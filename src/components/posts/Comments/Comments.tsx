import {
  Box,
  Flex,
  SkeletonCircle,
  SkeletonText,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";

import { Post, postState } from "../../../atoms/PostAtom";
import { userState } from "../../../atoms/userAtom";
import CommentInput from "./CommentInput";
import CommentItem, { Comment } from "./CommentItem";

interface RedditUserDocument {
  userId?: string;
  userName: string;
  userEmail?: string;
  userImage: string;
  redditImage: string;
  timestamp: any; // Timestamp;
}

type CommentsProps = {
  user?: any; // User;
  selectedPost: Post | null;
  communityId: string;
};

const Comments: React.FC<CommentsProps> = ({
  user: propUser,
  selectedPost,
  communityId,
}) => {
  const userFromState = useRecoilValue(userState);
  const user = propUser || userFromState;
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingDeleteId, setLoadingDeleteId] = useState("");
  const [fetchLoading, setFetchLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [redditUser, setRedditUser] = useState<RedditUserDocument>();
  const setPostState = useSetRecoilState(postState);
  const bg = useColorModeValue("white", "#1A202C");
  const lineBorderColor = useColorModeValue("gray.100", "#171923");
  const emptyTextColor = useColorModeValue("gray.400", "gray.500");



  const fetchRedditUser = async (userId: any) => {
    if (!userId) return;

    // Mock user data for frontend-only mode
    setRedditUser({
      userId: userId,
      userName: "Mock User",
      userEmail: "user@example.com",
      userImage: "/images/redditlogo.png",
      redditImage: "/images/redditlogo.png",
      timestamp: { seconds: Math.floor(Date.now() / 1000) },
    } as RedditUserDocument);
  };

  const onCreateComments = async () => {
    setCreateLoading(true);
    try {
      if (!user || !selectedPost) return;

      const splitName = user.email?.split("@")[0] || "anonymous";

      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        creatorId: user.uid || "anonymous",
        creatorDisplayText: splitName,
        creatorPhotoURL: redditUser?.redditImage || "/images/redditlogo.png",
        communityId,
        postId: selectedPost.id!,
        postTitle: selectedPost.title,
        text: commentText,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
      };

      setCommentText("");
      setComments((prev) => [newComment, ...prev]);
      setPostState((prev) => ({
        ...prev,
        selectedPost: {
          ...prev.selectedPost,
          numberOfComments: (prev.selectedPost?.numberOfComments || 0) + 1,
          userCommented: true,
        } as Post,
      }));
    } finally {
      setCreateLoading(false);
    }
  };

  const onDeleteComment = async (comment: Comment) => {
    setLoadingDeleteId(comment.id!);
    try {
      // Delete comment in frontend-only mode
      setPostState((prev) => ({
        ...prev,
        selectedPost: {
          ...prev.selectedPost,
          numberOfComments: Math.max(
            (prev.selectedPost?.numberOfComments || 1) - 1,
            0
          ),
        } as Post,
      }));

      setComments((prev) => prev.filter((item) => item.id !== comment.id));
    } catch (error) {

    }
    setLoadingDeleteId("");
  };

  const getPostComments = async () => {
    setFetchLoading(true);
    try {
      if (!selectedPost?.id) {
        setComments([]);
        return;
      }
      const res = await fetch(`/api/comments?postId=${encodeURIComponent(selectedPost.id)}`);
      if (!res.ok) {
        setComments([]);
        return;
      }
      const data = await res.json();
      const mapped: Comment[] = Array.isArray(data?.comments)
        ? data.comments.map((c: any) => {
            const keywords = Array.isArray(c.keywords)
              ? c.keywords
              : Array.isArray(c.text_features?.keywords)
                ? c.text_features.keywords
                : [];
            return {
              id: c._id,
              creatorId: c.author || "unknown",
              creatorDisplayText: c.author || "unknown",
              creatorPhotoURL: "/images/redditlogo.png",
              communityId,
              postId: selectedPost.id!,
              postTitle: selectedPost.title,
              text: c.body || c.url || "",
              createdAt: c.created_utc
                ? { seconds: Math.floor(new Date(c.created_utc).getTime() / 1000) }
                : { seconds: Math.floor(Date.now() / 1000) },
              score: typeof c.score === "number" ? c.score : null,
              url: c.url ?? null,
              postUrl: c.postUrl ?? null,
              parentId: c.parentId ?? null,
              query: c.query ?? null,
              keywords,
              commentDepth: typeof c.comment_depth === "number" ? c.comment_depth : null,
              textFeatures: c.text_features ?? null,
              createdUtc: c.created_utc ?? null,
              hasLinks: typeof c.has_links === "boolean" ? c.has_links : null,
              hasMentions: typeof c.has_mentions === "boolean" ? c.has_mentions : null,
            };
          })
        : [];
      setComments(mapped);
    } catch (error) {
      setComments([]);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPost) return;
    getPostComments();
  }, [selectedPost]);

  useEffect(() => {
    fetchRedditUser(user?.uid);
  }, [user]);

  return (
    <Box 
      bg={bg} 
      borderRadius="0px 0px 12px 12px" 
      p={4}
      borderTop="1px solid"
      borderColor={lineBorderColor}
    >
      <Flex
        direction="column"
        pl={10}
        pr={4}
        mb={6}
        fontSize="14px"
        width="100%"
      >
        {!fetchLoading && (
          <CommentInput
            commentText={commentText}
            setCommentText={setCommentText}
            user={user}
            createLoading={createLoading}
            onCreateComments={onCreateComments}
          />
        )}
      </Flex>
      <Stack spacing={4} p={2}>
        {fetchLoading ? (
          <>
            {[0, 1, 2].map((item) => (
              <Box key={item} padding="6" bg={bg}>
                <SkeletonCircle size="10" />
                <SkeletonText mt="4" noOfLines={2} spacing="4" />
              </Box>
            ))}
          </>
        ) : (
          <>
            {comments.length === 0 ? (
              <Flex
                direction="column"
                justify="center"
                align="center"
                borderTop="1px solid"
                borderColor={lineBorderColor}
                p={20}
              >
                <Text 
                  fontWeight={600} 
                  fontSize="16px"
                  color={emptyTextColor}
                  opacity={0.7}
                >
                  No Comments Yet
                </Text>
                <Text 
                  fontSize="14px"
                  color={emptyTextColor}
                  mt={2}
                  opacity={0.5}
                >
                  Be the first to comment!
                </Text>
              </Flex>
            ) : (
              <>
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onDeleteComment={onDeleteComment}
                    isLoading={loadingDeleteId === comment.id!}
                    userId={user?.uid}
                  />
                ))}
              </>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
};
export default Comments;
