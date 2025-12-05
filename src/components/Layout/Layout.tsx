import { Box } from "@chakra-ui/react";
import React from "react";
import Navbar from "../../Navbar/Navbar";

type LayoutProps = {
  children: any;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box position="relative" minH="100vh" zIndex={1}>
      <Navbar />
      <Box as="main" position="relative" zIndex={1}>
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
