import {
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  Wrap,
  WrapItem,
  Tag,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { BsArrowUpRightCircle, BsChatDots } from "react-icons/bs";
import { GrAdd } from "react-icons/gr";
import {
  IoFilterCircleOutline,
  IoNotificationsOutline,
  IoVideocamOutline,
  IoBarChartOutline,
  IoHeartOutline,
} from "react-icons/io5";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userState } from "../../atoms/userAtom";
import { authModelState } from "../../atoms/authModalAtom";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "../../firebase/clientApp";

const animationKeyframes = keyframes`
  0% { transform: scale(1) rotate(0); border-radius: 20%; }
  25% { transform: scale(2) rotate(0); border-radius: 20%; }
  50% { transform: scale(2) rotate(270deg); border-radius: 50%; }
  75% { transform: scale(1) rotate(270deg); border-radius: 50%; }
  100% { transform: scale(1) rotate(0); border-radius: 20%; }
`;

const animation = `${animationKeyframes} 2s ease-in-out infinite`;

const Icons: React.FC = () => {
  const router = useRouter();
  const hoverBg = useColorModeValue("gray.200", "#2A4365");
  const user = useRecoilValue(userState);
  const setAuthModalState = useSetRecoilState(authModelState);
  const {
    isOpen: isInterestsOpen,
    onOpen: onInterestsOpen,
    onClose: onInterestsClose,
  } = useDisclosure();
  const [interests, setInterests] = useState<string[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const sampleInterests = ["Web Dev", "Gaming", "AI/ML", "Music", "Fitness"];

  const goToMetrics = () => {
    if (!user) {
      setAuthModalState({ open: true, view: "signup" });
      return;
    }
    router.push("/metrics");
  };

  const openInterests = async () => {
    if (!user) {
      setAuthModalState({ open: true, view: "signup" });
      return;
    }
    try {
      onInterestsOpen();
      setLoadingInterests(true);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("user_interests");
        if (cached) {
          try {
            setInterests(JSON.parse(cached));
          } catch {
            // ignore parse error
          }
        }
      }
      const snap = await getDoc(doc(firestore, "users", user.uid));
      const data = snap.data();
      setInterests((data?.interests as string[]) || []);
    } catch (err: any) {
      // gracefully fall back to cached/sample interests
    } finally {
      setLoadingInterests(false);
    }
  };

  return (
    <Flex>
      <Flex
        display={{ base: "none", md: "flex" }}
        align="center"
        borderRadius="1px solid"
        borderColor="gray.200"
      >
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
        >
          <Icon as={BsArrowUpRightCircle} fontSize={20} />
        </Flex>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
        >
          <Icon as={IoFilterCircleOutline} fontSize={22} />
        </Flex>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
          onClick={goToMetrics}
        >
          <Icon as={IoBarChartOutline} fontSize={22} />
        </Flex>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
          onClick={openInterests}
        >
          <Icon as={IoHeartOutline} fontSize={22} />
        </Flex>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
        >
          <Icon as={IoVideocamOutline} fontSize={22} />
        </Flex>
      </Flex>
      <>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
          onClick={() => router.push("/chat")}
          position="relative"
          bgGradient="linear(to-l, #7928CA, #FF0080)"
        >
          <Text
            position="absolute"
            top={-1}
            left={4}
            fontSize={10}
            as={motion.div}
            animation={animation}
          >
            New
          </Text>
          <Icon as={BsChatDots} fontSize={20} />
        </Flex>
        <Flex
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
        >
          <Icon as={IoNotificationsOutline} fontSize={20} />
        </Flex>
        <Flex
          display={{ base: "none", md: "flex" }}
          mr={1.5}
          ml={1.5}
          padding={1}
          cursor="pointer"
          borderRadius={4}
          _hover={{ bg: hoverBg }}
        >
          <Icon as={GrAdd} fontSize={20} />
        </Flex>
      </>
      <Modal isOpen={isInterestsOpen} onClose={onInterestsClose} size="md">
        <ModalOverlay />
        <ModalContent borderRadius="16px" overflow="hidden">
          <ModalHeader bgGradient="linear(to-r, teal.400, blue.500)" color="white">
            Your Interests
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py={5} px={4}>
            <Flex justify="center" align="center" minH="120px" position="relative">
              {loadingInterests && (
                <Flex
                  position="absolute"
                  inset={0}
                  align="center"
                  justify="center"
                  bg="rgba(0,0,0,0.05)"
                  borderRadius="12px"
                >
                  <Spinner />
                </Flex>
              )}
              <Wrap spacing={2} justify="center" zIndex={1}>
                {(interests.length ? interests : sampleInterests).map((interest) => (
                  <WrapItem key={interest}>
                    <Tag
                      size="lg"
                      variant="solid"
                      colorScheme={interests.length ? "blue" : "purple"}
                      borderRadius="full"
                      px={3}
                    >
                      {interest}
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            </Flex>
            {!interests.length && (
              <Text color="gray.500" textAlign="center" mt={3} fontSize="sm">
                Showing sample interests. Save yours from the signup flow.
              </Text>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
};
export default Icons;
