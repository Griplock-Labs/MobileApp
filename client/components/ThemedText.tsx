import { Text, type TextProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { Typography, Fonts } from "@/constants/theme";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "display" | "heading" | "subheading" | "body" | "caption" | "mono";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useTheme();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "display":
        return { ...Typography.display, fontFamily: Fonts.heading };
      case "heading":
        return { ...Typography.heading, fontFamily: Fonts.heading };
      case "subheading":
        return { ...Typography.subheading, fontFamily: Fonts.bodyMedium };
      case "body":
        return { ...Typography.body, fontFamily: Fonts.body };
      case "caption":
        return { ...Typography.caption, fontFamily: Fonts.body };
      case "mono":
        return { ...Typography.mono, fontFamily: Fonts.mono };
      default:
        return { ...Typography.body, fontFamily: Fonts.body };
    }
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), style]} {...rest} />
  );
}
