import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Svg, { Path, Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { Colors, Spacing, Fonts, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

function GridIcon({
  size = 23,
  color = "white",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Path
        d="M9.19009 22.6741V5.81899C9.19009 5.52097 9.0717 5.23516 8.86097 5.02443C8.65024 4.8137 8.36443 4.69531 8.06641 4.69531H2.44803C1.852 4.69531 1.28038 4.93209 0.858917 5.35355C0.437457 5.77501 0.200684 6.34663 0.200684 6.94266V20.4268C0.200684 21.0228 0.437457 21.5944 0.858917 22.0159C1.28038 22.4373 1.852 22.6741 2.44803 22.6741H15.9321C16.5282 22.6741 17.0998 22.4373 17.5213 22.0159C17.9427 21.5944 18.1795 21.0228 18.1795 20.4268V14.8084C18.1795 14.5104 18.0611 14.2246 17.8504 14.0139C17.6397 13.8031 17.3538 13.6847 17.0558 13.6847H0.200684"
        stroke={color}
        strokeWidth={0.401313}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21.5505 0.200195H14.8085C14.1879 0.200195 13.6848 0.703282 13.6848 1.32387V8.06592C13.6848 8.68651 14.1879 9.1896 14.8085 9.1896H21.5505C22.1711 9.1896 22.6742 8.68651 22.6742 8.06592V1.32387C22.6742 0.703282 22.1711 0.200195 21.5505 0.200195Z"
        stroke={color}
        strokeWidth={0.401313}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function QRIcon({ ...props }) {
  return (
    <Svg width={61} height={61} viewBox="0 0 61 61" fill="none" {...props}>
      <Path
        d="M15.0492 31.7054H30.0985V16.6562H15.0492V31.7054ZM18.3907 20.0741H26.757V28.3895H18.3907V20.0741ZM30.0985 0C13.4678 0 0 13.4678 0 30.0985C0 46.7291 13.4678 60.1969 30.0985 60.1969C46.7291 60.1969 60.1969 46.7291 60.1969 30.0985C60.1969 13.4678 46.7291 0 30.0985 0ZM11.7078 13.3658H33.4654V35.0468H11.7078V13.3658ZM50.1726 30.0474V33.3889H43.4897V36.7303H50.1726V43.4387H46.8312V40.0973H40.1483V45.1222H46.8312V48.4636H28.4405V45.1222H25.0991V41.7807H21.7321V48.4636H11.7078V38.4393H15.0492V41.7807H18.3907V38.4393H25.0991V35.0468H28.4405V41.7807H31.7819V38.4393H38.4903V33.3889H33.4654V30.0474H38.4903V26.7315H35.1233V23.3645H38.4903V20.0231H41.8317V23.3645H45.1731V16.6561H48.4891V23.3645H45.1731V26.7315H48.4891V30.0474H50.1726ZM48.4891 45.1222V48.4636H43.4897V45.1222H48.4891ZM41.8317 30.0474H45.1731V33.3889H41.8317V30.0474Z"
        fill="white"
      />
    </Svg>
  );
}

function UserIcon({
  size = 21,
  color = "white",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size + 2} viewBox="0 0 21 23" fill="none">
      <Path
        d="M10.1963 12.6933C13.644 12.6933 16.4389 9.89837 16.4389 6.45065C16.4389 3.00293 13.644 0.208008 10.1963 0.208008C6.74854 0.208008 3.95361 3.00293 3.95361 6.45065C3.95361 9.89837 6.74854 12.6933 10.1963 12.6933Z"
        stroke={color}
        strokeWidth={0.416176}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20.1845 22.6816C20.1845 20.0325 19.1321 17.492 17.259 15.6188C15.3858 13.7457 12.8453 12.6934 10.1962 12.6934C7.54719 12.6934 5.00665 13.7457 3.13349 15.6188C1.26034 17.492 0.208008 20.0325 0.208008 22.6816"
        stroke={color}
        strokeWidth={0.416176}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const pulseAnim = useSharedValue(0);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const buttonGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.8, 1]),
  }));

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const handleScanPress = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const sessionId = generateSessionId();
    navigation.navigate("QRScanner", { sessionId });
  };

  const handleTestPIN = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate("Success", { 
      sessionId: "test-session", 
      walletAddress: "5Xc7xMkYqR9vNpZbJfQE3mHnTgWvKLdPsYrAzBcDeFgH" 
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.backgroundWrapper}>
        <Image
          source={require("../../assets/images/home-background.png")}
          style={styles.backgroundImage}
          contentFit="contain"
        />
      </View>

      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>GRIPLOCK.</Text>
          <Text style={styles.subtitle}>Ready to connect</Text>
        </View>

        <Pressable 
          style={styles.testButton} 
          onPress={handleTestPIN}
        >
          <Text style={styles.testButtonText}>Test Success Screen</Text>
        </Pressable>

        <View style={styles.centerContent}>
          <View style={styles.textContainer}>
            <Text style={styles.tagline}>Ephemeral Wallet System</Text>
            <Text style={styles.instruction}>
              Scan QR Code to Connect{"\n"}Web Dashboard
            </Text>
          </View>
        </View>

        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNavWrapper}>
            <Svg
              width="100%"
              height={100}
              viewBox="0 0 428 100"
              preserveAspectRatio="xMidYMid meet"
              fill="none"
            >
              <Path
                d="M249.215 30.7012H405.727L428 50.3655"
                stroke="#747474"
                strokeWidth={0.5}
              />
              <Path
                d="M178.785 30.9014H22.273L0.000100315 50.5657"
                stroke="#747474"
                strokeWidth={0.5}
              />
              <Circle
                cx={213.9}
                cy={34.9142}
                r={34.7135}
                stroke="#747474"
                strokeWidth={0.5}
                fill="transparent"
              />
            </Svg>

            <View style={styles.navIconsOverlayWrapper}>
              <View style={styles.navIconsOverlay}>
                <Pressable style={styles.leftNavButton}>
                  <GridIcon size={22} color={Colors.dark.text} />
                </Pressable>

                <Pressable style={styles.rightNavButton}>
                  <UserIcon size={22} color={Colors.dark.text} />
                </Pressable>
              </View>

              <Animated.View
                style={[styles.scanButtonContainer, buttonGlowStyle]}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.scanButton,
                    pressed && styles.scanButtonPressed,
                  ]}
                  onPress={handleScanPress}
                  testID="button-scan-qr"
                >
                  <QRIcon />
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing["2xl"],
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontFamily: Fonts.circular.black,
    fontSize: 28,
    color: Colors.dark.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: Fonts.circular.book,
    fontSize: Typography.caption.fontSize,
    color: "#A4BAD2",
    marginTop: Spacing.xs,
  },
  centerContent: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: SCREEN_HEIGHT * 0.08,
  },
  textContainer: {
    alignItems: "center",
  },
  tagline: {
    fontFamily: Fonts.circular.book,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
  },
  instruction: {
    fontFamily: Fonts.circular.medium,
    fontSize: Typography.body.fontSize,
    color: "#A4BAD2",
    textAlign: "center",
    lineHeight: 24,
  },
  bottomNavContainer: {
    alignItems: "center",
    marginHorizontal: -Spacing["2xl"],
  },
  bottomNavWrapper: {
    position: "relative",
    width: "100%",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconsOverlayWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  navIconsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  leftNavButton: {
    width: "50%",
    height: 44,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  rightNavButton: {
    width: "50%",
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  scanButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: -28,
  },
  scanButton: {
    width: 50,
    height: 50,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  scanButtonPressed: {
    opacity: 0.7,
  },
  testButton: {
    backgroundColor: "#1A1A1A",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    alignSelf: "center",
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  testButtonText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.dark.textSecondary,
  },
});
