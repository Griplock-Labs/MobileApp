import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Platform, Pressable, Text, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Path, Rect } from "react-native-svg";
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
import ScreenHeader from "@/components/ScreenHeader";
import { ASCIILoader } from "@/components/ASCIILoader";

let NfcManager: any = null;
let NfcTech: any = null;

if (Platform.OS !== "web") {
  try {
    const nfcModule = require("react-native-nfc-manager");
    NfcManager = nfcModule.default;
    NfcTech = nfcModule.NfcTech;
  } catch (e) {}
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PrivacyAction">;

const theme = Colors.dark;
const ACTION_TIMEOUT_MS = 3 * 60 * 1000;

type Phase = "nfc" | "processing" | "result";


function PhoneIllustration() {
  return (
    <Svg width={255} height={157} viewBox="0 0 255 157" fill="none">
      <Path d="M164.688 15.5107L140.885 29.9485L194.344 63.8969L218.927 48.2884L164.688 15.5107Z" stroke="white" strokeWidth={0.390211} />
      <Path d="M254.045 55.3115V64.6766L95.6199 156.144H81.5723L0.195312 109.161V100.576" stroke="white" strokeWidth={0.390211} />
      <Path d="M158.053 0.195312L0.408203 91.2116V100.37L81.572 147.23H94.8392L254.045 55.3122V47.2806L172.491 0.195312H158.053Z" stroke="white" strokeWidth={0.390211} />
      <Path d="M254.046 55.3117L172.492 6.92557V0.291992" stroke="white" strokeWidth={0.390211} />
      <Path d="M172.492 6.92557H158.054V0.291992" stroke="white" strokeWidth={0.390211} />
      <Path d="M158.053 6.92578L0.408203 100.186" stroke="white" strokeWidth={0.390211} />
      <Path d="M234.925 72.0908L223.999 78.399" stroke="white" strokeWidth={0.390211} />
      <Path d="M34.3564 125.159L46.5223 132.183" stroke="white" strokeWidth={0.390211} />
    </Svg>
  );
}

function NFCCardIllustration() {
  return (
    <Svg width={181} height={105} viewBox="0 0 181 105" fill="none">
      <Path d="M180.871 68.1064L118.017 104.396" stroke="white" strokeWidth={0.390211} />
      <Path d="M63.0986 0.209961L180.841 68.0217" stroke="white" strokeWidth={0.390211} />
      <Path d="M0.0986328 36.21L117.626 104.701" stroke="white" strokeWidth={0.390211} />
      <Path d="M63.0986 0.168945L0.172852 36.4996" stroke="white" strokeWidth={0.390211} />
      <Path d="M62.9967 4.89258L8.36719 37.2801L117.236 100.494L173.036 67.7165L62.9967 4.89258Z" fill="white" fillOpacity={0.2} />
      <Path d="M22.8053 32.9873C22.8053 34.7114 21.4077 36.109 19.6836 36.109" stroke="white" strokeWidth={0.780421} />
      <Path d="M25.1465 32.9873C25.1465 36.0044 22.7007 38.4503 19.6836 38.4503" stroke="white" strokeWidth={0.780421} />
      <Path d="M27.878 32.9873C27.878 37.2975 24.384 40.7915 20.0738 40.7915H19.6836" stroke="white" strokeWidth={0.780421} />
    </Svg>
  );
}

export default function PrivacyActionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { pendingPrivacyAction, clearPendingPrivacyAction, walletAddress, sendPrivacyActionResponse } = useWebRTC();
  
  const [phase, setPhase] = useState<Phase>("nfc");
  const [timeRemaining, setTimeRemaining] = useState(ACTION_TIMEOUT_MS);
  const [scanStatus, setScanStatus] = useState("Initializing NFC...");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const hasNavigatedRef = useRef(false);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [isNfcInitializing, setIsNfcInitializing] = useState(true);
  const cleanupInProgressRef = useRef(false);
  
  const isWebPlatform = Platform.OS === "web";
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nfcActiveRef = useRef(false);

  const pulseAnim = useSharedValue(0);
  const phoneFloat = useSharedValue(0);
  const cardFloat = useSharedValue(0);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    phoneFloat.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(5, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    cardFloat.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.7, 1]),
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [0.98, 1.02]) }],
  }));

  const phoneFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: phoneFloat.value }],
  }));

  const cardFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardFloat.value }],
  }));

  useEffect(() => {
    if (pendingPrivacyAction) {
      const startTime = pendingPrivacyAction.timestamp || Date.now();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, ACTION_TIMEOUT_MS - elapsed);
      setTimeRemaining(remaining);

      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            handleTimeout();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [pendingPrivacyAction]);

  useEffect(() => {
    checkNfcSupport();
  }, []);

  useEffect(() => {
    if (phase === "nfc" && nfcSupported && nfcEnabled && !resultMessage) {
      startNfcScan();
    }
    return () => {
      stopNfcScan();
    };
  }, [phase, nfcSupported, nfcEnabled, resultMessage]);

  const checkNfcSupport = async () => {
    setIsNfcInitializing(true);
    setScanStatus("Initializing NFC...");
    
    if (isWebPlatform || !NfcManager) {
      setNfcSupported(false);
      setIsNfcInitializing(false);
      return;
    }
    try {
      const supported = await NfcManager.isSupported();
      setNfcSupported(supported);
      if (supported) {
        await NfcManager.start();
        const enabled = await NfcManager.isEnabled();
        setNfcEnabled(enabled);
      }
    } catch (error) {
      console.error("[PrivacyAction] NFC check failed:", error);
      setNfcSupported(false);
    } finally {
      setIsNfcInitializing(false);
      setScanStatus("Waiting for card...");
    }
  };

  const startNfcScan = async () => {
    if (!NfcManager) return;
    
    // Wait if cleanup is in progress
    if (cleanupInProgressRef.current) {
      console.log("[PrivacyAction] Waiting for cleanup to complete...");
      setTimeout(() => startNfcScan(), 1500);
      return;
    }
    
    // Don't start if already active
    if (nfcActiveRef.current) {
      console.log("[PrivacyAction] NFC scan already active, skipping");
      return;
    }
    
    nfcActiveRef.current = true;
    setScanStatus("Waiting for card...");

    try {
      await NfcManager.requestTechnology(NfcTech.NfcA);
      const tag = await NfcManager.getTag();
      
      if (tag?.id) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScanStatus("Card verified!");
        
        const rawTagId = tag.id || "";
        const tagId = rawTagId.replace(/[^0-9a-f]/gi, "").toLowerCase();
        const nfcDataString = `griplock_${tagId}`;
        
        hasNavigatedRef.current = true;
        
        if (pendingPrivacyAction) {
          navigation.navigate("PINInput", {
            sessionId: `privacyaction-${pendingPrivacyAction.actionId}`,
            nfcData: nfcDataString,
            privacyAction: {
              actionId: pendingPrivacyAction.actionId,
              actionType: pendingPrivacyAction.actionType,
              walletAddress: pendingPrivacyAction.walletAddress,
              symbol: pendingPrivacyAction.symbol,
              amount: pendingPrivacyAction.amount,
              mint: pendingPrivacyAction.mint,
              expiresAt: new Date(Date.now() + timeRemaining).toISOString(),
            },
          });
        }
      }
    } catch (error: any) {
      if (error.message !== "cancelled") {
        console.error("[PrivacyAction] NFC scan error:", error);
        setScanStatus("Tap your card to confirm");
      }
    } finally {
      // Proper cleanup with flag
      cleanupInProgressRef.current = true;
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch {}
      
      // Wait a bit to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      nfcActiveRef.current = false;
      cleanupInProgressRef.current = false;
      
      // Retry with longer delay
      if (phase === "nfc" && !resultMessage && !hasNavigatedRef.current) {
        setTimeout(() => startNfcScan(), 1500);
      }
    }
  };

  const stopNfcScan = async () => {
    if (!NfcManager) return;
    cleanupInProgressRef.current = true;
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
    nfcActiveRef.current = false;
    cleanupInProgressRef.current = false;
  };

  const handleCancel = async () => {
    if (!pendingPrivacyAction || !walletAddress) {
      clearPendingPrivacyAction();
      navigation.goBack();
      return;
    }

    sendPrivacyActionResponse(
      pendingPrivacyAction.actionId,
      pendingPrivacyAction.actionType,
      false,
      walletAddress,
      "User cancelled"
    );

    clearPendingPrivacyAction();
    navigation.goBack();
  };

  const handleTimeout = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    stopNfcScan();
    
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setResultMessage("Action expired");
    setIsSuccess(false);
    setPhase("result");

    if (pendingPrivacyAction && walletAddress) {
      sendPrivacyActionResponse(
        pendingPrivacyAction.actionId,
        pendingPrivacyAction.actionType,
        false,
        walletAddress,
        "Action timed out"
      );
    }
  };

  const handleReturn = () => {
    clearPendingPrivacyAction();
    navigation.goBack();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const recheckNfcEnabled = async () => {
    if (!NfcManager) return;
    try {
      const enabled = await NfcManager.isEnabled();
      setNfcEnabled(enabled);
    } catch {}
  };

  const openNfcSettings = () => {
    if (NfcManager?.goToNfcSetting) {
      NfcManager.goToNfcSetting();
    }
  };

  if (!pendingPrivacyAction) {
    return (
      <View style={styles.container}>
        <ScreenHeader leftText="back" rightText="" onBack={() => navigation.goBack()} />
        <View style={styles.noRequestContent}>
          <Feather name="shield" size={48} color={theme.textSecondary} />
          <Text style={styles.noRequestText}>No pending privacy action</Text>
          <Pressable style={styles.returnButton} onPress={() => navigation.goBack()}>
            <Text style={styles.returnButtonText}>Return</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isShield = pendingPrivacyAction.actionType === "shield";
  const actionTitle = isShield ? "VERIFY HIDE BALANCE" : "VERIFY SHOW BALANCE";
  const actionVerb = isShield ? "Hide" : "Show";

  return (
    <View style={styles.container}>
      <ScreenHeader leftText="cancel" rightText={formatTime(timeRemaining)} onBack={handleCancel} />

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.actionTitle}>{actionTitle}</Text>
          <Text style={styles.amountText}>
            {actionVerb} {pendingPrivacyAction.amount} {pendingPrivacyAction.symbol}?
          </Text>
          <Text style={styles.walletText}>
            {pendingPrivacyAction.walletAddress.slice(0, 8)}...{pendingPrivacyAction.walletAddress.slice(-8)}
          </Text>
        </View>

        {phase === "result" ? (
          <View style={styles.resultContainer}>
            <View style={[styles.resultIcon, { backgroundColor: isSuccess ? "rgba(6, 176, 64, 0.2)" : "rgba(255, 68, 68, 0.2)" }]}>
              <Feather 
                name={isSuccess ? "check-circle" : "x-circle"} 
                size={48} 
                color={isSuccess ? "#06B040" : "#FF4444"} 
              />
            </View>
            <Text style={[styles.resultText, { color: isSuccess ? "#06B040" : "#FF4444" }]}>
              {resultMessage}
            </Text>
            <Pressable style={styles.returnButton} onPress={handleReturn}>
              <Text style={styles.returnButtonText}>Done</Text>
            </Pressable>
          </View>
        ) : phase === "processing" ? (
          <View style={styles.processingContainer}>
            <ASCIILoader size="large" />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        ) : (
          <>
            <View style={styles.spacer} />

            <View style={styles.nfcContainer}>
              <View style={styles.illustrationWrapper}>
                <Animated.View style={[styles.phoneBase, phoneFloatStyle]}>
                  <PhoneIllustration />
                </Animated.View>
                <Animated.View style={[styles.cardOverlay, cardFloatStyle]}>
                  <NFCCardIllustration />
                </Animated.View>
              </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.textContainer}>
              <Animated.Text style={[styles.title, pulseStyle]}>TAP YOUR CARD{"\n"}TO CONFIRM</Animated.Text>
              <View style={styles.statusRow}>
                {isNfcInitializing ? (
                  <ActivityIndicator size="small" color={Colors.dark.primary} style={styles.statusSpinner} />
                ) : null}
                <Text style={styles.statusText}>{scanStatus}</Text>
              </View>
            </View>

            {nfcSupported === true && nfcEnabled === false ? (
              <View style={styles.nfcErrorContainer}>
                <Feather name="wifi-off" size={24} color={Colors.dark.warning} />
                <Text style={styles.nfcDisabledTitle}>NFC is Disabled</Text>
                <Pressable
                  style={styles.enableNfcButton}
                  onPress={openNfcSettings}
                  testID="button-open-nfc-settings"
                >
                  <Text style={styles.enableNfcButtonText}>Open NFC Settings</Text>
                </Pressable>
                <Pressable style={styles.recheckButton} onPress={recheckNfcEnabled}>
                  <Text style={styles.recheckButtonText}>Check Again</Text>
                </Pressable>
              </View>
            ) : null}

            {nfcSupported === false ? (
              <View style={styles.nfcErrorContainer}>
                <Feather name="alert-triangle" size={24} color={Colors.dark.error} />
                <Text style={styles.nfcNotSupportedTitle}>NFC Not Available</Text>
                <Text style={styles.nfcErrorText}>
                  {isWebPlatform 
                    ? "NFC is not supported on web." 
                    : "Install the APK for NFC support."}
                </Text>
              </View>
            ) : null}

            <View style={[styles.bottomSpacer, { paddingBottom: insets.bottom }]} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundRoot,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  actionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    letterSpacing: 1,
    color: Colors.dark.text,
    marginBottom: Spacing.md,
  },
  amountText: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
  },
  walletText: {
    fontFamily: Fonts.mono || Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  bottomSpacer: {
    height: Spacing["3xl"] * 3,
  },
  noRequestContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  noRequestText: {
    fontFamily: Fonts.body,
    fontSize: Typography.body.fontSize,
    color: theme.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  nfcContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  illustrationWrapper: {
    position: "relative",
    width: 280,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  phoneBase: {
    position: "absolute",
    bottom: 0,
  },
  cardOverlay: {
    position: "absolute",
    top: 5,
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing["3xl"] * 2,
  },
  title: {
    fontFamily: Fonts.circular?.bold || Fonts.heading,
    fontSize: 22,
    color: Colors.dark.text,
    textAlign: "center",
    lineHeight: 30,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  statusSpinner: {
    marginRight: Spacing.xs,
  },
  statusText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: "#A4BAD2",
    textAlign: "center",
  },
  nfcErrorContainer: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: Spacing.lg,
  },
  nfcDisabledTitle: {
    fontFamily: Fonts.heading,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.warning,
    textAlign: "center",
  },
  nfcNotSupportedTitle: {
    fontFamily: Fonts.heading,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.error,
    textAlign: "center",
  },
  nfcErrorText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: theme.textSecondary,
    textAlign: "center",
  },
  enableNfcButton: {
    backgroundColor: Colors.dark.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
  },
  enableNfcButtonText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.backgroundRoot,
  },
  recheckButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  recheckButtonText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.primary,
  },
  resultContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  resultText: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  processingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  processingText: {
    fontFamily: Fonts.body,
    fontSize: Typography.body.fontSize,
    color: theme.textSecondary,
    marginTop: Spacing.lg,
  },
  returnButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  returnButtonText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.text,
  },
});
