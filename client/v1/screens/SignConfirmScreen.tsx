import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Platform, Pressable, Text, InteractionManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { Colors, Spacing, Fonts, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";
import { deriveSolanaKeypair } from "@/lib/crypto";
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "SignConfirm">;
type RouteProps = RouteProp<RootStackParamList, "SignConfirm">;

type Phase = 'nfc' | 'pin' | 'processing' | 'result';

const theme = Colors.dark;
const PIN_LENGTH = 6;
const KEYPAD_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"];
const ESTIMATED_GAS_FEE = 0.005 * 2;

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
    <Svg width={200} height={123} viewBox="0 0 255 157" fill="none">
      <Path d="M164.688 15.5107L140.885 29.9485L194.344 63.8969L218.927 48.2884L164.688 15.5107Z" stroke="white" strokeWidth={0.390211} />
      <Path d="M254.045 55.3115V64.6766L95.6199 156.144H81.5723L0.195312 109.161V100.576" stroke="white" strokeWidth={0.390211} />
      <Path d="M158.053 0.195312L0.408203 91.2116V100.37L81.572 147.23H94.8392L254.045 55.3122V47.2806L172.491 0.195312H158.053Z" stroke="white" strokeWidth={0.390211} />
      <Path d="M254.046 55.3117L172.492 6.92557V0.291992" stroke="white" strokeWidth={0.390211} />
      <Path d="M172.492 6.92557H158.054V0.291992" stroke="white" strokeWidth={0.390211} />
      <Path d="M158.053 6.92578L0.408203 100.186" stroke="white" strokeWidth={0.390211} />
    </Svg>
  );
}

function NFCCardIllustration() {
  return (
    <Svg width={140} height={81} viewBox="0 0 181 105" fill="none">
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

function LogoFill({ filledCount }: { filledCount: number }) {
  return (
    <View style={logoStyles.container}>
      <Svg width={110} height={110} viewBox="0 0 110 110">
        <Path d="M36.1514 17.7041L36.1416 17.71L36.3164 17.8848L54.3721 35.9414L45.291 45.0225L25.5928 25.3242L25.4668 25.4502C17.902 33.011 13.2227 43.4594 13.2227 55C13.2227 78.0731 31.9269 96.7773 55 96.7773C70.8742 96.7773 84.6794 87.9236 91.749 74.8857L91.8926 74.6221H50.2285V61.7783H109.403C106.064 88.8569 82.9817 109.821 55 109.821C24.723 109.821 0.178721 85.277 0.178711 55C0.178719 35.1336 10.7464 17.7362 26.5674 8.12012L36.1514 17.7041ZM104.07 30.5342C107.26 36.9203 109.241 44.0157 109.711 51.5215H83.5166L104.07 30.5342ZM90.6074 13.3184C93.5048 15.796 96.1413 18.5696 98.4688 21.5938L75.9326 44.6045L67.8662 36.5381L90.6074 13.3184ZM70.8711 2.51172C74.8232 3.70515 78.5865 5.33347 82.1064 7.33984L60.6133 29.2852L52.5469 21.2188L70.8711 2.51172ZM55 0.178711C56.2356 0.178714 57.4616 0.221342 58.6768 0.301758L45.2939 13.9658L35.1943 3.86719C41.3372 1.48617 48.0156 0.178726 55 0.178711Z" stroke="rgba(255,255,255,0.3)" strokeWidth={0.357143} fill="transparent" />
        
        {filledCount >= 1 ? (
          <Path d="M36.4537 17.7536C36.4501 17.7554 36.4465 17.7571 36.4429 17.7589L54.6254 35.9418L45.2916 45.2756L25.5929 25.5769C18.0603 33.1056 13.4009 43.5088 13.4009 55.0001C13.4009 77.9745 32.0255 96.5992 55 96.5992C70.7977 96.5992 84.5379 87.7928 91.581 74.8215H106.318C98.3638 95.4023 78.3874 110 55 110C24.6243 110 1.04951e-05 85.3757 0 55.0001C7.74953e-06 35.0187 10.6555 17.5265 26.5939 7.89453L36.4537 17.7536Z" fill="white" />
        ) : null}
        {filledCount >= 2 ? (
          <Path d="M109.608 61.6006C109.057 66.2068 107.936 70.6378 106.319 74.8218H91.5819C91.5857 74.8148 91.5896 74.8077 91.5934 74.8006H50.0508V61.6006H109.608Z" fill="white" />
        ) : null}
        {filledCount >= 3 ? (
          <Path d="M104.118 30.2305C107.411 36.7489 109.446 44.0118 109.901 51.6998H83.0908L104.118 30.2305Z" fill="white" />
        ) : null}
        {filledCount >= 4 ? (
          <Path d="M90.5989 13.0742C93.5948 15.6206 96.3147 18.4821 98.7065 21.608L75.9344 44.8585L67.6162 36.5403L90.5989 13.0742Z" fill="white" />
        ) : null}
        {filledCount >= 5 ? (
          <Path d="M70.8198 2.30957C74.8984 3.53236 78.7774 5.21652 82.3973 7.30015L60.6154 29.54L52.2969 21.2214L70.8198 2.30957Z" fill="white" />
        ) : null}
        {filledCount >= 6 ? (
          <Path d="M54.9999 0C56.3714 2.84221e-06 57.7315 0.0499106 59.0778 0.148577L45.2957 14.2205L34.874 3.79883C41.1072 1.34679 47.8963 1.49269e-05 54.9999 0Z" fill="white" />
        ) : null}
      </Svg>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    width: 110,
    height: 110,
    marginBottom: Spacing["2xl"],
  },
});

export default function SignConfirmScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { pendingSignRequest, pendingCardAction, sendSignResult, sendSignResponse, clearPendingSignRequest } = useWebRTC();
  
  useEffect(() => {
    if (pendingCardAction) {
      navigation.navigate("CardAction");
    }
  }, [pendingCardAction, navigation]);
  
  const [phase, setPhase] = useState<Phase>('nfc');
  const [scannedNfcId, setScannedNfcId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("Waiting for card...");
  const [isWebPlatform] = useState(Platform.OS === "web");
  
  const scanningRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  
  const pendingSignRequestRef = useRef(pendingSignRequest);
  pendingSignRequestRef.current = pendingSignRequest;
  
  const pulseAnim = useSharedValue(0);

  useEffect(() => {
    checkNfcSupport();
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      scanningRef.current = false;
      if (NfcManager && Platform.OS !== "web") {
        NfcManager.cancelTechnologyRequest().catch(() => {});
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
      } catch (e) {}
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
      } catch (e) {}
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
      } catch (e) {}
    }
  }, []);

  const processTransaction = async (nfcId: string, pinCode: string) => {
    const currentRequest = pendingSignRequestRef.current;
    
    console.log('[SignConfirm] processTransaction called');
    console.log('[SignConfirm] pendingSignRequest:', currentRequest ? 'exists' : 'null');
    console.log('[SignConfirm] nfcId:', nfcId);
    
    if (!currentRequest || isProcessingRef.current) {
      console.log('[SignConfirm] Early return - missing data or already processing');
      return;
    }
    
    isProcessingRef.current = true;
    setPhase('processing');

    try {
      const { action, requestId, unsignedTx, ownerPublicKey } = currentRequest;
      console.log('[SignConfirm] Processing:', action, 'ownerPublicKey:', ownerPublicKey);
      
      console.log('[SignConfirm] Deriving wallet from NFC + PIN...');
      const keypair = deriveSolanaKeypair(nfcId, pinCode);
      const derivedAddress = keypair.publicKey.toBase58();
      console.log('[SignConfirm] Derived address:', derivedAddress);
      console.log('[SignConfirm] Expected address:', ownerPublicKey);
      
      if (ownerPublicKey && derivedAddress !== ownerPublicKey) {
        console.log('[SignConfirm] Address mismatch - wrong card or PIN');
        throw new Error("Wrong card or PIN");
      }
      
      console.log('[SignConfirm] Identity verified, signing transaction...');
      
      const isShieldOrUnshield = action === "shield" || action === "unshield";
      const isPrivateActionType = action === "private_send" || action === "private_deposit" || action === "private_withdraw" || action === "privacy_deposit_full" || action === "privacy_withdraw_full";
      
      let result;
      let useSignResponse = false;
      
      if (isShieldOrUnshield && unsignedTx) {
        useSignResponse = true;
        try {
          const { VersionedTransaction, Transaction } = await import("@solana/web3.js");
          const txBuffer = Buffer.from(unsignedTx, "base64");
          
          let signedTxBase64: string;
          try {
            const transaction = VersionedTransaction.deserialize(txBuffer);
            transaction.sign([keypair]);
            signedTxBase64 = Buffer.from(transaction.serialize()).toString("base64");
          } catch {
            const transaction = Transaction.from(txBuffer);
            transaction.sign(keypair);
            signedTxBase64 = Buffer.from(transaction.serialize()).toString("base64");
          }
          
          console.log('[SignConfirm] Signed', action, 'transaction successfully');
          result = { success: true, signedTx: signedTxBase64, error: null };
        } catch (signError) {
          console.error('[SignConfirm] Failed to sign transaction:', signError);
          result = {
            success: false,
            signedTx: null,
            error: signError instanceof Error ? signError.message : "Failed to sign transaction"
          };
        }
      } else if (isShieldOrUnshield && !unsignedTx) {
        result = { success: false, signedTx: null, error: "Missing unsignedTx from dashboard" };
      } else if (isPrivateActionType) {
        if (!unsignedTx) {
          result = { success: false, signature: null, error: "Missing unsignedTx from dashboard" };
        } else {
          try {
            const { VersionedTransaction } = await import("@solana/web3.js");
            const txBuffer = Buffer.from(unsignedTx, "base64");
            const transaction = VersionedTransaction.deserialize(txBuffer);
            transaction.sign([keypair]);
            
            const signedTxBase64 = Buffer.from(transaction.serialize()).toString("base64");
            console.log('[SignConfirm] Signed', action, 'transaction successfully');
            result = { success: true, signature: signedTxBase64, error: null };
          } catch (signError) {
            console.error('[SignConfirm] Failed to sign transaction:', signError);
            result = {
              success: false,
              signature: null,
              error: signError instanceof Error ? signError.message : "Failed to sign transaction"
            };
          }
        }
      } else {
        result = { success: false, signature: null, error: `Unknown action: ${action}` };
      }
      
      console.log('[SignConfirm] Transaction result:', result);
      setPhase('result');

      if (useSignResponse && isShieldOrUnshield && 'signedTx' in result) {
        if (result.success && result.signedTx) {
          sendSignResponse(requestId, action as 'shield' | 'unshield', true, result.signedTx);
          setIsSuccess(true);
          setResultMessage("Transaction signed!");
          
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } else {
          sendSignResponse(requestId, action as 'shield' | 'unshield', false, undefined, result.error || "Failed to sign transaction");
          setIsSuccess(false);
          setResultMessage(result.error || "Failed to sign transaction");
          
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }
      } else if (result.success && result.signature) {
        sendSignResult(requestId, action, true, result.signature);
        setIsSuccess(true);
        setResultMessage("Transaction signed!");
        
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        sendSignResult(requestId, action, false, undefined, result.error || "Transaction failed");
        setIsSuccess(false);
        setResultMessage(result.error || "Transaction failed");
        
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }

      setTimeout(() => {
        clearPendingSignRequest();
        navigation.goBack();
      }, 2000);
    } catch (error) {
      console.error('[SignConfirm] Transaction error:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log('[SignConfirm] Error message:', errorMessage);
      
      if (currentRequest) {
        const isShieldOrUnshield = currentRequest.action === "shield" || currentRequest.action === "unshield";
        if (isShieldOrUnshield) {
          sendSignResponse(currentRequest.requestId, currentRequest.action as 'shield' | 'unshield', false, undefined, errorMessage);
        } else {
          sendSignResult(currentRequest.requestId, currentRequest.action, false, undefined, errorMessage);
        }
      }
      
      setPhase('result');
      setIsSuccess(false);
      setResultMessage(errorMessage);
      
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      setTimeout(() => {
        clearPendingSignRequest();
        navigation.goBack();
      }, 3000);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const startNfcScan = useCallback(async () => {
    if (!NfcManager || !nfcSupported || !nfcEnabled) return;
    if (phase !== 'nfc') return;
    
    if (scanningRef.current || isProcessingRef.current) {
      return;
    }
    
    scanningRef.current = true;
    setScanStatus("Waiting for card...");

    try {
      await cleanupNfc();
      
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      if (tag) {
        console.log('[SignConfirm] NFC Tag detected:', JSON.stringify(tag));
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        const rawTagId = tag.id || "";
        const tagId = rawTagId.replace(/[^0-9a-f]/gi, "").toLowerCase();
        const nfcData = `griplock_${tagId}`;
        
        console.log('[SignConfirm] NFC data:', nfcData);
        
        setScanStatus("Card detected!");
        await NfcManager.cancelTechnologyRequest();
        scanningRef.current = false;
        
        setScannedNfcId(nfcData);
        setPhase('pin');
      }
    } catch (e: any) {
      setScanStatus("Waiting for card...");
      scanningRef.current = false;
      
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {}
      
      if (nfcSupported && nfcEnabled && !isProcessingRef.current && phase === 'nfc') {
        retryTimeoutRef.current = setTimeout(() => {
          startNfcScan();
        }, 2000);
      }
    }
  }, [nfcSupported, nfcEnabled, phase, cleanupNfc]);

  useEffect(() => {
    if (phase === 'nfc' && nfcSupported && nfcEnabled && !scanningRef.current && !isProcessingRef.current) {
      startNfcScan();
    }
  }, [phase, nfcSupported, nfcEnabled, startNfcScan]);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.6, 1]),
  }));

  const handleKeyPress = useCallback(async (key: string) => {
    if (phase !== 'pin' || !scannedNfcId) return;

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (key === "backspace") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(async () => {
          await processTransaction(scannedNfcId, newPin);
        }, 300);
      });
    }
  }, [phase, pin, scannedNfcId]);

  const handleCancel = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (pendingSignRequest) {
      const isShieldOrUnshield = pendingSignRequest.action === "shield" || pendingSignRequest.action === "unshield";
      if (isShieldOrUnshield) {
        sendSignResponse(
          pendingSignRequest.requestId,
          pendingSignRequest.action as 'shield' | 'unshield',
          false,
          undefined,
          "User rejected transaction"
        );
      } else {
        sendSignResult(
          pendingSignRequest.requestId,
          pendingSignRequest.action,
          false,
          undefined,
          "User rejected transaction"
        );
      }
    }
    clearPendingSignRequest();
    navigation.goBack();
  };

  const handleBackPress = async () => {
    if (phase === 'pin') {
      setPhase('nfc');
      setScannedNfcId(null);
      setPin("");
      startNfcScan();
    } else {
      await handleCancel();
    }
  };

  const renderKey = (key: string, index: number) => {
    if (key === "") {
      return <View key={`empty-${index}`} style={styles.keyEmpty} />;
    }

    const displayText = key === "backspace" ? "<" : key;
    const testID = key === "backspace" ? "button-delete" : `button-key-${key}`;

    return (
      <Pressable
        key={key}
        style={styles.keyWrapper}
        onPress={() => handleKeyPress(key)}
        testID={testID}
      >
        {({ pressed }) => (
          <View style={styles.keyContainer}>
            <Svg width={70} height={70} viewBox="0 0 70 70" style={styles.keySvg}>
              <Rect
                x={4.2}
                y={4.2}
                width={61.6}
                height={61.6}
                fill="white"
                fillOpacity={pressed ? 0.2 : 0.1}
              />
              <Rect
                x={0.35}
                y={0.35}
                width={69.3}
                height={69.3}
                stroke="#484848"
                strokeWidth={0.7}
                fill="transparent"
              />
            </Svg>
            <Text style={styles.keyText}>{displayText}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (!pendingSignRequest) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.noRequestContent}>
          <Text style={styles.errorText}>No pending transaction</Text>
          <Pressable
            style={styles.returnButton}
            onPress={() => navigation.goBack()}
            testID="button-return"
          >
            <Text style={styles.returnButtonText}>Return</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isShield = pendingSignRequest.action === "shield";
  const isUnshield = pendingSignRequest.action === "unshield";
  const isPrivateSend = pendingSignRequest.action === "private_send";
  const isPrivateDeposit = pendingSignRequest.action === "private_deposit" || pendingSignRequest.action === "privacy_deposit_full";
  const isPrivateWithdraw = pendingSignRequest.action === "private_withdraw" || pendingSignRequest.action === "privacy_withdraw_full";
  
  const getActionTitle = () => {
    if (isPrivateSend) return "VERIFY YOUR PRIVATE SEND";
    if (isPrivateDeposit) return "VERIFY YOUR PRIVATE DEPOSIT";
    if (isPrivateWithdraw) return "VERIFY YOUR PRIVATE WITHDRAW";
    if (isShield) return "VERIFY SHIELD BALANCE";
    if (isUnshield) return "VERIFY UNSHIELD BALANCE";
    return `VERIFY ${pendingSignRequest.action?.toUpperCase() || "ACTION"}`;
  };
  
  const getActionDescription = () => {
    if (pendingSignRequest.description) {
      return `${pendingSignRequest.description}\nEst. gas fee: ${ESTIMATED_GAS_FEE} SOL`;
    }
    
    const symbol = pendingSignRequest.symbol || "TOKEN";
    const rawAmount = pendingSignRequest.amount;
    
    let displayAmount: string;
    if (rawAmount === undefined || rawAmount === null) {
      displayAmount = "-";
    } else {
      displayAmount = String(rawAmount);
    }
    
    const actionName = isPrivateSend ? "Private send" : 
                       isPrivateDeposit ? "Private deposit" : 
                       isPrivateWithdraw ? "Private withdraw" :
                       isShield ? "Shield" :
                       isUnshield ? "Unshield" :
                       pendingSignRequest.action || "Action";
    return `${actionName} ${displayAmount} ${symbol}\nEst. gas fee: ${ESTIMATED_GAS_FEE} SOL`;
  };
  
  const actionTitle = getActionTitle();

  if (phase === 'processing') {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundWrapper}>
          <Image
            source={require("../../assets/images/nfc-background.png")}
            style={styles.backgroundImage}
            contentFit="cover"
          />
        </View>
        <ScreenHeader rightText="Processing" />
        <View style={styles.content}>
          <ASCIILoader text="SIGNING TRANSACTION" />
        </View>
      </View>
    );
  }

  if (phase === 'result') {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundWrapper}>
          <Image
            source={require("../../assets/images/nfc-background.png")}
            style={styles.backgroundImage}
            contentFit="cover"
          />
        </View>
        <ScreenHeader rightText={isSuccess ? "Success" : "Failed"} />
        <View style={styles.content}>
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
          </View>
        </View>
      </View>
    );
  }

  if (phase === 'pin') {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundWrapper}>
          <Image
            source={require("../../assets/images/nfc-background.png")}
            style={styles.backgroundImage}
            contentFit="cover"
          />
        </View>
        <ScreenHeader leftText="back" rightText="Enter PIN" onBack={handleBackPress} />
        
        <View style={styles.pinContent}>
          <LogoFill filledCount={pin.length} />
          
          <View style={styles.pinTitleSection}>
            <Text style={styles.pinTitle}>ENTER YOUR PIN</Text>
            <Text style={styles.pinSubtitle}>Verify your identity to sign</Text>
          </View>

          <View style={styles.keypad}>
            {KEYPAD_NUMBERS.map((key, index) => renderKey(key, index))}
          </View>
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
        <View style={styles.headerSection}>
          <Text style={styles.verifyTitle}>{actionTitle}</Text>
          <Text style={styles.verifyDescription}>{getActionDescription()}</Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.illustrationContainer}>
          <PhoneIllustration />
          <View style={styles.cardOverlay}>
            <NFCCardIllustration />
          </View>
        </View>

        <View style={styles.spacer} />

        <View style={styles.textContainer}>
          <Animated.Text style={[styles.title, pulseStyle]}>TAP YOUR CARD{"\n"}TO CONFIRM</Animated.Text>
          <Text style={styles.statusText}>{scanStatus}</Text>
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

        <Pressable style={styles.cancelButton} onPress={handleCancel} testID="button-cancel">
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundRoot,
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  pinContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  verifyTitle: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.dark.text,
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  verifyDescription: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  spacer: {
    flex: 1,
  },
  bottomSpacer: {
    height: Spacing["3xl"] * 2,
  },
  illustrationContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.xl,
  },
  cardOverlay: {
    position: "absolute",
    top: -20,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: Colors.dark.text,
    textAlign: "center",
    letterSpacing: 2,
    lineHeight: 32,
    marginBottom: Spacing.md,
  },
  statusText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
  },
  cancelButtonText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
  },
  noRequestContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  returnButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
  },
  returnButtonText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.text,
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
  },
  nfcErrorContainer: {
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    marginBottom: Spacing.xl,
  },
  nfcDisabledTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.dark.warning,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  nfcNotSupportedTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: Colors.dark.error,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  nfcErrorText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
  },
  enableNfcButton: {
    backgroundColor: Colors.dark.warning,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  enableNfcButtonText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "#000",
    fontWeight: "600",
  },
  recheckButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  recheckButtonText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
  },
  pinTitleSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  pinTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: Colors.dark.text,
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  pinSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    maxWidth: 310,
    gap: 32,
  },
  keyWrapper: {
    width: 70,
    height: 70,
  },
  keyContainer: {
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  keySvg: {
    position: "absolute",
  },
  keyEmpty: {
    width: 70,
    height: 70,
  },
  keyText: {
    fontFamily: Fonts.body,
    fontSize: 20,
    color: Colors.dark.text,
  },
});
