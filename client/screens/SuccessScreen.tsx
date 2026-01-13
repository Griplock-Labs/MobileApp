import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform, Pressable, Text } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { Colors, Spacing, Fonts, Typography, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Success">;
type RouteProps = RouteProp<RootStackParamList, "Success">;

export default function SuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const { cleanup, status: connectionStatus } = useWebRTC();
  
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const pulseAnim = useSharedValue(0);

  const { walletAddress } = route.params;
  const truncatedAddress = `${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`;

  useEffect(() => {
    iconScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    iconOpacity.value = withTiming(1, { duration: 300 });
    contentOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    
    pulseAnim.value = withDelay(
      500,
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      )
    );
  }, []);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { translateY: interpolate(contentOpacity.value, [0, 1], [20, 0]) },
    ],
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(pulseAnim.value, [0, 1], [0.4, 0.8]),
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [1, 1.02]) }],
  }));

  const handleDone = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    cleanup();
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  };

  const isConnected = connectionStatus === "connected";

  const handleCopyAddress = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: headerHeight + Spacing["5xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
      ]}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, iconAnimStyle, glowAnimStyle]}>
          <Image
            source={require("../../assets/images/success-checkmark.png")}
            style={styles.successImage}
            contentFit="contain"
          />
        </Animated.View>

        <Animated.View style={[styles.textContainer, contentAnimStyle]}>
          <Text style={styles.title}>Wallet Connected</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Session Active</Text>
          </View>
          {isConnected ? (
            <View style={styles.dashboardStatus}>
              <View style={styles.dashboardDot} />
              <Text style={styles.dashboardText}>Dashboard Synced</Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={[styles.addressContainer, contentAnimStyle]}>
          <View style={styles.addressLabelRow}>
            <Text style={styles.addressLabel}>Solana Wallet Address</Text>
            <View style={styles.solBadge}>
              <Text style={styles.solBadgeText}>SOL</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.addressBox,
              pressed && styles.addressBoxPressed,
              copied && styles.addressBoxCopied,
            ]}
            onPress={handleCopyAddress}
            testID="button-copy-address"
          >
            <Text style={styles.addressText}>{truncatedAddress}</Text>
            <View style={styles.copyIndicator}>
              {copied ? (
                <>
                  <Feather name="check" size={16} color={Colors.dark.primary} />
                  <Text style={styles.copiedText}>Copied</Text>
                </>
              ) : (
                <Feather name="copy" size={16} color={Colors.dark.textSecondary} />
              )}
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.infoContainer, contentAnimStyle]}>
          <View style={styles.infoItem}>
            <Feather name="shield" size={18} color={Colors.dark.primary} />
            <Text style={styles.infoText}>Ephemeral wallet - no data stored</Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="monitor" size={18} color={Colors.dark.primary} />
            <Text style={styles.infoText}>Check dashboard for your assets</Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="clock" size={18} color={Colors.dark.primary} />
            <Text style={styles.infoText}>Wallet clears on session end</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={contentAnimStyle}>
        <Pressable
          style={({ pressed }) => [
            styles.doneButton,
            pressed && styles.doneButtonPressed,
          ]}
          onPress={handleDone}
          testID="button-done"
        >
          <Text style={styles.doneButtonText}>Done</Text>
          <Feather name="check" size={20} color={Colors.dark.buttonText} />
        </Pressable>
      </Animated.View>
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
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    marginBottom: Spacing["3xl"],
    ...Shadows.glow,
  },
  successImage: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: Typography.heading.fontSize,
    color: Colors.dark.primary,
    marginBottom: Spacing.md,
    textShadowColor: Colors.dark.primaryGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.success,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
  },
  addressContainer: {
    width: "100%",
    marginBottom: Spacing["3xl"],
  },
  addressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  addressLabel: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
  },
  solBadge: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  solBadgeText: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: Colors.dark.backgroundRoot,
    letterSpacing: 1,
  },
  addressBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.backgroundSecondary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  addressBoxPressed: {
    backgroundColor: Colors.dark.backgroundTertiary,
  },
  addressBoxCopied: {
    borderColor: Colors.dark.primary,
  },
  addressText: {
    fontFamily: Fonts.mono,
    fontSize: Typography.mono.fontSize,
    color: Colors.dark.text,
    letterSpacing: 1,
  },
  copyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  copiedText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.primary,
  },
  infoContainer: {
    gap: Spacing.lg,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  infoText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.primary,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    gap: Spacing.md,
    ...Shadows.glow,
  },
  doneButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  doneButtonText: {
    fontFamily: Fonts.heading,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.buttonText,
  },
  dashboardStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  dashboardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.primary,
    marginRight: Spacing.sm,
  },
  dashboardText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.primary,
  },
});
