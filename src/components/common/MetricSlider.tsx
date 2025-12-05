import {
  Box,
  Flex,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import React from "react";

type MetricSliderProps = {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  suffix?: string;
  formatValue?: (val: number) => string;
};

const MetricSlider: React.FC<MetricSliderProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  hint,
  suffix = "%",
  formatValue,
}) => {
  const accent = useColorModeValue("blue.500", "blue.300");
  const muted = useColorModeValue("gray.600", "gray.400");
  const trackBg = useColorModeValue("gray.100", "whiteAlpha.200");
  const thumbShadow = useColorModeValue(
    "0 12px 30px rgba(30, 136, 255, 0.35)",
    "0 12px 30px rgba(30, 136, 255, 0.5)"
  );

  return (
    <Stack spacing={3}>
      <Flex justify="space-between" align="center" gap={3}>
        <Text fontWeight={700} fontSize="sm" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
          {label}
        </Text>
        <Box
          minW="72px"
          textAlign="right"
          fontWeight={800}
          color="brand.500"
          fontVariantNumeric="tabular-nums"
          fontSize="lg"
        >
          {formatValue ? formatValue(value) : value}
          {suffix}
        </Box>
      </Flex>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        focusThumbOnChange={false}
        aria-label={`${label}-slider`}
      >
        <SliderTrack bg={trackBg} borderRadius="full" h="10px">
          <SliderFilledTrack bgGradient="linear(to-r, brand.500, accent.500)" boxShadow="inner" />
        </SliderTrack>
        <SliderThumb
          boxSize={5}
          bg="white"
          border="1px solid"
          borderColor="brand.200"
          boxShadow={thumbShadow}
        />
      </Slider>
      {hint && (
        <Text fontSize="sm" color={muted}>
          {hint}
        </Text>
      )}
    </Stack>
  );
};

export default MetricSlider;
