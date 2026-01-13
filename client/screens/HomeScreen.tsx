import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { Colors, Spacing, Fonts, Typography, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const pulseAnim = useSharedValue(0);
  const glowAnim = useSharedValue(0);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const logoGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowAnim.value, [0, 1], [0.6, 1]),
    transform: [{ scale: interpolate(glowAnim.value, [0, 1], [1, 1.02]) }],
  }));

  const buttonPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [1, 1.05]) }],
    shadowOpacity: interpolate(pulseAnim.value, [0, 1], [0.4, 0.8]),
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

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + Spacing["5xl"],
          paddingBottom: insets.bottom + Spacing["5xl"],
        },
      ]}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoGlowStyle]}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>

        <View style={styles.titleContainer}>
          <Animated.Text style={[styles.title, logoGlowStyle]}>
            GRIPLOCK
          </Animated.Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Animated.Text style={styles.statusText}>
              Ready to Connect
            </Animated.Text>
          </View>
        </View>

        <Animated.View style={[styles.scanButtonWrapper, buttonPulseStyle]}>
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.scanButtonPressed,
            ]}
            onPress={handleScanPress}
            testID="button-scan-qr"
          >
            <Feather name="maximize" size={32} color={Colors.dark.buttonText} />
            <View style={styles.scanButtonTextContainer}>
              <Animated.Text style={styles.scanButtonText}>
                Scan QR Code
              </Animated.Text>
              <Animated.Text style={styles.scanButtonSubtext}>
                Connect to Web Dashboard
              </Animated.Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Animated.Text style={styles.footerText}>
          Ephemeral Wallet System
        </Animated.Text>
        <Feather
          name="shield"
          size={14}
          color={Colors.dark.textSecondary}
          style={styles.footerIcon}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
    paddingHorizontal: Spacing["2xl"],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: Spacing["3xl"],
    ...Shadows.glow,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: Spacing["5xl"],
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: Typography.display.fontSize,
    color: Colors.dark.primary,
    letterSpacing: 4,
    textShadowColor: Colors.dark.primaryGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.primary,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
  },
  scanButtonWrapper: {
    ...Shadows.glow,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primary,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: 16,
    gap: Spacing.lg,
  },
  scanButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  scanButtonTextContainer: {
    alignItems: "flex-start",
  },
  scanButtonText: {
    fontFamily: Fonts.heading,
    fontSize: Typography.subheading.fontSize,
    color: Colors.dark.buttonText,
    letterSpacing: 1,
  },
  scanButtonSubtext: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.buttonText,
    opacity: 0.7,
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
  },
  footerIcon: {
    marginLeft: Spacing.sm,
  },
});
