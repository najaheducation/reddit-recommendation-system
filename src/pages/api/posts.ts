import type { NextApiRequest, NextApiResponse } from "next";

import type { Post } from "../../atoms/PostAtom";
import { getAuthToken, verifyAuthToken } from "../../lib/auth";
import { query } from "../../lib/db";

type DbPostRow = {
  id: string;
  kind?: string;
  query?: string;
  title?: string;
  body?: string | null;
  author?: string | null;
  score?: number | null;
  upvote_ratio?: number | null;
  num_comments?: number | null;
  subreddit?: string | null;
  created_utc?: string | Date | null;
  url?: string | null;
  flair?: string | null;
  over_18?: boolean | null;
  is_self?: boolean | null;
  spoiler?: boolean | null;
  locked?: boolean | null;
  is_video?: boolean | null;
  domain?: string | null;
  thumbnail?: string | null;
  url_overridden_by_dest?: string | null;
  media?: any;
  media_metadata?: any;
  gallery_data?: any;
  final_score?: number | null;
};

const POSTS_TABLE =
  (process.env.POSTS_TABLE || "reddit_posts").replace(/[^a-zA-Z0-9_]/g, "") ||
  "reddit_posts";
const SCORES_TABLE =
  (process.env.SCORES_TABLE || "post_scores").replace(/[^a-zA-Z0-9_]/g, "") ||
  "post_scores";

const getUserIdFromRequest = (req: NextApiRequest): number | null => {
  const token = getAuthToken(req);
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      return typeof payload.sub === "string" ? Number(payload.sub) : payload.sub;
    } catch {
      // fallback below
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const candidate = req.headers["x-user-id"] ?? req.query.userId ?? (req.body as any)?.userId;
    const num = Number(candidate);
    if (!Number.isNaN(num) && num > 0) return num;
  }
  return null;
};

const toSecondsTimestamp = (value?: string | Date | null) => {
  if (!value) return { seconds: Math.floor(Date.now() / 1000) };
  const date = value instanceof Date ? value : new Date(value);
  return { seconds: Math.floor(date.getTime() / 1000) };
};

const mapDbPostToClient = (row: DbPostRow): Post => ({
  id: row.id,
  communityId: row.subreddit || "all",
  creatorId: row.author || "anonymous",
  creatorDisplayName: row.author || "anonymous",
  title: row.title || "",
  body: row.body || "",
  numberOfComments: row.num_comments ?? 0,
  voteStatus: row.score ?? 0,
  imageURL: row.url_overridden_by_dest || undefined,
  communityImageURL: undefined,
  createdAt: toSecondsTimestamp(row.created_utc),
  score: row.final_score ?? row.score ?? 0,
  finalScore: row.final_score ?? undefined,
  userUpvote: false,
  userCommented: false,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const userId = getUserIdFromRequest(req);
    const communityIdParam = Array.isArray(req.query.communityId)
      ? req.query.communityId[0]
      : req.query.communityId;

    const limitParam = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;

    const values: any[] = [];
    const join =
      userId !== null
        ? `LEFT JOIN ${SCORES_TABLE} ps ON ps.post_id = p.id AND ps.user_id = $${values.push(
            userId
          )}`
        : `LEFT JOIN ${SCORES_TABLE} ps ON ps.post_id = p.id`;

    let sql = `SELECT p.*, ps.final_score FROM ${POSTS_TABLE} p ${join}`;

    const conditions: string[] = [];

    if (communityIdParam) {
      values.push(communityIdParam);
      conditions.push(`p.subreddit = $${values.length}`);
    }

    if (conditions.length) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    if (userId !== null) {
      sql += " ORDER BY ps.final_score DESC NULLS LAST, p.created_utc DESC";
    } else {
      sql += " ORDER BY p.created_utc DESC";
    }

    const limitNumber = limitParam ? parseInt(limitParam, 10) : undefined;
    if (limitNumber && !Number.isNaN(limitNumber)) {
      values.push(limitNumber);
      sql += ` LIMIT $${values.length}`;
    }

    const result = await query<DbPostRow>(sql, values);
    const posts: Post[] = result.rows.map(mapDbPostToClient);

    return res.status(200).json({ posts });
  } catch (error) {
    console.error("Failed to fetch posts", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
}
