import type { NextApiRequest, NextApiResponse } from "next";

import type { Post } from "../../atoms/PostAtom";
import { mockPosts as staticPosts } from "../../data/mockPosts";
import { getAuthToken, verifyAuthToken } from "../../lib/auth";
import { getInterestsCollection, toObjectId } from "../../lib/db";
import type { UserInterest } from "./interests";

const getUserIdFromRequest = (req: NextApiRequest): string | null => {
  const token = getAuthToken(req);
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      if (payload?.sub) return String(payload.sub);
    } catch {
      // fallback below
    }
  }
  if (process.env.NODE_ENV !== "production") {
    const candidate = req.headers["x-user-id"] ?? req.query.userId ?? (req.body as any)?.userId;
    if (candidate) return String(candidate);
  }
  return null;
};

const toSecondsTimestamp = (value?: string | Date | null) => {
  if (!value) return { seconds: Math.floor(Date.now() / 1000) };
  const date = value instanceof Date ? value : new Date(value);
  return { seconds: Math.floor(date.getTime() / 1000) };
};

const sanitize = (value?: string | null) =>
  (value || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, "");

const fetchUserInterests = async (userId?: string | null): Promise<UserInterest[]> => {
  if (!userId) return [];
  const objectId = toObjectId(userId);
  if (!objectId) return [];
  const col = await getInterestsCollection();
  const docs = await col.find({ userId: objectId }).toArray();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    interest: doc.interest,
    subInterest: doc.subInterest || undefined,
    weight: doc.weight,
  }));
};

const computeInterestBoost = (post: Post, interests: UserInterest[]) => {
  if (!interests.length) return 0;
  const haystack = sanitize(
    `${post.title || ""} ${post.body || ""} ${post.communityId || ""}`.toLowerCase()
  );

  return interests.reduce((acc, item) => {
    const key = sanitize(item.subInterest || item.interest);
    if (!key) return acc;
    const match = haystack.includes(key);
    return acc + (match ? Math.max(0.1, item.weight || 0) * 10 : 0);
  }, 0);
};

const mapPostToClient = (post: Post): Post => ({
  ...post,
  createdAt: toSecondsTimestamp(post.createdAt),
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
    const [userInterests] = await Promise.all([fetchUserInterests(userId)]);

    const communityIdParam = Array.isArray(req.query.communityId)
      ? req.query.communityId[0]
      : req.query.communityId;

    const limitParam = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;

    let posts = staticPosts;

    if (communityIdParam) {
      const normalizedCommunity = sanitize(communityIdParam);
      posts = posts.filter(
        (p) => sanitize(p.communityId) === normalizedCommunity
      );
    }

    const enriched = posts.map((post) => {
      const baseScore = post.score ?? post.voteStatus ?? 0;
      const boost = computeInterestBoost(post, userInterests);
      return {
        ...post,
        finalScore: baseScore + boost,
        score: baseScore,
      };
    });

    enriched.sort(
      (a, b) =>
        (b.finalScore ?? b.score ?? 0) - (a.finalScore ?? a.score ?? 0)
    );

    const limitNumber = limitParam ? parseInt(limitParam, 10) : undefined;
    const limited = limitNumber && !Number.isNaN(limitNumber)
      ? enriched.slice(0, limitNumber)
      : enriched;

    const postsResponse: Post[] = limited.map(mapPostToClient);

    return res.status(200).json({ posts: postsResponse });
  } catch (error) {
    console.error("Failed to fetch posts", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
}
