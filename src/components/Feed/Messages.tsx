import { Flex, Stack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import SkeletonLoader from "../common/SkeletonLoader";
import MessageItems from "./MessageItems";

export interface MessageBody {
  id: string;
  communityId: string;
  senderId: string;
  senderImageUrl: string;
  senderName: string;
  senderEmail: any;
  messageBody: string;
  sendedAt: string;
}

type Props = {
  conversationId: string;
  user: { uid?: string | null } | null;
};

function Messages({ conversationId, user }: Props) {
  const [messageDetails, setMessageDetails] = useState<MessageBody[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setMessageDetails([]);
    setLoading(false);
  }, [conversationId, user]);

  return (
    <Flex direction="column" justify="flex-end" overflow="hidden">
      {loading ? (
        <Flex direction="column-reverse" overflow="scroll" height="100%">
          {messageDetails.map((message) => (
            <MessageItems
              key={message.id}
              message={message}
              userId={user?.uid.toString() as string}
            />
          ))}
        </Flex>
      ) : (
        <Stack spacing={4} px={4}>
          <SkeletonLoader count={7} height="60px" />
        </Stack>
      )}
    </Flex>
  );
}

export default Messages;
