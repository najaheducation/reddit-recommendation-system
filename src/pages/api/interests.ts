import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthToken, verifyAuthToken } from "../../lib/auth";
import { query } from "../../lib/db";

type DbInterestRow = {
  id: number;
  user_id: number;
  interest: string;
  weight: number;
};

export type UserInterest = {
  id?: number;
  interest: string;
  weight: number;
};

const INTERESTS_TABLE =
  (process.env.INTERESTS_TABLE || "user_interests").replace(
    /[^a-zA-Z0-9_]/g,
    ""
  ) || "user_interests";

const getUserIdFromRequest = (req: NextApiRequest): number | null => {
  const token = getAuthToken(req);
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      return typeof payload.sub === "string" ? Number(payload.sub) : payload.sub;
    } catch {
      // fall through to dev fallback
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const headerId = req.headers["x-user-id"];
    const candidate = headerId ?? (req.body as any)?.userId ?? req.query.userId;
    const num = Number(candidate);
    if (!Number.isNaN(num) && num > 0) {
      return num;
    }
  }
  return null;
};

const sanitizeInterest = (value: string) => {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return cleaned;
};

const normalizeInterests = (raw: any): UserInterest[] => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();

  return raw
    .map((item) => ({
      interest: sanitizeInterest(
        typeof item?.interest === "string"
          ? item.interest
          : typeof item === "string"
            ? item
            : ""
      ),
      weight: Number.isNaN(Number(item?.weight)) ? 0.6 : Number(item?.weight),
    }))
    .filter((item) => item.interest.length > 0)
    .filter((item) => {
      if (seen.has(item.interest)) return false;
      seen.add(item.interest);
      return true;
    })
    .slice(0, 50)
    .map((item) => ({
      ...item,
      weight: Math.min(1, Math.max(0, Number(item.weight))),
    }));
};

const readUserInterests = async (userId: number) => {
  const result = await query<DbInterestRow>(
    `SELECT id, user_id, interest, weight FROM ${INTERESTS_TABLE} WHERE user_id = $1 ORDER BY weight DESC, interest ASC`,
    [userId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    interest: row.interest,
    weight: row.weight,
  })) as UserInterest[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ interests: UserInterest[]; userId?: number } | { error: string }>
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const interests = await readUserInterests(userId);
      return res.status(200).json({ interests, userId });
    }

    const incoming = normalizeInterests(req.body?.interests);

    if (!incoming.length) {
      return res
        .status(400)
        .json({ error: "At least one interest is required" });
    }

    await query(`DELETE FROM ${INTERESTS_TABLE} WHERE user_id = $1`, [userId]);

    const values: any[] = [];
    const placeholders: string[] = [];

    incoming.forEach((item, idx) => {
      const base = idx * 3;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      values.push(userId, item.interest, item.weight);
    });

    await query(
      `INSERT INTO ${INTERESTS_TABLE} (user_id, interest, weight) VALUES ${placeholders.join(
        ", "
      )}`,
      values
    );

    const interests = await readUserInterests(userId);
    return res.status(200).json({ interests, userId });
  } catch (error) {
    console.error("Interests API error", error);
    return res.status(500).json({ error: "Failed to process interests" });
  }
}
