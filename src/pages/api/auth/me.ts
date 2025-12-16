import { NextApiRequest, NextApiResponse } from "next";

import { clearAuthCookie, getAuthToken, mapDbUserToClient, verifyAuthToken } from "../../../lib/auth";
import { getUsersCollection, toObjectId } from "../../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getAuthToken(req);

  if (!token) {
    return res.status(200).json({ user: null });
  }

  try {
    const payload = verifyAuthToken(token);
    const userId = toObjectId(String(payload.sub));
    if (!userId) {
      clearAuthCookie(res);
      return res.status(200).json({ user: null });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ _id: userId });

    if (!user) {
      clearAuthCookie(res);
      return res.status(200).json({ user: null });
    }

    return res.status(200).json({ user: mapDbUserToClient(user) });
  } catch (error: any) {
    clearAuthCookie(res);
    return res.status(200).json({ user: null });
  }
}
