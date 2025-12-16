import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Input,
  SimpleGrid,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
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
  weight: number; // 0-1
  subInterests: string[];
};

const persistLocalInterests = (key: string, values: string[]) => {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Ignore storage failures (private mode or blocked storage)
  }
};

const formatLabel = (value: string) =>
  value
    ? value
        .toString()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase())
    : "";

const sanitizeSlug = (value: string) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const toPercent = (value: number | undefined) =>
  Math.round(((typeof value === "number" ? value : 0) || 0) * 100);

const subInterestOptions: Record<string, string[]> = {
  spark: ["databricks", "pyspark", "sparkstreaming", "sparkml", "sparkstructured"],
  phone: ["samsung", "iphone", "googlepixel", "xiaomi", "oneplus"],
  smartphones: ["samsung", "iphone", "googlepixel", "xiaomi", "oneplus"],
  mobile: ["android", "ios", "samsung", "iphone"],
  laptop: ["macbook", "windows", "chromebook", "gaminglaptop"],
  laptops: ["macbook", "windows", "chromebook", "gaminglaptop"],
  gaming: ["playstation", "xbox", "pcgaming", "nintendo"],
  pchardware: ["gpu", "cpu", "ssd", "monitors"],
  ai: ["llm", "cv", "robotics", "mlops"],
  programming: ["javascript", "python", "java", "rust"],
  ecommerce: ["shopify", "amazon", "dropshipping"],
  trading: ["stocks", "crypto", "options"],
  design: ["uiux", "graphic", "motion"],
};

const defaultInterests: Interest[] = [
  { label: "vr", description: "VR / AR / MR / Meta Quest", selected: false, weight: 0.6, subInterests: [] },
  { label: "metaquest", description: "Meta Quest ecosystem", selected: false, weight: 0.6, subInterests: [] },
  { label: "ar", description: "Augmented reality", selected: false, weight: 0.6, subInterests: [] },
  { label: "mr", description: "Mixed reality", selected: false, weight: 0.6, subInterests: [] },
  { label: "gaming", description: "Gaming / Consoles", selected: false, weight: 0.6, subInterests: [] },
  { label: "pcgaming", description: "PC gaming", selected: false, weight: 0.6, subInterests: [] },
  { label: "consoles", description: "Console gaming", selected: false, weight: 0.6, subInterests: [] },
  { label: "pchardware", description: "PC hardware / components", selected: false, weight: 0.6, subInterests: [] },
  { label: "components", description: "GPUs, CPUs, parts", selected: false, weight: 0.6, subInterests: [] },
  { label: "smartphones", description: "Smartphones / mobile", selected: false, weight: 0.6, subInterests: [] },
  { label: "laptops", description: "Laptops / notebooks", selected: false, weight: 0.6, subInterests: [] },
  { label: "ai", description: "AI / ML / general AI topics", selected: false, weight: 0.6, subInterests: [] },
  { label: "programming", description: "Programming / coding", selected: false, weight: 0.6, subInterests: [] },
  { label: "tech", description: "General tech", selected: false, weight: 0.6, subInterests: [] },
  { label: "spark", description: "Apache Spark / big data", selected: false, weight: 0.6, subInterests: [] },
  { label: "kafka", description: "Apache Kafka / streaming", selected: false, weight: 0.6, subInterests: [] },
  { label: "trading", description: "Trading / markets", selected: false, weight: 0.6, subInterests: [] },
  { label: "crypto", description: "Crypto / web3", selected: false, weight: 0.6, subInterests: [] },
  { label: "ecommerce", description: "Ecommerce / online stores", selected: false, weight: 0.6, subInterests: [] },
  { label: "store", description: "Store ops / retail", selected: false, weight: 0.6, subInterests: [] },
  { label: "mobile", description: "Mobile / phone topics", selected: false, weight: 0.6, subInterests: [] },
  { label: "phone", description: "Phones & accessories", selected: false, weight: 0.6, subInterests: [] },
  { label: "notebook", description: "Notebook PCs", selected: false, weight: 0.6, subInterests: [] },
  { label: "laptop", description: "Laptops", selected: false, weight: 0.6, subInterests: [] },
  { label: "hardware", description: "Hardware engineering", selected: false, weight: 0.6, subInterests: [] },
  { label: "computer", description: "General computing", selected: false, weight: 0.6, subInterests: [] },
  { label: "pc", description: "Personal computers", selected: false, weight: 0.6, subInterests: [] },
  { label: "design", description: "Design / UI-UX", selected: false, weight: 0.6, subInterests: [] },
  { label: "photography", description: "Photography", selected: false, weight: 0.6, subInterests: [] },
];

const InterestsPage = () => {
  const router = useRouter();
  const toast = useToast();
  const user = useRecoilValue(userState);
  const { uid } = router.query;
  const DEFAULT_WEIGHT = 0.55;
  const [interests, setInterests] = useState<Interest[]>(defaultInterests);
  const [activeInterest, setActiveInterest] = useState<string>(
    defaultInterests[0]?.label || ""
  );
  const [subInput, setSubInput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setSubInput("");
  }, [activeInterest]);
  const devUserId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("userId")
      : null;

  const selectedInterests = useMemo(
    () =>
      interests
        .filter((i) => i.selected)
        .flatMap((i) =>
          i.subInterests.length
            ? i.subInterests.map((sub) => `${i.label}:${sub}`)
            : [i.label]
        ),
    [interests]
  );

  const selectedTopics = useMemo(
    () =>
      interests
        .filter((i) => i.selected)
        .map((item) => ({
          ...item,
          percent: toPercent(item.weight),
          subCount: item.subInterests.length,
        })),
    [interests]
  );

  const activeInterestData = useMemo(() => {
    const current = interests.find((i) => i.label === activeInterest);
    if (current) return current;
    return interests.find((i) => i.selected) || interests[0];
  }, [activeInterest, interests]);

  const activeSubOptions = useMemo(
    () => {
      if (!activeInterestData) return [];
      const preset = subInterestOptions[activeInterestData.label] || [];
      const merged = new Set<string>([...preset, ...(activeInterestData.subInterests || [])]);
      return Array.from(merged);
    },
    [activeInterestData]
  );

  const toggleInterest = (label: string) => {
    setInterests((prev) =>
      prev.map((item) => {
        if (item.label !== label) return item;
        if (!item.selected) {
          return {
            ...item,
            selected: true,
            weight:
              typeof item.weight === "number"
                ? item.weight
                : DEFAULT_WEIGHT,
            subInterests: item.subInterests,
          };
        }
        // Already selected: keep selected and just focus it
        return item;
      })
    );
    setActiveInterest(label);
  };

  const deselectInterest = (label: string) => {
    setInterests((prev) => {
      const updated = prev.map((item) =>
        item.label === label
          ? { ...item, selected: false, subInterests: [] }
          : item
      );
      const stillActive = updated.find(
        (item) => item.label === activeInterest && item.selected
      );
      if (!stillActive) {
        const next = updated.find((item) => item.selected);
        setActiveInterest(next?.label || defaultInterests[0]?.label || "");
      }
      return updated;
    });
  };

  const toggleSubInterest = (parent: string, option: string) => {
    const clean = sanitizeSlug(option);
    if (!clean) return;
    setInterests((prev) =>
      prev.map((item) => {
        if (item.label !== parent) return item;
        const exists = item.subInterests.includes(clean);
        const updated = exists
          ? item.subInterests.filter((s) => s !== clean)
          : [...item.subInterests, clean];
        return {
          ...item,
          selected: true,
          subInterests: updated,
          weight:
            typeof item.weight === "number" ? item.weight : DEFAULT_WEIGHT,
        };
      })
    );
    setActiveInterest(parent);
  };

  const addCustomSubInterest = (parent: string) => {
    const clean = sanitizeSlug(subInput);
    if (!clean) return;
    toggleSubInterest(parent, clean);
    setSubInput("");
  };

  const updateInterestWeight = (label: string, value: number) => {
    setInterests((prev) =>
      prev.map((item) =>
        item.label === label
          ? { ...item, weight: value / 100, selected: true }
          : item
      )
    );
    setActiveInterest(label);
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

    const payload = interests
      .filter((i) => i.selected)
      .flatMap((i) => {
        const itemWeight =
          typeof i.weight === "number" ? i.weight : DEFAULT_WEIGHT;
        if (i.subInterests.length) {
          return i.subInterests.map((sub) => ({
            interest: i.label,
            subInterest: sub,
            weight: itemWeight,
          }));
        }
        return [
          {
            interest: i.label,
            weight: itemWeight,
          },
        ];
      });

    if (!payload.length) {
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
          interests: payload,
        ...(devUserId && !user?.id ? { userId: devUserId } : {}),
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
        `user_interests_${user?.uid || devUserId || "local"}`,
        interestsData.map((i) =>
          i.subInterest ? `${i.interest}:${i.subInterest}` : i.interest
        )
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

        const base = defaultInterests.map((item) => ({
          ...item,
          selected: false,
          weight: item.weight,
          subInterests: [],
        }));

        const extras: Interest[] = [];

        remote.forEach((entry) => {
          const weightValue = entry.weight ?? 0.6;
          const match = base.find(
            (i) => i.label.toLowerCase() === entry.interest.toLowerCase()
          );
          if (match) {
            match.selected = true;
            match.weight = weightValue;
            if (entry.subInterest) {
              const set = new Set(match.subInterests);
              set.add(entry.subInterest);
              match.subInterests = Array.from(set);
            }
          } else {
            extras.push({
              label: entry.interest,
              description: "From your saved preferences",
              selected: true,
              weight: weightValue,
              subInterests: entry.subInterest ? [entry.subInterest] : [],
            });
          }
        });

        const merged = [...base, ...extras];
        setInterests(merged);
        setActiveInterest((prev) => {
          const exists = merged.find((i) => i.label === prev);
          if (exists) return prev;
          const firstSelected = merged.find((i) => i.selected);
          return firstSelected?.label || merged[0]?.label || "";
        });
      } catch (_err) {
        // keep defaults on failure
      } finally {
        setLoading(false);
      }
    };

    loadInterests();
  }, [user, devUserId]);

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

          <Stack spacing={3}>
            <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.1em" color="gray.500">
              Selected topics
            </Text>
            {interests.some((i) => i.selected) ? (
              <Flex gap={2} wrap="wrap">
                {interests
                  .filter((i) => i.selected)
                  .map((item) => (
                    <Tag
                      key={item.label}
                      size="md"
                      borderRadius="full"
                      colorScheme={item.label === activeInterest ? "blue" : "gray"}
                      cursor="pointer"
                      onClick={() => setActiveInterest(item.label)}
                    >
                      <TagLabel>{formatLabel(item.label)}</TagLabel>
                      <TagCloseButton
                        onClick={(e) => {
                          e.stopPropagation();
                          deselectInterest(item.label);
                        }}
                        aria-label={`Remove ${item.label}`}
                      />
                    </Tag>
                  ))}
              </Flex>
            ) : (
              <Text color="gray.500">Choose topics to add sub-interests and weights.</Text>
            )}
          </Stack>

          <Box
            border="1px solid"
            borderColor="whiteAlpha.200"
            bg="white"
            _dark={{ bg: "rgba(255,255,255,0.04)" }}
            borderRadius="18px"
            p={{ base: 4, md: 6 }}
            boxShadow="xl"
          >
            <Stack spacing={3}>
              <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
                <Stack spacing={0}>
                  <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.1em" color="gray.500">
                    Selection overview
                  </Text>
                  <Heading size="sm">Selected topics overview</Heading>
                </Stack>
                <Text color="gray.500" fontSize="sm">
                  {selectedTopics.length} topics | {selectedTopics.reduce((s, i) => s + i.subCount, 0)} sub-interests
                </Text>
              </Flex>

              {selectedTopics.length ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                  {selectedTopics.map((topic) => (
                    <Box
                      key={topic.label}
                      border="1px solid"
                      borderColor="whiteAlpha.300"
                      bg={topic.label === activeInterest ? "blue.50" : "white"}
                      _dark={{
                        bg: topic.label === activeInterest ? "whiteAlpha.100" : "rgba(255,255,255,0.02)",
                      }}
                      borderRadius="14px"
                      p={3}
                      cursor="pointer"
                      onClick={() => setActiveInterest(topic.label)}
                      transition="all 0.15s ease"
                      _hover={{ boxShadow: "lg", transform: "translateY(-2px)" }}
                    >
                      <Flex justify="space-between" align="center" mb={1}>
                        <Text fontWeight={700}>{formatLabel(topic.label)}</Text>
                        <Tag colorScheme="blue" borderRadius="full">
                          <TagLabel>{topic.percent}%</TagLabel>
                        </Tag>
                      </Flex>
                      <Text fontSize="sm" color="gray.600">
                        {topic.subCount
                          ? `${topic.subCount} brand(s)/sub-topics`
                          : "No sub-interests yet"}
                      </Text>
                      {topic.subInterests.length ? (
                        <Flex gap={2} wrap="wrap" mt={2}>
                          {topic.subInterests.slice(0, 4).map((sub) => (
                            <Tag key={sub} size="sm" variant="subtle" colorScheme="gray" borderRadius="full">
                              <TagLabel>{formatLabel(sub)}</TagLabel>
                            </Tag>
                          ))}
                          {topic.subInterests.length > 4 && (
                            <Tag size="sm" colorScheme="blue" borderRadius="full">
                              <TagLabel>+{topic.subInterests.length - 4}</TagLabel>
                            </Tag>
                          )}
                        </Flex>
                      ) : null}
                    </Box>
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="gray.500" fontSize="sm">
                  No topics selected yet. Pick one above to start customizing.
                </Text>
              )}
            </Stack>
          </Box>

          <Box
            border="1px solid"
            borderColor="whiteAlpha.200"
            bg="whiteAlpha.60"
            _dark={{ bg: "whiteAlpha.50" }}
            borderRadius="18px"
            p={{ base: 4, md: 6 }}
            boxShadow="xl"
          >
            <Stack spacing={5}>
              <Stack spacing={1}>
                <Text fontSize="sm" textTransform="uppercase" letterSpacing="0.1em" color="gray.500">
                  Refine selection
                </Text>
                <Heading size="md">
                  {activeInterestData
                    ? `Customize ${formatLabel(activeInterestData.label)}`
                    : "Choose an interest to customize"}
                </Heading>
                <Text color="gray.600">
                  Pick brands or sub-topics (e.g., Samsung vs iPhone) and set a weight for this topic.
                </Text>
              </Stack>

              {activeInterestData ? (
                <Stack spacing={4}>
                  <MetricSlider
                    label={`Weight for ${formatLabel(activeInterestData.label)}`}
                    value={Math.round(
                      ((typeof activeInterestData.weight === "number"
                        ? activeInterestData.weight
                        : DEFAULT_WEIGHT) || 0) * 100
                    )}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(val) => updateInterestWeight(activeInterestData.label, val)}
                    suffix="%"
                    hint="Higher weight boosts this topic in your recommendations."
                  />

                  <Stack spacing={2}>
                    <Text fontWeight={700}>Sub-interests / brands</Text>
                    {activeSubOptions.length ? (
                      <Flex gap={2} wrap="wrap">
                        {activeSubOptions.map((option) => {
                          const isSelected = activeInterestData.subInterests.includes(option);
                          return (
                            <Button
                              key={option}
                              size="sm"
                              variant={isSelected ? "solid" : "outline"}
                              colorScheme="blue"
                              onClick={() => toggleSubInterest(activeInterestData.label, option)}
                            >
                              {formatLabel(option)}
                            </Button>
                          );
                        })}
                      </Flex>
                    ) : (
                      <Text color="gray.500" fontSize="sm">
                        No predefined sub-interests for this topic. You can still save it as-is.
                      </Text>
                    )}
                    <Stack spacing={2}>
                      <Text fontSize="sm" fontWeight={600}>
                        Selected
                      </Text>
                      {activeInterestData.subInterests.length ? (
                        <Flex gap={2} wrap="wrap">
                          {activeInterestData.subInterests.map((sub) => (
                            <Tag key={sub} size="md" colorScheme="blue" borderRadius="full">
                              <TagLabel>{formatLabel(sub)}</TagLabel>
                              <TagCloseButton
                                onClick={() => toggleSubInterest(activeInterestData.label, sub)}
                                aria-label={`Remove ${sub}`}
                              />
                            </Tag>
                          ))}
                        </Flex>
                      ) : (
                        <Text color="gray.500" fontSize="sm">
                          Pick at least one brand / sub-topic to refine this interest.
                        </Text>
                      )}
                      <Flex gap={2} wrap="wrap">
                        <Input
                          placeholder="Add custom (e.g., databricks)"
                          value={subInput}
                          onChange={(e) => setSubInput(e.target.value)}
                          maxW={{ base: "100%", md: "260px" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomSubInterest(activeInterestData.label);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => addCustomSubInterest(activeInterestData.label)}
                          isDisabled={!subInput.trim()}
                        >
                          Add
                        </Button>
                      </Flex>
                    </Stack>
                  </Stack>
                </Stack>
              ) : (
                <Text color="gray.500">Select a tile above to fine-tune its weight and brand choices.</Text>
              )}
            </Stack>
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
