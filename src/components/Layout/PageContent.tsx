import { Flex } from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";

type PageContentProps = {
  children: React.ReactNode | React.ReactNode[];
};

const PageContent: React.FC<PageContentProps> = ({ children }) => {
  const router = useRouter();
  const hasProfileSidebar = Boolean(router.query?.uid);
  const [primaryContent, secondaryContent] = React.Children.toArray(children);

  return (
    <Flex
      justify="center"
      p={{ base: "18px", md: "32px" }}
      minH="calc(100vh - 72px)"
      position="relative"
      zIndex={1}
    >
      <Flex
        width="100%"
        maxWidth={hasProfileSidebar ? "1280px" : "1160px"}
        gap={{ base: 4, md: 8 }}
        align="flex-start"
      >
        <Flex
          direction="column"
          width={{ base: "100%", md: "68%" }}
          gap={{ base: 4, md: 5 }}
        >
          {primaryContent}
        </Flex>

        <Flex
          direction="column"
          display={{ base: "none", md: "flex" }}
          flexGrow={1}
          gap={{ base: 4, md: 5 }}
          maxW="360px"
        >
          {secondaryContent}
        </Flex>
      </Flex>
    </Flex>
  );
};
export default PageContent;
