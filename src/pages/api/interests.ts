import type { NextApiRequest, NextApiResponse } from "next";

import { getAuthToken, verifyAuthToken } from "../../lib/auth";
import { getInterestsCollection, toObjectId } from "../../lib/db";

export type UserInterest = {
  id?: string;
  interest: string;
  subInterest?: string;
  weight: number;
};

const getUserIdFromRequest = (req: NextApiRequest) => {
  const token = getAuthToken(req);
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      const objectId = toObjectId(String(payload.sub));
      if (objectId) return objectId;
    } catch {
      // fall through to dev fallback
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const headerId = req.headers["x-user-id"];
    const candidate = headerId ?? (req.body as any)?.userId ?? req.query.userId;
    const objectId = toObjectId(candidate ? String(candidate) : "");
    if (objectId) return objectId;
  }
  return null;
};

const sanitizeInterest = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const normalizeInterests = (raw: any): UserInterest[] => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();

  return raw
    .map((item) => {
      const interestInput =
        typeof item?.interest === "string"
          ? item.interest
          : typeof item === "string"
            ? item
            : "";
      const subInterestInput = typeof item?.subInterest === "string" ? item.subInterest : "";
      return {
        interest: sanitizeInterest(interestInput),
        subInterest: subInterestInput ? sanitizeInterest(subInterestInput) : undefined,
        weight: Number.isNaN(Number(item?.weight)) ? 0.6 : Number(item?.weight),
      };
    })
    .filter((item) => item.interest.length > 0)
    .filter((item) => {
      const key = `${item.interest}::${item.subInterest || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 100)
    .map((item) => ({
      ...item,
      weight: Math.min(1, Math.max(0, Number(item.weight))),
    }));
};

const readUserInterests = async (userId: ReturnType<typeof toObjectId>) => {
  if (!userId) return [];
  const col = await getInterestsCollection();
  const docs = await col
    .find({ userId })
    .sort({ weight: -1, interest: 1, subInterest: 1 })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    interest: doc.interest,
    subInterest: doc.subInterest || undefined,
    weight: doc.weight,
  })) as UserInterest[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ interests: UserInterest[]; userId?: string } | { error: string }>
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
      return res.status(200).json({ interests, userId: userId.toString() });
    }

    const incoming = normalizeInterests(req.body?.interests);

    if (!incoming.length) {
      return res
        .status(400)
        .json({ error: "At least one interest is required" });
    }

    const col = await getInterestsCollection();
    await col.deleteMany({ userId });

    await col.insertMany(
      incoming.map((item) => ({
        userId,
        interest: item.interest,
        subInterest: item.subInterest,
        weight: item.weight,
        createdAt: new Date(),
      }))
    );

    const interests = await readUserInterests(userId);
    return res.status(200).json({ interests, userId: userId.toString() });
  } catch (error) {
    console.error("Interests API error", error);
    return res.status(500).json({ error: "Failed to process interests" });
  }
}
