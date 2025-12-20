import { Db } from "mongodb";

import {
  CommentDocument,
  PostDocument,
  RecommendationRequest,
} from "./models/Post";
import { getDb } from "./db";
import { computeQualityScore } from "./scorers/postScorer";
import {
  buildTrendIndexFromDocs,
  computeTrendScore,
  TrendIndex,
} from "./scorers/trendScorer";
import { computeTopicScore } from "./topicScorer";

const DEFAULT_WEIGHTS = {
  upvotes: 0,
  comments: 0,
  ratio: 0,
  image: 0,
  video: 0,
  freshness: 0,
  trendiness: 0,
};
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const toId = (value: any) => value?.toString?.() || "";
const compact = (value?: string | null) =>
  (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
const tokenize = (value?: string | null) =>
  (value || "")
    .toString()
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

const buildCommentScoreMap = (comments: CommentDocument[]) => {
  const map = new Map<string, number>();
  comments.forEach((comment) => {
    const postId = toId(comment.postId);
    if (!postId) return;
    const score = Math.max(0, comment.score || 0);
    map.set(postId, (map.get(postId) || 0) + score);
  });
  return map;
};

const fetchPostsAndComments = async (
  db: Db
): Promise<{ posts: PostDocument[]; comments: CommentDocument[] }> => {
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

  return { posts, comments };
};

const fetchTrendIndex = async (db: Db): Promise<TrendIndex> => {
  const name = process.env.MONGODB_TRENDS_COLLECTION || "count_min_sketch";
  const col = db.collection(name);
  const cutoff = Date.now() - WEEK_MS;
  const cutoffDate = new Date(cutoff);
  const docs = await col
    .find({
      $or: [
        { updatedAt: { $gte: cutoff } },
        { updatedAt: { $gte: cutoffDate } },
      ],
    })
    .toArray();

  return buildTrendIndexFromDocs(docs, cutoff);
};

const buildInterestMatcher = (topics: RecommendationRequest["topics"]) => {
  const topicSet = new Set(
    topics
      .flatMap((topic) => [topic.name, ...(topic.subreddits || [])])
      .map(compact)
      .filter(Boolean)
  );
  const keywordSet = new Set(
    topics
      .flatMap((topic) => topic.keywords || [])
      .map(compact)
      .filter(Boolean)
  );

  return (post: PostDocument) => {
    const sub = compact(post.subreddit);
    const queryCompact = compact(post.query);
    if ((sub && topicSet.has(sub)) || (queryCompact && topicSet.has(queryCompact))) return true;

    const queryTokens = tokenize(post.query);
    if (queryTokens.some((token) => topicSet.has(token))) return true;

    const keywordTokens = [
      ...(post.text_features?.keywords || []),
      post.query || "",
    ].flatMap((value) => tokenize(value));
    return keywordTokens.some((token) => keywordSet.has(token));
  };
};

const toResponsePost = (
  post: PostDocument,
  finalScore: number
): PostDocument => {
  const textFeatures = post.text_features || { keywords: [] };
  return {
    _id: post._id,
    kind: "post",
    id: post.id,
    title: post.title,
    subreddit: post.subreddit,
    query: post.query,
    body: post.body ?? null,
    selftext: post.selftext ?? null,
    selftext_html: post.selftext_html ?? null,
    author: post.author ?? null,
    author_fullname: post.author_fullname ?? null,
    score: post.score,
    upvote_ratio: post.upvote_ratio,
    num_comments: post.num_comments,
    is_video: post.is_video,
    thumbnail: post.thumbnail || null,
    url_overridden_by_dest: post.url_overridden_by_dest || null,
    preview: post.preview ?? null,
    content_type: post.content_type || null,
    created_utc: post.created_utc,
    url: post.url,
    finalScore,
    text_features: {
      keywords: textFeatures.keywords || [],
      topic_category: post.query || textFeatures.topic_category || null,
    },
  };
};

export const getRecommendations = async (
  config: RecommendationRequest
): Promise<PostDocument[]> => {
  const db = await getDb();
  const [{ posts, comments }, trendIndex] = await Promise.all([
    fetchPostsAndComments(db),
    fetchTrendIndex(db),
  ]);

  const commentScores = buildCommentScoreMap(comments);
  const weights = { ...DEFAULT_WEIGHTS, ...(config.weights || {}) };
  const topics = config.topics || [];
  const isInterestMatch = buildInterestMatcher(topics);

  const scoredPosts = posts.map((post) => {
    const postId = toId(post._id);
    const commentBoost = Math.log1p(commentScores.get(postId) || 0) * 0.1;
    const qualityScore = computeQualityScore(post, weights);
    const interestScore = computeTopicScore(post, topics);
    const trendScore = computeTrendScore(post, trendIndex) * weights.trendiness;
    const finalScore =
      qualityScore * (1 + interestScore) + commentBoost + trendScore;
    return { post, finalScore };
  });

  const interested: typeof scoredPosts = [];
  const other: typeof scoredPosts = [];
  scoredPosts.forEach((item) =>
    (isInterestMatch(item.post) ? interested : other).push(item)
  );

  interested.sort((a, b) => b.finalScore - a.finalScore);
  other.sort((a, b) => b.finalScore - a.finalScore);

  const combined = [...interested, ...other];
  const offset =
    typeof config.offset === "number" && Number.isFinite(config.offset) && config.offset > 0
      ? config.offset
      : 0;
  const limit = config.limit && config.limit > 0 ? config.limit : undefined;
  const sliced = limit ? combined.slice(offset, offset + limit) : combined.slice(offset);

  return sliced.map(({ post, finalScore }) => toResponsePost(post, finalScore));
};
