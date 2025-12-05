import { Button, Flex, Icon, Stack, Text, Link } from "@chakra-ui/react";
import React, { useState } from "react";
import { useSetRecoilState } from "recoil";
import { authModelState } from "../../../atoms/authModalAtom";
import { BsDot, BsReddit } from "react-icons/bs";
import { useSendPasswordResetEmail } from "react-firebase-hooks/auth";
import { auth } from "../../../firebase/clientApp";
import { HiOutlineMail } from "react-icons/hi";
import InputField from "../../common/InputField";

/*
type ResetPasswordProps = {
    toggleView: (view: ModalView) => void;
};
*/

const ResetPassword: React.FC = () => {
  const setAuthModalState = useSetRecoilState(authModelState);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [sendPasswordResetEmail, sending, error] =
    useSendPasswordResetEmail(auth);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (email) {
      const res = await sendPasswordResetEmail(email);
      if (res) setSuccess(true);
    }
  };

  return (
    <Flex direction="column" alignItems="center" width="100%">
      <Icon as={BsReddit} color="brand.100" fontSize={40} mb={2} />
      <Text fontWeight={800} mb={2} fontSize="xl">
        Reset your password
      </Text>
      {success ? (
        <Text mb={4}>Check your email :)</Text>
      ) : (
        <form onSubmit={onSubmit} style={{ width: "100%" }}>
          <Stack spacing={3}>
            <Text fontSize="sm" textAlign="center" color="gray.500">
              Enter the email associated with your account and we’ll send you a reset link.
            </Text>
            <InputField
              id="reset-email"
              label="Email"
              type="email"
              value={email}
              onChange={(val) => setEmail(val)}
              placeholder="you@example.com"
              icon={HiOutlineMail}
              error={error?.message}
            />
            <Button width="100%" height="44px" type="submit" isLoading={sending}>
              Send reset link
            </Button>
          </Stack>
        </form>
      )}
      <Flex alignItems="center" fontSize="sm" mt={4} gap={2}>
        <Link
          color="brand.500"
          onClick={() =>
            setAuthModalState((prev) => ({
              ...prev,
              view: "login",
            }))
          }
        >
          Back to login
        </Link>
        <Icon as={BsDot} color="gray.400" />
        <Link
          color="gray.500"
          onClick={() =>
            setAuthModalState((prev) => ({
              ...prev,
              view: "signup",
            }))
          }
        >
          Create account
        </Link>
      </Flex>
    </Flex>
  );
};
export default ResetPassword;
