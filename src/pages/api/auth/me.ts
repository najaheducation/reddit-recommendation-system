import { NextApiRequest, NextApiResponse } from "next";

import { clearAuthCookie, getAuthToken, mapDbUserToClient, verifyAuthToken } from "../../../lib/auth";
import { DbUserRow, query } from "../../../lib/db";

const USER_TABLE =
  (process.env.AUTH_USER_TABLE || "users").replace(/[^a-zA-Z0-9_]/g, "") ||
  "users";

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
    const userResult = await query<DbUserRow>(
      `SELECT id, username, email, password FROM ${USER_TABLE} WHERE id = $1 LIMIT 1`,
      [payload.sub]
    );

    const user = userResult.rows[0];

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
