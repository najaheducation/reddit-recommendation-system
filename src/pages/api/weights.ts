import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthToken, verifyAuthToken } from "../../lib/auth";
import { getConfigCollection, toObjectId } from "../../lib/db";

type WeightPayload = {
  label: string;
  value: number;
  hint?: string;
};

type WeightsResponse =
  | { weights: WeightPayload[]; userId?: string; topics?: string[] }
  | { error: string };

const toCamelLabel = (label: string) => {
  const cleaned = label
    .toString()
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const parts = cleaned.split(" ");
  return parts
    .map((part, idx) => {
      const lower = part.toLowerCase();
      if (idx === 0) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
};

const getUserIdFromRequest = (req: NextApiRequest) => {
  const token = getAuthToken(req);
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      const objectId = toObjectId(String(payload.sub));
      if (objectId) return objectId;
    } catch {
      // fall through
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const candidate = req.headers["x-user-id"] ?? req.query.userId ?? (req.body as any)?.userId;
    const objectId = toObjectId(candidate ? String(candidate) : "");
    if (objectId) return objectId;
  }
  return null;
};

const normalizeWeights = (raw: any): Record<string, number> => {
  if (!Array.isArray(raw)) return {};

  const seen = new Set<string>();
  const weights: Record<string, number> = {};

  raw
    .map((item) => ({
      label: toCamelLabel(item?.label || ""),
      value: Number.isFinite(Number(item?.value)) ? Number(item.value) : 0,
    }))
    .filter((item) => item.label.length > 0)
    .forEach((item) => {
      if (seen.has(item.label)) return;
      seen.add(item.label);
      const normalized =
        item.value > 1 ? Math.max(0, Math.min(1, item.value / 100)) : Math.max(0, Math.min(1, item.value));
      weights[item.label] = normalized;
    });

  return weights;
};

const normalizeTopics = (raw: any): string[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const topics: string[] = [];

  raw
    .map((item) => (typeof item === "string" ? item : ""))
    .map((item) =>
      item
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
    )
    .filter(Boolean)
    .forEach((topic) => {
      if (seen.has(topic)) return;
      seen.add(topic);
      topics.push(topic);
    });

  return topics.slice(0, 100);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WeightsResponse>
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const col = await getConfigCollection();

    if (req.method === "GET") {
      const config = await col.findOne({ userId });
      const weights: WeightPayload[] = config?.weights
        ? Object.entries(config.weights).map(([label, value]) => ({
            label,
            value: (() => {
              const numeric = Number(value);
              if (!Number.isFinite(numeric)) return 0;
              if (numeric > 1) return Math.round(Math.min(numeric, 100));
              return Math.round(Math.max(0, numeric) * 100);
            })(),
          }))
        : [];
      return res.status(200).json({
        weights,
        topics: config?.topics || [],
        userId: userId.toString(),
      });
    }

    const weightsMap = normalizeWeights(req.body?.weights);
    const hasWeights = Object.keys(weightsMap).length > 0;

    if (!hasWeights) {
      return res.status(400).json({ error: "At least one weight is required" });
    }

    const topics = normalizeTopics(req.body?.topics);

    const update: Record<string, unknown> = {
      weights: weightsMap,
      updatedAt: new Date(),
    };

    if (topics.length) {
      update.topics = topics;
    }

    await col.updateOne(
      { userId },
      {
        $set: update,
        $setOnInsert: { userId, createdAt: new Date() },
      },
      { upsert: true }
    );

    const responseWeights: WeightPayload[] = Object.entries(weightsMap).map(([label, value]) => ({
      label,
      value: Math.round(value * 100),
    }));

    return res.status(200).json({
      weights: responseWeights,
      topics,
      userId: userId.toString(),
    });
  } catch (error) {
    console.error("Weights API error", error);
    return res.status(500).json({ error: "Failed to process weights" });
  }
}
