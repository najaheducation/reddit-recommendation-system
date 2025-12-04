import { Box, Input, useColorModeValue } from "@chakra-ui/react";
import React, { useState } from "react";

type Props = {
  conversationId: string;
  user: { uid?: string | null } | null;
};

function MessageInput({ conversationId, user }: Props) {
  const [messageBody, setMessageBody] = useState("");
  const searchBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const searchBorder = useColorModeValue("gray.200", "#4A5568");

  const onSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    // Messaging disabled without Firebase; just clear input locally.
    setMessageBody("");
  };

  return (
    <Box px={4} py={6} width="100">
      <form onSubmit={onSendMessage}>
        <Input
          value={messageBody}
          onChange={(e) => setMessageBody(e.target.value)}
          size="md"
          placeholder="Message Chat Feedback"
          resize="none"
          _focus={{
            boxShadow: "none",
            border: "1px solid",
            borderColor: searchBorder,
          }}
          bg={searchBg}
          disabled={!user}
        />
      </form>
    </Box>
  );
}

export default MessageInput;
