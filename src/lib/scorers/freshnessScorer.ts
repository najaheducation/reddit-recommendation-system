import { PostDocument } from "../models/Post";

export const computeFreshnessScore = (post: PostDocument): number => {
  const createdAt = post.created_utc ? new Date(post.created_utc) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return 0;
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - ageDays / 7);
};
