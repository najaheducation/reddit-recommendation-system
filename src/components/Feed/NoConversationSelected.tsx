import { Flex, Stack, Text } from "@chakra-ui/react";
import { IoLogoReddit } from "react-icons/io5";

type Props = {
  user?: { uid?: string | null } | null;
};

function NoConversationSelected({ user }: Props) {
  return (
    <Flex height="100%" justify="center" align="center">
      <Stack spacing={10} align="center">
        <Text fontSize={40}>
          {user ? "Select a Conversation" : "You Need To Login"}
        </Text>
        <IoLogoReddit fontSize={90} />
      </Stack>
    </Flex>
  );
}

export default NoConversationSelected;
