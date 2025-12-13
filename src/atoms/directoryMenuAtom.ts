import { atom } from "recoil";
import { IconType } from "react-icons";
import { TiHome } from "react-icons/ti";

export type DirectoryMenuItem = {
  displayText: string;
  link: string;
  icon: IconType;
  iconColor: string;
  imageURL?: string;
};

interface DirectoryMenuState {
  isOpen: boolean;
  selectedMenuItem: DirectoryMenuItem;
}

export const defaultMenuItem = {
  displayText: "Home",
  link: "/",
  icon: TiHome,
  iconColor: "black",
};

export const defaultMenuState: DirectoryMenuState = {
  isOpen: false,
  selectedMenuItem: defaultMenuItem,
};

const globalForDirectory = globalThis as typeof globalThis & {
  __directoryMenuState?: ReturnType<typeof atom<DirectoryMenuState>>;
};

export const directoryMenuState =
  globalForDirectory.__directoryMenuState ||
  (globalForDirectory.__directoryMenuState = atom({
    key: "directoryMenuState",
    default: defaultMenuState,
  }));
