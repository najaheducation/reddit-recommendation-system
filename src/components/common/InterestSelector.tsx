import {
  Badge,
  Box,
  Flex,
  Grid,
  GridItem,
  Icon,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import React from "react";
import { FaCheck } from "react-icons/fa";

export type InterestOption = {
  label: string;
  description?: string;
  selected: boolean;
};

type InterestSelectorProps = {
  options: InterestOption[];
  onToggle: (label: string) => void;
};

const MotionBox = motion(Box);

const InterestSelector: React.FC<InterestSelectorProps> = ({
  options,
  onToggle,
}) => {
  const cardBg = useColorModeValue("white", "rgba(255,255,255,0.04)");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const text = useColorModeValue("gray.700", "gray.200");

  return (
    <Stack spacing={3}>
      <Text fontWeight={700} fontSize="sm" color="gray.500" letterSpacing="0.08em">
        PICK YOUR INTERESTS
      </Text>
      <Grid templateColumns={{ base: "repeat(2,1fr)", md: "repeat(3,1fr)" }} gap={3}>
        {options.map((item) => {
          const active = item.selected;
          return (
            <GridItem key={item.label}>
              <MotionBox
                onClick={() => onToggle(item.label)}
                border="1px solid"
                borderColor={active ? "brand.300" : border}
                bg={active ? "brand.50" : cardBg}
                _dark={{
                  bg: active ? "whiteAlpha.100" : cardBg,
                  borderColor: active ? "brand.400" : border,
                }}
                borderRadius="14px"
                p={3}
                cursor="pointer"
                whileHover={{ y: -2, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
              >
                <Flex align="center" justify="space-between" mb={1}>
                  <Text fontWeight={700} color={text}>
                    {item.label}
                  </Text>
                  {active && (
                    <Badge colorScheme="blue" borderRadius="8px" px={2}>
                      <Icon as={FaCheck} mr={1} /> Added
                    </Badge>
                  )}
                </Flex>
                {item.description && (
                  <Text color="gray.500" fontSize="sm">
                    {item.description}
                  </Text>
                )}
              </MotionBox>
            </GridItem>
          );
        })}
      </Grid>
    </Stack>
  );
};

export default InterestSelector;
