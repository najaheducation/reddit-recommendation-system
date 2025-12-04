import { Flex, Image, useColorMode, useColorModeValue } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
// import { useAuthState } from "react-firebase-hooks/auth";

// import {
//   doc,
//   getDoc,
//   serverTimestamp,
//   setDoc,
//   Timestamp,
// } from "firebase/firestore";
import { defaultMenuItem } from "../atoms/directoryMenuAtom";
// import { auth, firestore } from "../firebase/clientApp";
import useDirectory from "../hooks/useDirectory";
import Directory from "./Directory/Directory";
import RightContent from "./RightContent/RightContent";
import SearchInput from "./SearchInput";
import { redditProfileImage } from "./store";

interface RedditUserDocument {
  userId?: string;
  userName: string;
  userEmail?: string;
  userImage: string;
  redditImage: string;
  timestamp: any; // Timestamp;
}

const Navbar: React.FC = () => {
  const [user, loading, error] = [null as any, false, null as any]; // useAuthState(auth);
  const [redditUserImage, setRedditUserImage] = useState("");
  const [userCreates, setUserCreate] = useState<boolean>(false);
  const { onSelectMenuItem } = useDirectory();
  const { colorMode } = useColorMode();
  const bg = useColorModeValue("white", "blackAlpha.800");

  const getUserData = async () => {
    // Firebase-backed navbar user data commented out for static demo mode.
  };

  const userCreate = async (session: any) => {
    // Firebase-backed navbar user creation commented out for static demo mode.
  };

  useEffect(() => {
    getUserData();

    setRedditUserImage(
      redditProfileImage[Math.floor(Math.random() * redditProfileImage.length)]
    );

    if (userCreates) {
      userCreate(user);
    } else return;
  }, [user, userCreates]);

  return (
    <Flex
      bg={bg}
      height="44px"
      padding="6px 12px"
      justify={{ md: "space-between" }}
    >
      <Flex
        align="center"
        width={{ base: "40px", md: "auto" }}
        mr={{ base: 0, md: 2 }}
        cursor="pointer"
        onClick={() => onSelectMenuItem(defaultMenuItem)}
      >
        <Image src="/images/redditFace.svg" height="30px" />
        <Image
          src={
            colorMode === "light"
              ? "/images/redditText.svg"
              : "/images/Reddit-Word-Dark.svg"
          }
          height="46px"
          display={{ base: "none", md: "unset" }}
        />
      </Flex>
      {user && <Directory />}
      <SearchInput user={user} />
      <RightContent user={user} />
    </Flex>
  );
};
export default Navbar;
