import { Button, ButtonProps } from "@chakra-ui/react";
import React from "react";

const PrimaryButton: React.FC<ButtonProps> = ({ children, ...rest }) => {
  return (
    <Button
      height="48px"
      borderRadius="14px"
      fontWeight={800}
      bgGradient="linear(to-r, brand.500, accent.500)"
      color="white"
      _hover={{
        bgGradient: "linear(to-r, brand.600, accent.600)",
        boxShadow: "xl",
        transform: "translateY(-1px)",
      }}
      _active={{
        transform: "translateY(0px)",
      }}
      {...rest}
    >
      {children}
    </Button>
  );
};

export default PrimaryButton;
