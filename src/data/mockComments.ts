import CryptoJS from "crypto-js";
import { Comment } from "../components/posts/Comments/CommentItem";

/**
 * Mock comments data for frontend-only functionality.
 * Comments are encrypted using the same encryption method as posts.
 */
const encryptText = (text: string): string => {
  try {
    return CryptoJS.AES.encrypt(
      JSON.stringify(text),
      process.env.NEXT_PUBLIC_CRYPTO_SECRET_PASS || "default-secret"
    ).toString();
  } catch {
    return text;
  }
};

export const mockComments: Comment[] = [
  {
    id: "comment-1",
    creatorId: "user1",
    creatorDisplayText: encryptText("john_doe"),
    creatorPhotoURL: "/images/redditlogo.png",
    communityId: "SoftDuo",
    postId: "1pcbb9k",
    postTitle: "Do we look cute? 😊",
    text: encryptText("This is so adorable! 😍"),
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 3600 },
  },
  {
    id: "comment-2",
    creatorId: "user2",
    creatorDisplayText: encryptText("jane_smith"),
    creatorPhotoURL: "/images/redditFace.svg",
    communityId: "SoftDuo",
    postId: "1pcbb9k",
    postTitle: "Do we look cute? 😊",
    text: encryptText("Absolutely love this! Great post."),
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 1800 },
  },
  {
    id: "comment-3",
    creatorId: "user3",
    creatorDisplayText: encryptText("reddit_user"),
    creatorPhotoURL: "/images/header.png",
    communityId: "Natsubaru",
    postId: "1pcbb4d",
    postTitle: "Sakusubaru Halloween (by  Roku821)",
    text: encryptText("Amazing artwork! Thanks for sharing the source."),
    createdAt: { seconds: Math.floor(Date.now() / 1000) - 7200 },
  },
];

/**
 * Get mock comments for a specific post
 */
export const getMockCommentsByPostId = (postId: string): Comment[] => {
  return mockComments.filter((comment) => comment.postId === postId);
};

