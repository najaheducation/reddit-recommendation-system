import {
  Box,
  Button,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
} from "@chakra-ui/react";
import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { authModelState } from "../atoms/authModalAtom";
import { userState } from "../atoms/userAtom";
import MetricSlider from "../components/common/MetricSlider";
import type { InterestsResponse, UserInterest } from "../types/interests";
import type { UserWeight, WeightsResponse } from "../types/weights";

type Interest = {
  name: string;
  subInterest?: string;
  subreddits: number;
  weight: number;
};

type Weight = {
  label: string;
  value: number;
  hint?: string;
};

const defaultInterests: Interest[] = [
  { name: "PC Building", subreddits: 20, weight: 0.6 },
  { name: "Web Development", subreddits: 20, weight: 0.52 },
  { name: "Animals", subreddits: 20, weight: 0.45 },
];

const defaultWeights: Weight[] = [
  { label: "upvoteRatio", value: 35, hint: "Ratio of upvotes to total votes" },
  { label: "numComments", value: 25, hint: "Engagement measured by comments" },
  { label: "isImage", value: 15, hint: "Boost for image posts" },
  { label: "isVideo", value: 10, hint: "Boost for video posts" },
  { label: "freshness", value: 30, hint: "Freshness based on creation time" },
  { label: "upvote", value: 20, hint: "Raw upvote count signal" },
];

const MetricsPage = () => {
  const user = useRecoilValue(userState);
  const setAuthModal = useSetRecoilState(authModelState);
  const toast = useToast();
  const [interests, setInterests] = useState<Interest[]>(defaultInterests);
  const [initialInterests, setInitialInterests] = useState<Interest[]>(defaultInterests);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weights, setWeights] = useState<Weight[]>(defaultWeights);
  const devUserId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("userId")
      : null;
  const cardBg = useColorModeValue("white", "rgba(255,255,255,0.04)");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const accent = useColorModeValue("brand.500", "brand.300");
  const muted = useColorModeValue("gray.600", "gray.400");
  const heroBg = useColorModeValue(
    "linear-gradient(135deg, rgba(30,136,255,0.12) 0%, rgba(18,180,151,0.12) 100%)",
    "linear-gradient(135deg, rgba(30,136,255,0.12) 0%, rgba(18,180,151,0.12) 100%)"
  );

const formatLabel = (value: string) =>
  value
    ? value
        .toString()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^\w/, (c) => c.toUpperCase())
    : "";

const toSlug = (value: string) =>
  value
    .toString()
    .replace(/[^a-z0-9]+/gi, "")
    .toLowerCase();

const toWeightLabel = (value: string) =>
  value
    .toString()
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part, idx) => {
      const lower = part.toLowerCase();
      return idx === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

const formatWeightLabel = (value: string) =>
  value
    .toString()
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());

const mergeWithDefaults = (incoming: Weight[]): Weight[] => {
  const map = incoming.reduce<Record<string, Weight>>((acc, item) => {
    const key = toWeightLabel(item.label);
    if (!key) return acc;
    acc[key] = { ...item, label: key };
    return acc;
  }, {});
  return defaultWeights.map((def) => (map[def.label] ? { ...def, ...map[def.label], label: def.label } : def));
};

  const loadInterests = useCallback(async () => {
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
      const data = (await res.json()) as InterestsResponse;
      const mapped: Interest[] =
        data.interests?.map((item: UserInterest) => ({
          name: formatLabel(item.interest),
          subInterest: item.subInterest ? formatLabel(item.subInterest) : undefined,
          subreddits: 20,
          weight: item.weight ?? 0.5,
        })) || [];

      if (mapped.length) {
        setInterests(mapped);
        setInitialInterests(mapped);
      }
    } catch (_err) {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, [devUserId, user]);

  const loadWeights = useCallback(async () => {
    if (!user && !devUserId) return;
    try {
      const query = devUserId && !user?.id ? `?userId=${devUserId}` : "";
      const res = await fetch(`/api/weights${query}`, {
        credentials: "include",
        headers: {
          ...(user?.id ? { "x-user-id": String(user.id) } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch weights");
      const data = (await res.json()) as WeightsResponse;
      if (Array.isArray(data.weights) && data.weights.length) {
        const normalized = data.weights
          .map((w) => ({
            label: toWeightLabel(w.label),
            value: w.value,
            hint: w.hint,
          }))
          .filter((w) => defaultWeights.some((def) => def.label === w.label));
        setWeights(normalized.length ? mergeWithDefaults(normalized) : defaultWeights);
      } else {
        setWeights(defaultWeights);
      }
    } catch (_err) {
      // fallback to defaults
      setWeights(defaultWeights);
    }
  }, [devUserId, user]);

  const handleSave = async () => {
    if (!user && !devUserId) {
      setAuthModal({ open: true, view: "login" });
      return;
    }
    setSaving(true);
    try {
      const payload = interests.map((i) => ({
        interest: toSlug(i.name),
        subInterest: i.subInterest ? toSlug(i.subInterest) : undefined,
        weight: i.weight,
      }));
      const interestsResPromise = fetch("/api/interests", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(user?.id ? { "x-user-id": String(user.id) } : {}),
        },
        body: JSON.stringify({
          interests: payload,
          ...(devUserId && !user?.id ? { userId: devUserId } : {}),
        }),
      });

      const weightsPayload = weights.map((w) => ({
        label: toWeightLabel(w.label),
        value: w.value,
        hint: w.hint,
      }));

      const topicsPayload = Array.from(
        new Set(
          interests
            .map((i) => toSlug(i.name))
            .filter((topic) => topic.length > 0)
        )
      );

      const weightsResPromise = fetch("/api/weights", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(user?.id ? { "x-user-id": String(user.id) } : {}),
        },
        body: JSON.stringify({
          weights: weightsPayload,
          topics: topicsPayload,
          ...(devUserId && !user?.id ? { userId: devUserId } : {}),
        }),
      });

      const [interestsRes, weightsRes] = await Promise.all([
        interestsResPromise,
        weightsResPromise,
      ]);

      const interestsData = (await interestsRes.json().catch(() => ({}))) as InterestsResponse;
      const weightsData = (await weightsRes.json().catch(() => ({}))) as WeightsResponse;

      if (!interestsRes.ok) {
        throw new Error(interestsData.error || "Failed to save interests");
      }

      if (!weightsRes.ok) {
        throw new Error(weightsData.error || "Failed to save signal weights");
      }
      toast({
        title: "Saved",
        description: "Interests and signal weights updated in your account.",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      setInitialInterests(interests);
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err?.message || "Please try again",
        status: "error",
        duration: 2500,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadInterests();
    loadWeights();
  }, [loadInterests, loadWeights]);

  if (!user) {
    return (
      <Flex
        minH="70vh"
        align="center"
        justify="center"
        direction="column"
        gap={4}
      >
        <Heading size="lg">Metrics Dashboard</Heading>
        <Text color={muted}>Available after you register/log in.</Text>
        <Button onClick={() => setAuthModal({ open: true, view: "signup" })}>
          Create an account
        </Button>
        <Button
          variant="outline"
          onClick={() => setAuthModal({ open: true, view: "login" })}
        >
          Log In
        </Button>
      </Flex>
    );
  }

  return (
    <>
      <Head>
        <title>Metrics | Reddit Clone</title>
      </Head>
      <Stack spacing={8}>
        <Box
          border="1px solid"
          borderColor={borderColor}
          borderRadius="16px"
          p={{ base: 5, md: 8 }}
          bg={heroBg}
          boxShadow="2xl"
          backdropFilter="blur(12px)"
        >
          <Stack spacing={3} maxW="720px">
            <Heading size="lg">Metrics Dashboard</Heading>
            <Text color={muted} fontSize="md">
              Tune the recommendation engine with intuitive sliders. Values update instantly and
              will later persist to your backend.
            </Text>
            <Flex gap={3} wrap="wrap">
              <Button
                colorScheme="blue"
                variant="solid"
                size="sm"
                onClick={() => {
                  setInterests(initialInterests.length ? initialInterests : defaultInterests);
                  setWeights(defaultWeights);
                }}
              >
                Reset values
              </Button>
              <Button
                variant="outline"
                size="sm"
                isLoading={saving}
                onClick={handleSave}
              >
                Save to account
              </Button>
            </Flex>
          </Stack>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          {(loading ? [] : interests.length ? interests : defaultInterests).map(
            (interest, idx) => (
              <Box
                key={interest.name}
                p={5}
                bg={cardBg}
                borderRadius="16px"
                border="1px solid"
                borderColor={borderColor}
                boxShadow="xl"
                _hover={{ boxShadow: "dark-lg", transform: "translateY(-2px)" }}
                transition="all 0.2s ease"
              >
                <Flex justify="space-between" align="center" mb={3}>
                  <Stack spacing={1}>
                    <Text fontWeight={700} fontSize="md">
                      {interest.name}
                    </Text>
                    {interest.subInterest && (
                      <Text fontSize="sm" color={muted}>
                        Sub-topic: {interest.subInterest}
                      </Text>
                    )}
                    <Text fontSize="sm" color={muted}>
                      {interest.subreddits} subreddits tracked
                    </Text>
                  </Stack>
                  <Box
                    bg="brand.50"
                    _dark={{ bg: "whiteAlpha.100" }}
                    borderRadius="full"
                    px={3}
                    py={1}
                    fontSize="sm"
                    fontWeight={700}
                    color={accent}
                  >
                    {(interest.weight * 100).toFixed(0)}%
                  </Box>
                </Flex>
                <MetricSlider
                  value={interest.weight}
                  min={0}
                  max={1}
                  step={0.05}
                  suffix=""
                  label="Interest weight"
                  formatValue={(val) => val.toFixed(2)}
                  onChange={(val) =>
                    setInterests((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, weight: val } : item
                      )
                    )
                  }
                  hint="Higher values elevate this topic in rankings."
                />
              </Box>
            )
          )}
        </SimpleGrid>

        <Box
          p={{ base: 5, md: 6 }}
          bg={cardBg}
          borderRadius="16px"
          border="1px solid"
          borderColor={borderColor}
          boxShadow="xl"
        >
          <Flex justify="space-between" align="center" mb={5} wrap="wrap" gap={2}>
            <Stack spacing={1}>
              <Text fontWeight="700">Signal weights</Text>
              <Text fontSize="sm" color={muted}>
                Adjust the percentage contribution for each signal
              </Text>
            </Stack>
            <Button size="sm" variant="ghost" onClick={() => setWeights(defaultWeights)}>
              Restore defaults
            </Button>
          </Flex>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
            {weights.map((weight, idx) => (
              <MetricSlider
                key={weight.label}
                label={formatWeightLabel(weight.label)}
                value={weight.value}
                min={0}
                max={100}
                step={5}
                suffix="%"
                hint={weight.hint}
                onChange={(val) =>
                  setWeights((prev) =>
                    prev.map((item, i) =>
                      i === idx ? { ...item, value: val } : item
                    )
                  )
                }
              />
            ))}
          </SimpleGrid>

          <Box mt={6} border="1px solid" borderColor={borderColor} borderRadius="12px" overflow="hidden">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Signal</Th>
                  <Th isNumeric>Weight</Th>
                  <Th>Description</Th>
                </Tr>
              </Thead>
              <Tbody>
                {weights.map((w) => (
                  <Tr key={w.label}>
                    <Td>
                      <Flex align="center" gap={2}>
                        <Badge colorScheme="blue" variant="subtle" borderRadius="8px" px={2}>
                          {formatWeightLabel(w.label)}
                        </Badge>
                      </Flex>
                    </Td>
                    <Td isNumeric fontWeight={700}>
                      {w.value}%
                    </Td>
                    <Td color={muted}>{w.hint || "—"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>

        <Box
          p={{ base: 5, md: 6 }}
          bg={cardBg}
          borderRadius="16px"
          border="1px solid"
          borderColor={borderColor}
          boxShadow="xl"
        >
          <Text fontWeight="700" mb={2}>
            Signal guidelines
          </Text>
          <Text color={muted} fontSize="sm">
            Adjust sliders above to tune your ranking model. Save to persist these preferences once
            backend storage is enabled.
          </Text>
        </Box>
      </Stack>
    </>
  );
};

export default MetricsPage;
