import { atom } from "recoil";

export type Post = {
  id?: string;
  communityId: string;
  creatorId: string;
  creatorDisplayName: string;
  title: string;
  body: string;
  topic?: string;
  numberOfComments: number;
  voteStatus: number;
  imageURL?: string;
  communityImageURL?: string;
  createdAt: any; // date metadata
  score?: number; // Calculated score for the post
  finalScore?: number; // Personalized final score
  userUpvote?: boolean; // Indicates whether the user upvoted the item
  userCommented?: boolean; // Indicates whether the user wrote a comment
};

export type PostVote = {
  id: string;
  postId: string;
  communityId: string;
  voteValue: number;
};

interface PostState {
  selectedPost: Post | null;
  posts: Post[];
  postVotes: PostVote[];
}

const defaultPostState: PostState = {
  selectedPost: null,
  posts: [],
  postVotes: [],
};

export const postState = atom<PostState>({
  key: "PostState",
  default: defaultPostState,
});
