import type { BasicUser } from "../atoms/userAtom";

const KEY = "redditpulse_user";

export const saveUserCache = (user: BasicUser) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // ignore storage failures
  }
};

export const loadUserCache = (): BasicUser | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BasicUser> & { id?: string | number };
    if (parsed && parsed.id !== undefined && parsed.id !== null) {
      parsed.id = String(parsed.id);
      parsed.uid = parsed.uid || String(parsed.id);
    }
    return parsed as BasicUser;
  } catch {
    return null;
  }
};

export const clearUserCache = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
