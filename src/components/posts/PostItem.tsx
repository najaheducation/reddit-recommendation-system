import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Flex,
  Icon,
  Image,
  Skeleton,
  Spinner,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import CryptoJS from "crypto-js";
import moment from "moment";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { AiOutlineDelete } from "react-icons/ai";
import { BsChat, BsDot } from "react-icons/bs";
import { FaReddit } from "react-icons/fa";
import {
  IoArrowDownCircleOutline,
  IoArrowDownCircleSharp,
  IoArrowRedoOutline,
  IoArrowUpCircleOutline,
  IoArrowUpCircleSharp,
  IoBookmarkOutline,
} from "react-icons/io5";

import { Post } from "../../atoms/PostAtom";

type PostItemProps = {
  post: Post;
  userIsCreator: boolean;
  userVoteValue?: number;
  onVote: (
    event: React.MouseEvent<Element, MouseEvent>,
    post: Post,
    vote: number,
    communityId: string
  ) => void;
  onDeletePost: (post: Post) => Promise<boolean>;
  onSelectPost?: (post: Post) => void;
  homePage?: boolean;
};

const PostItem: React.FC<PostItemProps> = ({
  post,
  userIsCreator,
  userVoteValue,
  onVote,
  onDeletePost,
  onSelectPost,
  homePage,
}) => {
  const [loadingImage, setLoadingImage] = useState<boolean>(Boolean(post.imageURL));
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [error, setError] = useState(false);
  const [decryptedData, setDecryptedData] = useState({
    title: "",
    body: "",
    creatorDisplayName: "",
    imageURL: "",
    topic: "",
  });
  const singlePostPage = !onSelectPost;
  const router = useRouter();
  const toast = useToast();
  const displayTopic = decryptedData.topic || post.topic;

  // Theme colors
  const bg = useColorModeValue("white", "rgba(255,255,255,0.04)");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const hoverBorderColor = useColorModeValue("brand.100", "whiteAlpha.300");
  const singlePageBorderColor = useColorModeValue("white", "rgba(255,255,255,0.06)");
  const voteLineBorderColor = useColorModeValue("gray.50", "whiteAlpha.50");
  const IconHoverBg = useColorModeValue("gray.100", "whiteAlpha.100");
  const IconBg = useColorModeValue("gray.500", "#A0AEC0");
  const voteIconBg = useColorModeValue("gray.500", "#CBD5E0");
  const communityImageBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const communityTextColor = useColorModeValue("gray.700", "gray.200");
  const metaTextColor = useColorModeValue("gray.600", "gray.400");
  const titleColor = useColorModeValue("#0F172A", "white");
  const bodyTextColor = useColorModeValue("gray.700", "gray.300");
  const finalScoreText =
    typeof post.finalScore === "number" && Number.isFinite(post.finalScore)
      ? post.finalScore.toFixed(3)
      : null;

  const handleDelete = async (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    setLoadingDelete(true);
    try {
      const success = await onDeletePost(post);
      if (!success) throw new Error("Failed to Delete Post");
      if (singlePostPage) router.push(`/r/${post.communityId}`);
    } catch (err: any) {
      setError(err.message);
    }
    setLoadingDelete(false);
  };

  const handleShare = async (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.stopPropagation();
    const postUrl = `${window.location.origin}/r/${post.communityId}/comments/${post.id}`;
    const shareData = {
      title: decryptedData.title || "Reddit Post",
      text: decryptedData.body || "Check out this post",
      url: postUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({ title: "Shared successfully", status: "success", duration: 2000, isClosable: true });
      } else {
        await navigator.clipboard.writeText(postUrl);
        toast({ title: "Link copied to clipboard", status: "success", duration: 2000, isClosable: true });
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(postUrl);
          toast({ title: "Link copied to clipboard", status: "success", duration: 2000, isClosable: true });
        } catch {
          toast({
            title: "Failed to share",
            description: "Please copy the link manually",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        }
      }
    }
  };

  useEffect(() => {
    const decryptValue = (value?: string | null) => {
      if (!value) return "";
      try {
        const bytes = CryptoJS.AES.decrypt(value, process.env.NEXT_PUBLIC_CRYPTO_SECRET_PASS as string);
        const data = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        return data || value;
      } catch (_err) {
        return value;
      }
    };

    setDecryptedData({
      title: decryptValue(post.title),
      body: decryptValue(post.body),
      creatorDisplayName: decryptValue(post.creatorDisplayName),
      imageURL: decryptValue(post.imageURL),
      topic: decryptValue(post.topic),
    });
    setLoadingImage(Boolean(post.imageURL));
  }, [post]);

  const VoteColumn = () => (
    <Flex
      direction="column"
      align="center"
      bg={singlePostPage ? "none" : voteLineBorderColor}
      p={3}
      width="64px"
      borderRight={singlePostPage ? "none" : "1px solid"}
      borderColor={singlePostPage ? "transparent" : borderColor}
      borderRadius={singlePostPage ? "0" : "18px 0px 0px 18px"}
      gap={2}
    >
      <Icon
        as={userVoteValue === 1 ? IoArrowUpCircleSharp : IoArrowUpCircleOutline}
        color={userVoteValue === 1 ? "brand.500" : voteIconBg}
        fontSize={24}
        onClick={(event) => onVote(event, post, 1, post.communityId)}
        cursor="pointer"
        _hover={{ color: "brand.500", transform: "scale(1.1)" }}
        transition="all 0.2s"
      />
      <Text fontSize="12px" fontWeight={700} color={voteIconBg} minW="24px" textAlign="center">
        {post.voteStatus}
      </Text>
      <Icon
        as={userVoteValue === -1 ? IoArrowDownCircleSharp : IoArrowDownCircleOutline}
        color={userVoteValue === -1 ? "accent.500" : voteIconBg}
        fontSize={24}
        onClick={(event) => onVote(event, post, -1, post.communityId)}
        cursor="pointer"
        _hover={{ color: "accent.500", transform: "scale(1.1)" }}
        transition="all 0.2s"
      />
    </Flex>
  );

  const PostHeader = () => (
    <Flex align="center" gap={3} mb={1} flexWrap="wrap">
      <Flex
        align="center"
        justify="center"
        w="36px"
        h="36px"
        borderRadius="full"
        border="1px solid"
        borderColor={communityImageBorder}
        bg={useColorModeValue("white", "whiteAlpha.100")}
      >
        {post.communityImageURL ? (
          <Image src={post.communityImageURL} borderRadius="full" boxSize="30px" alt={post.communityId} />
        ) : (
          <Icon as={FaReddit} fontSize={22} color="brand.500" />
        )}
      </Flex>
      <Stack spacing={0}>
        <Flex align="center" gap={1.5} flexWrap="wrap">
          <Text fontWeight={800} color={communityTextColor}>
            r/{post.communityId}
          </Text>
          <BsDot color={metaTextColor as string} />
          <Text color={metaTextColor} fontSize="sm">
            Posted by u/{decryptedData.creatorDisplayName || post.creatorDisplayName} •{" "}
            {moment(new Date(post.createdAt?.seconds * 1000)).fromNow()}
          </Text>
          {displayTopic && (
            <>
              <BsDot color={metaTextColor as string} />
              <Badge colorScheme="blue" variant="subtle" borderRadius="full" px={2}>
                Topic: {displayTopic}
              </Badge>
            </>
          )}
          {finalScoreText && (
            <>
              <BsDot color={metaTextColor as string} />
              <Badge colorScheme="teal" variant="subtle" borderRadius="full" px={2}>
                Score: {finalScoreText}
              </Badge>
            </>
          )}
        </Flex>
      </Stack>
    </Flex>
  );

  const PostImage = () => {
    if (!decryptedData.imageURL) return null;

    return (
      <Box borderRadius="14px" overflow="hidden" border="1px solid" borderColor={borderColor}>
        {loadingImage && (
          <Skeleton height="320px" width="100%" startColor="gray.100" endColor="gray.200" borderRadius="14px" />
        )}
        <Image
          src={decryptedData.imageURL}
          alt={decryptedData.title}
          maxHeight="460px"
          width="100%"
          objectFit="cover"
          display={loadingImage ? "none" : "block"}
          onLoad={() => setLoadingImage(false)}
          borderRadius="14px"
          boxShadow="md"
        />
      </Box>
    );
  };

  const PostActions = () => (
    <Flex
      align="center"
      gap={3}
      mt={3}
      pt={3}
      borderTop="1px solid"
      borderColor={borderColor}
      fontWeight={600}
      color={metaTextColor}
      fontSize="sm"
      flexWrap="wrap"
    >
      <Flex align="center" gap={2} px={3} py={2} borderRadius="12px" _hover={{ bg: IconHoverBg }} transition="all 0.2s ease">
        <Icon as={BsChat} fontSize={18} />
        <Text>{post.numberOfComments || 0}</Text>
      </Flex>
      <Flex
        align="center"
        gap={2}
        px={3}
        py={2}
        borderRadius="12px"
        _hover={{ bg: IconHoverBg }}
        transition="all 0.2s ease"
        onClick={handleShare}
      >
        <Icon as={IoArrowRedoOutline} fontSize={18} />
        <Text>Share</Text>
      </Flex>
      <Flex align="center" gap={2} px={3} py={2} borderRadius="12px" _hover={{ bg: IconHoverBg }} transition="all 0.2s ease">
        <Icon as={IoBookmarkOutline} fontSize={18} />
        <Text>Save</Text>
      </Flex>
      {userIsCreator && (
        <Flex
          align="center"
          gap={2}
          px={3}
          py={2}
          borderRadius="12px"
          _hover={{ bg: IconHoverBg }}
          transition="all 0.2s ease"
          onClick={handleDelete}
        >
          {loadingDelete ? (
            <Spinner size="sm" />
          ) : (
            <>
              <Icon as={AiOutlineDelete} fontSize={18} />
              <Text>Delete</Text>
            </>
          )}
        </Flex>
      )}
    </Flex>
  );

  return (
    <Flex
      border="1px solid"
      bg={bg}
      borderColor={singlePostPage ? singlePageBorderColor : borderColor}
      borderRadius="18px"
      boxShadow={singlePostPage ? "none" : "xl"}
      backdropFilter={singlePostPage ? "none" : "blur(10px)"}
      _hover={{
        borderColor: singlePostPage ? "none" : hoverBorderColor,
        boxShadow: singlePostPage ? "none" : "2xl",
        transform: singlePostPage ? "none" : "translateY(-3px)",
      }}
      cursor={singlePostPage ? "unset" : "pointer"}
      onClick={() => onSelectPost && onSelectPost(post)}
      transition="all 0.2s ease-in-out"
      mb={4}
      overflow="hidden"
    >
      <VoteColumn />
      <Flex direction="column" width="100%" p={{ base: 4, md: 5 }} gap={3}>
        <PostHeader />
        <Text fontSize="18px" fontWeight={800} color={titleColor} lineHeight="1.3">
          {decryptedData.title}
        </Text>
        {decryptedData.body && (
          <Text fontSize="15px" color={bodyTextColor} lineHeight="1.6">
            {decryptedData.body}
          </Text>
        )}
        <PostImage />

        {error && (
          <Alert status="error">
            <AlertIcon />
            <Text mr={2}>Error deleting post</Text>
          </Alert>
        )}

        <PostActions />
      </Flex>
    </Flex>
  );
};

export default PostItem;
