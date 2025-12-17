import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../lib/db";

type TopicsResponse = { topics: string[] } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TopicsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const db = await getDb();
    const posts = db.collection("posts");

    const rawTopics = await posts.distinct("subreddit", {
      kind: "post",
      subreddit: { $nin: [null, ""] },
    });

    const topics = Array.from(
      new Set(
        rawTopics
          .map((t) => (t as any)?.toString?.().trim?.() || "")
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return res.status(200).json({ topics });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Failed to load topics" });
  }
}
