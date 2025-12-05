import {
  Box,
  Flex,
  Image,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";

import { Community } from "../../atoms/CommunitiesAtom";
import { userState } from "../../atoms/userAtom";
import SkeletonLoader from "../common/SkeletonLoader";
import ConversationsList from "./ConversationsList";

export interface ChatUser {
  apiKey: string;
  appName: string;
  createdAt: string;
  email: string;
  emailVerified: boolean;
  id: string;
  isAnonymous: boolean;
  lastLoginAt: string;
  providerData: any[];
  stsTokenManager: any[];
  uid: string;
  photoURL: string;
  displayName: string;
  updatedAt: string;
}

type Props = {};

function ConversationsWrapper({}: Props) {
  const router = useRouter();
  const {
    query: { userInCommunities },
  } = router;
  const user = useRecoilValue(userState);
  const [chatUsers, setChatUser] = useState<Community[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const bg = useColorModeValue("whiteAlpha.500", "whiteAlpha.100");

  const getChatUser = async (userId: any) => {
    setChatUser([]);
  };

  useEffect(() => {
    getChatUser(user?.uid);
  }, [user]);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  });

  return (
    <Box
      width={{ base: "100%", md: "430px" }}
      bg={bg}
      flexDirection="column"
      gap={4}
      py={6}
      px={3}
      display={{ base: userInCommunities ? "none" : "flex", md: "flex" }}
    >
      {loading ? (
        <SkeletonLoader count={10} height="80px" width="370px" />
      ) : (
        <>
          {chatUsers.length > 0 ? (
            <ConversationsList chatUsers={chatUsers} />
          ) : (
            <Flex justify="center" pt="50px">
              <Stack spacing={5}>
                <Image
                  src="/images/not-found-512.webp"
                  height="200px"
                  alt="No Communities"
                />
                <Text
                  fontSize="15pt"
                  color="gray.500"
                  fontWeight="bold"
                  textAlign="center"
                >
                  No Communities Yet!
                </Text>
              </Stack>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
}

export default ConversationsWrapper;
