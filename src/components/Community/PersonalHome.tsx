import {
  Button,
  Flex,
  Icon,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { FaReddit } from "react-icons/fa";
import { useRecoilValue } from "recoil";

import CreateCommunityModel from "../Modal/CreateCommunity/CreateCommunityModel";
import { userState } from "../../atoms/userAtom";

const PersonalHome: React.FC = () => {
  const user = useRecoilValue(userState);
  const [open, setOpen] = useState(false);
  const bg = useColorModeValue("white", "#1A202C");
  const borderColor = useColorModeValue("gray.300", "#2D3748");

  return (
    <Flex
      direction="column"
      bg={bg}
      borderRadius="12px"
      border="1px solid"
      borderColor={borderColor}
      position="sticky"
      top="80px"
      boxShadow="card"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{
        boxShadow: "card-hover",
      }}
    >
      <CreateCommunityModel open={open} handleClose={() => setOpen(false)} />
      <Flex
        align="flex-end"
        color="white"
        p="12px 16px"
        bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        height="60px"
        fontWeight={600}
        bgImage="url(/images/sgf6r5easbh31.jpg)"
        backgroundSize="cover"
        backgroundPosition="center"
        position="relative"
        _before={{
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bg: "rgba(0, 0, 0, 0.3)",
        }}
      >
        <Text position="relative" zIndex={1} fontSize="16px" fontWeight={700}>
          Home
        </Text>
      </Flex>
      <Flex direction="column" p="16px">
        <Flex align="center" mb={4}>
          <Icon as={FaReddit} fontSize={40} color="brand.500" mr={3} />
          <Text fontWeight={700} fontSize="18px">
            Home
          </Text>
        </Flex>
        <Stack spacing={4}>
          <Text fontSize="14px" color={useColorModeValue("gray.600", "gray.400")} lineHeight="1.6">
            Your personal Reddit frontpage, built for you.
          </Text>
          <Button 
            height="40px"
            width="100%"
            fontSize="14px"
            fontWeight={600}
          >
            Create Post
          </Button>
          <Button
            disabled={!user}
            variant="outline"
            height="40px"
            width="100%"
            fontSize="14px"
            fontWeight={600}
            onClick={() => {
              setOpen(true);
            }}
            _disabled={{
              opacity: 0.5,
              cursor: "not-allowed",
            }}
          >
            Create Community
          </Button>
        </Stack>
      </Flex>
    </Flex>
  );
};
export default PersonalHome;
