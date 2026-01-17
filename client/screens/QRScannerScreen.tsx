import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  Text,
  Linking,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { Colors, Spacing, Fonts, Typography, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";
import ScreenHeader from "@/components/ScreenHeader";
import { ASCIILoader } from "@/components/ASCIILoader";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "QRScanner">;
type RouteProps = RouteProp<RootStackParamList, "QRScanner">;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const FRAME_SIZE = Math.min(SCREEN_WIDTH * 0.7, 280);

function BackArrowIcon() {
  return (
    <Svg width={19} height={9} viewBox="0 0 19 9" fill="none">
      <Path
        d="M4.14648 0.146484C4.34172 -0.0487528 4.65825 -0.048703 4.85352 0.146484C5.04878 0.341747 5.04878 0.658253 4.85352 0.853516L1.70703 4H18.5C18.7761 4 19 4.22386 19 4.5C19 4.77612 18.7761 5 18.5 5H1.70703L4.85352 8.14648C5.04878 8.34175 5.04878 8.65825 4.85352 8.85352C4.65824 9.04865 4.3417 9.04873 4.14648 8.85352L0.146484 4.85352C0.122232 4.82926 0.101234 4.80292 0.0830078 4.77539C0.0760525 4.76488 0.0715071 4.75308 0.0654297 4.74219C0.0252168 4.67017 9.80679e-06 4.58834 0 4.5C0 4.41137 0.0249792 4.32902 0.0654297 4.25684C0.0713872 4.2462 0.076212 4.23488 0.0830078 4.22461L0.146484 4.14648L4.14648 0.146484Z"
        fill="white"
      />
    </Svg>
  );
}

function GriplockLogo({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 50 50" fill="none">
      <Defs>
        <LinearGradient id="logoGradient" x1="25" y1="0" x2="25" y2="50" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#DBE4ED" />
          <Stop offset="1" stopColor="#A3BAD2" />
        </LinearGradient>
      </Defs>
      <Path
        d="M16.585 8.07031C16.5834 8.07109 16.5816 8.07149 16.5801 8.07227L24.8525 16.3379L20.6055 20.5801L11.6445 11.6279C8.2177 15.0498 6.09668 19.7769 6.09668 25C6.09668 35.4429 14.5701 43.9082 25.0225 43.9082C32.2135 43.9082 38.4664 39.901 41.6689 34H22.7705V28H49.8652C48.3818 40.3926 37.8258 50 25.0225 50C11.2029 50 4.75598e-07 38.8071 0 25C0 15.9178 4.84766 7.96711 12.0986 3.58887L16.585 8.07031ZM47.3682 13.7402C48.8669 16.7035 49.794 20.005 50.001 23.5H37.8027L47.3682 13.7402ZM41.2178 5.94336C42.5805 7.10061 43.8183 8.40072 44.9062 9.82129L34.5459 20.3896L30.7627 16.6094L41.2178 5.94336ZM32.2197 1.04883C34.0754 1.60468 35.8403 2.37117 37.4873 3.31836L27.5771 13.4277L23.792 9.64648L32.2197 1.04883ZM25.0225 0C25.6463 9.07155e-06 26.2656 0.0215703 26.8779 0.0664062L20.6074 6.46387L15.8662 1.72656C18.7019 0.612097 21.7908 3.73014e-05 25.0225 0Z"
        fill="url(#logoGradient)"
      />
    </Svg>
  );
}

function CornerTL() {
  return (
    <Svg width={17} height={17} viewBox="0 0 17 17" fill="none" style={styles.cornerTL}>
      <Path d="M16 0.25H0V16.25" stroke="white" strokeWidth={0.5} />
    </Svg>
  );
}

function CornerTR() {
  return (
    <Svg width={17} height={17} viewBox="0 0 17 17" fill="none" style={styles.cornerTR}>
      <Path d="M0 0.25H16V16.25" stroke="white" strokeWidth={0.5} />
    </Svg>
  );
}

function CornerBL() {
  return (
    <Svg width={17} height={17} viewBox="0 0 17 17" fill="none" style={styles.cornerBL}>
      <Path d="M16 16.25H0V0.25" stroke="white" strokeWidth={0.5} />
    </Svg>
  );
}

function CornerBR() {
  return (
    <Svg width={17} height={17} viewBox="0 0 17 17" fill="none" style={styles.cornerBR}>
      <Path d="M0 16.25H16V0.25" stroke="white" strokeWidth={0.5} />
    </Svg>
  );
}

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

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function isGriplockQR(data: string): boolean {
  return data.startsWith("griplock:");
}

export default function QRScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const pulseAnim = useSharedValue(0);
  const { initializeFromQR, cleanup } = useWebRTC();

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

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || isConnecting) return;
    setScanned(true);
    setConnectionError(null);

    console.log('[QR] Scanned data:', data);

    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (!isGriplockQR(data)) {
      console.log('[QR] Invalid QR - not griplock format');
      setConnectionError("Invalid QR code. Please scan a GRIPLOCK dashboard QR code.");
      setScanned(false);
      return;
    }

    setIsConnecting(true);
    console.log('[QR] Initializing WebRTC...');
    try {
      await initializeFromQR(data);
      console.log('[QR] WebRTC initialized successfully');
      const sessionId = route.params.sessionId || generateSessionId();
      console.log('[QR] Navigating to NFCReader with sessionId:', sessionId);
      navigation.replace("NFCReader", { sessionId });
    } catch (error) {
      console.error("[QR] WebRTC connection failed:", error);
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

  const handleBack = () => {
    navigation.goBack();
  };

  const renderBottomNav = () => (
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
        </View>
      </View>
    </View>
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <ScreenHeader showBack={false} />
        <View style={styles.permissionContainer}>
          <ASCIILoader size="large" />
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <ScreenHeader leftText="back" rightText="Scan QR" onBack={handleBack} />

        <View style={styles.permissionContainer}>
          <View style={styles.iconWrapper}>
            <Feather name="camera-off" size={64} color={Colors.dark.textSecondary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            GRIPLOCK needs camera access to scan QR codes from the web dashboard.
          </Text>

          {permission.canAskAgain ? (
            <Pressable
              style={({ pressed }) => [
                styles.permissionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={requestPermission}
              testID="button-enable-camera"
            >
              <Text style={styles.permissionButtonText}>Enable Camera</Text>
            </Pressable>
          ) : null}

          {!permission.canAskAgain && Platform.OS !== "web" ? (
            <Pressable
              style={({ pressed }) => [
                styles.permissionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleOpenSettings}
              testID="button-open-settings"
            >
              <Text style={styles.permissionButtonText}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>


      </View>
    );
  }

  if (isConnecting) {
    return (
      <View style={styles.container}>
        <ScreenHeader leftText="back" rightText="Connecting..." showBack={false} />

        <View style={styles.permissionContainer}>
          <ASCIILoader size="large" />
          <Text style={styles.permissionTitle}>Establishing Connection</Text>
          <Text style={styles.permissionText}>
            Connecting to your GRIPLOCK dashboard...
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleRetry}
            testID="button-cancel-connection"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (connectionError) {
    return (
      <View style={styles.container}>
        <ScreenHeader leftText="back" rightText="Error" onBack={handleBack} />

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
            <Text style={styles.permissionButtonText}>Try Again</Text>
          </Pressable>
        </View>


      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader leftText="back" rightText="Scan QR" onBack={handleBack} />

      <View style={styles.content}>
        <Text style={styles.title}>SCAN QR CODE</Text>

        <View style={styles.cameraContainer}>
          <CornerTL />
          <CornerTR />
          <CornerBL />
          <CornerBR />
          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
          </View>
        </View>

        <Text style={styles.alignText}>Align QR code within frame</Text>

        <Text style={styles.instructionText}>
          Scan QR code from your{"\n"}GRIPLOCK dashboard
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 70,
  },
  backText: {
    fontFamily: Fonts.circular.book,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.text,
  },
  logo: {
    width: 40,
    height: 40,
  },
  headerSpacer: {
    width: 60,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: Fonts.circular.medium,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.text,
    letterSpacing: 2,
    marginBottom: Spacing["3xl"],
  },
  cameraContainer: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: "relative",
  },
  cameraWrapper: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
  alignText: {
    fontFamily: Fonts.circular.book,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    marginTop: Spacing["2xl"],
  },
  instructionText: {
    fontFamily: Fonts.circular.medium,
    fontSize: Typography.body.fontSize,
    color: "#A4BAD2",
    textAlign: "center",
    marginTop: Spacing["2xl"],
    lineHeight: 24,
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
    fontFamily: Fonts.circular.book,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.textSecondary,
    marginTop: Spacing.lg,
  },
  permissionTitle: {
    fontFamily: Fonts.astroSpace,
    fontSize: Typography.subheading.fontSize,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  permissionText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  permissionButton: {
    backgroundColor: Colors.dark.text,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.full,
  },
  permissionButtonText: {
    fontFamily: Fonts.circular.medium,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.backgroundRoot,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  bottomNavContainer: {
    alignItems: "center",
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
    paddingHorizontal: 40,
    width: "100%",
  },
  leftNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  rightNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scanButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: -28,
  },
  scanButtonActive: {
    width: 50,
    height: 50,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    borderWidth: 1,
    borderColor: Colors.dark.textSecondary,
    borderRadius: BorderRadius.full,
  },
  cancelButtonText: {
    fontFamily: Fonts.circular.book,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
