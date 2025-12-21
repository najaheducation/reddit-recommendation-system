import { PostDocument, TopicConfig } from "./models/Post";

const normalizeTokens = (values: string[] = []) => {
  const tokens = new Set<string>();
  values.forEach((value) => {
    const raw = (value || "").toString().toLowerCase();
    if (!raw) return;
    const compact = raw.replace(/[^a-z0-9]+/g, "");
    if (compact) tokens.add(compact);
    raw
      .split(/[^a-z0-9]+/g)
      .filter(Boolean)
      .forEach((token) => tokens.add(token));
  });
  return Array.from(tokens);
};

const hasIntersection = (a: string[], b: string[]): boolean => {
  if (a.length === 0 || b.length === 0) return false;
  const setB = new Set(b);
  return a.some((value) => setB.has(value));
};

/**
 * Compute interest score contribution from topics.
 * - Subreddit match: add topic weight if post.subreddit matches topic name/subreddits.
 * Result is clamped to [0, 1].
 */
export const computeTopicScore = (
  post: PostDocument,
  topics: TopicConfig[]
): number => {
  const postTokens = normalizeTokens([post.subreddit || ""]);

  const total = topics.reduce((acc, topic) => {
    const topicWeight = Number.isFinite(topic.weight) ? Math.max(0, Math.min(1, topic.weight)) : 0;
    const topicTokens = normalizeTokens([topic.name || "", ...(topic.subreddits || [])]);
    const subredditMatch = hasIntersection(postTokens, topicTokens);
    const topicScore = subredditMatch ? topicWeight : 0;
    return acc + topicScore;
  }, 0);

  return Math.max(0, Math.min(1, total));
};
