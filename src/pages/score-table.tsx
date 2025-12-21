import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { authModelState } from "../atoms/authModalAtom";
import { userState } from "../atoms/userAtom";

type ScoreRow = {
  id: string;
  title: string;
  subreddit: string;
  query?: string | null;
  topic?: string | null;
  createdAt?: string | null;
  score: number;
  numComments: number;
  upvoteRatio: number;
  hasImage: number;
  hasVideo: number;
  upvoteScore: number;
  upvoteWeighted: number;
  commentScore: number;
  commentWeighted: number;
  ratioScore: number;
  ratioWeighted: number;
  imageScore: number;
  imageWeighted: number;
  videoScore: number;
  videoWeighted: number;
  freshnessScore: number;
  freshnessWeighted: number;
  qualityScore: number;
  topicScore: number;
  interestMultiplier: number;
  commentScoreSum: number;
  commentBoost: number;
  trendScoreRaw: number;
  trendScoreWeighted: number;
  finalScore: number;
};

type ScoreTableResponse = {
  rows: ScoreRow[];
  offset: number;
  limit: number;
  total: number;
  error?: string;
};

const formatNumber = (value: number, digits = 3) =>
  Number.isFinite(value) ? value.toFixed(digits) : "0";

const ScoreTablePage = () => {
  const user = useRecoilValue(userState);
  const setAuthModal = useSetRecoilState(authModelState);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const limit = 50;
  const devUserId = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("userId");
  }, []);

  const cardBg = useColorModeValue("white", "rgba(255,255,255,0.04)");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const muted = useColorModeValue("gray.600", "gray.400");

  const canLoad = Boolean(user || devUserId);
  const hasMore = rows.length < total;

  const fetchRows = useCallback(
    async (offset: number) => {
      if (!canLoad) return;
      setError(null);
      offset === 0 ? setLoading(true) : setLoadingMore(true);
      try {
        const query = new URLSearchParams();
        query.set("limit", String(limit));
        query.set("offset", String(offset));
        if (devUserId && !user?.id) query.set("userId", devUserId);
        const res = await fetch(`/api/score-table?${query.toString()}`, {
          credentials: "include",
          headers: {
            ...(user?.id ? { "x-user-id": String(user.id) } : {}),
          },
        });
        const data = (await res.json()) as ScoreTableResponse;
        if (!res.ok) {
          throw new Error(data.error || "Failed to load score table");
        }
        setRows((prev) => (offset === 0 ? data.rows : [...prev, ...data.rows]));
        setTotal(data.total);
      } catch (err: any) {
        setError(err?.message || "Failed to load score table");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [canLoad, devUserId, limit, user?.id]
  );

  useEffect(() => {
    fetchRows(0);
  }, [fetchRows]);

  if (!canLoad) {
    return (
      <Flex minH="70vh" align="center" justify="center" direction="column" gap={4}>
        <Heading size="lg">Score Table</Heading>
        <Text color={muted}>Available after you register/log in.</Text>
        <Button onClick={() => setAuthModal({ open: true, view: "signup" })}>
          Create an account
        </Button>
        <Button variant="outline" onClick={() => setAuthModal({ open: true, view: "login" })}>
          Log In
        </Button>
      </Flex>
    );
  }

  return (
    <>
      <Head>
        <title>Score Table | Reddit Pulse</title>
      </Head>
      <Stack spacing={6}>
        <Box
          border="1px solid"
          borderColor={borderColor}
          borderRadius="16px"
          p={{ base: 5, md: 6 }}
          bg={cardBg}
          boxShadow="xl"
        >
          <Stack spacing={1}>
            <Heading size="md">Final Score Breakdown</Heading>
            <Text color={muted} fontSize="sm">
              Detailed calculation table for every post (Excel-style).
            </Text>
          </Stack>
        </Box>

        <Box border="1px solid" borderColor={borderColor} borderRadius="16px" bg={cardBg} boxShadow="xl">
          <Box
            maxH="70vh"
            overflow="auto"
            w="100%"
            maxW="100%"
            sx={{
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(100, 116, 139, 0.6) transparent",
              "&::-webkit-scrollbar": { height: "12px", width: "10px" },
              "&::-webkit-scrollbar-thumb": { background: "rgba(100, 116, 139, 0.6)" },
              "&::-webkit-scrollbar-track": { background: "transparent" },
            }}
          >
            <Table
              size="sm"
              variant="simple"
              minW="2600px"
              w="max-content"
              sx={{ "& th, & td": { whiteSpace: "nowrap" } }}
            >
              <Thead position="sticky" top={0} bg={cardBg} zIndex={1}>
                <Tr>
                  <Th>Post ID</Th>
                  <Th>Subreddit</Th>
                  <Th>Topic</Th>
                  <Th>Created</Th>
                  <Th isNumeric>Score</Th>
                  <Th isNumeric>Comments</Th>
                  <Th isNumeric>Upvote Ratio</Th>
                  <Th isNumeric>Image</Th>
                  <Th isNumeric>Video</Th>
                  <Th isNumeric>Upvote S</Th>
                  <Th isNumeric>Upvote W</Th>
                  <Th isNumeric>Comment S</Th>
                  <Th isNumeric>Comment W</Th>
                  <Th isNumeric>Ratio S</Th>
                  <Th isNumeric>Ratio W</Th>
                  <Th isNumeric>Image S</Th>
                  <Th isNumeric>Image W</Th>
                  <Th isNumeric>Video S</Th>
                  <Th isNumeric>Video W</Th>
                  <Th isNumeric>Fresh S</Th>
                  <Th isNumeric>Fresh W</Th>
                  <Th isNumeric>Quality</Th>
                  <Th isNumeric>Topic S</Th>
                  <Th isNumeric>Multiplier</Th>
                  <Th isNumeric>Comment Sum</Th>
                  <Th isNumeric>Comment Boost</Th>
                  <Th isNumeric>Trend S</Th>
                  <Th isNumeric>Trend W</Th>
                  <Th isNumeric>Final</Th>
                </Tr>
              </Thead>
              <Tbody>
                {loading && (
                  <Tr>
                    <Td colSpan={29}>
                      <Text color={muted}>Loading score table...</Text>
                    </Td>
                  </Tr>
                )}
                {!loading && error && (
                  <Tr>
                    <Td colSpan={29}>
                      <Text color="red.400">{error}</Text>
                    </Td>
                  </Tr>
                )}
                {!loading &&
                  !error &&
                  rows.map((row) => (
                    <Tr key={row.id}>
                      <Td>{row.id || "-"}</Td>
                      <Td>{row.subreddit || "-"}</Td>
                      <Td>{row.topic || row.query || "-"}</Td>
                      <Td>{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</Td>
                      <Td isNumeric>{row.score}</Td>
                      <Td isNumeric>{row.numComments}</Td>
                      <Td isNumeric>{formatNumber(row.upvoteRatio, 3)}</Td>
                      <Td isNumeric>{row.hasImage}</Td>
                      <Td isNumeric>{row.hasVideo}</Td>
                      <Td isNumeric>{formatNumber(row.upvoteScore)}</Td>
                      <Td isNumeric>{formatNumber(row.upvoteWeighted)}</Td>
                      <Td isNumeric>{formatNumber(row.commentScore)}</Td>
                      <Td isNumeric>{formatNumber(row.commentWeighted)}</Td>
                      <Td isNumeric>{formatNumber(row.ratioScore)}</Td>
                      <Td isNumeric>{formatNumber(row.ratioWeighted)}</Td>
                      <Td isNumeric>{formatNumber(row.imageScore)}</Td>
                      <Td isNumeric>{formatNumber(row.imageWeighted)}</Td>
                      <Td isNumeric>{formatNumber(row.videoScore)}</Td>
                      <Td isNumeric>{formatNumber(row.videoWeighted)}</Td>
                      <Td isNumeric>{formatNumber(row.freshnessScore)}</Td>
                      <Td isNumeric>{formatNumber(row.freshnessWeighted)}</Td>
                      <Td isNumeric>{formatNumber(row.qualityScore)}</Td>
                      <Td isNumeric>{formatNumber(row.topicScore)}</Td>
                      <Td isNumeric>{formatNumber(row.interestMultiplier)}</Td>
                      <Td isNumeric>{formatNumber(row.commentScoreSum, 2)}</Td>
                      <Td isNumeric>{formatNumber(row.commentBoost, 3)}</Td>
                      <Td isNumeric>{formatNumber(row.trendScoreRaw)}</Td>
                      <Td isNumeric>{formatNumber(row.trendScoreWeighted)}</Td>
                      <Td isNumeric>{formatNumber(row.finalScore, 4)}</Td>
                    </Tr>
                  ))}
              </Tbody>
            </Table>
          </Box>
          <Flex justify="space-between" align="center" px={5} py={4} borderTop="1px solid" borderColor={borderColor}>
            <Text fontSize="sm" color={muted}>
              Showing {rows.length} of {total}
            </Text>
            <HStack spacing={3}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchRows(0)}
                isLoading={loading}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                onClick={() => fetchRows(rows.length)}
                isLoading={loadingMore}
                isDisabled={!hasMore || loading || loadingMore}
              >
                Load more
              </Button>
            </HStack>
          </Flex>
        </Box>
      </Stack>
    </>
  );
};

export default ScoreTablePage;
