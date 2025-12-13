import { Stack } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { Community } from "../../atoms/CommunitiesAtom";
import { Post } from "../../atoms/PostAtom";
import { useRecoilValue } from "recoil";
import { userState } from "../../atoms/userAtom";
import usePosts from "../../hooks/usePosts";
import PostItem from "./PostItem";
import PostLoader from "./PostLoader";

type PostsProps = {
  communityData: Community;
  userId?: string;
};

const Posts: React.FC<PostsProps> = ({ communityData }) => {
  const user = useRecoilValue(userState);
  const [loading, setLoading] = useState(false);
  const {
    postStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
  } = usePosts();

  const getPost = async () => {
    try {
      setLoading(true);
      const queryParam = communityData?.id
        ? `?communityId=${encodeURIComponent(communityData.id)}`
        : "";
      const response = await fetch(`/api/posts${queryParam}`, {
        headers: user?.id ? { "x-user-id": String(user.id) } : undefined,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }
      const data = await response.json();
      setPostStateValue((prev) => ({
        ...prev,
        posts: (data.posts as Post[]) || [],
      }));
    } catch (error: any) {
      console.log("get post error", error.message);
      setPostStateValue((prev) => ({
        ...prev,
        posts: [],
      }));
    }
    setLoading(false);
  };

  useEffect(() => {
    getPost();
  }, [communityData, setPostStateValue, user?.id]);

  return (
    <>
      {loading ? (
        <PostLoader />
      ) : (
        <Stack>
          {postStateValue.posts.map((item) => (
            <PostItem
              key={item.id}
              post={item}
              userIsCreator={user?.uid === item.creatorId}
              userVoteValue={
                postStateValue.postVotes.find((vote) => vote.postId === item.id)
                  ?.voteValue
              }
              onVote={onVote}
              onSelectPost={onSelectPost}
              onDeletePost={onDeletePost}
            />
          ))}
        </Stack>
      )}
    </>
  );
};
export default Posts;
