// Premium SaaS-inspired Chakra theme
import { extendTheme } from "@chakra-ui/react";
import { Button } from "./Button";

export const theme = extendTheme({
  initialColorMode: "system",
  useSystemColorMode: true,
  colors: {
    brand: {
      50: "#E7F6FF",
      100: "#C2E8FF",
      200: "#9CD8FF",
      300: "#6CC0FF",
      400: "#3AA4FF",
      500: "#1E88FF",
      600: "#0C6FDA",
      700: "#0A59AD",
      800: "#0A4A8A",
      900: "#0B3B6B",
    },
    accent: {
      50: "#E9FEF7",
      100: "#C4F7E8",
      200: "#93EBD6",
      300: "#5DD9C2",
      400: "#2BC6AD",
      500: "#12B497",
      600: "#0B947E",
      700: "#0A7867",
      800: "#0A5D52",
      900: "#084B44",
    },
    ink: {
      50: "#EEF2F6",
      100: "#D7DEE7",
      200: "#B8C3D4",
      300: "#93A5BC",
      400: "#6E85A3",
      500: "#566B8A",
      600: "#43536E",
      700: "#333F56",
      800: "#252D3F",
      900: "#111827",
    },
  },
  fonts: {
    heading:
      "Plus Jakarta Sans, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "Plus Jakarta Sans, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg:
          props.colorMode === "light"
            ? "linear-gradient(180deg, #F6F9FC 0%, #EFF3F9 40%, #E8EFF8 100%)"
            : "linear-gradient(180deg, #050B18 0%, #0B1224 35%, #0F172A 100%)",
        color: props.colorMode === "light" ? "#0F172A" : "#E2E8F0",
        fontFamily:
          "Plus Jakarta Sans, Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        transition: "background-color 0.2s, color 0.2s",
        minHeight: "100vh",
        letterSpacing: "-0.01em",
      },
      "*::placeholder": {
        color: props.colorMode === "light" ? "gray.400" : "gray.500",
      },
      "*, *::before, &::after": {
        borderColor: props.colorMode === "light" ? "gray.200" : "gray.700",
      },
    }),
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 8px 24px rgba(15, 23, 42, 0.08)",
    lg: "0 15px 40px rgba(15, 23, 42, 0.12)",
    xl: "0 25px 60px rgba(15, 23, 42, 0.16)",
    "2xl": "0 35px 90px rgba(15, 23, 42, 0.22)",
    outline: "0 0 0 3px rgba(30, 136, 255, 0.35)",
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
    card: "0 15px 50px -35px rgba(15, 23, 42, 0.45)",
    "card-hover": "0 25px 70px -50px rgba(15, 23, 42, 0.55)",
  },
  components: {
    Button,
    Input: {
      variants: {
        filled: (props: any) => ({
          field: {
            bg: props.colorMode === "light" ? "white" : "whiteAlpha.50",
            border: "1px solid",
            borderColor:
              props.colorMode === "light" ? "gray.200" : "whiteAlpha.200",
            borderRadius: "14px",
            boxShadow:
              props.colorMode === "light"
                ? "0 20px 60px -35px rgba(15,23,42,0.3)"
                : "0 30px 80px -45px rgba(0,0,0,0.65)",
            _hover: {
              borderColor:
                props.colorMode === "light" ? "brand.200" : "brand.400",
              transform: "translateY(-1px)",
            },
            _focus: {
              borderColor: "brand.400",
              boxShadow: "0 0 0 3px rgba(30,136,255,0.22)",
            },
          },
        }),
      },
      defaultProps: {
        variant: "filled",
        focusBorderColor: "brand.400",
      },
    },
    Card: {
      baseStyle: (props: any) => ({
        container: {
          bg:
            props.colorMode === "light"
              ? "white"
              : "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
          borderRadius: "18px",
          boxShadow:
            props.colorMode === "light"
              ? "0 25px 70px -45px rgba(15,23,42,0.6)"
              : "0 35px 90px -55px rgba(0,0,0,0.8)",
          border: "1px solid",
          borderColor:
            props.colorMode === "light" ? "gray.200" : "whiteAlpha.200",
          transition: "all 0.2s ease",
          backdropFilter: props.colorMode === "light" ? "none" : "blur(8px)",
          _hover: {
            boxShadow:
              props.colorMode === "light"
                ? "0 30px 80px -55px rgba(15,23,42,0.7)"
                : "0 45px 110px -70px rgba(0,0,0,0.85)",
            transform: "translateY(-3px)",
          },
        },
      }),
    },
    Tooltip: {
      baseStyle: {
        borderRadius: "10px",
        px: 3,
        py: 2,
        boxShadow: "lg",
      },
    },
    Divider: {
      baseStyle: {
        borderColor: "ink.100",
      },
    },
  },
  config: {
    cssVarPrefix: "reddit",
  },
});
