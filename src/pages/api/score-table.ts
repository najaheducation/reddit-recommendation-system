import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthToken, verifyAuthToken } from "../../lib/auth";
import { getConfigCollection, getDb, getInterestsCollection, getTrendsCollection, toObjectId } from "../../lib/db";
import { CommentDocument, PostDocument, RecommendationWeights, TopicConfig } from "../../lib/models/Post";
import { computeCommentScore } from "../../lib/scorers/commentScorer";
import { computeFreshnessScore } from "../../lib/scorers/freshnessScorer";
import { computeImageScore, computeVideoScore } from "../../lib/scorers/mediaScorer";
import { computeQualityScore } from "../../lib/scorers/postScorer";
import { computeRatioScore } from "../../lib/scorers/ratioScorer";
import { buildTrendIndexFromDocs, computeTrendScore } from "../../lib/scorers/trendScorer";
import { computeUpvoteScore } from "../../lib/scorers/upvoteScorer";
import { computeTopicScore } from "../../lib/topicScorer";

type ScoreRow = {
  id: string;
  title: string;
  subreddit: string;
  query?: string | null;
  createdAt?: string | null;
  score: number;
  numComments: number;
  upvoteRatio: number;
  hasImage: number;
  hasVideo: number;
  upvoteScore: number;
  upvoteWeighted: number;
  commentScore: number;
  commentWeighted: number;
  ratioScore: number;
  ratioWeighted: number;
  imageScore: number;
  imageWeighted: number;
  videoScore: number;
  videoWeighted: number;
  freshnessScore: number;
  freshnessWeighted: number;
  qualityScore: number;
  topicScore: number;
  interestMultiplier: number;
  commentScoreSum: number;
  commentBoost: number;
  trendScoreRaw: number;
  trendScoreWeighted: number;
  finalScore: number;
};

type ScoreTableResponse =
  | {
      rows: ScoreRow[];
      offset: number;
      limit: number;
      total: number;
      weights: RecommendationWeights;
    }
  | { error: string };

const DEFAULT_WEIGHTS: RecommendationWeights = {
  upvotes: 0.2,
  comments: 0.2,
  ratio: 0.2,
  image: 0.2,
  video: 0.1,
  freshness: 0.1,
  trendiness: 0,
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const getUserIdFromRequest = (req: NextApiRequest): string | null => {
  const token = getAuthToken(req);
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      if (payload?.sub) return String(payload.sub);
    } catch {
      // fallback below
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const candidate = req.headers["x-user-id"] ?? req.query.userId ?? (req.body as any)?.userId;
    if (candidate) return String(candidate);
  }
  return null;
};

const sanitize = (value?: string | null) =>
  (value || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, "");

const normalizeWeightValue = (value: any) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num > 1) return Math.max(0, Math.min(1, num / 100));
  return Math.max(0, Math.min(1, num));
};

const mapWeightsFromConfig = (weightsMap: Record<string, number>): RecommendationWeights => {
  const mapped: RecommendationWeights = { ...DEFAULT_WEIGHTS };
  Object.entries(weightsMap || {}).forEach(([label, value]) => {
    const normalizedLabel = label.toLowerCase();
    const normalizedValue = normalizeWeightValue(value);
    if (normalizedLabel.includes("ratio")) mapped.ratio = normalizedValue;
    else if (normalizedLabel.includes("comment")) mapped.comments = normalizedValue;
    else if (normalizedLabel.includes("image")) mapped.image = normalizedValue;
    else if (normalizedLabel.includes("video")) mapped.video = normalizedValue;
    else if (normalizedLabel.includes("fresh")) mapped.freshness = normalizedValue;
    else if (normalizedLabel.includes("upvote")) mapped.upvotes = normalizedValue;
    else if (normalizedLabel.includes("trend")) mapped.trendiness = normalizedValue;
  });
  return mapped;
};

type UserInterest = {
  interest: string;
  subInterest?: string;
  weight: number;
};

const fetchUserInterests = async (userId?: string | null): Promise<UserInterest[]> => {
  if (!userId) return [];
  const objectId = toObjectId(userId);
  if (!objectId) return [];
  const col = await getInterestsCollection();
  const docs = await col.find({ userId: objectId }).toArray();
  return docs.map((doc) => ({
    interest: doc.interest,
    subInterest: doc.subInterest || undefined,
    weight: doc.weight,
  }));
};

const mapInterestsToTopics = (interests: UserInterest[]): TopicConfig[] =>
  interests.map((item) => {
    const base = sanitize(item.interest);
    const sub = sanitize(item.subInterest || "");
    const keywords = [base, sub].filter(Boolean);
    return {
      name: base || "topic",
      weight: Number.isFinite(item.weight) ? Math.max(0, Math.min(1, item.weight)) : 0.5,
      subreddits: keywords,
      keywords,
    };
  });

const mapStringsToTopics = (topics: string[] = []): TopicConfig[] =>
  topics.map((t) => {
    const clean = sanitize(t);
    return {
      name: clean || "topic",
      weight: 0.5,
      subreddits: clean ? [clean] : [],
      keywords: clean ? [clean] : [],
    };
  });

const toId = (value: any) => value?.toString?.() || "";

const parseLimit = (value: unknown) => {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] : String(value), 10);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(10, Math.min(200, parsed));
};

const parseOffset = (value: unknown) => {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] : String(value), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ScoreTableResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const limit = parseLimit(req.query.limit);
    const offset = parseOffset(req.query.offset);
    const userId = getUserIdFromRequest(req);

    const [userInterests, configCol] = await Promise.all([
      fetchUserInterests(userId),
      getConfigCollection(),
    ]);

    const configDoc = userId ? await configCol.findOne({ userId: toObjectId(userId) }) : null;

    const topicsFromInterests = mapInterestsToTopics(userInterests).filter((t) => t.keywords.length);
    const topicsFromConfigRaw = configDoc?.topics;
    const topicsFromConfig =
      Array.isArray(topicsFromConfigRaw) &&
      topicsFromConfigRaw.some((t: any) => t && typeof t === "object" && (t.keywords || t.subreddits))
        ? (topicsFromConfigRaw as any[]).map((item) => {
            const keywords = Array.isArray(item.keywords)
              ? item.keywords
                  .map((k: any) =>
                    k?.toString?.().toLowerCase?.().replace(/[^a-z0-9]+/g, "").trim?.()
                  )
                  .filter(Boolean)
              : [];
            const subreddits = Array.isArray(item.subreddits)
              ? item.subreddits
                  .map((k: any) =>
                    k?.toString?.().toLowerCase?.().replace(/[^a-z0-9]+/g, "").trim?.()
                  )
                  .filter(Boolean)
              : [];
            return {
              name:
                item.name?.toString?.().toLowerCase?.().replace(/[^a-z0-9]+/g, "").trim?.() ||
                keywords[0] ||
                subreddits[0] ||
                "topic",
              weight: normalizeWeightValue(item.weight ?? 0.5),
              keywords,
              subreddits,
            };
          })
        : mapStringsToTopics(topicsFromConfigRaw as any);

    const topics = topicsFromInterests.length ? topicsFromInterests : topicsFromConfig;
    const weights = mapWeightsFromConfig(configDoc?.weights || {});

    const db = await getDb();
    const posts = await db
      .collection<PostDocument>("posts")
      .find({ kind: "post" })
      .toArray();

    const postIds = posts.map((post) => toId(post._id));
    const comments = postIds.length
      ? await db
          .collection<CommentDocument>("comments")
          .find({ postId: { $in: postIds } })
          .toArray()
      : [];

    const commentScores = new Map<string, number>();
    comments.forEach((comment) => {
      const postId = toId(comment.postId);
      if (!postId) return;
      const score = Math.max(0, comment.score || 0);
      commentScores.set(postId, (commentScores.get(postId) || 0) + score);
    });

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
    const trendIndex = buildTrendIndexFromDocs(trendDocs, cutoff);

    const rows = posts.map((post) => {
      const postId = toId(post._id);
      const commentScoreSum = commentScores.get(postId) || 0;
      const commentBoost = Math.log1p(commentScoreSum) * 0.1;
      const upvoteScore = computeUpvoteScore(post);
      const commentScore = computeCommentScore(post);
      const ratioScore = computeRatioScore(post);
      const imageScore = computeImageScore(post);
      const videoScore = computeVideoScore(post);
      const freshnessScore = computeFreshnessScore(post);
      const topicScore = computeTopicScore(post, topics);
      const trendScoreRaw = computeTrendScore(post, trendIndex);
      const trendScoreWeighted = trendScoreRaw * (weights.trendiness || 0);
      const qualityScore = computeQualityScore(post, weights);
      const finalScore =
        qualityScore * (1 + topicScore) + commentBoost + trendScoreWeighted;

      return {
        id: post.id || postId,
        title: post.title || "",
        subreddit: post.subreddit || "",
        query: post.query ?? null,
        createdAt: post.created_utc ? new Date(post.created_utc).toISOString() : null,
        score: post.score ?? 0,
        numComments: post.num_comments ?? 0,
        upvoteRatio: post.upvote_ratio ?? 0,
        hasImage: imageScore,
        hasVideo: videoScore,
        upvoteScore,
        upvoteWeighted: upvoteScore * (weights.upvotes || 0),
        commentScore,
        commentWeighted: commentScore * (weights.comments || 0),
        ratioScore,
        ratioWeighted: ratioScore * (weights.ratio || 0),
        imageScore,
        imageWeighted: imageScore * (weights.image || 0),
        videoScore,
        videoWeighted: videoScore * (weights.video || 0),
        freshnessScore,
        freshnessWeighted: freshnessScore * (weights.freshness || 0),
        qualityScore,
        topicScore,
        interestMultiplier: 1 + topicScore,
        commentScoreSum,
        commentBoost,
        trendScoreRaw,
        trendScoreWeighted,
        finalScore,
      };
    });

    rows.sort((a, b) => b.finalScore - a.finalScore);

    const sliced = rows.slice(offset, offset + limit);

    return res.status(200).json({
      rows: sliced,
      offset,
      limit,
      total: rows.length,
      weights,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to load score table" });
  }
}
