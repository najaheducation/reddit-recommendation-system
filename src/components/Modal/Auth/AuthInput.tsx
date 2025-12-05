import { Flex, Stack, Text, useColorModeValue } from "@chakra-ui/react";
import React from "react";
import { useRecoilValue } from "recoil";
import { authModelState } from "../../../atoms/authModalAtom";
import Login from "./Login";
import SignUp from "./SignUp";
import ResetPassword from "./ResetPassword";

const AuthInput: React.FC = () => {
  const modelState = useRecoilValue(authModelState);
  const cardBg = useColorModeValue("white", "rgba(255,255,255,0.04)");
  const border = useColorModeValue("transparent", "transparent");

  return (
    <Flex direction="column" align="center" width="100%" mt={4}>
      <Stack
        width="100%"
        spacing={5}
        border="1px solid"
        borderColor={border}
        bg={cardBg}
        borderRadius="20px"
        p={{ base: 7, md: 9 }}
        boxShadow="0 30px 90px -50px rgba(15,23,42,0.4)"
        backdropFilter="blur(8px)"
      >
        <Stack spacing={1} align="flex-start">
          <Text fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="0.12em">
            {modelState.view === "login"
              ? "Welcome back"
              : modelState.view === "signup"
              ? "Join the community"
              : "Reset access"}
          </Text>
          <Text fontSize="2xl" fontWeight={800} letterSpacing="-0.04em">
            {modelState.view === "login"
              ? "Sign in to Reddit Pulse"
              : modelState.view === "signup"
              ? "Create your account"
              : "Forgot your password"}
          </Text>
        </Stack>
        {modelState.view === "login" && <Login />}
        {modelState.view === "signup" && <SignUp />}
        {modelState.view === "resetPassword" && <ResetPassword />}
      </Stack>
    </Flex>
  );
};
export default AuthInput;
