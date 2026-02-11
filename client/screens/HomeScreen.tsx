import React, { useEffect, useState, useRef, useCallback } from "react";
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
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import { useAuthPreference } from "@/context/AuthPreferenceContext";
import WalletCard from "@/components/WalletCard";
import BottomNavigation from "@/components/BottomNavigation";
import AuthLevelModal, { AuthLevel } from "@/components/AuthLevelModal";
import SecretSetupModal from "@/components/SecretSetupModal";
import { logEvent, logQRScanned, logNFCTap } from "@/lib/analytics";
import { deriveSolanaAddress } from "@/lib/crypto";
import { checkForUpdates, UpdateInfo } from "@/lib/update-checker";
import * as Linking from "expo-linking";

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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

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

function GriplockLogo() {
  return (
    <Svg width={50} height={50} viewBox="0 0 50 50" fill="none">
      <Path
        d="M16.585 8.07031C16.5834 8.07109 16.5816 8.07149 16.5801 8.07227L24.8525 16.3379L20.6055 20.5801L11.6445 11.6279C8.2177 15.0498 6.09668 19.7769 6.09668 25C6.09668 35.4429 14.5701 43.9082 25.0225 43.9082C32.2135 43.9082 38.4664 39.901 41.6689 34H22.7705V28H49.8652C48.3818 40.3926 37.8258 50 25.0225 50C11.2029 50 4.75598e-07 38.8071 0 25C0 15.9178 4.84766 7.96711 12.0986 3.58887L16.585 8.07031ZM47.3682 13.7402C48.8669 16.7035 49.794 20.005 50.001 23.5H37.8027L47.3682 13.7402ZM41.2178 5.94336C42.5805 7.10061 43.8183 8.40072 44.9062 9.82129L34.5459 20.3896L30.7627 16.6094L41.2178 5.94336ZM32.2197 1.04883C34.0754 1.60468 35.8403 2.37117 37.4873 3.31836L27.5771 13.4277L23.792 9.64648L32.2197 1.04883ZM25.0225 0C25.6463 9.07155e-06 26.2656 0.0215703 26.8779 0.0664062L20.6074 6.46387L15.8662 1.72656C18.7019 0.612097 21.7908 3.73014e-05 25.0225 0Z"
        fill="url(#paint0_linear_logo)"
      />
      <Defs>
        <LinearGradient
          id="paint0_linear_logo"
          x1="25.0005"
          y1="0"
          x2="25.0005"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#DBE4ED" />
          <Stop offset="1" stopColor="#A3BAD2" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

function GearIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
      <Path
        d="M11 14C12.6569 14 14 12.6569 14 11C14 9.34315 12.6569 8 11 8C9.34315 8 8 9.34315 8 11C8 12.6569 9.34315 14 11 14Z"
        stroke="#888888"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17.7273 13.7273C17.6063 14.0015 17.5702 14.3056 17.6236 14.6005C17.6771 14.8954 17.8177 15.1676 18.0273 15.3818L18.0818 15.4364C18.2509 15.6052 18.385 15.8057 18.4765 16.0265C18.568 16.2472 18.6151 16.4838 18.6151 16.7227C18.6151 16.9617 18.568 17.1983 18.4765 17.419C18.385 17.6397 18.2509 17.8402 18.0818 18.0091C17.913 18.1781 17.7124 18.3122 17.4917 18.4037C17.271 18.4952 17.0344 18.5423 16.7955 18.5423C16.5565 18.5423 16.3199 18.4952 16.0992 18.4037C15.8785 18.3122 15.678 18.1781 15.5091 18.0091L15.4545 17.9545C15.2403 17.745 14.9682 17.6044 14.6733 17.5509C14.3784 17.4974 14.0742 17.5335 13.8 17.6545C13.5311 17.7698 13.3018 17.9611 13.1403 18.205C12.9788 18.4489 12.8921 18.7347 12.8909 19.0273V19.1818C12.8909 19.664 12.6994 20.1265 12.3584 20.4675C12.0174 20.8085 11.5549 21 11.0727 21C10.5905 21 10.128 20.8085 9.78705 20.4675C9.44606 20.1265 9.25455 19.664 9.25455 19.1818V19.1C9.24751 18.7991 9.15011 18.5073 8.97501 18.2625C8.79991 18.0176 8.55521 17.8312 8.27273 17.7273C7.99853 17.6063 7.69437 17.5702 7.39947 17.6236C7.10456 17.6771 6.83244 17.8177 6.61818 18.0273L6.56364 18.0818C6.39478 18.2509 6.19425 18.385 5.97353 18.4765C5.7528 18.568 5.51621 18.6151 5.27727 18.6151C5.03834 18.6151 4.80175 18.568 4.58102 18.4765C4.3603 18.385 4.15977 18.2509 3.99091 18.0818C3.82186 17.913 3.68775 17.7124 3.59626 17.4917C3.50476 17.271 3.45766 17.0344 3.45766 16.7955C3.45766 16.5565 3.50476 16.3199 3.59626 16.0992C3.68775 15.8785 3.82186 15.678 3.99091 15.5091L4.04545 15.4545C4.25503 15.2403 4.39562 14.9682 4.4491 14.6733C4.50257 14.3784 4.46647 14.0742 4.34545 13.8C4.23022 13.5311 4.03887 13.3018 3.79497 13.1403C3.55107 12.9788 3.26526 12.8921 2.97273 12.8909H2.81818C2.33597 12.8909 1.87351 12.6994 1.53253 12.3584C1.19156 12.0174 1 11.5549 1 11.0727C1 10.5905 1.19156 10.128 1.53253 9.78705C1.87351 9.44606 2.33597 9.25455 2.81818 9.25455H2.9C3.20089 9.24751 3.49273 9.15011 3.73754 8.97501C3.98236 8.79991 4.16883 8.55521 4.27273 8.27273C4.39374 7.99853 4.42984 7.69437 4.37637 7.39947C4.3229 7.10456 4.18231 6.83244 3.97273 6.61818L3.91818 6.56364C3.74913 6.39478 3.61503 6.19425 3.52353 5.97353C3.43203 5.7528 3.38493 5.51621 3.38493 5.27727C3.38493 5.03834 3.43203 4.80175 3.52353 4.58102C3.61503 4.3603 3.74913 4.15977 3.91818 3.99091C4.08704 3.82186 4.28757 3.68775 4.50829 3.59626C4.72902 3.50476 4.96561 3.45766 5.20455 3.45766C5.44348 3.45766 5.68007 3.50476 5.9008 3.59626C6.12152 3.68775 6.32205 3.82186 6.49091 3.99091L6.54545 4.04545C6.75971 4.25503 7.03183 4.39562 7.32674 4.4491C7.62164 4.50257 7.9258 4.46647 8.2 4.34545H8.27273C8.54161 4.23022 8.77093 4.03887 8.93245 3.79497C9.09397 3.55107 9.18065 3.26526 9.18182 2.97273V2.81818C9.18182 2.33597 9.37338 1.87351 9.71435 1.53253C10.0553 1.19156 10.5178 1 11 1C11.4822 1 11.9447 1.19156 12.2856 1.53253C12.6266 1.87351 12.8182 2.33597 12.8182 2.81818V2.9C12.8193 3.19253 12.906 3.47834 13.0676 3.72224C13.2291 3.96614 13.4584 4.15749 13.7273 4.27273C14.0015 4.39374 14.3056 4.42984 14.6005 4.37637C14.8954 4.3229 15.1676 4.18231 15.3818 3.97273L15.4364 3.91818C15.6052 3.74913 15.8057 3.61503 16.0265 3.52353C16.2472 3.43203 16.4838 3.38493 16.7227 3.38493C16.9617 3.38493 17.1983 3.43203 17.419 3.52353C17.6397 3.61503 17.8402 3.74913 18.0091 3.91818C18.1781 4.08704 18.3122 4.28757 18.4037 4.50829C18.4952 4.72902 18.5423 4.96561 18.5423 5.20455C18.5423 5.44348 18.4952 5.68007 18.4037 5.9008C18.3122 6.12152 18.1781 6.32205 18.0091 6.49091L17.9545 6.54545C17.745 6.75971 17.6044 7.03183 17.5509 7.32674C17.4974 7.62164 17.5335 7.9258 17.6545 8.2V8.27273C17.7698 8.54161 17.9611 8.77093 18.205 8.93245C18.4489 9.09397 18.7347 9.18065 19.0273 9.18182H19.1818C19.664 9.18182 20.1265 9.37338 20.4675 9.71435C20.8085 10.0553 21 10.5178 21 11C21 11.4822 20.8085 11.9447 20.4675 12.2856C20.1265 12.6266 19.664 12.8182 19.1818 12.8182H19.1C18.8075 12.8193 18.5217 12.906 18.2778 13.0676C18.0339 13.2291 17.8425 13.4584 17.7273 13.7273Z"
        stroke="#888888"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function AuthLevelBadge({ level }: { level: AuthLevel | null }) {
  if (!level) return null;
  
  const labels: Record<AuthLevel, string> = {
    nfc_pin: "NFC+PIN",
    nfc_secret: "NFC+SECRET",
    nfc_pin_secret: "TRIPLE",
  };
  
  const isTriple = level === "nfc_pin_secret";
  
  return (
    <View style={[authBadgeStyles.badge, isTriple && authBadgeStyles.badgeTriple]}>
      <Text style={[authBadgeStyles.text, isTriple && authBadgeStyles.textTriple]}>
        {labels[level]}
      </Text>
    </View>
  );
}

const authBadgeStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#444444",
    backgroundColor: "rgba(40, 40, 40, 0.8)",
  },
  badgeTriple: {
    borderColor: Colors.dark.primary,
    backgroundColor: "rgba(0, 204, 204, 0.1)",
  },
  text: {
    fontFamily: Fonts.circular.medium,
    fontSize: 9,
    color: "#888888",
    letterSpacing: 0.5,
  },
  textTriple: {
    color: Colors.dark.primary,
  },
});

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const pulseAnim = useSharedValue(0);
  const phoneFloat = useSharedValue(0);
  const cardFloat = useSharedValue(0);

  const webrtc = useWebRTC();
  const walletAddress = webrtc?.walletAddress;
  const setWalletAddress = webrtc?.setWalletAddress;
  const connectionStatus = webrtc?.status ?? "disconnected";
  const dashboardDisconnect = webrtc?.dashboardDisconnect;
  const peerDisconnect = webrtc?.peerDisconnect;
  const pendingSignRequest = webrtc?.pendingSignRequest;
  const pendingCardAction = webrtc?.pendingCardAction;
  const pendingPrivacyAction = webrtc?.pendingPrivacyAction;
  const solanaKeypair = webrtc?.solanaKeypair;
  const sendSignResult = webrtc?.sendSignResult;
  const clearPendingSignRequest = webrtc?.clearPendingSignRequest;
  const cleanup = webrtc?.cleanup;
  const setNfcData = webrtc?.setNfcData;
  const nfcData = webrtc?.nfcData;

  const [copied, setCopied] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [nfcDetected, setNfcDetected] = useState(false);
  const [nfcCardId, setNfcCardId] = useState<string | null>(null);
  const [showAuthSettingsModal, setShowAuthSettingsModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [nfcNeedsRestart, setNfcNeedsRestart] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const nfcScanningRef = useRef(false);
  const nfcWasDisabledRef = useRef(false);
  
  const { authLevel, setAuthLevel, setSecret, requiresSecret, hasSecret, getSecret } = useAuthPreference();
  const nfcRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef(cleanup);
  
  useEffect(() => {
    const currentVersion = Constants.expoConfig?.version || '1.0.0';
    checkForUpdates(currentVersion).then(setUpdateInfo);
  }, []);
  
  const cleanupCalledRef = useRef(false);
  cleanupRef.current = cleanup;

  const isConnected = connectionStatus === "connected" && !!walletAddress;
  const isFailed = connectionStatus === "failed";
  const isConnecting = connectionStatus === "connecting";
  const isDashboardDisconnected = dashboardDisconnect?.reason !== null;
  const isPeerDisconnected = peerDisconnect?.reason !== null;
  const shouldShowConnectedUI = isConnected && !isDashboardDisconnected && !isPeerDisconnected;

  const cleanupNfc = useCallback(async () => {
    if (nfcRetryTimeoutRef.current) {
      clearTimeout(nfcRetryTimeoutRef.current);
      nfcRetryTimeoutRef.current = null;
    }
    if (NfcManager) {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (e) {
      }
    }
  }, []);

  const startNfcScan = useCallback(async () => {
    if (!NfcManager || Platform.OS === "web") return;
    
    if (nfcScanningRef.current) {
      return;
    }
    
    nfcScanningRef.current = true;

    try {
      await cleanupNfc();
      
      const supported = await NfcManager.isSupported();
      if (!supported) {
        nfcScanningRef.current = false;
        return;
      }
      
      await NfcManager.start();
      const enabled = await NfcManager.isEnabled();
      if (!enabled) {
        nfcScanningRef.current = false;
        return;
      }
      
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag) {
        console.log('[HomeScreen NFC] Tag detected:', JSON.stringify(tag));
        logNFCTap(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const rawTagId = tag.id || "";
        const tagId = rawTagId.replace(/[^0-9a-f]/gi, "").toLowerCase();
        const nfcDataString = `griplock_${tagId}`;
        
        console.log('[HomeScreen NFC] Processed NFC data:', nfcDataString);
        
        setNfcDetected(true);
        setNfcCardId(nfcDataString);
        setNfcData?.(nfcDataString);
        
        await NfcManager.cancelTechnologyRequest();
        nfcScanningRef.current = false;
        
        const { getWalletByNfcUid } = require("@/lib/v2/wallet-store");
        try {
          const existingProfile = await getWalletByNfcUid(tagId);
          if (!existingProfile) {
            console.log('[HomeScreen NFC] No V2 profile, routing to V2Setup');
            navigation.navigate("V2Setup", { nfcUid: tagId });
          } else {
            console.log('[HomeScreen NFC] V2 profile found:', existingProfile.walletId);
            navigation.navigate("V2Unlock", {
              nfcUid: tagId,
              walletProfile: existingProfile,
            });
          }
        } catch (e) {
          console.log('[HomeScreen NFC] V2 routing error:', e);
        }
      }
    } catch (e: any) {
      nfcScanningRef.current = false;
      
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {}
      
      nfcRetryTimeoutRef.current = setTimeout(() => {
        if (!shouldShowConnectedUI) {
          startNfcScan();
        }
      }, 1000);
    }
  }, [cleanupNfc, setNfcData, shouldShowConnectedUI]);

  useEffect(() => {
    if (!shouldShowConnectedUI && Platform.OS !== "web") {
      startNfcScan();
    }
    
    return () => {
      cleanupNfc();
      nfcScanningRef.current = false;
    };
  }, [shouldShowConnectedUI, startNfcScan, cleanupNfc]);

  // NFC status polling - check every 3 seconds
  useEffect(() => {
    if (Platform.OS === "web" || !NfcManager) {
      setNfcEnabled(null);
      return;
    }

    const checkNfcStatus = async () => {
      try {
        const supported = await NfcManager.isSupported();
        if (!supported) {
          setNfcEnabled(false);
          return;
        }
        const enabled = await NfcManager.isEnabled();
        
        // Track if NFC was ever disabled during this session
        if (!enabled) {
          nfcWasDisabledRef.current = true;
        }
        
        // If NFC was disabled and now enabled, suggest restart
        if (enabled && nfcWasDisabledRef.current && nfcEnabled === false) {
          setNfcNeedsRestart(true);
        }
        
        setNfcEnabled(enabled);
      } catch (error) {
        console.log('[HomeScreen] NFC status check error:', error);
        setNfcEnabled(false);
      }
    };

    // Initial check
    checkNfcStatus();

    // Poll every 3 seconds
    const interval = setInterval(checkNfcStatus, 3000);

    return () => clearInterval(interval);
  }, [nfcEnabled]);

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

  const buttonGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.8, 1]),
  }));

  const phoneFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: phoneFloat.value }],
  }));

  const cardFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: cardFloat.value }],
  }));

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const handleScanPress = async () => {
    logEvent('button_press', { button: 'scan_qr' });
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const sessionId = generateSessionId();
    navigation.navigate("QRScanner", { sessionId });
  };

  const handleDisconnect = async () => {
    logEvent('button_press', { button: 'disconnect_wallet' });
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

  useEffect(() => {
    if (pendingCardAction && shouldShowConnectedUI) {
      console.log('[HomeScreen] Card action request detected, navigating to CardAction');
      navigation.navigate("CardAction");
    }
  }, [pendingCardAction, shouldShowConnectedUI, navigation]);

  useEffect(() => {
    if (pendingPrivacyAction && shouldShowConnectedUI) {
      console.log('[HomeScreen] Privacy action request detected, navigating to PrivacyAction');
      navigation.navigate("PrivacyAction");
    }
  }, [pendingPrivacyAction, shouldShowConnectedUI, navigation]);

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
            },
          ]}
        >
          <View style={styles.walletContentContainer}>
            <WalletCard
              walletName="Main wallet"
              publicBalance={340}
              privateBalance={5999}
              onReceive={() => {}}
              onSendPrivately={() => {}}
              onSwipeNext={() => {}}
            />
          </View>

          <BottomNavigation
            activeTab="grid"
            onCenterPress={handleConnectedIconPress}
            centerIcon={<CheckIcon size={40} />}
            circleColor="#06B040"
            centerButtonTestID="button-connected-icon"
          />
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
          source={require("../../assets/images/nfc-background.png")}
          style={styles.backgroundImage}
          contentFit="cover"
        />
      </View>

      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + Spacing["3xl"],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <View style={styles.logoContainer}>
              <GriplockLogo />
              <AuthLevelBadge level={authLevel} />
            </View>
            <Pressable 
              style={styles.gearButton} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("Settings");
              }}
              testID="button-settings"
            >
              <GearIcon />
            </Pressable>
          </View>
        </View>

        <View style={styles.centerContent}>
          <View style={styles.nfcIllustrationContainer}>
            <View style={styles.illustrationStack}>
              <Animated.View style={[styles.phoneIllustrationWrapper, phoneFloatStyle]}>
                <PhoneIllustration />
              </Animated.View>
              <Animated.View style={[styles.nfcCardIllustrationWrapper, cardFloatStyle]}>
                <NFCCardIllustration />
              </Animated.View>
            </View>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.tapCardTitle}>TAP YOUR CARD</Text>
            <Text style={styles.tapCardSubtitle}>
              Place your any NFC card near the device
            </Text>
          </View>
        </View>

        {/* NFC Status Indicator */}
        {Platform.OS !== "web" && nfcEnabled !== null && (
          <View style={styles.nfcStatusContainer}>
            <View style={[
              styles.nfcStatusDot,
              nfcEnabled && !nfcNeedsRestart ? styles.nfcStatusDotActive : styles.nfcStatusDotInactive
            ]} />
            <Text style={[
              styles.nfcStatusText,
              nfcEnabled && !nfcNeedsRestart ? styles.nfcStatusTextActive : styles.nfcStatusTextInactive
            ]}>
              {nfcNeedsRestart ? "RESTART APP" : nfcEnabled ? "NFC READY" : "NFC OFF"}
            </Text>
          </View>
        )}

        <Pressable 
          style={styles.versionContainer}
          onPress={() => {
            if (updateInfo?.hasUpdate) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Linking.openURL('https://app.griplock.io/');
            }
          }}
        >
          {updateInfo?.hasUpdate ? (
            <Text style={styles.updateAvailableText}>UPDATE AVAILABLE</Text>
          ) : (
            <Text style={styles.versionText}>GRIPLOCK v{Constants.expoConfig?.version || '1.0.0'}</Text>
          )}
        </Pressable>

        <BottomNavigation
          activeTab="grid"
          onCenterPress={handleScanPress}
          centerButtonStyle={buttonGlowStyle}
          centerButtonTestID="button-scan-qr"
        />
      </View>

      <AuthLevelModal
        visible={showAuthSettingsModal}
        onClose={() => setShowAuthSettingsModal(false)}
        onSelect={async (level: AuthLevel) => {
          await setAuthLevel(level);
          setShowAuthSettingsModal(false);
          // Only show secret modal if switching to secret mode AND no secret exists yet
          if ((level === "nfc_secret" || level === "nfc_pin_secret") && !hasSecret) {
            setShowSecretModal(true);
          }
        }}
        currentLevel={authLevel || undefined}
        isFirstTime={false}
      />
      <SecretSetupModal
        visible={showSecretModal}
        onClose={() => setShowSecretModal(false)}
        onConfirm={async (secret: string) => {
          await setSecret(secret);
          setShowSecretModal(false);
        }}
        isUpdate={hasSecret}
      />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    width: "100%",
  },
  headerSpacer: {
    width: 40,
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  gearButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  nfcStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    gap: 6,
  },
  nfcStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  nfcStatusDotActive: {
    backgroundColor: "#FFFFFF",
  },
  nfcStatusDotInactive: {
    backgroundColor: "#555555",
  },
  nfcStatusText: {
    fontFamily: Fonts.astroSpace,
    fontSize: 9,
    letterSpacing: 1,
  },
  nfcStatusTextActive: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  nfcStatusTextInactive: {
    color: "#555555",
  },
  versionContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  versionText: {
    fontFamily: Fonts.circular.book,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.35)",
    letterSpacing: 1,
  },
  updateAvailableText: {
    fontFamily: Fonts.circular.bold,
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 1,
    textDecorationLine: "underline",
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
    justifyContent: "center",
    alignItems: "center",
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
  nfcIllustrationContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  illustrationStack: {
    position: "relative",
    width: 280,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  nfcIllustration: {
    width: "100%",
    height: "100%",
  },
  phoneIllustrationWrapper: {
    position: "absolute",
    bottom: 0,
  },
  nfcCardIllustrationWrapper: {
    position: "absolute",
    top: 5,
  },
  tapCardTitle: {
    fontFamily: Fonts.circular.black,
    fontSize: 22,
    color: Colors.dark.text,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  tapCardSubtitle: {
    fontFamily: Fonts.circular.book,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  walletContentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
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
