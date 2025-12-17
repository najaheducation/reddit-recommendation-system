import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../lib/db";

type CommentDto = {
  _id: string;
  query?: string | null;
  postId: string;
  postUrl?: string | null;
  parentId?: string | null;
  body?: string | null;
  author?: string | null;
  score?: number | null;
  created_utc?: string | null;
  url?: string | null;
  text_features?: { keywords?: string[] };
  keywords?: string[];
  has_links?: boolean | null;
  has_mentions?: boolean | null;
  comment_depth?: number | null;
  indexed_at?: string | null;
};

type CommentsResponse = { comments: CommentDto[] } | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CommentsResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const postIdParam = Array.isArray(req.query.postId)
    ? req.query.postId[0]
    : req.query.postId;

  if (!postIdParam) {
    return res.status(400).json({ error: "postId is required" });
  }

  try {
    const db = await getDb();
    const col = db.collection("comments");

    const docs = await col
      .find({ kind: "comment", postId: postIdParam.toString() })
      .sort({ created_utc: -1 })
      .toArray();

    const comments: CommentDto[] = docs.map((c: any) => ({
      _id: c._id?.toString?.() || c._id,
      query: c.query ?? null,
      postId: c.postId,
      postUrl: c.postUrl ?? null,
      parentId: c.parentId ?? null,
      body: c.body ?? null,
      author: c.author ?? null,
      score: typeof c.score === "number" ? c.score : null,
      created_utc: c.created_utc ?? null,
      url: c.url ?? null,
      text_features: c.text_features ?? {},
      keywords: Array.isArray(c.keywords) ? c.keywords : [],
      has_links: typeof c.has_links === "boolean" ? c.has_links : null,
      has_mentions: typeof c.has_mentions === "boolean" ? c.has_mentions : null,
      comment_depth:
        typeof c.comment_depth === "number" ? c.comment_depth : null,
      indexed_at: c.indexed_at ?? null,
    }));

    return res.status(200).json({ comments });
  } catch (error: any) {
    return res
      .status(500)
      .json({ error: error?.message || "Failed to load comments" });
  }
}
