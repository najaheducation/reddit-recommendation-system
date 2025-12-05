import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React, { useMemo, useState } from "react";
import InterestCard from "../components/common/InterestCard";
import MetricSlider from "../components/common/MetricSlider";

type Interest = {
  label: string;
  description: string;
  selected: boolean;
};

const defaultInterests: Interest[] = [
  { label: "Web Development", description: "Frameworks, frontend, devtools", selected: true },
  { label: "AI / ML", description: "Models, LLMs, data science", selected: true },
  { label: "Gaming", description: "PC, console, esports, releases", selected: false },
  { label: "Photography", description: "Gear, editing, inspiration", selected: false },
  { label: "Music", description: "Production, playlists, reviews", selected: false },
  { label: "Movies & TV", description: "Critiques, news, recommendations", selected: false },
  { label: "Fitness", description: "Training plans, health, recovery", selected: false },
  { label: "Design", description: "UI/UX, typography, inspiration", selected: false },
  { label: "Crypto", description: "Markets, builders, chains", selected: false },
];

const InterestsPage = () => {
  const router = useRouter();
  const toast = useToast();
  const { uid } = router.query;
  const [interests, setInterests] = useState<Interest[]>(defaultInterests);
  const [weight, setWeight] = useState(60);

  const selectedInterests = useMemo(
    () => interests.filter((i) => i.selected).map((i) => i.label),
    [interests]
  );

  const toggleInterest = (label: string) => {
    setInterests((prev) =>
      prev.map((item) =>
        item.label === label ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleContinue = () => {
    toast({
      title: "Preferences saved",
      description: "Your feed will be tuned to these interests.",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
    router.push("/");
  };

  return (
    <Flex justify="center" px={{ base: 4, md: 8 }} py={{ base: 8, md: 14 }}>
      <Box
        width="100%"
        maxW="1100px"
        bg="white"
        _dark={{ bg: "rgba(255,255,255,0.04)" }}
        borderRadius="24px"
        border="1px solid"
        borderColor="whiteAlpha.200"
        boxShadow="2xl"
        p={{ base: 6, md: 10 }}
      >
        <Stack spacing={8}>
          <Stack spacing={2}>
            <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.12em" color="gray.500">
              Step 2 · Personalize
            </Text>
            <Heading size="lg">Choose your interests</Heading>
            <Text color="gray.600" maxW="3xl">
              Tell us what you want to see. Your selections help us surface the best communities and
              discussions for you. Signed in as {uid || "guest"}.
            </Text>
          </Stack>

          <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }} gap={4}>
            {interests.map((interest) => (
              <GridItem key={interest.label}>
                <InterestCard
                  title={interest.label}
                  subtitle={interest.description}
                  selected={interest.selected}
                  onToggle={() => toggleInterest(interest.label)}
                />
              </GridItem>
            ))}
          </Grid>

          <Box
            border="1px solid"
            borderColor="whiteAlpha.200"
            bg="whiteAlpha.60"
            _dark={{ bg: "whiteAlpha.50" }}
            borderRadius="18px"
            p={{ base: 4, md: 6 }}
            boxShadow="xl"
          >
            <MetricSlider
              label="Interest Weight"
              value={weight}
              min={0}
              max={100}
              step={5}
              onChange={setWeight}
              suffix="%"
              hint="How strongly to prioritize your chosen interests."
            />
          </Box>

          <Flex justify="flex-end">
            <Button
              size="lg"
              height="48px"
              px={8}
              borderRadius="14px"
              bgGradient="linear(to-r, brand.500, accent.500)"
              color="white"
              _hover={{
                bgGradient: "linear(to-r, brand.600, accent.600)",
                boxShadow: "xl",
                transform: "translateY(-1px)",
              }}
              onClick={handleContinue}
            >
              Continue
            </Button>
          </Flex>
        </Stack>
      </Box>
    </Flex>
  );
};

export default InterestsPage;
