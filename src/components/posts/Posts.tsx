import { Box, Stack } from "@chakra-ui/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const {
    postStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
  } = usePosts();

  const PAGE_SIZE = 50;

  const buildParams = useCallback(
    (targetOffset: number) => {
      const params = new URLSearchParams();
      if (communityData?.id) {
        params.set("communityId", communityData.id);
      }
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(targetOffset));
      return params.toString();
    },
    [communityData?.id]
  );

  const fetchPosts = useCallback(
    async (targetOffset: number, mode: "reset" | "append") => {
      const response = await fetch(`/api/posts?${buildParams(targetOffset)}`, {
        headers: user?.id ? { "x-user-id": String(user.id) } : undefined,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }
      const data = await response.json();
      const mappedPosts = (data.posts as Post[]) || [];
      setPostStateValue((prev) => ({
        ...prev,
        posts:
          mode === "append"
            ? [...prev.posts, ...mappedPosts]
            : mappedPosts,
      }));
      setOffset(targetOffset + mappedPosts.length);
      setHasMore(mappedPosts.length === PAGE_SIZE);
    },
    [buildParams, setPostStateValue, user?.id]
  );

  const loadInitialPosts = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    setOffset(0);
    try {
      await fetchPosts(0, "reset");
    } catch (error: any) {
      console.log("get post error", error.message);
      setPostStateValue((prev) => ({
        ...prev,
        posts: [],
      }));
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPosts, setPostStateValue]);

  const loadMorePosts = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchPosts(offset, "append");
    } catch (_error) {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPosts, hasMore, loading, loadingMore, offset]);

  useEffect(() => {
    loadInitialPosts();
  }, [loadInitialPosts]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMorePosts();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMorePosts]);

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
      <Box ref={loadMoreRef} height="1px" />
      {loadingMore && <PostLoader />}
    </>
  );
};
export default Posts;
