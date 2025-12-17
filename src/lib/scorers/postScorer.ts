import { PostDocument, RecommendationWeights } from "../models/Post";
import { computeCommentScore } from "./commentScorer";
import { computeFreshnessScore } from "./freshnessScorer";
import { computeImageScore, computeVideoScore } from "./mediaScorer";
import { computeRatioScore } from "./ratioScorer";
import { computeUpvoteScore } from "./upvoteScorer";

export const computeQualityScore = (
  post: PostDocument,
  weights: RecommendationWeights
): number => {
  const upvotesScore = computeUpvoteScore(post) * (weights.upvotes || 0);
  const commentsScore = computeCommentScore(post) * (weights.comments || 0);
  const ratioScore = computeRatioScore(post) * (weights.ratio || 0);
  const imageScore = computeImageScore(post) * (weights.image || 0);
  const videoScore = computeVideoScore(post) * (weights.video || 0);
  const freshnessScore = computeFreshnessScore(post) * (weights.freshness || 0);

  return (
    upvotesScore +
    commentsScore +
    ratioScore +
    imageScore +
    videoScore +
    freshnessScore
  );
};
