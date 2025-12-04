import { Flex, Image, Stack, Text } from "@chakra-ui/react";
import React from "react";

type Props = {};

function NoPost({}: Props) {
  return (
    <Flex justify="center" pt="50px">
      <Stack spacing={5}>
        <Image
          src="/images/not-found-512.webp"
          height="200px"
          alt="No Post"
        />
        <Text
          fontSize="20pt"
          color="gray.500"
          fontWeight="bold"
          textAlign="center"
        >
          No Post Yet!
        </Text>
      </Stack>
    </Flex>
  );
}

export default NoPost;
