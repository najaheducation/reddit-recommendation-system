import { NextApiRequest, NextApiResponse } from "next";

import { setAuthCookie } from "../../../lib/auth";
import { registerAccount } from "../../../lib/services/authService";

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
    const { user, token } = await registerAccount(email, username, password);
    setAuthCookie(res, token);
    return res.status(201).json({ user });
  } catch (error: any) {
    const message = error?.message || "Failed to register user";
    const status = message.includes("exists") || message.includes("taken") ? 409 : 500;
    return res.status(status).json({ error: message });
  }
}
