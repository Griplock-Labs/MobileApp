import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";

import { Spacing, Fonts } from "@/constants/theme";

interface ScreenHeaderProps {
  leftText?: string;
  rightText?: string;
  showBack?: boolean;
  onBack?: () => void;
}

function BackArrowIcon() {
  return (
    <Svg width={19} height={9} viewBox="0 0 19 9" fill="none">
      <Path
        d="M4.14648 0.146484C4.34172 -0.0487528 4.65825 -0.048703 4.85352 0.146484C5.04878 0.341747 5.04878 0.658253 4.85352 0.853516L1.70703 4H18.5C18.7761 4 19 4.22386 19 4.5C19 4.77612 18.7761 5 18.5 5H1.70703L4.85352 8.14648C5.04878 8.34175 5.04878 8.65825 4.85352 8.85352C4.65824 9.04865 4.3417 9.04873 4.14648 8.85352L0.146484 4.85352C0.112976 4.82 0.0874347 4.78162 0.0654297 4.74219C0.0252168 4.67017 9.80679e-06 4.58834 0 4.5C0 4.41137 0.0249792 4.32902 0.0654297 4.25684C0.0713863 4.2462 0.0762127 4.23488 0.0830078 4.22461L0.146484 4.14648L4.14648 0.146484Z"
        fill="white"
      />
    </Svg>
  );
}

export default function ScreenHeader({
  leftText = "back home",
  rightText,
  showBack = true,
  onBack,
}: ScreenHeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Home" }],
        })
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          {showBack ? (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <BackArrowIcon />
              <Text style={styles.leftText}>{leftText}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/images/griplock-logo-small.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <View style={styles.rightSection}>
          {rightText ? (
            <Text style={styles.rightText}>{rightText}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  leftSection: {
    minWidth: 100,
    zIndex: 10,
  },
  rightSection: {
    minWidth: 100,
    alignItems: "flex-end",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  leftText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "#FFFFFF",
  },
  logoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  logo: {
    width: 50,
    height: 50,
  },
  rightText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
