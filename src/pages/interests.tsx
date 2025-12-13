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
import React, { useEffect, useMemo, useState } from "react";
import { useRecoilValue } from "recoil";

import { userState } from "../atoms/userAtom";
import InterestCard from "../components/common/InterestCard";
import MetricSlider from "../components/common/MetricSlider";
import type { InterestsResponse, UserInterest } from "../types/interests";

type Interest = {
  label: string;
  description: string;
  selected: boolean;
  weight?: number; // 0-1
};

const persistLocalInterests = (key: string, values: string[]) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Ignore storage failures (private mode or blocked storage)
  }
};

const defaultInterests: Interest[] = [
  { label: "vr", description: "VR / AR / MR / Meta Quest", selected: false, weight: 0.6 },
  { label: "metaquest", description: "Meta Quest ecosystem", selected: false, weight: 0.6 },
  { label: "ar", description: "Augmented reality", selected: false, weight: 0.6 },
  { label: "mr", description: "Mixed reality", selected: false, weight: 0.6 },
  { label: "gaming", description: "Gaming / Consoles", selected: false, weight: 0.6 },
  { label: "pcgaming", description: "PC gaming", selected: false, weight: 0.6 },
  { label: "consoles", description: "Console gaming", selected: false, weight: 0.6 },
  { label: "pchardware", description: "PC hardware / components", selected: false, weight: 0.6 },
  { label: "components", description: "GPUs, CPUs, parts", selected: false, weight: 0.6 },
  { label: "smartphones", description: "Smartphones / mobile", selected: false, weight: 0.6 },
  { label: "laptops", description: "Laptops / notebooks", selected: false, weight: 0.6 },
  { label: "ai", description: "AI / ML / general AI topics", selected: false, weight: 0.6 },
  { label: "programming", description: "Programming / coding", selected: false, weight: 0.6 },
  { label: "tech", description: "General tech", selected: false, weight: 0.6 },
  { label: "spark", description: "Apache Spark / big data", selected: false, weight: 0.6 },
  { label: "kafka", description: "Apache Kafka / streaming", selected: false, weight: 0.6 },
  { label: "trading", description: "Trading / markets", selected: false, weight: 0.6 },
  { label: "crypto", description: "Crypto / web3", selected: false, weight: 0.6 },
  { label: "ecommerce", description: "Ecommerce / online stores", selected: false, weight: 0.6 },
  { label: "store", description: "Store ops / retail", selected: false, weight: 0.6 },
  { label: "mobile", description: "Mobile / phone topics", selected: false, weight: 0.6 },
  { label: "phone", description: "Phones & accessories", selected: false, weight: 0.6 },
  { label: "notebook", description: "Notebook PCs", selected: false, weight: 0.6 },
  { label: "laptop", description: "Laptops", selected: false, weight: 0.6 },
  { label: "hardware", description: "Hardware engineering", selected: false, weight: 0.6 },
  { label: "computer", description: "General computing", selected: false, weight: 0.6 },
  { label: "pc", description: "Personal computers", selected: false, weight: 0.6 },
  { label: "design", description: "Design / UI-UX", selected: false, weight: 0.6 },
  { label: "photography", description: "Photography", selected: false, weight: 0.6 },
];

const InterestsPage = () => {
  const router = useRouter();
  const toast = useToast();
  const user = useRecoilValue(userState);
  const { uid } = router.query;
  const [interests, setInterests] = useState<Interest[]>(defaultInterests);
  const [weight, setWeight] = useState(60);
  const [weightDirty, setWeightDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const devUserId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("userId")
      : null;

  const selectedInterests = useMemo(
    () => interests.filter((i) => i.selected).map((i) => i.label),
    [interests]
  );

  const toggleInterest = (label: string) => {
    setInterests((prev) =>
      prev.map((item) =>
        item.label === label
          ? {
              ...item,
              selected: !item.selected,
              weight: !item.selected
                ? weightDirty
                  ? weight / 100
                  : item.weight ?? weight / 100
                : item.weight,
            }
          : item
      )
    );
  };

  const handleContinue = async () => {
    if (!user && !devUserId) {
      toast({
        title: "Please log in",
        description: "You need an account to save your interests.",
        status: "warning",
        duration: 2500,
        isClosable: true,
      });
      return;
    }

    const weightValue = weight / 100;
    const selected = interests
      .filter((i) => i.selected)
      .map((i) => ({
        interest: i.label,
        weight: weightDirty
          ? weightValue
          : typeof i.weight === "number"
            ? i.weight
            : weightValue,
      }));

    if (!selected.length) {
      toast({
        title: "Select at least one interest",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.id ? { "x-user-id": String(user.id) } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          interests: selected,
          ...(devUserId && !user?.id ? { userId: Number(devUserId) } : {}),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as
        | InterestsResponse
        | Record<string, never>;

      if (!res.ok) {
        throw new Error((data as InterestsResponse).error || "Failed to save interests");
      }
      const interestsData = (data as InterestsResponse).interests || [];

      persistLocalInterests(
        `user_interests_${user.uid}`,
        interestsData.map((i) => i.interest)
      );

      toast({
        title: "Preferences saved",
        description: "Your feed will be tuned to these interests.",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      router.push("/");
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err?.message || "Something went wrong",
        status: "error",
        duration: 2500,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadInterests = async () => {
      if (!user && !devUserId) return;
      setLoading(true);
      try {
        const query = devUserId && !user?.id ? `?userId=${devUserId}` : "";
        const res = await fetch(`/api/interests${query}`, {
          credentials: "include",
          headers: {
            ...(user?.id ? { "x-user-id": String(user.id) } : {}),
          },
        });
        if (!res.ok) throw new Error("Failed to fetch interests");

        const data = (await res.json()) as { interests: UserInterest[] };
        const remote = data.interests || [];

        if (remote.length) {
          const avgWeight =
            remote.reduce((sum, item) => sum + (item.weight || 0), 0) /
            remote.length;
          setWeight(Math.round((avgWeight || 0.6) * 100));
        }

        const base = defaultInterests.map((item) => ({
          ...item,
          selected: false,
          weight: item.weight ?? 0.6,
        }));

        const lowerSet = new Map(
          remote.map((i) => [i.interest.toLowerCase(), i.weight ?? 0.6])
        );

        const updatedDefaults = base.map((item) => {
          const found = lowerSet.get(item.label.toLowerCase());
          return found !== undefined
            ? { ...item, selected: true, weight: found }
            : item;
        });

        const extras = remote
          .filter(
            (i) =>
              !updatedDefaults.some(
                (d) => d.label.toLowerCase() === i.interest.toLowerCase()
              )
          )
          .map((i) => ({
            label: i.interest,
            description: "From your saved preferences",
            selected: true,
            weight: i.weight ?? 0.6,
          }));

        setInterests([...updatedDefaults, ...extras]);
        setWeightDirty(false);
      } catch (_err) {
        // keep defaults on failure
      } finally {
        setLoading(false);
      }
    };

    loadInterests();
  }, [user]);

  const handleWeightChange = (val: number) => {
    setWeight(val);
    setWeightDirty(true);
  };

  const isBusy = saving || loading;
  const buttonLabel = loading ? "Loading..." : saving ? "Saving..." : "Continue";
  const subtitle = selectedInterests.length
    ? `Your selections help us surface the best communities and discussions for you. Signed in as ${uid || user?.email || "guest"}.`
    : "Pick at least one interest to personalize your feed.";

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
              Step 2 - Personalize
            </Text>
            <Heading size="lg">Choose your interests</Heading>
            <Text color="gray.600" maxW="3xl">
              {subtitle}
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
              onChange={handleWeightChange}
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
              isLoading={isBusy}
            >
              {buttonLabel}
            </Button>
          </Flex>
        </Stack>
      </Box>
    </Flex>
  );
};

export default InterestsPage;
