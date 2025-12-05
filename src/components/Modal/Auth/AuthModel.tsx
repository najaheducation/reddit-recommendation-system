import { Flex, Modal, ModalBody, ModalContent, ModalOverlay } from "@chakra-ui/react";
import React, { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState } from "recoil";
import { motion } from "framer-motion";

import { authModelState } from "../../../atoms/authModalAtom";
import { auth } from "../../../firebase/clientApp";
import AuthInput from "./AuthInput";
import ResetPassword from "./ResetPassword";

const AuthModel: React.FC = () => {
  const [modelState, setModelState] = useRecoilState(authModelState);
  const [user] = useAuthState(auth);

  const handleClose = () => {
    setModelState((prev) => ({
      ...prev,
      open: false,
    }));
  };

  useEffect(() => {
    // Keep modal open after signup to allow post-registration flows (e.g., interests).
  }, [user]);

  const MotionContent = motion(ModalContent);

  return (
    <Modal isOpen={modelState.open} onClose={handleClose} size="xl" isCentered>
      <ModalOverlay bg="rgba(10,12,20,0.55)" backdropFilter="blur(12px)" />
      <MotionContent
        borderRadius="22px"
        overflow="hidden"
        bg="white"
        _dark={{ bg: "rgba(255,255,255,0.04)" }}
        boxShadow="0 40px 160px -70px rgba(15,23,42,0.5)"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        maxW="650px"
        border="none"
      >
        <ModalBody
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          p={{ base: 8, md: 12 }}
        >
          <Flex
            direction="column"
            align="center"
            justify="center"
            width={{ base: "100%", md: "80%" }}
            gap={3}
          >
            {modelState.view === "login" || modelState.view === "signup" ? (
              <AuthInput />
            ) : (
              <ResetPassword />
            )}
          </Flex>
        </ModalBody>
      </MotionContent>
    </Modal>
  );
};

export default AuthModel;
