import {
  Flex,
  Link,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { HiOutlineLockClosed, HiOutlineMail, HiOutlineUser } from "react-icons/hi";
import { useSetRecoilState } from "recoil";

import { authModelState } from "../../../atoms/authModalAtom";
import { userState } from "../../../atoms/userAtom";
import { registerUser } from "../../../utils/authClient";
import { saveUserCache } from "../../../utils/userCache";
import InputField from "../../common/InputField";
import PrimaryButton from "../../common/PrimaryButton";

const SignUp: React.FC = () => {
  const setAuthModelState = useSetRecoilState(authModelState);
  const setUser = useSetRecoilState(userState);
  const router = useRouter();
  const [signUpForm, setSignUpForm] = useState({
    email: "",
    username: "",
    password: "",
    conformPassword: "",
  });
  const [error, setError] = useState("");
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (error) setError("");

    if (signUpForm.password !== signUpForm.conformPassword) {
      setError("Passwords do not match");
      return;
    }

    if (signUpForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const user = await registerUser(
        signUpForm.email,
        signUpForm.username,
        signUpForm.password
      );
      setUser(user);
      saveUserCache(user);
      setAuthModelState((prev) => ({ ...prev, open: false }));
      toast({
        title: "Account created",
        description: "Welcome to Reddit Pulse",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      router.push(`/interests?uid=${user.uid}`);
    } catch (err: any) {
      const message = err?.message || "Something went wrong, please try again";
      setError(message);
      toast({
        title: "Signup failed",
        description: message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Stack spacing={4}>
        <InputField
          id="email"
          label="Email"
          type="email"
          value={signUpForm.email}
          onChange={(val) => setSignUpForm((prev) => ({ ...prev, email: val }))}
          placeholder="you@example.com"
          icon={HiOutlineMail}
        />
        <InputField
          id="username"
          label="Username"
          type="text"
          value={signUpForm.username}
          onChange={(val) => setSignUpForm((prev) => ({ ...prev, username: val }))}
          placeholder="your_username"
          icon={HiOutlineUser}
        />
        <InputField
          id="password"
          label="Password"
          type="password"
          value={signUpForm.password}
          onChange={(val) => setSignUpForm((prev) => ({ ...prev, password: val }))}
          placeholder="••••••••"
          icon={HiOutlineLockClosed}
        />
        <InputField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          value={signUpForm.conformPassword}
          onChange={(val) =>
            setSignUpForm((prev) => ({ ...prev, conformPassword: val }))
          }
          placeholder="••••••••"
          icon={HiOutlineLockClosed}
          error={error}
        />

        {error && (
          <Text textAlign="center" color="red.400" fontSize="sm">
            {error}
          </Text>
        )}
        <PrimaryButton
          width="100%"
          height="52px"
          type="submit"
          isLoading={loading}
        >
          Create account
        </PrimaryButton>
        <Flex justify="center" fontSize="sm" color="gray.500">
          <Text mr={2}>Already a member?</Text>
          <Link
            color="brand.500"
            fontWeight={700}
            onClick={() =>
              setAuthModelState((prev) => ({
                ...prev,
                view: "login",
              }))
            }
          >
            Log in
          </Link>
        </Flex>
      </Stack>
    </form>
  );
};
export default SignUp;
