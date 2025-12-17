import { PostDocument } from "../models/Post";

export const computeCommentScore = (post: PostDocument): number => {
  const value = Math.max(0, post.num_comments || 0);
  return Math.log1p(value) / Math.log1p(5000);
};
