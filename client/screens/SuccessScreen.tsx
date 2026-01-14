import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  Text,
  Dimensions,
} from "react-native";
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
import Svg, { Path } from "react-native-svg";

import { Spacing, Fonts } from "@/constants/theme";
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
  const webrtc = useWebRTC();
  const connectionStatus = webrtc?.status ?? "disconnected";

  const isConnected = connectionStatus === "connected";
  const isFailed = connectionStatus === "failed";
  const isConnecting = connectionStatus === "connecting";

  const getHeaderRightText = () => {
    if (isConnected) return "Connected";
    if (isFailed) return "Disconnected";
    if (isConnecting) return "Connecting...";
    return "Disconnected";
  };

  const getSyncStatusText = () => {
    if (isConnected) return "Dashboard Synced";
    if (isFailed) return "Connection Failed";
    if (isConnecting) return "Syncing...";
    return "Disconnected";
  };

  const getSyncStatusColor = () => {
    if (isConnected) return "connected";
    if (isFailed) return "failed";
    return "syncing";
  };

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
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
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

  const handleCopyAddress = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/success-bg.png")}
        style={styles.bgPattern}
        contentFit="cover"
      />

      <Animated.View style={[styles.logoLayer, logoAnimStyle]} pointerEvents="none">
        <Svg width={88} height={88} viewBox="0 0 88 88" fill="none">
          <Path
            d="M28.9229 14.0869C28.92 14.0883 28.9169 14.0894 28.9141 14.0908L43.3379 28.5146L35.9326 35.9199L20.3057 20.293C14.3289 26.2655 10.6319 34.5187 10.6318 43.6357C10.6321 61.8626 25.4079 76.6384 43.6348 76.6387C56.1745 76.6386 67.0792 69.6443 72.6641 59.3447H39.708V48.8721H86.957C84.3699 70.5019 65.9614 87.2704 43.6348 87.2705C19.5361 87.2703 0.000284349 67.7344 0 43.6357C8.83189e-05 27.7834 8.45375 13.9055 21.0986 6.26367L28.9229 14.0869ZM82.6035 23.9834C85.2167 29.1551 86.8314 34.9178 87.1924 41.0176H65.9209L82.6035 23.9834ZM71.877 10.374C74.2536 12.394 76.4122 14.6629 78.3096 17.1426L60.2422 35.5889L53.6436 28.9902L71.877 10.374ZM56.1846 1.83203C59.4205 2.80212 62.4981 4.13888 65.3701 5.79199L48.0898 23.4365L41.4893 16.8359L56.1846 1.83203ZM43.6357 0C44.7231 1.88442e-05 45.8017 0.0389942 46.8691 0.117188L35.9355 11.2822L27.668 3.01465C32.6131 1.06935 38.0001 0 43.6357 0Z"
            fill="#06B040"
          />
        </Svg>
      </Animated.View>

      <ScreenHeader rightText={getHeaderRightText()} />

      <Animated.View style={[styles.titleSection, contentAnimStyle]}>
        <Text style={styles.title}>WALLET CONNECTED</Text>
        <Text style={styles.subtitle}>Session Active</Text>
      </Animated.View>

      <View style={styles.spacer} />

      <View
        style={[
          styles.bottomSection,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <Animated.View style={[styles.addressSection, contentAnimStyle]}>
          <Text style={styles.addressLabel}>SOL Wallet Address</Text>

          <View style={styles.addressBoxWrapper}>
            <View style={styles.addressBoxFrame}>
              <View style={styles.addressBoxContent}>
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
                  <Text
                    style={[
                      styles.copyButtonText,
                      copied && styles.copyButtonTextCopied,
                    ]}
                  >
                    {copied ? "Copied!" : "Copy"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.cornerTopLeft}>
              <Svg
                width={10}
                height={10}
                viewBox="0 0 10 10"
                fill="none"
                style={{ transform: [{ scaleX: -1 }] }}
              >
                <Path d="M0 0.5H9V9.5" stroke="white" />
              </Svg>
            </View>
            <View style={styles.cornerTopRight}>
              <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                <Path d="M0 0.5H9V9.5" stroke="white" />
              </Svg>
            </View>
            <View style={styles.cornerBottomLeft}>
              <Svg
                width={10}
                height={10}
                viewBox="0 0 10 10"
                fill="none"
                style={{ transform: [{ scaleX: -1 }, { scaleY: -1 }] }}
              >
                <Path d="M0 0.5H9V9.5" stroke="white" />
              </Svg>
            </View>
            <View style={styles.cornerBottomRight}>
              <Svg
                width={10}
                height={10}
                viewBox="0 0 10 10"
                fill="none"
                style={{ transform: [{ scaleY: -1 }] }}
              >
                <Path d="M0 0.5H9V9.5" stroke="white" />
              </Svg>
            </View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.syncStatus, contentAnimStyle]}>
          <View
            style={[
              styles.syncDot,
              getSyncStatusColor() === "syncing" && styles.syncDotSyncing,
              getSyncStatusColor() === "failed" && styles.syncDotFailed,
            ]}
          />
          <Text
            style={[
              styles.syncText,
              getSyncStatusColor() === "syncing" && styles.syncTextSyncing,
              getSyncStatusColor() === "failed" && styles.syncTextFailed,
            ]}
          >
            {getSyncStatusText()}
          </Text>
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
    marginTop: 40,
  },
  title: {
    fontFamily: "AstroSpace",
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  logoLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 36,
    marginBottom: 24,
    gap: 24,
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
  addressBoxWrapper: {
    position: "relative",
    padding: 6,
  },
  addressBoxFrame: {
    borderWidth: 0.7,
    borderColor: "#484848",
    padding: 2,
  },
  addressBoxContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 3,
    paddingLeft: 8,
    paddingRight: 3,
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  addressText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "#FFFFFF",
    flex: 1,
  },
  copyButton: {
    backgroundColor: "#D9D9D9",
    paddingVertical: 6,
    paddingHorizontal: 16,
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
  syncDotSyncing: {
    backgroundColor: "#F59E0B",
  },
  syncDotFailed: {
    backgroundColor: "#EF4444",
  },
  syncText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "#06B040",
    textDecorationLine: "none",
  },
  syncTextSyncing: {
    color: "#F59E0B",
  },
  syncTextFailed: {
    color: "#EF4444",
  },
});
