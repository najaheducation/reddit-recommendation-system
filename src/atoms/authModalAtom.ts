import { atom } from "recoil";

export interface AuthModelState {
  open: boolean;
  view: "login" | "signup" | "resetPassword";
}

const defaultModelState: AuthModelState = {
  open: false,
  view: "login",
};

const globalForAuthModal = globalThis as typeof globalThis & {
  __authModelState?: ReturnType<typeof atom<AuthModelState>>;
};

export const authModelState =
  globalForAuthModal.__authModelState ||
  (globalForAuthModal.__authModelState = atom<AuthModelState>({
    key: "authModelState",
    default: defaultModelState,
  }));
