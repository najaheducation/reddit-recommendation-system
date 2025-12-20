import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import type { NextPage } from "next";
import Head from "next/head";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRecoilValue } from "recoil";

import { Post } from "../atoms/PostAtom";
import { userState } from "../atoms/userAtom";
import CreatePostLink from "../components/Community/CreatePostLink";
import PersonalHome from "../components/Community/PersonalHome";
import Premium from "../components/Community/Premium";
import Recommendation from "../components/Community/Recommendation";
import PageContent from "../components/Layout/PageContent";
import PostItem from "../components/posts/PostItem";
import PostLoader from "../components/posts/PostLoader";
import useCommunityData from "../hooks/useCommunityData";
import usePosts from "../hooks/usePosts";

const Home: NextPage = () => {
  const user = useRecoilValue(userState);
  const loadingUser = false;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const {
    postStateValue,
    setPostStateValue,
    onDeletePost,
    onSelectPost,
    onVote,
  } = usePosts();
  const { communityStateValue } = useCommunityData();

  //const communityStateValue = useRecoilValue(CommunityState);

  const PAGE_SIZE = 50;

  const mapPost = useCallback(
    (p: any): Post => ({
      id: p.id || p._id?.toString?.() || "",
      communityId: p.subreddit || p.communityId || "global",
      creatorId: p.creatorId || p.subreddit || "system",
      creatorDisplayName: p.creatorDisplayName || p.subreddit || "system",
      title: p.title || "",
      body: p.body || "",
      topic: p.topic || p.query || p.text_features?.topic_category || "",
      numberOfComments: p.num_comments ?? p.numberOfComments ?? 0,
      voteStatus: p.score ?? p.voteStatus ?? 0,
      imageURL: p.imageURL || p.thumbnail || undefined,
      communityImageURL: p.communityImageURL,
      createdAt:
        p.createdAt ||
        (p.created_utc
          ? { seconds: Math.floor(new Date(p.created_utc).getTime() / 1000) }
          : { seconds: Math.floor(Date.now() / 1000) }),
      score: p.score,
      finalScore: p.finalScore,
      userUpvote: p.userUpvote ?? false,
      userCommented: p.userCommented ?? false,
    }),
    []
  );

  const fetchPosts = useCallback(
    async (targetOffset: number, mode: "reset" | "append") => {
      const response = await fetch(
        `/api/posts?limit=${PAGE_SIZE}&offset=${targetOffset}`,
        {
          headers: user?.id ? { "x-user-id": String(user.id) } : undefined,
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`);
      }

      const data = await response.json();
      const mappedPosts =
        (data.posts as any[])?.map((p) => mapPost(p)) || [];

      setPostStateValue((prev) => ({
        ...prev,
        posts:
          mode === "append"
            ? ([...prev.posts, ...mappedPosts] as Post[])
            : (mappedPosts as Post[]),
      }));

      setOffset(targetOffset + mappedPosts.length);
      setHasMore(mappedPosts.length === PAGE_SIZE);
    },
    [mapPost, setPostStateValue, user?.id]
  );

  const loadInitialPosts = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    setOffset(0);
    try {
      await fetchPosts(0, "reset");
    } catch (error) {
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
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <Head>
        <title>Reddit Pulse</title>
        <meta
          name="description"
          content="A refined Reddit experience with premium UI and curated feeds."
        />
        <link rel="icon" href="/images/header.png" />
      </Head>
      <PageContent>
        <>
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Stack
              bgGradient="linear(to-r, rgba(30,136,255,0.12), rgba(18,180,151,0.12))"
              border="1px solid"
              borderColor="whiteAlpha.300"
              backdropFilter="blur(12px)"
              borderRadius="24px"
              spacing={3}
              p={{ base: 4, md: 6 }}
              boxShadow="xl"
            >
              <Stack direction={{ base: "column", md: "row" }} justify="space-between" spacing={4}>
                <Stack spacing={1}>
                  <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="0.14em">
                    Welcome back
                  </Text>
                  <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight={800} letterSpacing="-0.04em">
                    Design-forward feed for modern communities
                  </Text>
                  <Text color="gray.600" fontSize="md" maxW="3xl">
                    Discover trending subreddits, tune your interests, and publish with confidence—all in a polished,
                    minimal workspace built for speed.
                  </Text>
                </Stack>
                <Stack direction={{ base: "row", md: "column" }} spacing={3} minW={{ md: "220px" }}>
                  <Button size="lg" variant="solid">
                    Create a post
                  </Button>
                  <Button variant="outline" size="lg">
                    Personalize feed
                  </Button>
                </Stack>
              </Stack>
              <Stack
                direction={{ base: "column", md: "row" }}
                spacing={4}
                pt={2}
                divider={
                  <Box
                    h="1px"
                    bg="blackAlpha.100"
                    display={{ base: "block", md: "none" }}
                    _dark={{ bg: "whiteAlpha.200" }}
                  />
                }
              >
                {[
                  { label: "Communities", value: "250+" },
                  { label: "Signals tracked", value: "36" },
                  { label: "Avg. response", value: "42ms" },
                ].map((item) => (
                  <Flex
                    key={item.label}
                    align="center"
                    justify="space-between"
                    flex={{ base: "1 1 auto", md: 1 }}
                    p={3}
                    borderRadius="14px"
                    bg="whiteAlpha.60"
                    _dark={{ bg: "whiteAlpha.50" }}
                    border="1px solid"
                    borderColor="whiteAlpha.300"
                    boxShadow="md"
                  >
                    <Text color="gray.500" fontWeight={600}>
                      {item.label}
                    </Text>
                    <Text fontWeight={800} fontSize="xl">
                      {item.value}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            </Stack>
          </motion.div>
          <CreatePostLink />
          {loading ? (
            <PostLoader />
          ) : (
            <Stack>
              {postStateValue.posts.map((post) => (
                <PostItem
                  key={post.id}
                  post={post}
                  onVote={onVote}
                  onDeletePost={onDeletePost}
                  userVoteValue={
                    postStateValue.postVotes.find(
                      (item) => item.postId === post.id
                    )?.voteValue
                  }
                  userIsCreator={user?.uid === post.creatorId}
                  onSelectPost={onSelectPost}
                  homePage
                />
              ))}
            </Stack>
          )}
          <Box ref={loadMoreRef} height="1px" />
          {loadingMore && <PostLoader />}
        </>
        <Stack spacing={5}>
          <Recommendation />
          <Premium />
          <PersonalHome />
        </Stack>
      </PageContent>
    </motion.div>
  );
};

export default Home;
