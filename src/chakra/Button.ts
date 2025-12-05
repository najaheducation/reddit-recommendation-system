import type { ComponentStyleConfig } from "@chakra-ui/theme";

export const Button: ComponentStyleConfig = {
  baseStyle: {
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
    transition: "all 0.2s ease-in-out",
    _focus: {
      boxShadow: "0 0 0 3px rgba(30, 136, 255, 0.3)",
    },
    _active: {
      transform: "scale(0.98)",
    },
  },
  sizes: {
    sm: {
      fontSize: "12px",
      height: "32px",
      px: "16px",
    },
    md: {
      fontSize: "14px",
      height: "40px",
      px: "24px",
    },
    lg: {
      fontSize: "16px",
      height: "48px",
      px: "32px",
    },
  },
  variants: {
    solid: {
      color: "white",
      bgGradient: "linear(to-r, brand.500, accent.500)",
      _hover: {
        bgGradient: "linear(to-r, brand.600, accent.600)",
        transform: "translateY(-1px)",
        boxShadow: "xl",
      },
      _active: {
        bgGradient: "linear(to-r, brand.700, accent.700)",
        boxShadow: "md",
      },
    },
    outline: {
      color: "brand.600",
      border: "1.5px solid",
      borderColor: "brand.200",
      bg: "transparent",
      _hover: {
        bg: "brand.50",
        borderColor: "brand.400",
        color: "brand.700",
      },
    },
    ghost: {
      color: "brand.600",
      bg: "transparent",
      _hover: {
        bg: "blackAlpha.50",
      },
    },
    oauth: {
      height: "44px",
      border: "1px solid",
      borderColor: "gray.300",
      borderRadius: "8px",
      _hover: {
        bg: "gray.50",
        borderColor: "gray.400",
      },
      _dark: {
        borderColor: "gray.600",
        _hover: {
          bg: "gray.800",
          borderColor: "gray.500",
        },
      },
    },
    brand: {
      color: "white",
      bgGradient: "linear(to-r, brand.500, brand.400)",
      _hover: {
        bgGradient: "linear(to-r, brand.600, brand.500)",
        transform: "translateY(-1px)",
        boxShadow: "xl",
      },
    },
  },
  defaultProps: {
    variant: "solid",
    size: "md",
  },
};
