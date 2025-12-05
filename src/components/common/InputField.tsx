import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  useColorModeValue,
} from "@chakra-ui/react";
import React from "react";

type InputFieldProps = {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
  icon?: React.ElementType;
};

const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  icon,
}) => {
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const bg = useColorModeValue("white", "rgba(255,255,255,0.04)");
  const labelColor = useColorModeValue("gray.700", "gray.300");

  return (
    <FormControl id={id} isInvalid={Boolean(error)}>
      <HStack justify="space-between" mb={1}>
        <FormLabel m={0} fontWeight={700} color={labelColor} fontSize="sm">
          {label}
        </FormLabel>
      </HStack>
      <InputGroup>
        {icon && (
          <InputLeftElement pointerEvents="none">
            <Icon as={icon} color="gray.400" />
          </InputLeftElement>
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          bg={bg}
          border="1px solid"
          borderColor={border}
          borderRadius="12px"
          height="44px"
          _hover={{
            borderColor: "brand.200",
            boxShadow: "0 12px 36px -22px rgba(15,23,42,0.35)",
          }}
          _focus={{
            borderColor: "brand.400",
            boxShadow: "0 0 0 3px rgba(30,136,255,0.25)",
          }}
        />
      </InputGroup>
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
};

export default InputField;
