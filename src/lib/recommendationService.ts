import { Collection, Db } from "mongodb";
import {
  CommentDocument,
  PostDocument,
  RecommendationRequest,
} from "./models/Post";
import { getDb } from "./db";
import { computeQualityScore } from "./scorers/postScorer";
import { computeTopicScore } from "./topicScorer";

type CommentAgg = {
  scoreSum: number;
  keywords: Set<string>;
};

const buildCommentMaps = (comments: CommentDocument[]) => {
  const map = new Map<string, CommentAgg>();
  comments.forEach((comment) => {
    const postId = (comment.postId || "").toString();
    if (!postId) return;
    const entry = map.get(postId) || { scoreSum: 0, keywords: new Set<string>() };
    entry.scoreSum += Math.max(0, comment.score || 0);
    (comment.keywords || []).forEach((kw) => entry.keywords.add((kw || "").toLowerCase()));
    map.set(postId, entry);
  });
  return map;
};

const computeCommentBoost = (scoreSum: number): number => {
  return Math.log1p(scoreSum) * 0.1;
};

const fetchPostsAndComments = async (
  db: Db
): Promise<{ posts: PostDocument[]; comments: CommentDocument[] }> => {
  const postsCollection: Collection<PostDocument> = db.collection("posts");
  const commentsCollection: Collection<CommentDocument> = db.collection("comments");

  const posts = await postsCollection.find({ kind: "post" }).toArray();

  const postIds = posts.map((p) => (p._id as any)?.toString?.() || "");

  const comments =
    postIds.length > 0
      ? await commentsCollection.find({ postId: { $in: postIds } }).toArray()
      : [];

  return { posts, comments };
};

export const getRecommendations = async (
  config: RecommendationRequest
): Promise<PostDocument[]> => {
  const db = await getDb();
  const { posts, comments } = await fetchPostsAndComments(db);
  const commentMap = buildCommentMaps(comments);
  const defaultWeights = {
    upvotes: 0,
    comments: 0,
    ratio: 0,
    image: 0,
    video: 0,
    freshness: 0,
  };
  const weights = {
    ...defaultWeights,
    ...(config.weights || {}),
  };

  const scoredPosts = posts.map((post) => {
    const qualityScore = computeQualityScore(post, weights);
    const topicScore = computeTopicScore(post, config.topics || []);

    const postId = (post._id as any)?.toString?.() || "";
    const commentAgg = commentMap.get(postId);
    const commentBoost = commentAgg ? computeCommentBoost(commentAgg.scoreSum) : 0;

    const interestScore = topicScore;
    const finalScore = qualityScore * (1 + interestScore) + commentBoost;

    return { post, finalScore };
  });

  // Split into interest-aligned and others (boolean classification, no filtering)
  const topics = config.topics || [];
  const interestTopicSet = new Set(
    topics
      .flatMap((t) => [t.name, ...(t.subreddits || [])])
      .map((v) => (v || "").toLowerCase())
      .filter(Boolean)
  );
  const interestKeywordSet = new Set(
    topics
      .flatMap((t) => t.keywords || [])
      .map((v) => (v || "").toLowerCase())
      .filter(Boolean)
  );

  const isInterestMatch = (post: PostDocument) => {
    const sub = (post.subreddit || "").toLowerCase();
    const keywords = (post.text_features?.keywords || []).map((k) => (k || "").toLowerCase());
    const topicMatch = sub && interestTopicSet.has(sub);
    const keywordMatch = keywords.some((k) => interestKeywordSet.has(k));
    return topicMatch || keywordMatch;
  };

  const interestedPosts = scoredPosts.filter(({ post }) => isInterestMatch(post));
  const otherPosts = scoredPosts.filter(({ post }) => !isInterestMatch(post));

  interestedPosts.sort((a, b) => b.finalScore - a.finalScore);
  otherPosts.sort((a, b) => b.finalScore - a.finalScore);

  const combined = [...interestedPosts, ...otherPosts];

  const limit = config.limit && config.limit > 0 ? config.limit : undefined;
  const sliced = limit ? combined.slice(0, limit) : combined;

  return sliced.map(({ post, finalScore }) => ({
    _id: post._id,
    kind: "post",
    title: post.title,
    subreddit: post.subreddit,
    score: post.score,
    upvote_ratio: post.upvote_ratio,
    num_comments: post.num_comments,
    is_video: post.is_video,
    thumbnail: post.thumbnail || null,
    content_type: post.content_type || null,
    created_utc: post.created_utc,
    url: post.url,
    finalScore,
    text_features: {
      keywords: post.text_features?.keywords || [],
      topic_category: post.text_features?.topic_category || null,
    },
  }));
};
