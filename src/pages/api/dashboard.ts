import type { NextApiRequest, NextApiResponse } from "next";

import { getDb, getTrendsCollection } from "../../lib/db";

type CountItem = {
  label: string;
  count: number;
};

type PostsByDay = {
  date: string;
  count: number;
};

type DashboardResponse =
  | {
      totals: {
        totalPosts: number;
        totalComments: number;
        avgScore: number;
        avgComments: number;
        avgUpvoteRatio: number;
        imagePosts: number;
        videoPosts: number;
        distinctSubreddits: number;
        distinctQueries: number;
        trendiness: number;
      };
      topQueries: CountItem[];
      topSubreddits: CountItem[];
      topAuthors: CountItem[];
      topDomains: CountItem[];
      postsByDay: PostsByDay[];
      trends: { key: string; count: number }[];
      trendsUpdatedAt?: number;
      trendsWindowStart?: number;
      trendsWindowEnd?: number;
    }
  | { error: string };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const toNumber = (value: any, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object") {
    if ("$numberLong" in value) {
      const parsed = Number((value as { $numberLong?: string }).$numberLong);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
      const parsed = (value as { toNumber: () => number }).toNumber();
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
};

const toMillis = (value: any) => {
  if (!value) return undefined;
  if (value instanceof Date) return value.getTime();
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeCountItems = (items: any[]): CountItem[] =>
  items.map((item) => ({
    label: item._id?.toString?.() || item.label?.toString?.() || "",
    count: toNumber(item.count, 0),
  }));

const normalizeTrendKey = (value: string) => {
  const cleaned = value
    .toString()
    .trim()
    .replace(/^term:/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (!cleaned || cleaned.startsWith("user:")) return "";
  return `term:${cleaned}`;
};

const aggregateTrendItems = (docs: any[], cutoff: number) => {
  const counts = new Map<string, number>();
  const recentDocs = docs.filter((doc) => {
    const updatedAt = toMillis(doc?.updatedAt);
    return typeof updatedAt === "number" && updatedAt >= cutoff;
  });

  recentDocs.forEach((doc) => {
    const items = Array.isArray(doc?.trends) ? doc.trends : [];
    items.forEach((item: any) => {
      const key = normalizeTrendKey(item?.key?.toString?.() || "");
      if (!key) return;
      const count = toNumber(item?.count, 0);
      if (!count) return;
      counts.set(key, (counts.get(key) || 0) + count);
    });
  });

  const trends = Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const latestDoc = recentDocs.reduce<any>((latest, current) => {
    const latestTime = toMillis(latest?.updatedAt) ?? 0;
    const currentTime = toMillis(current?.updatedAt) ?? 0;
    return currentTime > latestTime ? current : latest;
  }, null);

  return { trends, latestDoc };
};

const parseDays = (value: unknown) => {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] : String(value), 10);
  if (!Number.isFinite(parsed)) return 14;
  return Math.max(3, Math.min(90, parsed));
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const db = await getDb();
    const posts = db.collection("posts");
    const comments = db.collection("comments");
    const days = parseDays(req.query.days);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const httpRegex = /^https?:\/\//i;
    const imageRegex = /\.(png|jpe?g|gif|webp)(\?.*)?$/i;

    const summaryPromise = posts
      .aggregate([
        { $match: { kind: "post" } },
        {
          $group: {
            _id: null,
            totalPosts: { $sum: 1 },
            avgScore: { $avg: "$score" },
            avgComments: { $avg: "$num_comments" },
            avgUpvoteRatio: { $avg: "$upvote_ratio" },
          },
        },
      ])
      .toArray();

    const mediaPromise = posts
      .aggregate([
        { $match: { kind: "post" } },
        {
          $project: {
            isVideo: { $eq: ["$is_video", true] },
            thumbnail: { $ifNull: ["$thumbnail", ""] },
            url: { $ifNull: ["$url_overridden_by_dest", ""] },
          },
        },
        {
          $group: {
            _id: null,
            videoPosts: { $sum: { $cond: ["$isVideo", 1, 0] } },
            imagePosts: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $regexMatch: { input: "$thumbnail", regex: httpRegex } },
                      { $regexMatch: { input: "$url", regex: imageRegex } },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    const topQueriesPromise = posts
      .aggregate([
        { $match: { kind: "post", query: { $type: "string" } } },
        {
          $project: {
            query: { $toLower: { $trim: { input: "$query" } } },
          },
        },
        { $match: { query: { $ne: "" } } },
        { $group: { _id: "$query", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    const topSubredditsPromise = posts
      .aggregate([
        { $match: { kind: "post", subreddit: { $type: "string" } } },
        {
          $project: {
            subreddit: { $toLower: { $trim: { input: "$subreddit" } } },
          },
        },
        { $match: { subreddit: { $ne: "" } } },
        { $group: { _id: "$subreddit", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    const topAuthorsPromise = posts
      .aggregate([
        { $match: { kind: "post", author: { $type: "string" } } },
        {
          $project: {
            author: { $toLower: { $trim: { input: "$author" } } },
          },
        },
        { $match: { author: { $ne: "" } } },
        { $group: { _id: "$author", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    const topDomainsPromise = posts
      .aggregate([
        { $match: { kind: "post", domain: { $type: "string" } } },
        {
          $project: {
            domain: { $toLower: { $trim: { input: "$domain" } } },
          },
        },
        { $match: { domain: { $ne: "" } } },
        { $group: { _id: "$domain", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    const postsByDayPromise = posts
      .aggregate([
        { $match: { kind: "post" } },
        {
          $addFields: {
            createdDate: {
              $convert: {
                input: { $ifNull: ["$created_utc", "$createdAt"] },
                to: "date",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        { $match: { createdDate: { $ne: null, $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdDate" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const distinctSubredditsPromise = posts
      .aggregate([
        { $match: { kind: "post", subreddit: { $type: "string" } } },
        {
          $project: {
            subreddit: { $toLower: { $trim: { input: "$subreddit" } } },
          },
        },
        { $match: { subreddit: { $ne: "" } } },
        { $group: { _id: "$subreddit" } },
        { $count: "count" },
      ])
      .toArray();

    const distinctQueriesPromise = posts
      .aggregate([
        { $match: { kind: "post", query: { $type: "string" } } },
        {
          $project: {
            query: { $toLower: { $trim: { input: "$query" } } },
          },
        },
        { $match: { query: { $ne: "" } } },
        { $group: { _id: "$query" } },
        { $count: "count" },
      ])
      .toArray();

    const totalCommentsPromise = comments.countDocuments({ kind: "comment" });

    const [
      summaryDocs,
      mediaDocs,
      topQueries,
      topSubreddits,
      topAuthors,
      topDomains,
      postsByDayDocs,
      distinctSubDocs,
      distinctQueryDocs,
      totalComments,
    ] = await Promise.all([
      summaryPromise,
      mediaPromise,
      topQueriesPromise,
      topSubredditsPromise,
      topAuthorsPromise,
      topDomainsPromise,
      postsByDayPromise,
      distinctSubredditsPromise,
      distinctQueriesPromise,
      totalCommentsPromise,
    ]);

    const summary = summaryDocs[0] || {};
    const media = mediaDocs[0] || {};

    const trendsCol = await getTrendsCollection();
    const cutoff = Date.now() - WEEK_MS;
    const cutoffDate = new Date(cutoff);
    const trendDocs = await trendsCol
      .find({
        $or: [
          { updatedAt: { $gte: cutoff } },
          { updatedAt: { $gte: cutoffDate } },
        ],
      })
      .toArray();

    const { trends, latestDoc } = aggregateTrendItems(trendDocs, cutoff);
    const trendiness = trends.reduce((sum, item) => sum + item.count, 0);

    return res.status(200).json({
      totals: {
        totalPosts: toNumber(summary.totalPosts, 0),
        totalComments: toNumber(totalComments, 0),
        avgScore: toNumber(summary.avgScore, 0),
        avgComments: toNumber(summary.avgComments, 0),
        avgUpvoteRatio: toNumber(summary.avgUpvoteRatio, 0),
        imagePosts: toNumber(media.imagePosts, 0),
        videoPosts: toNumber(media.videoPosts, 0),
        distinctSubreddits: toNumber(distinctSubDocs[0]?.count, 0),
        distinctQueries: toNumber(distinctQueryDocs[0]?.count, 0),
        trendiness,
      },
      topQueries: normalizeCountItems(topQueries),
      topSubreddits: normalizeCountItems(topSubreddits),
      topAuthors: normalizeCountItems(topAuthors),
      topDomains: normalizeCountItems(topDomains),
      postsByDay: postsByDayDocs.map((doc) => ({
        date: doc._id,
        count: toNumber(doc.count, 0),
      })),
      trends,
      trendsUpdatedAt: toMillis(latestDoc?.updatedAt),
      trendsWindowStart: toMillis(latestDoc?.windowStart),
      trendsWindowEnd: toMillis(latestDoc?.windowEnd),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to load dashboard" });
  }
}
