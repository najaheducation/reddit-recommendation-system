import { NextApiRequest, NextApiResponse } from "next";

import { clearAuthCookie, getAuthToken, mapDbUserToClient } from "../../../lib/auth";
import { getUsersCollection, toObjectId } from "../../../lib/db";
import { fetchUserFromToken } from "../../../lib/services/authService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getAuthToken(req);
  const devUserId =
    process.env.NODE_ENV !== "production"
      ? (Array.isArray(req.headers["x-user-id"])
          ? req.headers["x-user-id"][0]
          : req.headers["x-user-id"]) ??
        (Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId)
      : null;

  const resolveUserById = async (userId: string) => {
    const users = await getUsersCollection();
    const objectId = toObjectId(userId);
    const query = objectId ? { _id: objectId } : { _id: userId as any };
    const user = await users.findOne(query);
    return user ? mapDbUserToClient(user) : null;
  };

  if (!token) {
    if (devUserId) {
      const user = await resolveUserById(String(devUserId));
      return res.status(200).json({ user });
    }
    return res.status(200).json({ user: null });
  }

  try {
    const user = await fetchUserFromToken(token);
    if (!user) {
      if (devUserId) {
        const fallback = await resolveUserById(String(devUserId));
        if (fallback) {
          return res.status(200).json({ user: fallback });
        }
      }
      clearAuthCookie(res);
      return res.status(200).json({ user: null });
    }
    return res.status(200).json({ user });
  } catch (error: any) {
    if (devUserId) {
      const fallback = await resolveUserById(String(devUserId));
      if (fallback) {
        return res.status(200).json({ user: fallback });
      }
    }
    clearAuthCookie(res);
    return res.status(200).json({ user: null });
  }
}
