import { NextApiRequest, NextApiResponse } from "next";

import {
  hashPassword,
  mapDbUserToClient,
  setAuthCookie,
  signAuthToken,
} from "../../../lib/auth";
import { getUsersCollection } from "../../../lib/db";

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
    const users = await getUsersCollection();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username).trim();

    const [existingByEmail, existingByUsername] = await Promise.all([
      users.findOne({ email: normalizedEmail }),
      users.findOne({ username: normalizedUsername }),
    ]);

    if (existingByEmail) {
      return res.status(409).json({ error: "A user with that email already exists" });
    }

    if (existingByUsername) {
      return res.status(409).json({ error: "Username is already taken" });
    }

    const hashedPassword = await hashPassword(password);

    const insertResult = await users.insertOne({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      createdAt: new Date(),
    });

    const newUser = {
      _id: insertResult.insertedId,
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
    };
    const token = signAuthToken(newUser);
    setAuthCookie(res, token);

    return res.status(201).json({ user: mapDbUserToClient(newUser) });
  } catch (error: any) {
    console.error("Register error", error);
    return res.status(500).json({ error: "Failed to register user" });
  }
}
