import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthToken, verifyAuthToken } from "../../lib/auth";
import { getConfigCollection, getInterestsCollection, toObjectId } from "../../lib/db";
import {
  RecommendationRequest,
  RecommendationWeights,
  TopicConfig,
} from "../../lib/models/Post";
import { getRecommendations } from "../../lib/recommendationService";

type RecommendResponse = any[] | { error: string };

const normalizeWeightValue = (value: any) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num > 1) return Math.max(0, Math.min(1, num / 100));
  return Math.max(0, Math.min(1, num));
};

const sanitize = (value?: string | null) =>
  (value || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

const mapObjectTopics = (topics: any[] = []): TopicConfig[] =>
  topics
    .map((item) => {
      const keywords = Array.isArray(item?.keywords)
        ? item.keywords
            .map((k: any) =>
              k?.toString?.().toLowerCase?.().replace(/[^a-z0-9]+/g, "").trim?.()
            )
            .filter(Boolean)
        : [];
      const subreddits = Array.isArray(item?.subreddits)
        ? item.subreddits
            .map((k: any) =>
              k?.toString?.().toLowerCase?.().replace(/[^a-z0-9]+/g, "").trim?.()
            )
            .filter(Boolean)
        : [];
      const name =
        item?.name?.toString?.().toLowerCase?.().replace(/[^a-z0-9]+/g, "").trim?.() ||
        keywords[0] ||
        subreddits[0] ||
        "topic";
      return {
        name,
        weight: normalizeWeightValue(item?.weight ?? 0.5),
        subreddits,
        keywords,
      };
    })
    .filter((t) => t.keywords.length || t.subreddits.length || t.name);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecommendResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body as RecommendationRequest;

    const hasPayloadTopics = Array.isArray(body?.topics) && body.topics.length > 0;
    const hasPayloadWeights = !!body?.weights;

    if (!hasPayloadTopics || !hasPayloadWeights) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const recommendations = await getRecommendations(body);
    return res.status(200).json(recommendations);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Internal Server Error" });
  }
}
