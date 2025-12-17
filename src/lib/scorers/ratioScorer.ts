import { PostDocument } from "../models/Post";

export const computeRatioScore = (post: PostDocument): number => {
  const ratio = typeof post.upvote_ratio === "number" ? post.upvote_ratio : 0;
  if (!Number.isFinite(ratio)) return 0;
  return Math.max(0, Math.min(1, ratio));
};
