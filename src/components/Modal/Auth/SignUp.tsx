import {
  Flex,
  Link,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useState } from "react";
import { useCreateUserWithEmailAndPassword } from "react-firebase-hooks/auth";
import { HiOutlineLockClosed, HiOutlineMail } from "react-icons/hi";
import { useSetRecoilState } from "recoil";

import { authModelState } from "../../../atoms/authModalAtom";
import { auth, firestore } from "../../../firebase/clientApp";
import { FIREBASE_ERRORS } from "../../../firebase/errors";
import InputField from "../../common/InputField";
import PrimaryButton from "../../common/PrimaryButton";

const SignUp: React.FC = () => {
  const setAuthModelState = useSetRecoilState(authModelState);
  const router = useRouter();
  const [signUpForm, setSignUpForm] = useState({
    email: "",
    password: "",
    conformPassword: "",
  });
  const [error, setError] = useState("");
  const toast = useToast();
  const [createUserWithEmailAndPassword, userCred, loading, userError] =
    useCreateUserWithEmailAndPassword(auth);

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

    const res = await createUserWithEmailAndPassword(
      signUpForm.email,
      signUpForm.password
    );
    if (res) {
      setAuthModelState((prev) => ({ ...prev, open: false }));
      toast({
        title: "Account created",
        description: "Welcome to Reddit Pulse",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const saveUserData = useCallback(
    async (user: User) => {
      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        createdAt: new Date(),
      });
    },
    []
  );

  useEffect(() => {
    if (userError) {
      const message =
        FIREBASE_ERRORS[userError?.message as keyof typeof FIREBASE_ERRORS] ||
        "Something went wrong, please try again";
      setError(message);
    }
  }, [userError]);

  useEffect(() => {
    if (userCred) {
      saveUserData(userCred.user);
      setAuthModelState((prev) => ({ ...prev, open: false }));
      router.push(`/interests?uid=${userCred.user.uid}`);
    }
  }, [router, saveUserData, setAuthModelState, userCred]);

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
        <PrimaryButton width="100%" height="52px" type="submit" isLoading={loading}>
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
