import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Platform, Pressable, Text } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  SharedValue,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { Colors, Spacing, Fonts, Typography, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";

let NfcManager: any = null;
let NfcTech: any = null;

if (Platform.OS !== "web") {
  try {
    const nfcModule = require("react-native-nfc-manager");
    NfcManager = nfcModule.default;
    NfcTech = nfcModule.NfcTech;
  } catch (e) {
    console.log("NFC module not available (running in Expo Go)");
  }
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "NFCReader">;
type RouteProps = RouteProp<RootStackParamList, "NFCReader">;

export default function NFCReaderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [isWebPlatform] = useState(Platform.OS === "web");
  const { setNfcData, status: connectionStatus } = useWebRTC();
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>("Ready to scan");
  const scanningRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const pulseAnim = useSharedValue(0);
  const ripple1 = useSharedValue(0);
  const ripple2 = useSharedValue(0);
  const ripple3 = useSharedValue(0);

  useEffect(() => {
    checkNfcSupport();
    return () => {
      if (NfcManager && Platform.OS !== "web") {
        try {
          NfcManager.cancelTechnologyRequest().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  const checkNfcSupport = async () => {
    if (Platform.OS === "web" || !NfcManager) {
      setNfcSupported(false);
      setNfcEnabled(false);
      return;
    }

    try {
      const supported = await NfcManager.isSupported();
      setNfcSupported(supported);
      
      if (supported) {
        await NfcManager.start();
        
        const enabled = await NfcManager.isEnabled();
        setNfcEnabled(enabled);
        
        if (enabled) {
          startNfcScan();
        }
      } else {
        setNfcEnabled(false);
      }
    } catch (e) {
      console.log("NFC check failed:", e);
      setNfcSupported(false);
      setNfcEnabled(false);
    }
  };

  const openNfcSettings = async () => {
    if (NfcManager && Platform.OS !== "web") {
      try {
        await NfcManager.goToNfcSetting();
      } catch (e) {
        console.log("Cannot open NFC settings:", e);
      }
    }
  };

  const recheckNfcEnabled = async () => {
    if (NfcManager && Platform.OS !== "web") {
      try {
        const enabled = await NfcManager.isEnabled();
        setNfcEnabled(enabled);
        if (enabled) {
          startNfcScan();
        }
      } catch (e) {
        console.log("NFC recheck failed:", e);
      }
    }
  };

  const cleanupNfc = useCallback(async () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (NfcManager) {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
      }
    }
  }, []);

  const startNfcScan = useCallback(async () => {
    if (!NfcManager || !nfcSupported || !nfcEnabled) return;
    
    if (scanningRef.current) {
      return;
    }
    
    scanningRef.current = true;
    setIsScanning(true);
    setScanStatus("Waiting for card...");

    try {
      await cleanupNfc();
      
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag) {
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        const tagId = tag.id || "";
        const nfcDataString = `ntag_${tagId}_${Date.now()}`;
        
        setScanStatus("Card detected!");
        setNfcData(nfcDataString);
        
        await NfcManager.cancelTechnologyRequest();
        scanningRef.current = false;
        setIsScanning(false);
        
        navigation.replace("PINInput", {
          sessionId: route.params.sessionId,
          nfcData: nfcDataString,
        });
      }
    } catch (e: any) {
      setScanStatus("Tap your GRIPLOCK card");
      scanningRef.current = false;
      setIsScanning(false);
      
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {}
      
      if (nfcSupported && nfcEnabled) {
        retryTimeoutRef.current = setTimeout(() => {
          startNfcScan();
        }, 2000);
      }
    }
  }, [nfcSupported, nfcEnabled, navigation, route.params.sessionId, setNfcData, cleanupNfc]);

  useEffect(() => {
    if (nfcSupported && nfcEnabled && !scanningRef.current) {
      startNfcScan();
    }
  }, [nfcSupported, nfcEnabled, startNfcScan]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      scanningRef.current = false;
      if (NfcManager) {
        NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    ripple1.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    ripple2.value = withDelay(
      666,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );

    ripple3.value = withDelay(
      1333,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  const iconPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [1, 1.05]) }],
    shadowOpacity: interpolate(pulseAnim.value, [0, 1], [0.4, 0.8]),
  }));

  const createRippleStyle = (animValue: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: interpolate(animValue.value, [0, 1], [0.8, 2]) }],
      opacity: interpolate(animValue.value, [0, 0.5, 1], [0.6, 0.3, 0]),
    }));

  const ripple1Style = createRippleStyle(ripple1);
  const ripple2Style = createRippleStyle(ripple2);
  const ripple3Style = createRippleStyle(ripple3);

  const isConnected = connectionStatus === "connected";

  if (!isConnected) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: headerHeight + Spacing["5xl"],
            paddingBottom: insets.bottom + Spacing["5xl"],
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.nfcIconContainer}>
            <Feather name="wifi-off" size={64} color={Colors.dark.error} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Not Connected</Text>
            <Text style={styles.subtitle}>
              Dashboard connection required. Please scan a valid GRIPLOCK QR code first.
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.goBackButton,
              pressed && styles.goBackButtonPressed,
            ]}
            onPress={() => navigation.replace("Home")}
            testID="button-go-home"
          >
            <Feather name="home" size={20} color={Colors.dark.text} />
            <Text style={styles.goBackButtonText}>Return Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: headerHeight + Spacing["5xl"],
          paddingBottom: insets.bottom + Spacing["5xl"],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.nfcContainer}>
          <Animated.View style={[styles.ripple, ripple1Style]} />
          <Animated.View style={[styles.ripple, ripple2Style]} />
          <Animated.View style={[styles.ripple, ripple3Style]} />
          
          <Animated.View style={[styles.nfcIconContainer, iconPulseStyle]}>
            <Image
              source={require("../../assets/images/nfc-illustration.png")}
              style={styles.nfcImage}
              contentFit="contain"
            />
          </Animated.View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Hold Your Card</Text>
          <Text style={styles.subtitle}>
            Place your GRIPLOCK card near the device
          </Text>
          {nfcSupported === true ? (
            <Text style={styles.scanStatusText}>{scanStatus}</Text>
          ) : null}
        </View>

        <View style={styles.instructionContainer}>
          <View style={styles.instructionItem}>
            <Feather name="smartphone" size={20} color={Colors.dark.primary} />
            <Text style={styles.instructionText}>Hold near the back of your phone</Text>
          </View>
          <View style={styles.instructionItem}>
            <Feather name="clock" size={20} color={Colors.dark.primary} />
            <Text style={styles.instructionText}>Keep steady for 2-3 seconds</Text>
          </View>
        </View>

        {nfcSupported === true && nfcEnabled === false ? (
          <View style={styles.nfcNotSupportedContainer}>
            <View style={styles.errorIconContainer}>
              <Feather name="wifi-off" size={48} color={Colors.dark.warning} />
            </View>
            <Text style={styles.nfcDisabledTitle}>NFC is Disabled</Text>
            <Text style={styles.nfcNotSupportedText}>
              Your device supports NFC, but it is currently turned off. Please enable NFC in your phone settings to use GRIPLOCK.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.enableNfcButton,
                pressed && styles.enableNfcButtonPressed,
              ]}
              onPress={openNfcSettings}
              testID="button-open-nfc-settings"
            >
              <Feather name="settings" size={20} color={Colors.dark.backgroundRoot} />
              <Text style={styles.enableNfcButtonText}>Open NFC Settings</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.recheckButton,
                pressed && styles.recheckButtonPressed,
              ]}
              onPress={recheckNfcEnabled}
              testID="button-recheck-nfc"
            >
              <Feather name="refresh-cw" size={20} color={Colors.dark.primary} />
              <Text style={styles.recheckButtonText}>Check Again</Text>
            </Pressable>
          </View>
        ) : null}

        {nfcSupported === false ? (
          <View style={styles.nfcNotSupportedContainer}>
            <View style={styles.errorIconContainer}>
              <Feather name="alert-triangle" size={48} color={Colors.dark.error} />
            </View>
            <Text style={styles.nfcNotSupportedTitle}>NFC Not Available</Text>
            <Text style={styles.nfcNotSupportedText}>
              {isWebPlatform 
                ? "NFC is not supported on web browsers. Please use the GRIPLOCK mobile app." 
                : "This app requires native NFC support. Please install the APK built with EAS Build to use NFC functionality."}
            </Text>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionBoxTitle}>How to get NFC support:</Text>
              <Text style={styles.instructionBoxText}>1. Run: eas build --platform android</Text>
              <Text style={styles.instructionBoxText}>2. Install the generated APK</Text>
              <Text style={styles.instructionBoxText}>3. Reopen GRIPLOCK app</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.goBackButton,
                pressed && styles.goBackButtonPressed,
              ]}
              onPress={() => navigation.replace("Home")}
              testID="button-go-home-nfc"
            >
              <Feather name="arrow-left" size={20} color={Colors.dark.text} />
              <Text style={styles.goBackButtonText}>Return Home</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.connectionStatus}>
          <View style={styles.connectedDot} />
          <Text style={styles.connectionText}>Dashboard Connected</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {nfcSupported 
            ? "Hold your NTAG card near the NFC reader"
            : "Build with EAS for native NFC support"}
        </Text>
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
  nfcContainer: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  ripple: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
  },
  nfcIconContainer: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    ...Shadows.glow,
  },
  nfcImage: {
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
    marginBottom: Spacing.sm,
    textShadowColor: Colors.dark.primaryGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  scanStatusText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.primary,
    marginTop: Spacing.md,
  },
  instructionContainer: {
    gap: Spacing.lg,
    marginBottom: Spacing["3xl"],
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  instructionText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
  },
  nfcNotSupportedContainer: {
    alignItems: "center",
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  errorIconContainer: {
    marginBottom: Spacing.md,
  },
  nfcNotSupportedTitle: {
    fontFamily: Fonts.heading,
    fontSize: Typography.subheading.fontSize,
    color: Colors.dark.error,
    textAlign: "center",
  },
  nfcNotSupportedText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  instructionBox: {
    backgroundColor: Colors.dark.backgroundSecondary,
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    width: "100%",
    marginTop: Spacing.md,
  },
  instructionBoxTitle: {
    fontFamily: Fonts.heading,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.primary,
    marginBottom: Spacing.sm,
  },
  instructionBoxText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.xs,
  },
  goBackButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundTertiary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: 12,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: Spacing.lg,
  },
  goBackButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  goBackButtonText: {
    fontFamily: Fonts.heading,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.text,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.success,
  },
  connectionText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.success,
  },
  nfcDisabledTitle: {
    fontFamily: Fonts.heading,
    fontSize: Typography.subheading.fontSize,
    color: Colors.dark.warning,
    textAlign: "center",
  },
  enableNfcButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.primary,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: 12,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  enableNfcButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  enableNfcButtonText: {
    fontFamily: Fonts.heading,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.backgroundRoot,
  },
  recheckButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.primary,
  },
  recheckButtonPressed: {
    opacity: 0.8,
  },
  recheckButtonText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.primary,
  },
});
