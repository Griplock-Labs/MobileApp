import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

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

function GriplockLogo() {
  return (
    <Svg width={50} height={50} viewBox="0 0 50 50" fill="none">
      <Path
        d="M16.585 8.07031C16.5834 8.07109 16.5816 8.07149 16.5801 8.07227L24.8525 16.3379L20.6055 20.5801L11.6445 11.6279C8.2177 15.0498 6.09668 19.7769 6.09668 25C6.09668 35.4429 14.5701 43.9082 25.0225 43.9082C32.2135 43.9082 38.4664 39.901 41.6689 34H22.7705V28H49.8652C48.3818 40.3926 37.8258 50 25.0225 50C11.2029 50 4.75598e-07 38.8071 0 25C0 15.9178 4.84766 7.96711 12.0986 3.58887L16.585 8.07031ZM47.3682 13.7402C48.8669 16.7035 49.794 20.005 50.001 23.5H37.8027L47.3682 13.7402ZM41.2178 5.94336C42.5805 7.10061 43.8183 8.40072 44.9062 9.82129L34.5459 20.3896L30.7627 16.6094L41.2178 5.94336ZM32.2197 1.04883C34.0754 1.60468 35.8403 2.37117 37.4873 3.31836L27.5771 13.4277L23.792 9.64648L32.2197 1.04883ZM25.0225 0C25.6463 9.07155e-06 26.2656 0.0215703 26.8779 0.0664062L20.6074 6.46387L15.8662 1.72656C18.7019 0.612097 21.7908 3.73014e-05 25.0225 0Z"
        fill="url(#paint0_linear_381_36)"
      />
      <Defs>
        <LinearGradient
          id="paint0_linear_381_36"
          x1="25.0005"
          y1="0"
          x2="25.0005"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#DBE4ED" />
          <Stop offset="1" stopColor="#A3BAD2" />
        </LinearGradient>
      </Defs>
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
    <View style={[styles.container, { paddingTop: insets.top + 28 }]}>
      <View style={styles.header}>
        <View style={styles.leftSection}>
          {showBack ? (
            <Pressable 
              onPress={handleBack} 
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <BackArrowIcon />
              <Text style={styles.leftText}>{leftText}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.logoContainer}>
          <GriplockLogo />
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
    marginBottom: 28,
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
  rightText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
