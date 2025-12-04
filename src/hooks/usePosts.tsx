import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { CommunityState } from "../atoms/CommunitiesAtom";
import { Post, postState, PostVote } from "../atoms/PostAtom";

const usePosts = () => {
  const [postStateValue, setPostStateValue] = useRecoilState(postState);
  const router = useRouter();
  const currentCommunity = useRecoilValue(CommunityState).currentCommunity;
  const onVote = async (
    event: React.MouseEvent<Element, MouseEvent>,
    post: Post,
    vote: number,
    communityId: string
  ) => {
    event.stopPropagation();
    try {
      const { voteStatus } = post;
      const exitingVote = postStateValue.postVotes.find(
        (vote) => vote.postId === post.id
      );
      const updatedPost = { ...post };
      const updatedPosts = [...postStateValue.posts];
      let updatedPostVotes = [...postStateValue.postVotes];
      let voteChange = vote;

      // new vote
      if (!exitingVote) {
        // create a new postVote Document
        const newVote: PostVote = {
          id: `${post.id}-vote`,
          postId: post.id!,
          communityId,
          voteValue: vote,
        };

        updatedPost.voteStatus = voteStatus + vote;
        // Update userUpvote based on vote value
        updatedPost.userUpvote = vote === 1;
        updatedPostVotes = [...updatedPostVotes, newVote];
      } else {
        if (exitingVote.voteValue === vote) {
          voteChange *= -1;
          updatedPost.voteStatus = voteStatus - vote;
          // Remove upvote status when unvoting
          updatedPost.userUpvote = false;
          updatedPostVotes = updatedPostVotes.filter(
            (vote) => vote.id !== exitingVote.id
          );

        } else {
          voteChange = 2 * vote;
          updatedPost.voteStatus = voteStatus + 2 * vote;
          // Update userUpvote based on new vote value
          updatedPost.userUpvote = vote === 1;

          const voteIdx = postStateValue.postVotes.findIndex(
            (vote) => vote.id === exitingVote.id
          );

          if (voteIdx !== -1) {
            updatedPostVotes[voteIdx] = {
              ...exitingVote,
              voteValue: vote,
            };
          }
        }
      }

      const postIdx = postStateValue.posts.findIndex(
        (item) => item.id === post.id
      );

      updatedPosts[postIdx] = updatedPost;

      setPostStateValue((prev) => ({
        ...prev,
        posts: updatedPosts,
        postVotes: updatedPostVotes,
      }));

      if (postStateValue.selectedPost) {
        setPostStateValue((prev) => ({
          ...prev,
          selectedPost: updatedPost,
        }));
      }

    } catch (error) {
      console.log("onVote Error", error);
    }
  };

  const onSelectPost = (post: Post) => {
    setPostStateValue((prev) => ({
      ...prev,
      selectedPost: post,
    }));
    router.push(`/r/${post.communityId}/comments/${post.id}`);
  };

  const onDeletePost = async (post: Post): Promise<boolean> => {
    try {
      setPostStateValue((prev) => ({
        ...prev,
        posts: prev.posts.filter((item) => item.id !== post.id),
      }));

      return true;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    // Clear votes when community changes to keep state in sync locally.
    if (!currentCommunity?.id) {
      setPostStateValue((prev) => ({ ...prev, postVotes: [] }));
    }
  }, [currentCommunity, setPostStateValue]);

  return {
    postStateValue,
    setPostStateValue,
    onVote,
    onSelectPost,
    onDeletePost,
  };
};

export default usePosts;
