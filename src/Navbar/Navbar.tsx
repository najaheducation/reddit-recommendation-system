import {
  Avatar,
  Box,
  Flex,
  HStack,
  Icon,
  Image,
  Text,
  useColorModeValue,
  useOutsideClick,
  useColorMode,
} from "@chakra-ui/react";
import React, { useMemo, useRef, useState } from "react";
import { BsChatDots } from "react-icons/bs";
import { FiBell, FiChevronDown, FiHome, FiMoon, FiPlusCircle, FiSun } from "react-icons/fi";
import { IoHeartOutline, IoBarChartOutline } from "react-icons/io5";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { useRecoilValue, useSetRecoilState } from "recoil";

import { defaultMenuItem } from "../atoms/directoryMenuAtom";
import { authModelState } from "../atoms/authModalAtom";
import { userState } from "../atoms/userAtom";
import { auth } from "../firebase/clientApp";
import useDirectory from "../hooks/useDirectory";
import PrimaryButton from "../components/common/PrimaryButton";
import AuthModel from "../components/Modal/Auth/AuthModel";
import SearchInput from "./SearchInput";

const Navbar: React.FC = () => {
  const user = useRecoilValue(userState);
  const setAuthModalState = useSetRecoilState(authModelState);
  const { onSelectMenuItem } = useDirectory();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue("rgba(255,255,255,0.9)", "rgba(7,11,22,0.9)");
  const borderColor = useColorModeValue("blackAlpha.100", "whiteAlpha.200");
  const logoText = useColorModeValue("#0F172A", "white");
  const pillBg = useColorModeValue("whiteAlpha.800", "whiteAlpha.100");
  const pillBorder = useColorModeValue("gray.200", "whiteAlpha.200");

  useOutsideClick({
    ref: profileRef,
    handler: () => setProfileOpen(false),
  });

  const IconButton = ({
    icon,
    onClick,
    active,
  }: {
    icon: React.ElementType;
    onClick?: () => void;
    active?: boolean;
  }) => (
    <Flex
      as="button"
      align="center"
      justify="center"
      w="40px"
      h="40px"
      borderRadius="14px"
      bg="whiteAlpha.70"
      _dark={{ bg: "whiteAlpha.100" }}
      border="1px solid"
      borderColor={active ? "brand.300" : "whiteAlpha.300"}
      transition="all 0.2s ease"
      boxShadow="0 8px 24px -16px rgba(15,23,42,0.4)"
      _hover={{ transform: "translateY(-1px)", boxShadow: "md", bg: "white" }}
      _active={{ transform: "scale(0.97)" }}
      onClick={onClick}
    >
      <Icon as={icon} fontSize="18px" color={logoText} />
    </Flex>
  );

  const go = (path: string) => router.push(path);
  const isActive = useMemo(
    () => (path: string) => router.pathname === path,
    [router.pathname]
  );

  const handleSearch = () => {
    if (!searchValue.trim()) return;
    router.push(`/search?query=${encodeURIComponent(searchValue.trim())}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setProfileOpen(false);
  };

  return (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={1000}
      bg={bg}
      backdropFilter="blur(18px)"
      borderBottom="1px solid"
      borderColor={borderColor}
      boxShadow="0 12px 40px -28px rgba(15,23,42,0.35)"
    >
      <AuthModel />
      <Flex
        height="80px"
        px={{ base: 4, md: 8 }}
        align="center"
        gap={4}
        justify="space-between"
      >
        <HStack spacing={4} align="center" minW={{ md: "280px" }}>
          <HStack
            spacing={3}
            align="center"
            cursor="pointer"
            onClick={() => go("/")}
            _hover={{ opacity: 0.9, transform: "translateY(-1px)" }}
            transition="all 0.2s ease"
          >
            <Flex
              align="center"
              justify="center"
              w="44px"
              h="44px"
              borderRadius="14px"
              bgGradient="linear(to-br, brand.500, accent.500)"
              boxShadow="0 12px 36px -18px rgba(30,136,255,0.55)"
            >
              <Image src="/images/redditFace.svg" height="26px" alt="Reddit Pulse logo" />
            </Flex>
            <Text
              fontSize="lg"
              fontWeight={800}
              letterSpacing="-0.04em"
              display={{ base: "none", md: "block" }}
              color={logoText}
            >
              Reddit Pulse
            </Text>
          </HStack>

          <Flex
            align="center"
            gap={2}
            px={3}
            py={2}
            borderRadius="14px"
            bg={pillBg}
            border="1px solid"
            borderColor={pillBorder}
            cursor="pointer"
            _hover={{ boxShadow: "md", transform: "translateY(-1px)" }}
            transition="all 0.2s ease"
            onClick={() => go("/")}
          >
            <Icon as={FiHome} fontSize="18px" />
            <Text fontWeight={700} fontSize="sm">
              Home
            </Text>
            <Icon as={FiChevronDown} fontSize="16px" />
          </Flex>
        </HStack>

        <Flex flex="1" maxW="720px" px={{ base: 0, md: 2 }}>
          <SearchInput
            user={user}
            value={searchValue}
            onChange={setSearchValue}
            onSubmit={handleSearch}
          />
        </Flex>

        <HStack spacing={3} align="center">
          <IconButton
            icon={colorMode === "light" ? FiMoon : FiSun}
            onClick={toggleColorMode}
            active={false}
          />
          <IconButton icon={IoHeartOutline} onClick={() => go("/interests")} active={isActive("/interests")} />
          <IconButton icon={IoBarChartOutline} onClick={() => go("/metrics")} active={isActive("/metrics")} />
          <IconButton icon={FiBell} onClick={() => go("/notifications")} active={isActive("/notifications")} />
          <IconButton icon={BsChatDots} onClick={() => go("/messages")} active={isActive("/messages")} />
          <IconButton icon={FiPlusCircle} onClick={() => go("/create")} active={isActive("/create")} />

          {user ? (
            <Flex
              ref={profileRef}
              align="center"
              gap={3}
              px={3}
              py={2}
              borderRadius="16px"
              bg="whiteAlpha.80"
              _dark={{ bg: "whiteAlpha.100" }}
              border="1px solid"
              borderColor="whiteAlpha.300"
              transition="all 0.2s ease"
              _hover={{ boxShadow: "md", transform: "translateY(-1px)" }}
              onClick={() => setProfileOpen((prev) => !prev)}
            >
              <Avatar
                size="sm"
                name={user.displayName || user.email || "User"}
                src={user.photoURL || undefined}
              />
              <Box textAlign="left">
                <Text fontWeight={700} fontSize="sm">
                  {user.displayName || user.email?.split("@")[0]}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  Karma • 12.3k
                </Text>
              </Box>
              <Icon as={FiChevronDown} fontSize="16px" color="gray.500" />
              {profileOpen && (
                <Box
                  position="absolute"
                  top="64px"
                  right={0}
                  bg="white"
                  _dark={{ bg: "gray.800" }}
                  borderRadius="14px"
                  boxShadow="xl"
                  border="1px solid"
                  borderColor="whiteAlpha.300"
                  minW="200px"
                  p={2}
                  zIndex={10}
                >
                  {[
                    { label: "Profile", action: () => go("/profile") },
                    { label: "Settings", action: () => go("/settings") },
                    { label: "Logout", action: handleLogout },
                  ].map((item) => (
                    <Flex
                      key={item.label}
                      px={3}
                      py={2}
                      borderRadius="10px"
                      cursor="pointer"
                      _hover={{ bg: "blackAlpha.50" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileOpen(false);
                        item.action();
                      }}
                    >
                      <Text fontWeight={600}>{item.label}</Text>
                    </Flex>
                  ))}
                </Box>
              )}
            </Flex>
          ) : (
            <PrimaryButton
              height="44px"
              px={5}
              onClick={() => setAuthModalState({ open: true, view: "login" })}
            >
              Log in
            </PrimaryButton>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};
export default Navbar;
