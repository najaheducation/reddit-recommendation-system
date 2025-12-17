import { PostDocument } from "../models/Post";

export const computeUpvoteScore = (post: PostDocument): number => {
  const value = Math.max(0, post.score || 0);
  return Math.log1p(value) / Math.log1p(10000);
};
