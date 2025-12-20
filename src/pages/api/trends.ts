import type { NextApiRequest, NextApiResponse } from "next";

import { getTrendsCollection } from "../../lib/db";

type TrendItem = {
  key: string;
  count: number;
};

type TrendsSuccessResponse = {
  trends: TrendItem[];
  topTerms: TrendItem[];
  topUsers: TrendItem[];
  updatedAt?: number;
  windowStart?: number;
  windowEnd?: number;
  windowBuckets?: number;
  bucketSizeMillis?: number;
  threshold?: number;
  trendiness: number;
};

type TrendsResponse = TrendsSuccessResponse | { error: string };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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
    if (typeof (value as { toString?: () => string }).toString === "function") {
      const parsed = Number((value as { toString: () => string }).toString());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
};

const toOptionalNumber = (value: any) => {
  const parsed = toNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toMillis = (value: any) => {
  if (!value) return undefined;
  if (value instanceof Date) return value.getTime();
  return toOptionalNumber(value);
};

const normalizeKey = (value: string) =>
  value
    .toString()
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeTrendKey = (value: string) => {
  const cleaned = normalizeKey(value).replace(/^term:/i, "").trim();
  if (!cleaned || cleaned.startsWith("user:")) return "";
  return `term:${cleaned}`;
};

const aggregateItems = (
  docs: any[],
  field: string,
  keyFormatter: (value: string) => string,
  limit = 200
): TrendItem[] => {
  const counts = new Map<string, number>();
  docs.forEach((doc) => {
    const items = Array.isArray(doc?.[field]) ? doc[field] : [];
    items.forEach((item: any) => {
      const key = keyFormatter(item?.key?.toString?.() || "");
      if (!key) return;
      const count = toNumber(item?.count, 0);
      if (!count) return;
      counts.set(key, (counts.get(key) || 0) + count);
    });
  });

  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

const computeTrendiness = (items: TrendItem[]) =>
  Math.round(items.reduce((sum, item) => sum + item.count, 0));

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrendsResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const col = await getTrendsCollection();
    const cutoff = Date.now() - WEEK_MS;
    const cutoffDate = new Date(cutoff);
    const docs = await col
      .find({
        $or: [
          { updatedAt: { $gte: cutoff } },
          { updatedAt: { $gte: cutoffDate } },
        ],
      })
      .toArray();

    const recentDocs = docs.filter((doc) => {
      const updatedAt = toMillis((doc as { updatedAt?: unknown }).updatedAt);
      return typeof updatedAt === "number" && updatedAt >= cutoff;
    });

    if (!recentDocs.length) {
      return res.status(200).json({
        trends: [],
        topTerms: [],
        topUsers: [],
        trendiness: 0,
      });
    }

    const latestDoc = recentDocs.reduce<any>((latest, current) => {
      const latestTime = toMillis(latest?.updatedAt) ?? 0;
      const currentTime = toMillis(current?.updatedAt) ?? 0;
      return currentTime > latestTime ? current : latest;
    }, null);

    const trends = aggregateItems(recentDocs, "trends", normalizeTrendKey, 200);
    const topTerms = aggregateItems(recentDocs, "topTerms", normalizeKey, 100);
    const topUsers = aggregateItems(recentDocs, "topUsers", normalizeKey, 100);

    return res.status(200).json({
      trends,
      topTerms,
      topUsers,
      updatedAt: toMillis((latestDoc as { updatedAt?: unknown })?.updatedAt),
      windowStart: toMillis((latestDoc as { windowStart?: unknown })?.windowStart),
      windowEnd: toMillis((latestDoc as { windowEnd?: unknown })?.windowEnd),
      windowBuckets: toOptionalNumber((latestDoc as { windowBuckets?: unknown })?.windowBuckets),
      bucketSizeMillis: toOptionalNumber((latestDoc as { bucketSizeMillis?: unknown })?.bucketSizeMillis),
      threshold: toOptionalNumber((latestDoc as { threshold?: unknown })?.threshold),
      trendiness: computeTrendiness(trends),
    });
  } catch (error) {
    console.error("Trends API error", error);
    return res.status(500).json({ error: "Failed to fetch trends" });
  }
}
