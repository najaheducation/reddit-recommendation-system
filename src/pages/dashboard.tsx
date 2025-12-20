import {
  Badge,
  Box,
  Flex,
  Heading,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

import type { DashboardResponse } from "../types/dashboard";

const formatNumber = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "0";

const formatPercent = (value?: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : "0%";

const formatTrendKey = (value: string) =>
  value.replace(/^(term:|user:)/i, "").trim();

const formatDateLabel = (value: string) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const DashboardPage = () => {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardBg = useColorModeValue("white", "rgba(255,255,255,0.04)");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const accent = useColorModeValue("brand.500", "brand.300");
  const muted = useColorModeValue("gray.600", "gray.400");
  const heroBg = useColorModeValue(
    "linear-gradient(135deg, rgba(30,136,255,0.12) 0%, rgba(18,180,151,0.12) 100%)",
    "linear-gradient(135deg, rgba(30,136,255,0.12) 0%, rgba(18,180,151,0.12) 100%)"
  );

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/dashboard");
        const payload = (await response.json()) as DashboardResponse;
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load dashboard");
        }
        setData(payload);
      } catch (err: any) {
        setError(err?.message || "Failed to load dashboard");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const metrics = useMemo(() => {
    const totals = data?.totals;
    return [
      { label: "Total posts", value: formatNumber(totals?.totalPosts) },
      { label: "Total comments", value: formatNumber(totals?.totalComments) },
      { label: "Average score", value: formatNumber(totals?.avgScore) },
      { label: "Average comments", value: formatNumber(totals?.avgComments) },
      { label: "Avg upvote ratio", value: formatPercent(totals?.avgUpvoteRatio) },
      { label: "Image posts", value: formatNumber(totals?.imagePosts) },
      { label: "Video posts", value: formatNumber(totals?.videoPosts) },
      { label: "Unique subreddits", value: formatNumber(totals?.distinctSubreddits) },
      { label: "Unique queries", value: formatNumber(totals?.distinctQueries) },
      { label: "Trendiness", value: formatNumber(totals?.trendiness) },
    ];
  }, [data?.totals]);

  const renderRankedList = (
    items: { label: string; count: number }[],
    emptyLabel: string
  ) => {
    if (!items?.length) {
      return <Text color={muted}>{emptyLabel}</Text>;
    }
    const max = Math.max(...items.map((item) => item.count), 1);
    return (
      <Stack spacing={3}>
        {items.map((item) => (
          <Box key={item.label}>
            <Flex justify="space-between" align="center" mb={1}>
              <Text fontWeight={600}>{item.label}</Text>
              <Text fontWeight={700}>{formatNumber(item.count)}</Text>
            </Flex>
            <Progress value={(item.count / max) * 100} size="sm" borderRadius="full" />
          </Box>
        ))}
      </Stack>
    );
  };

  const renderTrendList = () => {
    if (!data?.trends?.length) {
      return <Text color={muted}>No trend terms yet.</Text>;
    }
    const max = Math.max(...data.trends.map((item) => item.count), 1);
    return (
      <Stack spacing={3}>
        {data.trends.slice(0, 10).map((item) => (
          <Box key={item.key}>
            <Flex justify="space-between" align="center" mb={1}>
              <Text fontWeight={600}>{formatTrendKey(item.key)}</Text>
              <Text fontWeight={700}>{formatNumber(item.count)}</Text>
            </Flex>
            <Progress value={(item.count / max) * 100} size="sm" borderRadius="full" colorScheme="blue" />
          </Box>
        ))}
      </Stack>
    );
  };

  const renderPostsByDay = () => {
    if (!data?.postsByDay?.length) {
      return <Text color={muted}>No recent posts to summarize.</Text>;
    }
    const max = Math.max(...data.postsByDay.map((item) => item.count), 1);
    return (
      <Stack spacing={3}>
        {data.postsByDay.map((item) => (
          <Box key={item.date}>
            <Flex justify="space-between" align="center" mb={1}>
              <Text fontWeight={600}>{formatDateLabel(item.date)}</Text>
              <Text fontWeight={700}>{formatNumber(item.count)}</Text>
            </Flex>
            <Progress value={(item.count / max) * 100} size="sm" borderRadius="full" colorScheme="green" />
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <>
      <Head>
        <title>Dashboard | Reddit Pulse</title>
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
          <Stack spacing={3} maxW="760px">
            <Heading size="lg">Post Analytics Dashboard</Heading>
            <Text color={muted}>
              A full snapshot of your ingestion pipeline: activity volume, distribution,
              and trend signals.
            </Text>
            <Flex gap={2} wrap="wrap">
              <Badge colorScheme="green" variant="subtle" borderRadius="full" px={3}>
                Live from MongoDB
              </Badge>
              {data?.trendsUpdatedAt && (
                <Badge colorScheme="blue" variant="subtle" borderRadius="full" px={3}>
                  Trends updated {new Date(data.trendsUpdatedAt).toLocaleString()}
                </Badge>
              )}
            </Flex>
          </Stack>
        </Box>

        {loading ? (
          <Text color={muted}>Loading dashboard...</Text>
        ) : error ? (
          <Text color="red.400">{error}</Text>
        ) : (
          <>
            <SimpleGrid columns={{ base: 1, md: 2, xl: 5 }} spacing={4}>
              {metrics.map((metric) => (
                <Box
                  key={metric.label}
                  p={4}
                  bg={cardBg}
                  borderRadius="14px"
                  border="1px solid"
                  borderColor={borderColor}
                  boxShadow="lg"
                >
                  <Text color={muted} fontSize="sm" textTransform="uppercase" letterSpacing="0.08em">
                    {metric.label}
                  </Text>
                  <Text fontSize="2xl" fontWeight={700} color={accent}>
                    {metric.value}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
              <Box
                p={{ base: 5, md: 6 }}
                bg={cardBg}
                borderRadius="16px"
                border="1px solid"
                borderColor={borderColor}
                boxShadow="xl"
              >
                <Heading size="md" mb={4}>
                  Trending terms (CMS)
                </Heading>
                {renderTrendList()}
              </Box>

              <Box
                p={{ base: 5, md: 6 }}
                bg={cardBg}
                borderRadius="16px"
                border="1px solid"
                borderColor={borderColor}
                boxShadow="xl"
              >
                <Heading size="md" mb={4}>
                  Post activity (last 14 days)
                </Heading>
                {renderPostsByDay()}
              </Box>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
              <Box
                p={{ base: 5, md: 6 }}
                bg={cardBg}
                borderRadius="16px"
                border="1px solid"
                borderColor={borderColor}
                boxShadow="xl"
              >
                <Heading size="md" mb={4}>
                  Top queries
                </Heading>
                {renderRankedList(data?.topQueries || [], "No query data yet.")}
              </Box>

              <Box
                p={{ base: 5, md: 6 }}
                bg={cardBg}
                borderRadius="16px"
                border="1px solid"
                borderColor={borderColor}
                boxShadow="xl"
              >
                <Heading size="md" mb={4}>
                  Top subreddits
                </Heading>
                {renderRankedList(data?.topSubreddits || [], "No subreddit data yet.")}
              </Box>
            </SimpleGrid>

            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={6}>
              <Box
                p={{ base: 5, md: 6 }}
                bg={cardBg}
                borderRadius="16px"
                border="1px solid"
                borderColor={borderColor}
                boxShadow="xl"
              >
                <Heading size="md" mb={4}>
                  Top authors
                </Heading>
                {renderRankedList(data?.topAuthors || [], "No author data yet.")}
              </Box>

              <Box
                p={{ base: 5, md: 6 }}
                bg={cardBg}
                borderRadius="16px"
                border="1px solid"
                borderColor={borderColor}
                boxShadow="xl"
              >
                <Heading size="md" mb={4}>
                  Top domains
                </Heading>
                {renderRankedList(data?.topDomains || [], "No domain data yet.")}
              </Box>
            </SimpleGrid>
          </>
        )}
      </Stack>
    </>
  );
};

export default DashboardPage;
