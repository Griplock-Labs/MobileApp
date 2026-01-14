import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform, Pressable, Text, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Image } from "expo-image";
import Svg, { Path, Circle } from "react-native-svg";

import { Colors, Spacing, Fonts } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";
import ScreenHeader from "@/components/ScreenHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Success">;
type RouteProps = RouteProp<RootStackParamList, "Success">;

export default function SuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const { cleanup, status: connectionStatus } = useWebRTC();
  
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  const { walletAddress } = route.params;
  const truncatedAddress = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 400 });
    contentOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value * pulseAnim.value }],
    opacity: logoOpacity.value,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { translateY: interpolate(contentOpacity.value, [0, 1], [20, 0]) },
    ],
  }));

  const handleBackToHome = async () => {
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
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/success-bg-pattern.png")}
        style={styles.bgPattern}
        contentFit="cover"
      />
      
      <ScreenHeader rightText="Connected" />
      
      <Animated.View style={[styles.titleSection, contentAnimStyle]}>
        <Text style={styles.title}>WALLET CONNECTED</Text>
        <Text style={styles.subtitle}>Session Active</Text>
      </Animated.View>

      <View style={styles.logoSection}>
        <Animated.View style={[styles.logoContainer, logoAnimStyle]}>
          <Svg width={120} height={120} viewBox="0 0 110 110">
            <Circle cx="55" cy="55" r="40" stroke="#22C55E" strokeWidth="3" fill="none" />
            <Path
              d="M35 55 A20 20 0 0 1 75 55"
              stroke="#22C55E"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M35 55 A20 20 0 0 0 75 55"
              stroke="#22C55E"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M45 65 L55 78 L65 65"
              stroke="#22C55E"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Path
              d="M55 20 L55 40"
              stroke="#22C55E"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </Svg>
        </Animated.View>
      </View>

      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <Animated.View style={[styles.addressSection, contentAnimStyle]}>
          <Text style={styles.addressLabel}>SOL Wallet Address</Text>
          
          <View style={styles.addressBoxOuter}>
            <View style={styles.addressBoxMiddle}>
              <View style={styles.addressBoxInner}>
                <Text style={styles.addressText}>{truncatedAddress}</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.copyButton,
                    pressed && styles.copyButtonPressed,
                    copied && styles.copyButtonCopied,
                  ]}
                  onPress={handleCopyAddress}
                  testID="button-copy-address"
                >
                  <Text style={[styles.copyButtonText, copied && styles.copyButtonTextCopied]}>
                    {copied ? "Copied!" : "Copy"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>

        {isConnected ? (
          <Animated.View style={[styles.syncStatus, contentAnimStyle]}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Dashboard Synced</Text>
          </Animated.View>
        ) : null}

        <Animated.View style={contentAnimStyle}>
          <Pressable
            style={({ pressed }) => [
              styles.backToHomeButton,
              pressed && styles.backToHomeButtonPressed,
            ]}
            onPress={handleBackToHome}
            testID="button-back-home"
          >
            <Text style={styles.backToHomeText}>Back to Home</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  bgPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  titleSection: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
  },
  title: {
    fontFamily: "AstroSpace",
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  logoSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 120,
    height: 120,
  },
  bottomSection: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  addressSection: {
    width: "100%",
  },
  addressLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: Spacing.sm,
  },
  addressBoxOuter: {
    borderWidth: 0.7,
    borderColor: "#484848",
    padding: 3,
  },
  addressBoxMiddle: {
    borderWidth: 0.7,
    borderColor: "#484848",
    padding: 3,
  },
  addressBoxInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  addressText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "#FFFFFF",
    flex: 1,
  },
  copyButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  copyButtonPressed: {
    backgroundColor: "#BBBBBB",
  },
  copyButtonCopied: {
    backgroundColor: "#22C55E",
  },
  copyButtonText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: "#000000",
    textAlign: "center",
  },
  copyButtonTextCopied: {
    color: "#FFFFFF",
  },
  syncStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#06B040",
  },
  syncText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: "#06B040",
  },
  backToHomeButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  backToHomeButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  backToHomeText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
