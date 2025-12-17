import { PostDocument } from "../models/Post";

export const computeImageScore = (post: PostDocument): number => {
  const hasImage =
    Boolean(post.thumbnail) ||
    (post.content_type ? post.content_type === "image" : false);
  return hasImage ? 1 : 0;
};

export const computeVideoScore = (post: PostDocument): number => {
  return post.is_video ? 1 : 0;
};
