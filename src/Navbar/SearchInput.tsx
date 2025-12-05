import { SearchIcon } from "@chakra-ui/icons";
import {
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import React from "react";

type SearchInputProps = {
  user?: { uid?: string | null } | null;
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
};

const SearchInput: React.FC<SearchInputProps> = ({ user, value, onChange, onSubmit }) => {
  const bg = useColorModeValue("white", "rgba(255,255,255,0.06)");
  const iconColor = useColorModeValue("gray.400", "whiteAlpha.700");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");

  return (
    <Flex as="form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} flexGrow={1} maxWidth={user ? "auto" : "720px"} mr={3} align="center">
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color={iconColor} mb={1} />
        </InputLeftElement>
        <Input
          type="search"
          placeholder="Search communities, posts, people"
          fontSize="1rem"
          height="48px"
          bg={bg}
          border="1px solid"
          borderColor={border}
          borderRadius="16px"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          _placeholder={{ color: "gray.400" }}
          _hover={{
            borderColor: "brand.200",
            boxShadow: "0 12px 36px -20px rgba(30,136,255,0.45)",
            transform: "translateY(-1px)",
          }}
          _focus={{
            borderColor: "brand.400",
            boxShadow: "0 0 0 3px rgba(30,136,255,0.22)",
            transform: "translateY(0)",
          }}
        />
        <InputRightElement height="48px" pr={2}>
          <IconButton
            aria-label="search"
            icon={<SearchIcon />}
            size="sm"
            onClick={onSubmit}
            variant="ghost"
            color={iconColor}
            _hover={{ bg: "blackAlpha.50", transform: "scale(1.02)" }}
          />
        </InputRightElement>
      </InputGroup>
    </Flex>
  );
};
export default SearchInput;
