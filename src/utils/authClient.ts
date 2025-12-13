import { AuthResponse, AuthUser } from "../types/auth";

const headers = { "Content-Type": "application/json" };

const parseResponse = async (res: Response): Promise<AuthResponse> => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as AuthResponse;
};

export const login = async (email: string, password: string) => {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await parseResponse(res);
  return data.user as AuthUser;
};

export const registerUser = async (
  email: string,
  username: string,
  password: string
) => {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ email, username, password }),
  });
  const data = await parseResponse(res);
  return data.user as AuthUser;
};

export const fetchCurrentUser = async () => {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  const data = await parseResponse(res);
  return data.user as AuthUser | null;
};

export const logout = async () => {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
};
