import {
  Box,
  Flex,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import React from "react";

export type InterestCardProps = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onToggle: () => void;
};

const MotionBox = motion(Box);

const InterestCard: React.FC<InterestCardProps> = ({
  title,
  subtitle,
  selected,
  onToggle,
}) => {
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const bg = useColorModeValue("white", "rgba(255,255,255,0.04)");
  const selectedBg = useColorModeValue("brand.50", "whiteAlpha.100");

  return (
    <MotionBox
      role="button"
      onClick={onToggle}
      border="1px solid"
      borderColor={selected ? "brand.300" : border}
      borderRadius="16px"
      bg={selected ? selectedBg : bg}
      p={4}
      cursor="pointer"
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
      boxShadow={selected ? "xl" : "md"}
    >
      <Stack spacing={2}>
        <Flex align="center" justify="space-between">
          <Text fontWeight={800} fontSize="lg" letterSpacing="-0.02em">
            {title}
          </Text>
          <Box
            w="10px"
            h="10px"
            borderRadius="full"
            bg={selected ? "brand.400" : "gray.300"}
            boxShadow={selected ? "0 0 0 6px rgba(30,136,255,0.18)" : "none"}
          />
        </Flex>
        {subtitle && (
          <Text fontSize="sm" color="gray.500">
            {subtitle}
          </Text>
        )}
      </Stack>
    </MotionBox>
  );
};

export default InterestCard;
