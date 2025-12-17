import { Button, Flex, Image, Text, useColorModeValue } from "@chakra-ui/react";
import React from "react";

const OAuthButtons: React.FC = () => {
  const hoverBg = useColorModeValue("gray.50", "#2A4365");

  const handleUnavailableClick = () => {
    // OAuth sign-in removed with Firebase; placeholder hook for future provider.
  };

  return (
    <Flex direction="column" width="100%" mb={4}>
      <Button
        variant="oauth"
        _hover={{ bg: hoverBg }}
        mb={2}
        isDisabled
        onClick={handleUnavailableClick}
      >
        <Image src="/images/googlelogo.png" height="20px" mr={4} />
        Google sign-in unavailable
      </Button>
      <Button variant="oauth" _hover={{ bg: hoverBg }} isDisabled>
        OAuth provider not configured
      </Button>
      <Text color="gray.400" fontSize="10pt" textAlign="center" mt={2}>
        OAuth sign-in is currently disabled now that Firebase was removed.
      </Text>
    </Flex>
  );
};
export default OAuthButtons;
