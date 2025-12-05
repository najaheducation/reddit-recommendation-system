import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { authModelState } from "../atoms/authModalAtom";
import { userState } from "../atoms/userAtom";
import {
  Community,
  CommunityState,
  CommunitySnippet,
} from "../atoms/CommunitiesAtom";

const useCommunityData = () => {
  const user = useRecoilValue(userState);
  const router = useRouter();
  const setAuthModelState = useSetRecoilState(authModelState);
  const [communityStateValue, setCommunityStateValue] =
    useRecoilState(CommunityState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onJoinOrCommunity = (communityData: Community, isJoined: boolean) => {
    if (!user) {
      setAuthModelState({ open: true, view: "login" });
      return;
    }

    if (isJoined) {
      leaveCommunity(communityData.id);
      return;
    }
    joinCommunity(communityData);
  };

  const getMySnippets = async () => {
    setLoading(false);
    setCommunityStateValue((prev) => ({
      ...prev,
      mySnippets: [],
      snippetsFetched: true,
    }));
  };

  const getCommunityData = async (communityId: string) => {
    setCommunityStateValue((prev) => ({
      ...prev,
      currentCommunity: {
        id: communityId,
        imageURL: "",
        creatorId: "",
        numberOfMembers: 0,
        privacyType: "public",
        createdAt: "" as any,
      } as Community,
    }));
  };

  useEffect(() => {
    if (!user) {
      setCommunityStateValue((prev) => ({
        ...prev,
        mySnippets: [],
        snippetsFetched: false,
      }));
      return;
    }
    getMySnippets();
  }, [user]);

  useEffect(() => {
    const { communityId } = router.query;

    if (communityId && !communityStateValue.currentCommunity) {
      getCommunityData(communityId as string);
    }
  }, [router.query, communityStateValue.currentCommunity]);

  const joinCommunity = async (communityData: Community) => {
    setLoading(false);
  };

  const updateCommunitySnippet = async (
    communityData: Community,
    userId: string
  ) => {
    return;
  };

  const leaveCommunity = async (communityId: string) => {
    setLoading(false);
  };

  return {
    communityStateValue,
    onJoinOrCommunity,
    loading,
  };
};
export default useCommunityData;
