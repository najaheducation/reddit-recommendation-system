import { atom } from "recoil";

export interface Community {
  id: string;
  creatorId: string;
  numberOfMembers: number;
  privacyType: "public" | "restricted" | "private";
  createdAt?: any; // date metadata
  imageURL?: string;
}

export interface CommunitySnippet {
  communityId: string;
  isModerator?: boolean;
  imageURL?: string;
  updateTimeStamp?: any; // last update timestamp
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
