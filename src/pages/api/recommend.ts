import type { NextApiRequest, NextApiResponse } from "next";
import { RecommendationRequest } from "../../lib/models/Post";
import { getRecommendations } from "../../lib/recommendationService";

type RecommendResponse = any[] | { error: string };

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
