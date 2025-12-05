import {
  Flex,
  Textarea,
  Button,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import React from "react";
import AuthButtons from "../../../Navbar/RightContent/AuthButtons";

type CommentInputProps = {
  commentText: string;
  setCommentText: (value: string) => void;
  user: { uid?: string | null; email?: string | null } | null;
  createLoading: boolean;
  onCreateComments: () => void;
};

const CommentInput: React.FC<CommentInputProps> = ({
  commentText,
  setCommentText,
  user,
  createLoading,
  onCreateComments,
}) => {
  const bg = useColorModeValue("white", "#1A202C");
  const bgBottom = useColorModeValue("gray.50", "#2D3748");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const hoverBorderColor = useColorModeValue("gray.300", "gray.500");
  const textColor = useColorModeValue("gray.700", "gray.300");

  return (
    <Flex direction="column" position="relative">
      {user ? (
        <>
          <Text mb={3} fontSize="14px" color={textColor} fontWeight={500}>
            Comment as{" "}
            <Text as="span" color="accent.500" fontWeight={600}>
              {user?.email?.split("@")[0]}
            </Text>
          </Text>
          <Textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="What are your thoughts?"
            fontSize="14px"
            borderRadius="8px"
            minHeight="120px"
            pb={14}
            border="2px solid"
            borderColor={borderColor}
            _placeholder={{ color: "gray.400" }}
            _focus={{
              outline: "none",
              bg: bg,
              borderColor: "accent.500",
              boxShadow: "0 0 0 1px var(--chakra-colors-accent-500)",
            }}
            _hover={{
              borderColor: hoverBorderColor,
            }}
            transition="all 0.2s"
          />
          <Flex
            position="absolute"
            left="2px"
            right="2px"
            bottom="2px"
            justify="flex-end"
            bg={bgBottom}
            p="8px 12px"
            borderRadius="0px 0px 6px 6px"
          >
            <Button
              size="sm"
              disabled={!commentText.length}
              isLoading={createLoading}
              onClick={() => onCreateComments()}
            >
              Comment
            </Button>
          </Flex>
        </>
      ) : (
        <Flex
          align="center"
          justify="space-between"
          borderRadius="8px"
          border="2px solid"
          borderColor={borderColor}
          p={6}
          bg={bg}
        >
          <Text fontWeight={600} fontSize="14px" color={textColor}>
            Log in or sign up to leave a comment
          </Text>
          <AuthButtons />
        </Flex>
      )}
    </Flex>
  );
};
export default CommentInput;
