import {
  Box,
  Flex,
  SkeletonCircle,
  SkeletonText,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import CryptoJS from "crypto-js";
// import { User } from "firebase/auth";
// import {
//   collection,
//   doc,
//   getDoc,
//   getDocs,
//   increment,
//   orderBy,
//   query,
//   serverTimestamp,
//   Timestamp,
//   where,
//   writeBatch,
// } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";

import { Post, postState } from "../../../atoms/PostAtom";
import { userState } from "../../../atoms/userAtom";
// import { firestore } from "../../../firebase/clientApp";
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
  const [encryptedData, setEncryptedData] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingDeleteId, setLoadingDeleteId] = useState("");
  const [fetchLoading, setFetchLoading] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [redditUser, setRedditUser] = useState<RedditUserDocument>();
  const setPostState = useSetRecoilState(postState);
  const bg = useColorModeValue("white", "#1A202C");
  const lineBorderColor = useColorModeValue("gray.100", "#171923");
  const emptyTextColor = useColorModeValue("gray.400", "gray.500");

  //console.log(comments);

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
    try {
      setCreateLoading(true);

      if (!user || !selectedPost) return;

      const splitName = user.email?.split("@")[0] || "anonymous";

      const dataName = CryptoJS.AES.encrypt(
        JSON.stringify(splitName),
        process.env.NEXT_PUBLIC_CRYPTO_SECRET_PASS as string
      ).toString();

      // Create new comment for frontend-only mode
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        creatorId: user.uid || "anonymous",
        creatorDisplayText: dataName,
        creatorPhotoURL: redditUser?.redditImage || "/images/redditlogo.png",
        communityId,
        postId: selectedPost.id!,
        postTitle: selectedPost.title,
        text: encryptedData,
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
      };

      setCommentText("");
      setComments((prev) => [newComment, ...prev]);
      setPostState((prev) => ({
        ...prev,
        selectedPost: {
          ...prev.selectedPost,
          numberOfComments: (prev.selectedPost?.numberOfComments || 0) + 1,
          userCommented: true, // Mark that user has commented
        } as Post,
      }));
    } catch (error) {
      console.log("📝", error);
    }
    setCreateLoading(false);
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
      console.log("CommentDelete Error", error);
    }
    setLoadingDeleteId("");
  };

  const getPostComments = async () => {
    try {
      // Use mock comments for frontend-only mode
      if (selectedPost?.id) {
        const { getMockCommentsByPostId } = await import(
          "../../../data/mockComments"
        );
        const mockComments = getMockCommentsByPostId(selectedPost.id);
        setComments(mockComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.log("GetPostComments Error", error);
      setComments([]);
    }
    setFetchLoading(false);
  };

  useEffect(() => {
    if (!selectedPost) return;
    getPostComments();
  }, [selectedPost]);

  useEffect(() => {
    try {
      const data = CryptoJS.AES.encrypt(
        JSON.stringify(commentText),
        process.env.NEXT_PUBLIC_CRYPTO_SECRET_PASS as string
      ).toString();

      setEncryptedData(data);
    } catch (error) {
      console.log(error);
    }
  }, [commentText]);

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
