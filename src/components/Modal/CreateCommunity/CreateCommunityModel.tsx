import {
  Box,
  Button,
  Checkbox,
  Flex,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { BsFillEyeFill, BsFillPersonFill } from "react-icons/bs";
import { HiLockClosed } from "react-icons/hi";

import useDirectory from "../../../hooks/useDirectory";

type CreateCommunityModelProps = {
  open: boolean;
  handleClose: () => void;
};

const CreateCommunityModel: React.FC<CreateCommunityModelProps> = ({ open, handleClose }) => {
  const [communityName, setCommunityName] = useState("");
  const [charsRemaining, setCharsRemaining] = useState(21);
  const [communityType, setCommunityType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toggleMenuOpen } = useDirectory();
  const bg = useColorModeValue("gray.50", "#1A202C");
  const textColor = useColorModeValue("gray.600", "gray.400");

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value;
    if (val.length > 21) return;
    setCommunityName(val);
    setCharsRemaining(21 - val.length);
  };

  const onCommunityTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCommunityType(event.target.name);
  };

  const handleCreateCommunity = () => {
    if (error) setError("");
    const format = /[ `!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?~]/;
    if (format.test(communityName) || communityName.length < 3) {
      return setError(
        "Community names must be between 3 and 21 characters, and can only contain letters, numbers, or underscores."
      );
    }
    setLoading(true);
    // Placeholder: hook into backend creation flow
    setTimeout(() => {
      setLoading(false);
      handleClose();
      toggleMenuOpen();
    }, 500);
  };

  return (
    <Modal isOpen={open} onClose={handleClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="18px" overflow="hidden">
        <ModalHeader>Create a community</ModalHeader>
        <ModalCloseButton />
        <ModalBody display="flex" flexDirection="column" gap={4}>
          <Text fontWeight={600}>Name</Text>
          <Text fontSize="sm" color={textColor}>
            Community names including capitalization cannot be changed.
          </Text>
          <Box position="relative">
            <Text
              position="absolute"
              color={textColor}
              left="0px"
              top="12px"
              ml={2}
            >
              r/
            </Text>
            <Input
              position="relative"
              value={communityName}
              onChange={handleChange}
              pl="32px"
              maxLength={21}
              bg={bg}
              borderRadius="10px"
              _focus={{ borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(30,136,255,0.2)" }}
            />
            <Text fontSize="9pt" color={communityName.length === 21 ? "red.500" : "gray.500"}>
              {charsRemaining} Characters remaining
            </Text>
            <Text fontSize="9pt" color="red.500" pt={1}>
              {error}
            </Text>
          </Box>

          <Box>
            <Text fontWeight={600} mb={2}>
              Community Type
            </Text>
            <Stack spacing={3}>
              <Checkbox
                name="public"
                isChecked={communityType === "public"}
                onChange={onCommunityTypeChange}
              >
                <Flex align="center">
                  <Icon as={BsFillPersonFill} color="gray.500" mr={2} />
                  <Text fontSize="10pt" mr={1}>
                    Public
                  </Text>
                  <Text fontSize="8pt" color="gray.500" pt={1}>
                    Anyone can view, post, and comment
                  </Text>
                </Flex>
              </Checkbox>
              <Checkbox
                name="restricted"
                isChecked={communityType === "restricted"}
                onChange={onCommunityTypeChange}
              >
                <Flex align="center">
                  <Icon as={BsFillEyeFill} color="gray.500" mr={2} />
                  <Text fontSize="10pt" mr={1}>
                    Restricted
                  </Text>
                  <Text fontSize="8pt" color="gray.500" pt={1}>
                    Anyone can view, only approved can post
                  </Text>
                </Flex>
              </Checkbox>
              <Checkbox
                name="private"
                isChecked={communityType === "private"}
                onChange={onCommunityTypeChange}
              >
                <Flex align="center">
                  <Icon as={HiLockClosed} color="gray.500" mr={2} />
                  <Text fontSize="10pt" mr={1}>
                    Private
                  </Text>
                  <Text fontSize="8pt" color="gray.500" pt={1}>
                    Only approved users can view and submit
                  </Text>
                </Flex>
              </Checkbox>
            </Stack>
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" height="30px" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button height="30px" onClick={handleCreateCommunity} isLoading={loading}>
            Create Community
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CreateCommunityModel;
