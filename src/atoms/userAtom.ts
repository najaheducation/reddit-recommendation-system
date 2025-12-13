import { atom } from "recoil";

export interface BasicUser {
  id: number;
  uid: string; // legacy-friendly string id
  username?: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

const globalForUser = globalThis as typeof globalThis & {
  __userState?: ReturnType<typeof atom<BasicUser | null>>;
};

export const userState =
  globalForUser.__userState ||
  (globalForUser.__userState = atom<BasicUser | null>({
    key: "userState",
    default: null,
  }));
