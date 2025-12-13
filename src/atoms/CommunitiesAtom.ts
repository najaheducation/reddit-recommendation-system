// import { Timestamp } from "firebase/firestore";
import { atom } from "recoil";

export interface Community {
  id: string;
  creatorId: string;
  numberOfMembers: number;
  privacyType: "public" | "restricted" | "private";
  createdAt?: any; // Timestamp;
  imageURL?: string;
}

export interface CommunitySnippet {
  communityId: string;
  isModerator?: boolean;
  imageURL?: string;
  updateTimeStamp?: any; // Timestamp;
}

interface CommunityState {
  mySnippets: CommunitySnippet[];
  currentCommunity?: Community;
  snippetsFetched: boolean;
}

export const defaultCommunityState: CommunityState = {
  mySnippets: [],
  snippetsFetched: false,
};

const globalForCommunity = globalThis as typeof globalThis & {
  __communityState?: ReturnType<typeof atom<CommunityState>>;
};

export const CommunityState =
  globalForCommunity.__communityState ||
  (globalForCommunity.__communityState = atom<CommunityState>({
    key: "communityState",
    default: defaultCommunityState,
  }));
