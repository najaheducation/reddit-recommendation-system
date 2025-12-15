import bcrypt from "bcryptjs";
import { parse, serialize } from "cookie";
import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

import { UserDocument } from "./db";

export const AUTH_COOKIE = "redditpulse_token";

const getJwtSecret = () => {
  const secret = process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET;
  return secret || "dev-secret";
};

export const hashPassword = (password: string) => bcrypt.hash(password, 10);

export const verifyPassword = async (input: string, stored: string) => {
  if (stored.startsWith("$2")) {
    return bcrypt.compare(input, stored);
  }
  return input === stored;
};

export const signAuthToken = (user: UserDocument) =>
  jwt.sign(
    { sub: user._id.toString(), email: user.email, username: user.username },
    getJwtSecret(),
    { expiresIn: "7d" }
  );

export const mapDbUserToClient = (user: UserDocument) => ({
  id: user._id.toString(),
  uid: user._id.toString(),
  username: user.username,
  email: user.email,
  displayName: user.username || user.email,
  photoURL: null as string | null,
});

export const setAuthCookie = (res: NextApiResponse, token: string) => {
  const cookie = serialize(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  res.setHeader("Set-Cookie", cookie);
};

export const clearAuthCookie = (res: NextApiResponse) => {
  res.setHeader(
    "Set-Cookie",
    serialize(AUTH_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    })
  );
};

export const getAuthToken = (req: NextApiRequest) => {
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  return cookies[AUTH_COOKIE];
};

export const verifyAuthToken = (token: string) =>
  jwt.verify(token, getJwtSecret()) as {
    sub: string;
    email: string;
    username: string;
    iat: number;
    exp: number;
  };
