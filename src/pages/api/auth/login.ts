import { NextApiRequest, NextApiResponse } from "next";

import {
  mapDbUserToClient,
  setAuthCookie,
  signAuthToken,
  verifyPassword,
} from "../../../lib/auth";
import { getUsersCollection } from "../../../lib/db";

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
    const users = await getUsersCollection();
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await users.findOne({ email: normalizedEmail });

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
