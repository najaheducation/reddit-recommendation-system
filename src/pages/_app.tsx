import { ChakraProvider } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import React, { useEffect } from "react";
import { RecoilRoot, useSetRecoilState } from "recoil";
import { useAuthState } from "react-firebase-hooks/auth";

import { theme } from "../chakra/theme";
import Layout from "../components/Layout/Layout";
import { BasicUser, userState } from "../atoms/userAtom";
import { auth } from "../firebase/clientApp";
import "../styles/globals.css";

const AuthStateLoader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user] = useAuthState(auth);
  const setUser = useSetRecoilState(userState);

  useEffect(() => {
    const basicUser: BasicUser | null = user
      ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }
      : null;
    setUser(basicUser);
  }, [setUser, user]);

  return <>{children}</>;
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <RecoilRoot>
      <ChakraProvider theme={theme}>
        <AuthStateLoader>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </AuthStateLoader>
      </ChakraProvider>
    </RecoilRoot>
  );
}

export default MyApp;
