import { PostDocument } from "../models/Post";

export type TrendIndex = {
  termCounts: Map<string, number>;
  maxCount: number;
};

const toNumber = (value: any, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object") {
    if ("$numberLong" in value) {
      const parsed = Number((value as { $numberLong?: string }).$numberLong);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
      const parsed = (value as { toNumber: () => number }).toNumber();
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
};

const toMillis = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTrendKey = (value: string) =>
  value
    .toString()
    .toLowerCase()
    .replace(/^term:/, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeText = (value?: string | null) =>
  (value || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const buildPostText = (post: PostDocument) => {
  const parts = [
    post.query,
    post.title,
    post.body,
    post.selftext,
    post.text_features?.topic_category || "",
    ...(post.text_features?.keywords || []),
  ];
  return parts.map(normalizeText).filter(Boolean).join(" ");
};

const buildPostTokens = (post: PostDocument) => {
  const text = buildPostText(post);
  const tokens = new Set(text.split(" ").filter(Boolean));
  return { text, tokens };
};

export const buildTrendIndexFromDoc = (doc: any): TrendIndex => {
  return buildTrendIndexFromDocs([doc]);
};

export const buildTrendIndexFromDocs = (docs: any[], cutoffMs?: number): TrendIndex => {
  const termCounts = new Map<string, number>();
  let maxCount = 0;

  docs.forEach((doc) => {
    if (cutoffMs) {
      const updatedAt = toMillis(doc?.updatedAt);
      if (!updatedAt || updatedAt < cutoffMs) return;
    }
    const raw = (doc as { trends?: unknown }).trends ?? [];
    const items = Array.isArray(raw) ? raw : [];
    items.forEach((item: any) => {
      const key = normalizeTrendKey(item?.key || "");
      if (!key || key.startsWith("user:")) return;
      const count = toNumber(item?.count, 0);
      if (!count) return;
      const next = (termCounts.get(key) || 0) + count;
      termCounts.set(key, next);
      if (next > maxCount) maxCount = next;
    });
  });

  return { termCounts, maxCount };
};

export const computeTrendScore = (post: PostDocument, trendIndex: TrendIndex): number => {
  if (!trendIndex.maxCount || trendIndex.termCounts.size === 0) return 0;
  const { text, tokens } = buildPostTokens(post);
  const padded = ` ${text} `;
  let score = 0;
  trendIndex.termCounts.forEach((count, term) => {
    if (!count) return;
    if (term.includes(" ")) {
      if (padded.includes(` ${term} `)) {
        score += count / trendIndex.maxCount;
      }
      return;
    }
    if (tokens.has(term)) {
      score += count / trendIndex.maxCount;
    }
  });
  return Math.min(1, score);
};
