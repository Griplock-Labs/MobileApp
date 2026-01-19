import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, StyleSheet, Platform, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";
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
import { compressTokens, decompressTokens } from "@/lib/zk-compression";
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

const theme = Colors.dark;
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

function LockIcon({ isCompress, isPrivateSend }: { isCompress: boolean; isPrivateSend?: boolean }) {
  const color = isPrivateSend ? "#06B040" : (isCompress ? "#A4BAD2" : "#06B040");
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      {isPrivateSend ? (
        <>
          <Path
            d="M12 2L2 7l10 5 10-5-10-5z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M2 17l10 5 10-5M2 12l10 5 10-5"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : isCompress ? (
        <Path
          d="M8 11V7a4 4 0 1 1 8 0v4M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <Path
            d="M7 11V7a5 5 0 0 1 9.9-1"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
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

export default function SignConfirmScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { pendingSignRequest, solanaKeypair, sendSignResult, clearPendingSignRequest, nfcData } = useWebRTC();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [nfcEnabled, setNfcEnabled] = useState<boolean | null>(null);
  const [scanStatus, setScanStatus] = useState<string>("Tap your card to confirm");
  const [isWebPlatform] = useState(Platform.OS === "web");
  
  const scanningRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  
  const pendingSignRequestRef = useRef(pendingSignRequest);
  const solanaKeypairRef = useRef(solanaKeypair);
  pendingSignRequestRef.current = pendingSignRequest;
  solanaKeypairRef.current = solanaKeypair;
  
  const cardFloatAnim = useSharedValue(0);
  const phoneFloatAnim = useSharedValue(0);
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

  const processTransaction = async () => {
    const currentRequest = pendingSignRequestRef.current;
    const currentKeypair = solanaKeypairRef.current;
    
    console.log('[SignConfirm] processTransaction called');
    console.log('[SignConfirm] pendingSignRequest:', currentRequest ? 'exists' : 'null');
    console.log('[SignConfirm] solanaKeypair:', currentKeypair ? 'exists' : 'null');
    console.log('[SignConfirm] isProcessingRef:', isProcessingRef.current);
    
    if (!currentRequest || !currentKeypair || isProcessingRef.current) {
      console.log('[SignConfirm] Early return - missing data or already processing');
      return;
    }
    
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      const { action, mint, amount, requestId, unsignedTx, rpcUrl } = currentRequest;
      console.log('[SignConfirm] Processing:', action, 'mint:', mint, 'amount:', amount, 'rpcUrl:', rpcUrl);
      
      const isPrivateActionType = action === "private_send" || action === "private_deposit" || action === "private_withdraw" || action === "privacy_deposit_full" || action === "privacy_withdraw_full";
      
      let result;
      
      if (isPrivateActionType) {
        if (!unsignedTx) {
          result = {
            success: false,
            signature: null,
            error: "Missing unsignedTx from dashboard"
          };
        } else {
          try {
            const { VersionedTransaction, Connection } = await import("@solana/web3.js");
            const txBuffer = Buffer.from(unsignedTx, "base64");
            const transaction = VersionedTransaction.deserialize(txBuffer);
            transaction.sign([currentKeypair]);
            
            if (action === "private_send") {
              const signedTxBase64 = Buffer.from(transaction.serialize()).toString("base64");
              result = {
                success: true,
                signature: signedTxBase64,
                error: null
              };
            } else {
              const connectionUrl = rpcUrl || process.env.EXPO_PUBLIC_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
              const connection = new Connection(connectionUrl, 'confirmed');
              
              console.log('[SignConfirm] Broadcasting', action, 'transaction to', connectionUrl);
              const txSignature = await connection.sendTransaction(transaction);
              console.log('[SignConfirm] Tx sent:', txSignature, '- waiting for confirmation...');
              
              const confirmation = await connection.confirmTransaction(txSignature, 'confirmed');
              if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
              }
              
              console.log('[SignConfirm] Transaction confirmed:', txSignature);
              result = {
                success: true,
                signature: txSignature,
                error: null
              };
            }
          } catch (signError) {
            console.error('[SignConfirm] Failed to process transaction:', signError);
            result = {
              success: false,
              signature: null,
              error: signError instanceof Error ? signError.message : "Failed to process transaction"
            };
          }
        }
      } else if (action === "compress") {
        result = await compressTokens(currentKeypair, mint || "", amount || 0);
      } else {
        result = await decompressTokens(currentKeypair, mint || "", amount || 0);
      }
      
      console.log('[SignConfirm] Transaction result:', result);

      if (result.success && result.signature) {
        sendSignResult(requestId, action, true, result.signature);
        setIsSuccess(true);
        const successMsg = action === "private_send" ? "Transaction signed!" : "Transaction confirmed!";
        setResultMessage(successMsg);
        
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
        sendSignResult(currentRequest.requestId, currentRequest.action, false, undefined, errorMessage);
      }
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
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const startNfcScan = useCallback(async () => {
    if (!NfcManager || !nfcSupported || !nfcEnabled) return;
    
    if (scanningRef.current || isProcessingRef.current) {
      return;
    }
    
    scanningRef.current = true;
    setScanStatus("Tap your card to confirm");

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
        const scannedNfcData = `griplock_${tagId}`;
        
        console.log('[SignConfirm] Scanned NFC data:', scannedNfcData);
        console.log('[SignConfirm] Original NFC data:', nfcData);
        
        if (nfcData && scannedNfcData !== nfcData) {
          setScanStatus("Wrong card! Use the same card");
          if (Platform.OS !== "web") {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
          await NfcManager.cancelTechnologyRequest();
          scanningRef.current = false;
          
          retryTimeoutRef.current = setTimeout(() => {
            startNfcScan();
          }, 2000);
          return;
        }
        
        setScanStatus("Card verified! Processing...");
        await NfcManager.cancelTechnologyRequest();
        scanningRef.current = false;
        
        await processTransaction();
      }
    } catch (e: any) {
      setScanStatus("Tap your card to confirm");
      scanningRef.current = false;
      
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {}
      
      if (nfcSupported && nfcEnabled && !isProcessingRef.current) {
        retryTimeoutRef.current = setTimeout(() => {
          startNfcScan();
        }, 2000);
      }
    }
  }, [nfcSupported, nfcEnabled, nfcData, cleanupNfc]);

  useEffect(() => {
    if (nfcSupported && nfcEnabled && !scanningRef.current && !isProcessingRef.current) {
      startNfcScan();
    }
  }, [nfcSupported, nfcEnabled, startNfcScan]);

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

    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const cardFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(cardFloatAnim.value, [0, 1], [0, -10]) }],
  }));

  const phoneFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(phoneFloatAnim.value, [0, 1], [0, -5]) }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnim.value, [0, 1], [0.4, 1]),
  }));

  const handleCancel = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (pendingSignRequest) {
      sendSignResult(
        pendingSignRequest.requestId,
        pendingSignRequest.action,
        false,
        undefined,
        "User rejected transaction"
      );
    }
    clearPendingSignRequest();
    navigation.goBack();
  };

  const handleBackPress = async () => {
    await handleCancel();
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

  const isCompress = pendingSignRequest.action === "compress";
  const isPrivateSend = pendingSignRequest.action === "private_send";
  const isPrivateDeposit = pendingSignRequest.action === "private_deposit" || pendingSignRequest.action === "privacy_deposit_full";
  const isPrivateWithdraw = pendingSignRequest.action === "private_withdraw" || pendingSignRequest.action === "privacy_withdraw_full";
  const isPrivateAction = isPrivateSend || isPrivateDeposit || isPrivateWithdraw;
  
  const getActionTitle = () => {
    if (isPrivateSend) return "VERIFY YOUR PRIVATE SEND";
    if (isPrivateDeposit) return "VERIFY YOUR PRIVATE DEPOSIT";
    if (isPrivateWithdraw) return "VERIFY YOUR PRIVATE WITHDRAW";
    if (isCompress) return "VERIFY YOUR HIDE BALANCE";
    return "VERIFY YOUR SHOW BALANCE";
  };
  
  const getActionDescription = () => {
    const symbol = pendingSignRequest.symbol || "TOKEN";
    const amount = pendingSignRequest.amount ?? "-";
    const actionName = isPrivateSend ? "Private send" : 
                       isPrivateDeposit ? "Private deposit" : 
                       isPrivateWithdraw ? "Private withdraw" : 
                       isCompress ? "Hide" : "Show";
    return `${actionName} ${amount} ${symbol} with estimated gas\nfee ${ESTIMATED_GAS_FEE} SOL`;
  };
  
  const actionTitle = getActionTitle();

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
        {/* Fixed: Title + Description */}
        <View style={styles.headerSection}>
          <Text style={styles.verifyTitle}>{actionTitle}</Text>
          <Text style={styles.verifyDescription}>{getActionDescription()}</Text>
        </View>

        {resultMessage ? (
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
        ) : isProcessing ? (
          <View style={styles.processingContainer}>
            <ASCIILoader size="large" />
            <Text style={styles.processingText}>Processing transaction...</Text>
          </View>
        ) : (
          <>
            {/* Spacer */}
            <View style={styles.spacer} />

            {/* NFC Illustration */}
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

            {/* Spacer */}
            <View style={styles.spacer} />

            {/* TAP YOUR CARD Section */}
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

            {/* Fixed: Bottom spacer */}
            <View style={styles.bottomSpacer} />
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
    height: Spacing["2xl"],
  },
  noRequestContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  actionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: theme.border,
  },
  actionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 18,
    letterSpacing: 1,
  },
  detailsContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 16,
    padding: Spacing.lg,
    width: "100%",
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: theme.border,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
  },
  detailValue: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: theme.text,
  },
  detailValueFee: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: "#EF8300",
  },
  detailValueRecipient: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    color: "#06B040",
    maxWidth: 180,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: Spacing.xs,
  },
  nfcContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  illustrationWrapper: {
    position: "relative",
    width: 220,
    height: 150,
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
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.circular?.bold || Fonts.heading,
    fontSize: 22,
    color: Colors.dark.text,
    textAlign: "center",
    lineHeight: 30,
    marginBottom: Spacing.md,
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
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
  enableNfcButton: {
    backgroundColor: "#A4BAD2",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
    marginTop: Spacing.xs,
  },
  enableNfcButtonText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.backgroundRoot,
    fontWeight: "600",
  },
  recheckButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  recheckButtonText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: "#A4BAD2",
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
  },
  cancelButtonText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
  },
  processingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  processingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: Spacing.md,
  },
  resultContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
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
});
