import {
  Box,
  Button,
  Flex,
  Icon,
  Image,
  Skeleton,
  SkeletonCircle,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
// import { collection, getDocs, orderBy, query } from "firebase/firestore";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import { FaReddit } from "react-icons/fa";

import { Community } from "../../atoms/CommunitiesAtom";
// import { firestore } from "../../firebase/clientApp";
import useCommunityData from "../../hooks/useCommunityData";

const demoRecommendations: Community[] = [
  {
    id: "webdev",
    creatorId: "seed",
    numberOfMembers: 1200000,
    privacyType: "public",
    imageURL: "/images/recCommsArt.png",
  },
  {
    id: "reactjs",
    creatorId: "seed",
    numberOfMembers: 2500000,
    privacyType: "public",
    imageURL: "/images/redditFace.svg",
  },
  {
    id: "aww",
    creatorId: "seed",
    numberOfMembers: 34000000,
    privacyType: "public",
    imageURL: "/images/redditPersonalHome.png",
  },
  {
    id: "AskReddit",
    creatorId: "seed",
    numberOfMembers: 43000000,
    privacyType: "public",
    imageURL: "/images/header.png",
  },
];

const Recommendation: React.FC = () => {
  const [showAll, setShowAll] = useState<boolean>(false);
  const { communityStateValue, onJoinOrCommunity } = useCommunityData();
  const bg = useColorModeValue("white", "#1A202C");
  const borderColor = useColorModeValue("gray.300", "#2D3748");

  const visibleCommunities = useMemo(
    () => (showAll ? demoRecommendations : demoRecommendations.slice(0, 3)),
    [showAll]
  );

  return (
    <Flex
      direction="column"
      bg={bg}
      borderRadius={4}
      cursor="pointer"
      border="1px solid"
      borderColor={borderColor}
    >
      <Flex
        align="flex-end"
        color="white"
        p="6px 10px"
        bg="blue.500"
        height="70px"
        borderRadius="4px 4px 0px 0px"
        fontWeight={600}
        bgImage="url(/images/recCommsArt.png)"
        backgroundSize="cover"
        bgGradient="linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.75)),
        url('images/xw6wqhhjubh31.webp')"
      >
        Top Communities
      </Flex>
      <Flex direction="column">
        {visibleCommunities.length === 0 ? (
          <Stack mt={2} p={3}>
            <Flex justify="space-between" align="center">
              <SkeletonCircle size="10" />
              <Skeleton height="10px" width="70%" />
            </Flex>
            <Flex justify="space-between" align="center">
              <SkeletonCircle size="10" />
              <Skeleton height="10px" width="70%" />
            </Flex>
            <Flex justify="space-between" align="center">
              <SkeletonCircle size="10" />
              <Skeleton height="10px" width="70%" />
            </Flex>
          </Stack>
        ) : (
          <>
            {visibleCommunities.map((item, index) => {
              const isJoined = !!communityStateValue.mySnippets.find(
                (snippet) => snippet.communityId === item.id
              );
              return (
                <Link key={item.id} href={`/r/${item.id}`}>
                  <Flex
                    position="relative"
                    align="center"
                    fontSize="10pt"
                    borderBottom="1px solid"
                    borderColor={borderColor}
                    p="10px 12px"
                    fontWeight={600}
                  >
                    <Flex width="80%" align="center">
                      <Flex width="15%">
                        <Text mr={2}>{index + 1}</Text>
                      </Flex>
                      <Flex align="center" width="80%">
                        {item.imageURL ? (
                          <Image
                            borderRadius="full"
                            boxSize="28px"
                            src={item.imageURL}
                            mr={2}
                            alt={`${item.id} community`}
                          />
                        ) : (
                          <Icon
                            as={FaReddit}
                            fontSize={30}
                            color="brand.100"
                            mr={2}
                          />
                        )}
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >{`r/${item.id}`}</span>
                      </Flex>
                    </Flex>
                    <Box position="absolute" right="10px">
                      <Button
                        height="22px"
                        fontSize="8pt"
                        variant={isJoined ? "outline" : "solid"}
                        onClick={(event) => {
                          event.preventDefault();
                          onJoinOrCommunity(item, isJoined);
                        }}
                      >
                        {isJoined ? "Joined" : "Join"}
                      </Button>
                    </Box>
                  </Flex>
                </Link>
              );
            })}
            <Box p="10px 20px">
              <Button
                height="30px"
                width="100%"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll ? "Collapse Items" : "View All"}
              </Button>
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
};
export default Recommendation;
