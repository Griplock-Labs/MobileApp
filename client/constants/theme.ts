import { Platform } from "react-native";

const cyanAccent = "#00CCCC";
const cyanGlow = "rgba(0, 204, 204, 0.4)";

export const Colors = {
  light: {
    text: "#FFFFFF",
    textSecondary: "#B3B3B3",
    textMuted: "#666666",
    buttonText: "#000000",
    tabIconDefault: "#747474",
    tabIconSelected: cyanAccent,
    link: cyanAccent,
    backgroundRoot: "#000000",
    backgroundDefault: "#0A0A0A",
    backgroundSecondary: "#141414",
    backgroundTertiary: "#1A1A1A",
    primary: cyanAccent,
    primaryGlow: cyanGlow,
    border: "#747474",
    success: cyanAccent,
    error: "#CC3333",
    warning: "#CCAA00",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#B3B3B3",
    textMuted: "#666666",
    buttonText: "#000000",
    tabIconDefault: "#747474",
    tabIconSelected: cyanAccent,
    link: cyanAccent,
    backgroundRoot: "#000000",
    backgroundDefault: "#0A0A0A",
    backgroundSecondary: "#141414",
    backgroundTertiary: "#1A1A1A",
    primary: cyanAccent,
    primaryGlow: cyanGlow,
    border: "#747474",
    success: cyanAccent,
    error: "#CC3333",
    warning: "#CCAA00",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700" as const,
  },
  subheading: {
    fontSize: 18,
    fontWeight: "500" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  mono: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
};

export const Fonts = {
  heading: "Orbitron_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  circular: {
    black: "CircularStd-Black",
    bold: "CircularStd-Bold",
    medium: "CircularStd-Medium",
    book: "CircularStd-Book",
  },
  astroSpace: "AstroSpace",
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
};

export const Shadows = {
  glow: {
    shadowColor: cyanAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  subtle: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
};
