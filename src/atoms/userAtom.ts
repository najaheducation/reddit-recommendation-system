import { atom } from "recoil";

export interface BasicUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const userState = atom<BasicUser | null>({
  key: "userState",
  default: null,
});

