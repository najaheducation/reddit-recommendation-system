import type { NextApiRequest, NextApiResponse } from "next";

import { getDb } from "../../lib/db";

type QueryTopic = {
  topic: string;
  count: number;
};

type QueryTopicsResponse = { topics: QueryTopic[] } | { error: string };

const normalizeQuery = (value: unknown) =>
  (value || "")
    .toString()
    .trim()
    .toLowerCase();

const parseLimit = (value: unknown) => {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] : String(value), 10);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(1, Math.min(100, parsed));
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QueryTopicsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const db = await getDb();
    const posts = db.collection("posts");
    const limit = parseLimit(req.query.limit);

    const docs = await posts
      .find(
        { kind: "post", query: { $ne: null } },
        { projection: { query: 1 } }
      )
      .toArray();

    const counts = new Map<string, number>();

    docs.forEach((doc) => {
      const topic = normalizeQuery((doc as { query?: unknown }).query);
      if (!topic) return;
      counts.set(topic, (counts.get(topic) || 0) + 1);
    });

    const topics = Array.from(counts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
      .slice(0, limit);

    return res.status(200).json({ topics });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Failed to load query topics" });
  }
}
