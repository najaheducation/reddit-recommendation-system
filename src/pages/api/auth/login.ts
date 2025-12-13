import { NextApiRequest, NextApiResponse } from "next";

import {
  mapDbUserToClient,
  setAuthCookie,
  signAuthToken,
  verifyPassword,
} from "../../../lib/auth";
import { DbUserRow, query } from "../../../lib/db";

const USER_TABLE =
  (process.env.AUTH_USER_TABLE || "users").replace(/[^a-zA-Z0-9_]/g, "") ||
  "users";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const userResult = await query<DbUserRow>(
      `SELECT * FROM ${USER_TABLE} WHERE email = $1 LIMIT 1`,
      [email]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signAuthToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({ user: mapDbUserToClient(user) });
  } catch (error: any) {
    console.error("Login error", error);
    return res.status(500).json({ error: "Failed to login" });
  }
}
