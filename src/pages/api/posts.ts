import type { NextApiRequest, NextApiResponse } from "next";

import type { Post } from "../../atoms/PostAtom";
import { getAuthToken, verifyAuthToken } from "../../lib/auth";
import { getConfigCollection, getInterestsCollection, toObjectId } from "../../lib/db";
import { getRecommendations } from "../../lib/recommendationService";
import type { UserInterest } from "./interests";

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

const toSecondsTimestamp = (value?: string | Date | null) => {
  if (!value) return { seconds: Math.floor(Date.now() / 1000) };
  const date = value instanceof Date ? value : new Date(value);
  return { seconds: Math.floor(date.getTime() / 1000) };
};

const sanitize = (value?: string | null) =>
  (value || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, "");

const fetchUserInterests = async (userId?: string | null): Promise<UserInterest[]> => {
  if (!userId) return [];
  const objectId = toObjectId(userId);
  if (!objectId) return [];
  const col = await getInterestsCollection();
  const docs = await col.find({ userId: objectId }).toArray();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    interest: doc.interest,
    subInterest: doc.subInterest || undefined,
    weight: doc.weight,
  }));
};

const mapInterestsToTopics = (interests: UserInterest[]) =>
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

const mapStringsToTopics = (topics: string[] = []) =>
  topics.map((t) => {
    const clean = sanitize(t);
    return {
      name: clean || "topic",
      weight: 0.5,
      subreddits: clean ? [clean] : [],
      keywords: clean ? [clean] : [],
    };
  });

const normalizeWeightValue = (value: any) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num > 1) return Math.max(0, Math.min(1, num / 100));
  return Math.max(0, Math.min(1, num));
};

const mapWeightsFromConfig = (weightsMap: Record<string, number>) => {
  const defaults = {
    upvotes: 0.2,
    comments: 0.2,
    ratio: 0.2,
    image: 0.2,
    video: 0.1,
    freshness: 0.1,
    trendiness: 0,
  };
  const mapped = { ...defaults };
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

const sanitizeText = (value?: string | null) => (value || "").toString().trim();

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ");

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalizeHtmlText = (value?: string | null) => {
  if (!value) return "";
  const stripped = stripHtml(value);
  const decoded = decodeHtmlEntities(stripped);
  return sanitizeText(decoded.replace(/\s+/g, " "));
};

const resolveTopic = (post: any) =>
  sanitizeText(post.query || post.text_features?.topic_category || post.topic);

const buildDescription = (post: any): string => {
  const body = sanitizeText(post.body || post.selftext);
  if (body) return body;
  const htmlBody = normalizeHtmlText(post.selftext_html);
  if (htmlBody) return htmlBody;
  const topic = resolveTopic(post);
  const keywords = Array.isArray(post.text_features?.keywords)
    ? post.text_features.keywords.map((k: any) => sanitizeText(k)).filter(Boolean)
    : [];
  if (keywords.length) {
    const clipped = keywords.slice(0, 8).join(", ");
    const summary = topic ? `${topic}: ${clipped}` : clipped;
    return summary.length > 160 ? `${summary.slice(0, 157)}...` : summary;
  }
  return topic || "";
};

const normalizeUrl = (value?: string | null) => {
  const candidate = sanitizeText(value);
  if (!candidate) return undefined;
  const decoded = candidate.replace(/&amp;/g, "&");
  if (/^https?:\/\//i.test(decoded)) return decoded;
  return undefined;
};

const looksLikeImageUrl = (value: string) => {
  const lower = value.toLowerCase();
  return (
    /\.(png|jpe?g|gif|webp)$/.test(lower) ||
    lower.includes("://i.redd.it/") ||
    lower.includes("://preview.redd.it/") ||
    lower.includes("://i.imgur.com/")
  );
};

const resolveImageUrl = (post: any) => {
  const preview = post?.preview?.images?.[0];
  const previewUrl =
    normalizeUrl(preview?.source?.url) ||
    normalizeUrl(preview?.resolutions?.[preview?.resolutions?.length - 1]?.url);
  const directUrl = normalizeUrl(post.url_overridden_by_dest);
  const imageUrl = normalizeUrl(post.imageURL);
  const thumbnailUrl = normalizeUrl(post.thumbnail);

  if (imageUrl) return imageUrl;
  if (previewUrl) return previewUrl;
  if (directUrl && looksLikeImageUrl(directUrl)) return directUrl;
  if (thumbnailUrl) return thumbnailUrl;
  return undefined;
};

const mapApiPostToClient = (post: any): Post => {
  const author = post.author || post.author_fullname || "system";
  return {
    id: post._id?.toString?.() || post.id || "",
    communityId: post.subreddit || post.communityId || "global",
    creatorId: post.author_fullname || author,
    creatorDisplayName: author,
    title: post.title || resolveTopic(post) || "",
    topic: resolveTopic(post) || undefined,
    body: buildDescription(post),
    numberOfComments: post.num_comments ?? post.numberOfComments ?? 0,
    voteStatus: post.score ?? post.voteStatus ?? 0,
    imageURL: resolveImageUrl(post),
    communityImageURL: post.communityImageURL,
    createdAt: toSecondsTimestamp(post.createdAt || post.created_utc),
    score: post.score,
    finalScore: post.finalScore,
    userUpvote: false,
    userCommented: false,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = getUserIdFromRequest(req);
    const userInterests = await fetchUserInterests(userId);

    const limitParam = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;

    const limitNumber = limitParam ? parseInt(limitParam, 10) : undefined;

    const offsetParam = Array.isArray(req.query.offset)
      ? req.query.offset[0]
      : req.query.offset;
    const offsetNumber = offsetParam ? parseInt(offsetParam, 10) : 0;
    const safeOffset = Number.isFinite(offsetNumber) && offsetNumber > 0 ? offsetNumber : 0;

    const configCol = await getConfigCollection();
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

    const recommended = await getRecommendations({
      weights,
      topics,
      limit: limitNumber,
      offset: safeOffset,
    });

    const postsResponse: Post[] = recommended.map(mapApiPostToClient);

    return res.status(200).json({ posts: postsResponse });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
}
