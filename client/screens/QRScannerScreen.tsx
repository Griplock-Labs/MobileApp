import React, { useState, useEffect } from "react";
import { View, StyleSheet, Platform, Pressable, Text, Linking, ActivityIndicator } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
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

import { Colors, Spacing, Fonts, Typography, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "QRScanner">;
type RouteProps = RouteProp<RootStackParamList, "QRScanner">;

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function isGriplockQR(data: string): boolean {
  return data.startsWith("griplock:");
}

export default function QRScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const scanAnim = useSharedValue(0);
  const { initializeFromQR, cleanup } = useWebRTC();

  useEffect(() => {
    scanAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scanAnim.value, [0, 1], [0, 220]) },
    ],
    opacity: interpolate(scanAnim.value, [0, 0.5, 1], [0.3, 1, 0.3]),
  }));

  const cornerGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(scanAnim.value, [0, 0.5, 1], [0.4, 0.8, 0.4]),
  }));

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isConnecting) return;
    setScanned(true);
    setConnectionError(null);
    
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (!isGriplockQR(data)) {
      setConnectionError("Invalid QR code. Please scan a GRIPLOCK dashboard QR code.");
      setScanned(false);
      return;
    }

    setIsConnecting(true);
    try {
      await initializeFromQR(data);
      const sessionId = route.params.sessionId || generateSessionId();
      navigation.replace("NFCReader", { sessionId });
    } catch (error) {
      console.error("WebRTC connection failed:", error);
      cleanup();
      setConnectionError("Failed to connect. Please try scanning again.");
      setScanned(false);
      setIsConnecting(false);
    }
  };

  const handleRetry = () => {
    cleanup();
    setScanned(false);
    setConnectionError(null);
    setIsConnecting(false);
  };

  const handleOpenSettings = async () => {
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch {}
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: headerHeight + Spacing.xl }]}>
        <View style={styles.permissionContainer}>
          <Feather name="loader" size={48} color={Colors.dark.primary} />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
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
        <View style={styles.permissionContainer}>
          <View style={styles.iconWrapper}>
            <Feather name="camera-off" size={64} color={Colors.dark.textSecondary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            GRIPLOCK needs camera access to scan QR codes from the web dashboard.
          </Text>
          
          {permission.canAskAgain && (
            <Pressable
              style={({ pressed }) => [
                styles.permissionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={requestPermission}
              testID="button-enable-camera"
            >
              <Feather name="camera" size={20} color={Colors.dark.buttonText} />
              <Text style={styles.permissionButtonText}>Enable Camera</Text>
            </Pressable>
          )}

          {!permission.canAskAgain && Platform.OS !== "web" && (
            <Pressable
              style={({ pressed }) => [
                styles.permissionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleOpenSettings}
              testID="button-open-settings"
            >
              <Feather name="settings" size={20} color={Colors.dark.buttonText} />
              <Text style={styles.permissionButtonText}>Open Settings</Text>
            </Pressable>
          )}

        </View>
      </View>
    );
  }

  if (isConnecting) {
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
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
          <Text style={styles.permissionTitle}>Establishing Connection</Text>
          <Text style={styles.permissionText}>
            Connecting to your GRIPLOCK dashboard...
          </Text>
        </View>
      </View>
    );
  }

  if (connectionError) {
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
        <View style={styles.permissionContainer}>
          <View style={styles.iconWrapper}>
            <Feather name="alert-circle" size={64} color={Colors.dark.error} />
          </View>
          <Text style={styles.permissionTitle}>Connection Failed</Text>
          <Text style={styles.permissionText}>{connectionError}</Text>

          <Pressable
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRetry}
            testID="button-retry-scan"
          >
            <Feather name="refresh-cw" size={20} color={Colors.dark.buttonText} />
            <Text style={styles.permissionButtonText}>Try Again</Text>
          </Pressable>

        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      
      <View style={styles.overlay}>
        <View style={[styles.overlayTop, { height: headerHeight + Spacing["3xl"] }]} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <Animated.View style={[styles.scanFrame, cornerGlowStyle]}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Animated.View style={[styles.scanLine, scanLineStyle]} />
          </Animated.View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.instructionText}>Align QR code within frame</Text>
          <Text style={styles.instructionSubtext}>
            Scan the code from your GRIPLOCK dashboard
          </Text>

        </View>
      </View>
    </View>
  );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 30;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  iconWrapper: {
    marginBottom: Spacing["2xl"],
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.lg,
  },
  permissionTitle: {
    fontFamily: Fonts.heading,
    fontSize: Typography.heading.fontSize,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  permissionText: {
    fontFamily: Fonts.body,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: 12,
    gap: Spacing.md,
    ...Shadows.glow,
  },
  permissionButtonText: {
    fontFamily: Fonts.heading,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.buttonText,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  overlayMiddle: {
    flexDirection: "row",
    height: FRAME_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  scanFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: "relative",
    shadowColor: Colors.dark.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: Colors.dark.primary,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: Colors.dark.primary,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderColor: Colors.dark.primary,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderColor: Colors.dark.primary,
  },
  scanLine: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    height: 2,
    backgroundColor: Colors.dark.primary,
    top: Spacing.lg,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    paddingTop: Spacing["3xl"],
  },
  instructionText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  instructionSubtext: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing["2xl"],
  },
});
