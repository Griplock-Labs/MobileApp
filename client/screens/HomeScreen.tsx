import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  Modal,
} from "react-native";
import * as Clipboard from "expo-clipboard";
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
import { useWebRTC } from "@/context/WebRTCContext";

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

function CheckIcon({ size = 88 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <Path
        d="M28.9229 14.0869C28.92 14.0883 28.9169 14.0894 28.9141 14.0908L43.3379 28.5146L35.9326 35.9199L20.3057 20.293C14.3289 26.2655 10.6319 34.5187 10.6318 43.6357C10.6321 61.8626 25.4079 76.6384 43.6348 76.6387C56.1745 76.6386 67.0792 69.6443 72.6641 59.3447H39.708V48.8721H86.957C84.3699 70.5019 65.9614 87.2704 43.6348 87.2705C19.5361 87.2703 0.000284349 67.7344 0 43.6357C8.83189e-05 27.7834 8.45375 13.9055 21.0986 6.26367L28.9229 14.0869ZM82.6035 23.9834C85.2167 29.1551 86.8314 34.9178 87.1924 41.0176H65.9209L82.6035 23.9834ZM71.877 10.374C74.2536 12.394 76.4122 14.6629 78.3096 17.1426L60.2422 35.5889L53.6436 28.9902L71.877 10.374ZM56.1846 1.83203C59.4205 2.80212 62.4981 4.13888 65.3701 5.79199L48.0898 23.4365L41.4893 16.8359L56.1846 1.83203ZM43.6357 0C44.7231 1.88442e-05 45.8017 0.0389942 46.8691 0.117188L35.9355 11.2822L27.668 3.01465C32.6131 1.06935 38.0001 0 43.6357 0Z"
        fill="#06B040"
      />
    </Svg>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const pulseAnim = useSharedValue(0);

  const webrtc = useWebRTC();
  const walletAddress = webrtc?.walletAddress;
  const connectionStatus = webrtc?.status ?? "disconnected";
  const dashboardDisconnect = webrtc?.dashboardDisconnect;
  const peerDisconnect = webrtc?.peerDisconnect;
  const pendingSignRequest = webrtc?.pendingSignRequest;
  const solanaKeypair = webrtc?.solanaKeypair;
  const sendSignResult = webrtc?.sendSignResult;
  const clearPendingSignRequest = webrtc?.clearPendingSignRequest;
  const cleanup = webrtc?.cleanup;

  const [copied, setCopied] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const cleanupRef = useRef(cleanup);
  const cleanupCalledRef = useRef(false);
  cleanupRef.current = cleanup;

  const isConnected = connectionStatus === "connected" && !!walletAddress;
  const isFailed = connectionStatus === "failed";
  const isConnecting = connectionStatus === "connecting";
  const isDashboardDisconnected = dashboardDisconnect?.reason !== null;
  const isPeerDisconnected = peerDisconnect?.reason !== null;
  const shouldShowConnectedUI = isConnected && !isDashboardDisconnected && !isPeerDisconnected;

  useEffect(() => {
    if (isPeerDisconnected && walletAddress && !cleanupCalledRef.current) {
      cleanupCalledRef.current = true;
      console.log('[HomeScreen] Peer disconnected, cleaning up session');
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      cleanupRef.current?.(false);
    }
    
    if (!isPeerDisconnected) {
      cleanupCalledRef.current = false;
    }
  }, [isPeerDisconnected, walletAddress]);

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

  const handleDisconnect = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowDisconnectDialog(false);
    cleanup?.();
  };

  const handleConnectedIconPress = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowDisconnectDialog(true);
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  useEffect(() => {
    if (pendingSignRequest && shouldShowConnectedUI) {
      navigation.navigate("SignConfirm");
    }
  }, [pendingSignRequest, shouldShowConnectedUI, navigation]);

  const getSyncStatusText = () => {
    if (isDashboardDisconnected) {
      if (dashboardDisconnect?.reason === "user_logout") {
        return "Dashboard Logged Out";
      }
      if (dashboardDisconnect?.reason === "session_expired") {
        return "Session Expired";
      }
      return "Dashboard Disconnected";
    }
    if (isConnected) return "Dashboard Synced";
    if (isFailed) return "Connection Failed";
    if (isConnecting) return "Syncing...";
    return "Disconnected";
  };

  const getSyncStatusColor = () => {
    if (isDashboardDisconnected) return "failed";
    if (isConnected) return "connected";
    if (isFailed) return "failed";
    return "syncing";
  };

  if (shouldShowConnectedUI) {
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
            <Text style={[styles.subtitle, { color: "#06B040" }]}>Connected</Text>
          </View>

          <View style={styles.centerContent}>
            <View style={styles.textContainer}>
              <Text style={styles.tagline}>Ephemeral Wallet System</Text>
            </View>
          </View>

          <View style={styles.addressSection}>
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
                  stroke="#06B040"
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

                <Pressable 
                  style={styles.connectedIndicatorContainer}
                  onPress={handleConnectedIconPress}
                  testID="button-connected-icon"
                >
                  <CheckIcon size={40} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <Modal
          visible={showDisconnectDialog}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDisconnectDialog(false)}
        >
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogContainer}>
              <Text style={styles.dialogTitle}>Disconnect Wallet</Text>
              <Text style={styles.dialogMessage}>
                Are you sure you want to disconnect from the dashboard?
              </Text>
              <View style={styles.dialogButtons}>
                <Pressable
                  style={styles.dialogButtonCancel}
                  onPress={() => setShowDisconnectDialog(false)}
                  testID="button-cancel-disconnect"
                >
                  <Text style={styles.dialogButtonCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={styles.dialogButtonConfirm}
                  onPress={handleDisconnect}
                  testID="button-confirm-disconnect"
                >
                  <Text style={styles.dialogButtonConfirmText}>Disconnect</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

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
  connectedContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  checkIconContainer: {
    marginBottom: Spacing["2xl"],
  },
  connectedTitle: {
    fontFamily: "AstroSpace",
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  connectedSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  bottomSection: {
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
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
  syncDotConnected: {
    backgroundColor: "#06B040",
  },
  syncDotFailed: {
    backgroundColor: "#EF8300",
  },
  syncText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "#06B040",
  },
  syncTextConnected: {
    color: "#06B040",
  },
  syncTextFailed: {
    color: "#EF8300",
  },
  disconnectButton: {
    borderWidth: 1,
    borderColor: "#484848",
    borderRadius: 8,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  disconnectButtonPressed: {
    opacity: 0.7,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  disconnectButtonText: {
    fontFamily: Fonts.circular.medium,
    fontSize: 14,
    color: "#A4BAD2",
  },
  addressSection: {
    width: "100%",
    paddingHorizontal: 36,
    marginBottom: 24,
  },
  addressLabel: {
    fontFamily: Fonts.circular.book,
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
    fontFamily: Fonts.circular.book,
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
    fontFamily: Fonts.circular.book,
    fontSize: 11,
    color: "#000000",
    textAlign: "center",
  },
  copyButtonTextCopied: {
    color: "#FFFFFF",
  },
  connectedIndicatorContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: -28,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  dialogContainer: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: Spacing["2xl"],
    width: "100%",
    maxWidth: 320,
    borderWidth: 1,
    borderColor: "#333333",
  },
  dialogTitle: {
    fontFamily: Fonts.circular.medium,
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  dialogMessage: {
    fontFamily: Fonts.circular.book,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: Spacing["2xl"],
    lineHeight: 20,
  },
  dialogButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  dialogButtonCancel: {
    flex: 1,
    backgroundColor: "#333333",
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  dialogButtonCancelText: {
    fontFamily: Fonts.circular.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },
  dialogButtonConfirm: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: Spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  dialogButtonConfirmText: {
    fontFamily: Fonts.circular.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },
});
