import { PostDocument, TopicConfig } from "./models/Post";

const normalizeKeywords = (keywords: string[] = []) => {
  const tokens = new Set<string>();
  keywords.forEach((keyword) => {
    const raw = (keyword || "").toString().toLowerCase();
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

const jaccardSimilarity = (a: string[], b: string[]): number => {
  const setA = new Set(normalizeKeywords(a));
  const setB = new Set(normalizeKeywords(b));
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  setA.forEach((val) => {
    if (setB.has(val)) intersection += 1;
  });
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

/**
 * Compute interest score contribution from topics.
 * - Subreddit match: full topic weight if post.subreddit is in topic.subreddits.
 * - Keyword match: topic.weight * Jaccard similarity of post keywords vs topic keywords.
 * Result is clamped to [0, 1].
 */
export const computeTopicScore = (
  post: PostDocument,
  topics: TopicConfig[]
): number => {
  const keywords = normalizeKeywords([
    ...(post.text_features?.keywords || []),
    post.query || "",
  ]);
  const subreddit = (post.subreddit || "").toString().toLowerCase();

  const total = topics.reduce((acc, topic) => {
    const topicWeight = Number.isFinite(topic.weight) ? Math.max(0, Math.min(1, topic.weight)) : 0;
    const topicName = (topic.name || "").toLowerCase();
    const topicSubreddits = normalizeKeywords(topic.subreddits || []);
    const topicKeywords = normalizeKeywords(topic.keywords || []);
    const topicTokens = normalizeKeywords([topicName, ...topicSubreddits, ...topicKeywords]);
    const subredditMatch =
      Boolean(subreddit) && (subreddit === topicName || topicSubreddits.includes(subreddit));
    const keywordSim = jaccardSimilarity(keywords, topicTokens);
    const topicScore = (subredditMatch ? topicWeight : 0) + topicWeight * keywordSim;
    return acc + topicScore;
  }, 0);

  return Math.max(0, Math.min(1, total));
};
