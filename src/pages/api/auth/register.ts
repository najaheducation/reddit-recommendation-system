import { NextApiRequest, NextApiResponse } from "next";

import {
  hashPassword,
  mapDbUserToClient,
  setAuthCookie,
  signAuthToken,
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

  const { email, password, username } = req.body || {};

  if (!email || !password || !username) {
    return res
      .status(400)
      .json({ error: "Email, username, and password are required" });
  }

  try {
    const [existingByEmail, existingByUsername] = await Promise.all([
      query<DbUserRow>(`SELECT * FROM ${USER_TABLE} WHERE email = $1 LIMIT 1`, [
        email,
      ]),
      query<DbUserRow>(`SELECT * FROM ${USER_TABLE} WHERE username = $1 LIMIT 1`, [
        username,
      ]),
    ]);

    if (existingByEmail.rowCount && existingByEmail.rows[0]) {
      return res.status(409).json({ error: "A user with that email already exists" });
    }

    if (existingByUsername.rowCount && existingByUsername.rows[0]) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    const hashedPassword = await hashPassword(password);

    const insertResult = await query<DbUserRow>(
      `INSERT INTO ${USER_TABLE} (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, password`,
      [username, email, hashedPassword]
    );

    const newUser = insertResult.rows[0];
    const token = signAuthToken(newUser);
    setAuthCookie(res, token);

    return res.status(201).json({ user: mapDbUserToClient(newUser) });
  } catch (error: any) {
    console.error("Register error", error);
    return res.status(500).json({ error: "Failed to register user" });
  }
}
