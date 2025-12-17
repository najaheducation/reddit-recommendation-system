import { Stack } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { Post, PostVote } from "../../atoms/PostAtom";
import useCommunityData from "../../hooks/useCommunityData";
import usePosts from "../../hooks/usePosts";
import Recommendation from "../Community/Recommendation";
import PageContent from "../Layout/PageContent";
import PostItem from "../posts/PostItem";
import PostLoader from "../posts/PostLoader";
import NoPost from "./NoPost";
import ProfileSide from "./ProfileSide";
import ProfileTopBar from "./ProfileTopBar";

type Props = {};

function MainContainer({}: Props) {
  const user = null;
  const loadingUser = false;
  const router = useRouter();
  const { uid } = router.query;
  const [loading, setLoading] = useState(false);
  const {
    postStateValue,
    setPostStateValue,
    onDeletePost,
    onSelectPost,
    onVote,
  } = usePosts();
  const { communityStateValue } = useCommunityData();

  //const communityStateValue = useRecoilValue(CommunityState);

  const buildUserHomeFeed = async () => {
    // Populate personalized feed with your backend data here.
  };
  const buildNoUserHomeFeed = async () => {
    setLoading(true);
    // Populate public feed with your backend data here.
    setLoading(false);
  };

  const getUserPostVotes = async () => {
    // Fetch user vote data from your backend here.
  };

  useEffect(() => {
    if (communityStateValue.snippetsFetched) buildNoUserHomeFeed();
  }, [communityStateValue.snippetsFetched]);

  useEffect(() => {
    if (!user && !loadingUser) buildNoUserHomeFeed();
  }, [user, loadingUser]);

  useEffect(() => {
    if (user && postStateValue.posts.length) getUserPostVotes();

    return () => {
      setPostStateValue((prev) => ({
        ...prev,
        postVotes: [],
      }));
    };
  }, [user, postStateValue.posts]);

  return (
    <PageContent>
      <>
        <ProfileTopBar />
        {loading ? (
          <PostLoader />
        ) : (
          <Stack>
            <>
              {postStateValue.posts.length > 0 ? (
                <>
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
                </>
              ) : (
                <NoPost />
              )}
            </>
          </Stack>
        )}
      </>
      <Stack spacing={5}>
        {user && <ProfileSide />}
        <Recommendation />
      </Stack>
    </PageContent>
  );
}

export default MainContainer;
