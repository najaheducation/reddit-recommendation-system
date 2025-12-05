import { Flex, Link, Stack, Text, useToast } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { HiOutlineLockClosed, HiOutlineMail } from "react-icons/hi";
import { useSetRecoilState } from "recoil";

import { authModelState } from "../../../atoms/authModalAtom";
import { auth } from "../../../firebase/clientApp";
import { FIREBASE_ERRORS } from "../../../firebase/errors";
import InputField from "../../common/InputField";
import PrimaryButton from "../../common/PrimaryButton";

const Login: React.FC = () => {
  const [signInWithEmailAndPassword, userCred, loading, hookError] =
    useSignInWithEmailAndPassword(auth);
  const setAuthModelState = useSetRecoilState(authModelState);
  const toast = useToast();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const res = await signInWithEmailAndPassword(
        loginForm.email,
        loginForm.password
      );
      if (res) {
        setAuthModelState((prev) => ({ ...prev, open: false }));
        toast({
          title: "Logged in successfully",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (err: any) {
      const message =
        FIREBASE_ERRORS[err?.message as keyof typeof FIREBASE_ERRORS] ||
        err?.message ||
        "Invalid email or password";
      setError(message);
      toast({
        title: "Login failed",
        description: message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    if (hookError) {
      const message =
        FIREBASE_ERRORS[hookError?.message as keyof typeof FIREBASE_ERRORS] ||
        hookError.message;
      setError(message);
    }
  }, [hookError]);

  useEffect(() => {
    if (userCred) {
      setAuthModelState((prev) => ({ ...prev, open: false }));
    }
  }, [setAuthModelState, userCred]);

  return (
    <form onSubmit={onSubmit}>
      <Stack spacing={5}>
        <InputField
          id="email"
          label="Email"
          type="email"
          value={loginForm.email}
          onChange={(val) => setLoginForm((prev) => ({ ...prev, email: val }))}
          placeholder="you@example.com"
          icon={HiOutlineMail}
        />
        <InputField
          id="password"
          label="Password"
          type="password"
          value={loginForm.password}
          onChange={(val) => setLoginForm((prev) => ({ ...prev, password: val }))}
          placeholder="••••••••"
          icon={HiOutlineLockClosed}
          error={error}
        />
        <Flex justify="space-between" align="center" fontSize="sm">
          <Link
            color="brand.500"
            onClick={() =>
              setAuthModelState((prev) => ({
                ...prev,
                view: "resetPassword",
              }))
            }
          >
            Forgot password?
          </Link>
          <Link
            color="gray.500"
            onClick={() =>
              setAuthModelState((prev) => ({
                ...prev,
                view: "signup",
              }))
            }
          >
            Create account
          </Link>
        </Flex>
        <PrimaryButton
          width="100%"
          height="52px"
          type="submit"
          isLoading={loading}
          fontWeight={800}
          mt={2}
        >
          Log In
        </PrimaryButton>
      </Stack>
    </form>
  );
};

export default Login;
