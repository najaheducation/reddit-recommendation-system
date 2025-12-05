import { Button } from "@chakra-ui/react";
import React from "react";
import { useSetRecoilState } from "recoil";
import { authModelState } from "../../atoms/authModalAtom";

const AuthButtons: React.FC = () => {
  const setAuthModelState = useSetRecoilState(authModelState);

  return (
    <>
      <Button
        variant="outline"
        height="36px"
        display={{ base: "none", sm: "flex" }}
        width={{ base: "80px", md: "110px" }}
        mr={2}
        onClick={() => setAuthModelState({ open: true, view: "login" })}
      >
        Log In
      </Button>
      <Button
        variant="solid"
        height="36px"
        display={{ base: "none", sm: "flex" }}
        width={{ base: "80px", md: "110px" }}
        mr={2}
        onClick={() => setAuthModelState({ open: true, view: "signup" })}
      >
        Sign Up
      </Button>
    </>
  );
};
export default AuthButtons;
