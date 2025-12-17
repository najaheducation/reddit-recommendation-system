import {
  Avatar,
  Box,
  Flex,
  Icon,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import CryptoJS from "crypto-js";
import moment from "moment";
import React, { useEffect, useState } from "react";
import {
  IoArrowDownCircleOutline,
  IoArrowUpCircleOutline,
} from "react-icons/io5";

export type Comment = {
  id?: string;
  creatorId: string;
  creatorDisplayText: string;
  creatorPhotoURL: string;
  communityId: string;
  postId: string;
  postTitle: string;
  text: string;
  createdAt: { seconds: number };
  score?: number | null;
  url?: string | null;
  postUrl?: string | null;
  parentId?: string | null;
  query?: string | null;
  keywords?: string[];
  commentDepth?: number | null;
  textFeatures?: Record<string, any> | null;
  createdUtc?: string | null;
  hasLinks?: boolean | null;
  hasMentions?: boolean | null;
};

type CommentItemProps = {
  comment: Comment;
  onDeleteComment: (comment: Comment) => void;
  isLoading: boolean;
  userId?: string;
};

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onDeleteComment,
  isLoading,
  userId,
}) => {
  const [decryptedData, setDecryptedData] = useState({
    text: "",
    creatorDisplayText: "",
  });

  useEffect(() => {
    const decryptValue = (value?: string | null) => {
      if (!value) return "";
      try {
        const bytes = CryptoJS.AES.decrypt(
          value,
          process.env.NEXT_PUBLIC_CRYPTO_SECRET_PASS as string
        );
        const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        return data || value;
      } catch {
        return value;
      }
    };

    setDecryptedData({
      text: decryptValue(comment.text),
      creatorDisplayText: decryptValue(comment.creatorDisplayText),
    });
  }, [comment]);

  const textColor = useColorModeValue("gray.700", "gray.300");
  const metaColor = useColorModeValue("gray.500", "gray.400");
  const hoverBg = useColorModeValue("gray.50", "gray.800");
  const showScore = typeof comment.score === "number";
  const isUrl = (value?: string | null) =>
    typeof value === "string" && /^https?:\/\//i.test(value);

  return (
    <Flex
      p={3}
      borderRadius="8px"
      _hover={{ bg: hoverBg }}
      transition="background-color 0.2s"
      mb={2}
    >
      <Box mr={3}>
        <Avatar
          src={comment.creatorPhotoURL}
          size="md"
          name={decryptedData.creatorDisplayText}
          border="2px solid"
          borderColor={useColorModeValue("gray.200", "gray.600")}
        />
      </Box>
      <Stack spacing={2} flex={1}>
        <Stack direction="row" align="center" fontSize="12px" spacing={2}>
          <Text fontWeight={600} color={textColor}>
            u/{decryptedData.creatorDisplayText}
          </Text>
          <Text color={metaColor} fontSize="11px">
            {moment(new Date(comment.createdAt?.seconds * 1000)).fromNow()}
          </Text>
          {showScore && (
            <Text color={metaColor} fontSize="11px">
              • {comment.score} points
            </Text>
          )}
          {isLoading && <Spinner size="sm" color="accent.500" />}
        </Stack>
        {isUrl(decryptedData.text) ? (
          <Text
            as="a"
            href={decryptedData.text}
            target="_blank"
            rel="noreferrer"
            fontSize="14px"
            color="blue.400"
            wordBreak="break-all"
          >
            {decryptedData.text}
          </Text>
        ) : (
          <Text fontSize="14px" color={textColor} lineHeight="1.6" wordBreak="break-word">
            {decryptedData.text}
          </Text>
        )}
        <Stack 
          direction="row" 
          align="center" 
          spacing={4}
          color={metaColor}
          fontSize="12px"
        >
          <Flex
            align="center"
            cursor="pointer"
            _hover={{ color: "brand.500" }}
            transition="color 0.2s"
          >
            <Icon as={IoArrowUpCircleOutline} mr={1} fontSize="16px" />
            <Text>Upvote</Text>
          </Flex>
          <Flex
            align="center"
            cursor="pointer"
            _hover={{ color: "accent.500" }}
            transition="color 0.2s"
          >
            <Icon as={IoArrowDownCircleOutline} mr={1} fontSize="16px" />
            <Text>Downvote</Text>
          </Flex>
          {userId === comment.creatorId && (
            <>
              <Text
                cursor="pointer"
                _hover={{ color: "accent.500" }}
                transition="color 0.2s"
                fontWeight={500}
              >
                Edit
              </Text>
              <Text
                cursor="pointer"
                _hover={{ color: "red.500" }}
                transition="color 0.2s"
                fontWeight={500}
                onClick={() => onDeleteComment(comment)}
              >
                Delete
              </Text>
            </>
          )}
        </Stack>
      </Stack>
    </Flex>
  );
};
export default CommentItem;
