import { ChakraProvider } from "@chakra-ui/react";
import type { AppProps } from "next/app";
import React, { useEffect } from "react";
import { RecoilRoot, useSetRecoilState } from "recoil";

import { theme } from "../chakra/theme";
import Layout from "../components/Layout/Layout";
import { BasicUser, userState } from "../atoms/userAtom";
import { fetchCurrentUser } from "../utils/authClient";
import { clearUserCache, loadUserCache, saveUserCache } from "../utils/userCache";
import "../styles/globals.css";

const AuthStateLoader: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const setUser = useSetRecoilState(userState);

  useEffect(() => {
    let mounted = true;
    const cached = loadUserCache();
    if (cached) {
      setUser(cached);
    }

    const loadUser = async () => {
      try {
        const user = await fetchCurrentUser();
        if (mounted) {
          setUser(user as BasicUser | null);
          if (user) {
            saveUserCache(user as BasicUser);
          } else {
            clearUserCache();
          }
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          clearUserCache();
        }
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [setUser]);

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
