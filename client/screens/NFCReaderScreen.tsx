import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Platform, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
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
import { logNFCTap, logEvent } from "@/lib/analytics";
import { getWalletByNfcUid } from "@/lib/v2/wallet-store";

let NfcManager: any = null;
let NfcTech: any = null;

if (Platform.OS !== "web") {
  try {
    const nfcModule = require("react-native-nfc-manager");
    NfcManager = nfcModule.default;
    NfcTech = nfcModule.NfcTech;
  } catch (e) {
  }
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "NFCReader">;
type RouteProps = RouteProp<RootStackParamList, "NFCReader">;

function GriplockLogo() {
  return (
    <Svg width={50} height={50} viewBox="0 0 50 50" fill="none">
      <Defs>
        <LinearGradient id="logoGradient" x1="25.0005" y1="0" x2="25.0005" y2="50" gradientUnits="userSpaceOnUse">
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
      <Path d="M164.297 26.891L161.566 25.314C160.525 24.7133 160.525 23.2113 161.566 22.6106L164.297 21.0336C164.78 20.7548 165.375 20.7548 165.858 21.0336L168.59 22.6106C169.63 23.2113 169.63 24.7133 168.59 25.314L165.858 26.891C165.375 27.1699 164.78 27.1699 164.297 26.891Z" stroke="white" strokeWidth={0.390211} />
      <Path d="M172.881 32.3539L170.15 30.7769C169.109 30.1762 169.109 28.6742 170.15 28.0735L172.881 26.4965C173.364 26.2177 173.959 26.2177 174.442 26.4965L177.174 28.0735C178.214 28.6742 178.214 30.1762 177.174 30.7769L174.442 32.3539C173.959 32.6327 173.364 32.6327 172.881 32.3539Z" stroke="white" strokeWidth={0.390211} />
      <Path d="M155.712 32.3539L152.981 30.7769C151.94 30.1762 151.94 28.6742 152.981 28.0735L155.712 26.4965C156.195 26.2177 156.79 26.2177 157.273 26.4965L160.005 28.0735C161.045 28.6742 161.045 30.1762 160.005 30.7769L157.273 32.3539C156.79 32.6327 156.195 32.6327 155.712 32.3539Z" stroke="white" strokeWidth={0.390211} />
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
      <Path d="M60.2656 8.58161L63.3401 6.45312V10.0006L65.9416 8.10862" stroke="white" strokeWidth={0.472997} />
      <Path d="M64.2861 11.4197L67.5971 9.05469L69.2526 10.2372" stroke="white" strokeWidth={0.472997} />
      <Path d="M66.4141 9.76465L68.3061 11.1836" stroke="white" strokeWidth={0.472997} />
      <Path d="M73.0358 12.6016L70.9073 11.1826L68.0693 13.0746L69.7248 14.2571" stroke="white" strokeWidth={0.472997} />
    </Svg>
  );
}

function BackArrowIcon() {
  return (
    <Svg width={19} height={9} viewBox="0 0 19 9" fill="none">
      <Path
        d="M18 4.5H1M1 4.5L4.5 1M1 4.5L4.5 8"
        stroke="white"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function NFCReaderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const [isWebPlatform] = useState(Platform.OS === "web");
  const { setNfcData, status: connectionStatus, setWalletAddress } = useWebRTC();
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("Waiting for card...");
  const scanningRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const cardFloatAnim = useSharedValue(0);
  const phoneFloatAnim = useSharedValue(0);

  useEffect(() => {
    checkNfcSupport();
    return () => {
      if (NfcManager && Platform.OS !== "web") {
        try { NfcManager.unregisterTagEvent().catch(() => {}); } catch (e) {}
        try { NfcManager.cancelTechnologyRequest().catch(() => {}); } catch (e) {}
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
      setNfcSupported(false);
      setNfcEnabled(false);
    }
  };

  const openNfcSettings = async () => {
    if (NfcManager && Platform.OS !== "web") {
      try {
        await NfcManager.goToNfcSetting();
      } catch (e) {
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

  const handleTagDiscovered = useCallback(async (tag: any) => {
    if (!tag) return;

    console.log('[NFC] Tag detected:', JSON.stringify(tag));
    logNFCTap(true);
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const rawTagId = tag.id || "";
    const tagId = rawTagId.replace(/[^0-9a-f]/gi, "").toLowerCase();
    const nfcDataString = `griplock_${tagId}`;

    console.log('[NFC] Processed NFC data:', nfcDataString);
    console.log('[NFC] Connection status before navigate:', connectionStatus);

    setScanStatus("Card detected!");
    setNfcData(nfcDataString);

    try {
      await NfcManager.unregisterTagEvent();
    } catch (_) {}
    scanningRef.current = false;

    try {
      const existingProfile = await getWalletByNfcUid(tagId);
      if (!existingProfile) {
        console.log('[NFC] No V2 profile found, routing to V2Setup');
        navigation.replace('V2Setup', { nfcUid: tagId });
        return;
      }
      console.log('[NFC] V2 profile found:', existingProfile.walletId);
      navigation.replace('V2Unlock', {
        nfcUid: tagId,
        walletProfile: existingProfile,
        shieldAction: route.params?.shieldAction,
        privateSendAction: route.params?.privateSendAction,
        sendAction: route.params?.sendAction,
      });
    } catch (e) {
      console.log('[NFC] V2 profile check failed:', e);
      navigation.goBack();
    }
  }, [navigation, route.params, setNfcData, connectionStatus]);

  const startNfcScan = useCallback(async () => {
    if (!NfcManager || !nfcSupported || !nfcEnabled) return;
    
    if (scanningRef.current) {
      return;
    }
    
    scanningRef.current = true;
    setScanStatus("Waiting for card...");

    try {
      try {
        await NfcManager.unregisterTagEvent();
      } catch (_) {}

      await NfcManager.registerTagEvent(
        (tag: any) => {
          handleTagDiscovered(tag);
        },
        'Hold your NFC card near the device',
        { alertMessage: 'Hold your GRIPLOCK card near the device' }
      );
      console.log('[NFC] registerTagEvent active — waiting for any NFC tag');
    } catch (e: any) {
      console.log('[NFC] registerTagEvent failed, falling back to NfcA:', e);
      logNFCTap(false);
      scanningRef.current = false;

      try {
        await cleanupNfc();
        await NfcManager.requestTechnology(NfcTech.NfcA);
        const tag = await NfcManager.getTag();
        if (tag) {
          await handleTagDiscovered(tag);
        }
        try { await NfcManager.cancelTechnologyRequest(); } catch (_) {}
      } catch (fallbackErr) {
        console.log('[NFC] NfcA fallback also failed:', fallbackErr);
        try { await NfcManager.cancelTechnologyRequest(); } catch (_) {}
      }
      
      setScanStatus("Waiting for card...");
      scanningRef.current = false;
      
      if (nfcSupported && nfcEnabled) {
        retryTimeoutRef.current = setTimeout(() => {
          startNfcScan();
        }, 2000);
      }
    }
  }, [nfcSupported, nfcEnabled, cleanupNfc, handleTagDiscovered]);

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
        try { NfcManager.unregisterTagEvent().catch(() => {}); } catch (_) {}
        NfcManager.cancelTechnologyRequest().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    cardFloatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    phoneFloatAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const cardFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(cardFloatAnim.value, [0, 1], [0, -12]) }],
  }));

  const phoneFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(phoneFloatAnim.value, [0, 1], [0, -6]) }],
  }));

  const handleBackPress = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  };

  const isConnected = connectionStatus === "connected";
  const shieldAction = route.params?.shieldAction;
  const privateSendAction = route.params?.privateSendAction;
  const sendAction = route.params?.sendAction;
  const isMobileInitiatedFlow = !!shieldAction || !!privateSendAction || !!sendAction;

  if (!isConnected && !isMobileInitiatedFlow) {
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
        <View style={styles.disconnectedContent}>
          <View style={styles.disconnectedIconContainer}>
            <Feather name="wifi-off" size={64} color="#FFFFFF" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.disconnectedTitle}>Not Connected</Text>
            <Text style={styles.disconnectedSubtitle}>
              Dashboard connection required. Please scan a valid GRIPLOCK QR code first.
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.disconnectedButton,
              pressed && styles.disconnectedButtonPressed,
            ]}
            onPress={() => navigation.replace("Home")}
            testID="button-go-home"
          >
            <Text style={styles.disconnectedButtonText}>Return Home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundWrapper}>
        <Image
          source={require("../../assets/images/nfc-background.png")}
          style={styles.backgroundImage}
          contentFit="cover"
        />
      </View>

      <ScreenHeader leftText="back" rightText="Tap card" onBack={handleBackPress} />

      <View style={styles.content}>
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

        <View style={styles.textContainer}>
          <Text style={styles.title}>TAP AND HOLD{"\n"}YOUR CARD</Text>
          {shieldAction ? (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>
                {shieldAction.type === 'shield' ? 'SHIELD' : 'UNSHIELD'} {shieldAction.amount} SOL
              </Text>
            </View>
          ) : null}
          {privateSendAction ? (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>
                SEND PRIVATE {privateSendAction.amount} SOL
              </Text>
            </View>
          ) : null}
          {sendAction ? (
            <View style={styles.actionBadge}>
              <Text style={styles.actionBadgeText}>
                SEND {sendAction.amount} SOL
              </Text>
            </View>
          ) : null}
          <Text style={styles.subtitle}>Place your any NFC card near the device</Text>
          <Text style={styles.statusText}>{scanStatus}</Text>
        </View>

        {nfcSupported === true && nfcEnabled === false ? (
          <View style={styles.nfcErrorContainer}>
            <View style={styles.errorIconContainer}>
              <Feather name="wifi-off" size={32} color={Colors.dark.warning} />
            </View>
            <Text style={styles.nfcDisabledTitle}>NFC is Disabled</Text>
            <Text style={styles.nfcErrorText}>
              Please enable NFC in your phone settings to use GRIPLOCK.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.enableNfcButton,
                pressed && styles.enableNfcButtonPressed,
              ]}
              onPress={openNfcSettings}
              testID="button-open-nfc-settings"
            >
              <Feather name="settings" size={18} color={Colors.dark.backgroundRoot} />
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
              <Feather name="refresh-cw" size={16} color="#A4BAD2" />
              <Text style={styles.recheckButtonText}>Check Again</Text>
            </Pressable>
          </View>
        ) : null}

        {nfcSupported === false ? (
          <View style={styles.nfcErrorContainer}>
            <View style={styles.errorIconContainer}>
              <Feather name="alert-triangle" size={32} color={Colors.dark.error} />
            </View>
            <Text style={styles.nfcNotSupportedTitle}>NFC Not Available</Text>
            <Text style={styles.nfcErrorText}>
              {isWebPlatform 
                ? "NFC is not supported on web. Please use the mobile app." 
                : "Install the APK built with EAS Build for NFC support."}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  backText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.text,
  },
  logoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  tapCardText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.text,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  disconnectedContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  disconnectedIconContainer: {
    marginBottom: Spacing["2xl"],
  },
  disconnectedTitle: {
    fontFamily: Fonts.astroSpace,
    fontSize: Typography.heading.fontSize,
    color: "#FFFFFF",
    marginBottom: Spacing.md,
  },
  disconnectedSubtitle: {
    fontFamily: Fonts.body,
    fontSize: Typography.body.fontSize,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  disconnectedButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: 999,
    marginTop: Spacing["2xl"],
  },
  disconnectedButtonPressed: {
    opacity: 0.8,
  },
  disconnectedButtonText: {
    fontFamily: Fonts.body,
    fontSize: Typography.body.fontSize,
    color: "#000000",
    fontWeight: "600",
  },
  title: {
    fontFamily: Fonts.circular.bold,
    fontSize: 24,
    color: Colors.dark.text,
    textAlign: "center",
    lineHeight: 32,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  statusText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: "#A4BAD2",
    textAlign: "center",
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
    top: 10,
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  actionBadge: {
    backgroundColor: "rgba(164, 186, 210, 0.15)",
    borderWidth: 1,
    borderColor: "#A4BAD2",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  actionBadgeText: {
    fontFamily: Fonts.astroSpace,
    fontSize: 11,
    color: "#A4BAD2",
    letterSpacing: 1,
  },
  nfcErrorContainer: {
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing["2xl"],
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    padding: Spacing.xl,
  },
  errorIconContainer: {
    marginBottom: Spacing.xs,
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
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  enableNfcButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#A4BAD2",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  enableNfcButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  enableNfcButtonText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.backgroundRoot,
    fontWeight: "600",
  },
  recheckButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: "#A4BAD2",
  },
  recheckButtonPressed: {
    opacity: 0.8,
  },
  recheckButtonText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: "#A4BAD2",
  },
});
