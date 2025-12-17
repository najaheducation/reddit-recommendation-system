import { NextApiRequest, NextApiResponse } from "next";

import { setAuthCookie } from "../../../lib/auth";
import { loginAccount } from "../../../lib/services/authService";

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
    const { user, token } = await loginAccount(email, password);
    setAuthCookie(res, token);
    return res.status(200).json({ user });
  } catch (error: any) {
    const message = error?.message || "Failed to login";
    const status = message === "Invalid email or password" ? 401 : 500;
    return res.status(status).json({ error: message });
  }
}
