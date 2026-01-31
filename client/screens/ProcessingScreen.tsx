import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Keypair } from "@solana/web3.js";
import * as Haptics from "expo-haptics";

import { Colors, Spacing, Fonts, Typography } from "@/constants/theme";
import { ASCIILoader } from "@/components/ASCIILoader";
import ScreenHeader from "@/components/ScreenHeader";
import CyberpunkErrorModal from "@/components/CyberpunkErrorModal";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { signAndBroadcastTransaction } from "@/lib/shield-transaction";
import {
  preparePrivateSend,
  executePrivateSend,
  signTransaction,
  signEncryptionMessage,
} from "@/lib/transaction-history-api";
import { sendSolTransaction } from "@/lib/send-transaction";
import { useWebRTC } from "@/context/WebRTCContext";

type ProcessingStep = 'signing' | 'broadcasting' | 'confirming' | 'complete' | 'error';

type ProcessingRouteProp = RouteProp<RootStackParamList, 'Processing'>;
type ProcessingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Processing'>;

export default function ProcessingScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<ProcessingRouteProp>();
  const navigation = useNavigation<ProcessingNavigationProp>();
  const { setWalletAddress, setSolanaKeypair } = useWebRTC();

  const { actionType, amount, source, recipient, keypairSecretKey, unsignedTx, walletAddress } = route.params;

  const [currentStep, setCurrentStep] = useState<ProcessingStep>('signing');
  const [stepNumber, setStepNumber] = useState(1);
  const totalSteps = 3;
  const [errorMessage, setErrorMessage] = useState("");
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  const getStepLabel = (step: ProcessingStep): string => {
    switch (step) {
      case 'signing':
        return 'SIGNING....';
      case 'broadcasting':
        return 'BROADCASTING....';
      case 'confirming':
        return 'CONFIRMING....';
      case 'complete':
        return 'COMPLETE';
      case 'error':
        return 'ERROR';
    }
  };

  const getActionTitle = (): string => {
    switch (actionType) {
      case 'shield':
        return 'Shield';
      case 'unshield':
        return 'Unshield';
      case 'privateSend':
        return 'Private Send';
      case 'send':
        return 'Send';
    }
  };

  const getSourceLabel = (): string => {
    if (source === 'shielded') {
      return 'Shielded Balance';
    }
    return 'Public Balance';
  };

  const getDestinationLabel = (): string => {
    if (actionType === 'shield') {
      return 'Private';
    } else if (actionType === 'unshield') {
      return 'Public';
    }
    return 'Private';
  };

  const processShieldUnshield = async (keypair: Keypair) => {
    if (!unsignedTx) {
      throw new Error('Missing unsigned transaction');
    }

    const actionLabel = actionType === 'shield' ? 'SHIELD' : 'UNSHIELD';
    console.log(`[${actionLabel}] === PROCESS START ===`);
    console.log(`[${actionLabel}] Wallet:`, walletAddress);
    console.log(`[${actionLabel}] Amount:`, amount, 'SOL');

    setCurrentStep('signing');
    setStepNumber(1);
    console.log(`[${actionLabel}] Step 1: Signing transaction...`);
    await new Promise(resolve => setTimeout(resolve, 500));

    setCurrentStep('broadcasting');
    setStepNumber(2);
    console.log(`[${actionLabel}] Step 2: Broadcasting transaction...`);

    const result = await signAndBroadcastTransaction(keypair, unsignedTx);

    if (!result.success) {
      console.log(`[${actionLabel}] Transaction failed:`, result.error);
      throw new Error(result.error || "Transaction failed");
    }

    setCurrentStep('confirming');
    setStepNumber(3);
    console.log(`[${actionLabel}] Step 3: Confirming...`);
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`[${actionLabel}] === PROCESS COMPLETE ===`);
    console.log(`[${actionLabel}] Signature:`, result.signature);

    return result;
  };

  const processPrivateSend = async (keypair: Keypair) => {
    if (!recipient) {
      throw new Error('Missing recipient address');
    }

    const senderAddress = keypair.publicKey.toBase58();

    console.log('[PrivateSend] === PROCESS START ===');
    console.log('[PrivateSend] Source:', source);
    console.log('[PrivateSend] Sender:', senderAddress);
    console.log('[PrivateSend] Recipient:', recipient);
    console.log('[PrivateSend] Amount:', amount);

    setCurrentStep('signing');
    setStepNumber(1);
    console.log('[PrivateSend] Step 1: Preparing transaction...');

    const prepareResult = await preparePrivateSend({
      source: source || 'public',
      senderPublicKey: senderAddress,
      recipientAddress: recipient,
      amount,
    });

    if (!prepareResult.success || !prepareResult.unsignedTx) {
      console.log('[PrivateSend] Prepare failed:', prepareResult.error);
      throw new Error(prepareResult.error || "Failed to prepare transaction");
    }

    console.log('[PrivateSend] Prepare successful');
    console.log('[PrivateSend] Quote ID:', prepareResult.quoteId);

    setCurrentStep('broadcasting');
    setStepNumber(2);
    console.log('[PrivateSend] Step 2: Signing transaction...');

    const signedTx = signTransaction(prepareResult.unsignedTx, keypair);
    console.log('[PrivateSend] Transaction signed');

    const encryptionSignature = signEncryptionMessage(keypair);
    console.log('[PrivateSend] Encryption message signed');

    setCurrentStep('confirming');
    setStepNumber(3);
    console.log('[PrivateSend] Step 3: Executing transaction...');

    const executeResult = await executePrivateSend({
      quoteId: prepareResult.quoteId!,
      signedTx,
      encryptionSignature,
      source: source || 'public',
      senderPublicKey: senderAddress,
      recipientAddress: recipient,
      amount,
    });

    if (!executeResult.success) {
      console.log('[PrivateSend] Execute failed:', executeResult.error);
      throw new Error(executeResult.error || "Private send failed");
    }

    console.log('[PrivateSend] === PROCESS COMPLETE ===');
    console.log('[PrivateSend] Signature:', executeResult.signature);

    return executeResult;
  };

  const processSend = async (keypair: Keypair) => {
    if (!recipient) {
      throw new Error('Missing recipient address');
    }

    const senderAddress = keypair.publicKey.toBase58();

    console.log('[Send] === PROCESS START ===');
    console.log('[Send] Sender:', senderAddress);
    console.log('[Send] Recipient:', recipient);
    console.log('[Send] Amount:', amount);

    setCurrentStep('signing');
    setStepNumber(1);
    console.log('[Send] Step 1: Building & signing transaction...');
    await new Promise(resolve => setTimeout(resolve, 500));

    setCurrentStep('broadcasting');
    setStepNumber(2);
    console.log('[Send] Step 2: Broadcasting transaction...');

    const result = await sendSolTransaction({
      keypair,
      recipientAddress: recipient,
      amount,
    });

    if (!result.success) {
      console.log('[Send] Transaction failed:', result.error);
      throw new Error(result.error || "Send failed");
    }

    setCurrentStep('confirming');
    setStepNumber(3);
    console.log('[Send] Step 3: Confirming...');
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('[Send] === PROCESS COMPLETE ===');
    console.log('[Send] Signature:', result.signature);

    return result;
  };

  const processTransaction = async () => {
    try {
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairSecretKey));
      const derivedWalletAddress = keypair.publicKey.toBase58();

      let result;

      if (actionType === 'shield' || actionType === 'unshield') {
        result = await processShieldUnshield(keypair);
      } else if (actionType === 'send') {
        result = await processSend(keypair);
      } else {
        result = await processPrivateSend(keypair);
      }

      setCurrentStep('complete');

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setSolanaKeypair(keypair);
      setWalletAddress(derivedWalletAddress);

      navigation.reset({
        index: 0,
        routes: [{
          name: 'Success',
          params: {
            actionType,
            amount,
            amountReceived: (actionType === 'privateSend' || actionType === 'send') ? (result as { amountReceived?: number }).amountReceived : undefined,
            signature: result.signature,
          }
        }],
      });
    } catch (error) {
      console.log('[Processing] ERROR:', error instanceof Error ? error.message : error);
      setCurrentStep('error');

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      setErrorMessage(error instanceof Error ? error.message : "Transaction failed");
      setErrorModalVisible(true);
    }
  };

  const handleRetry = () => {
    setErrorModalVisible(false);
    setCurrentStep('signing');
    setStepNumber(1);
    processTransaction();
  };

  const handleCancel = () => {
    setErrorModalVisible(false);
    navigation.goBack();
  };

  useEffect(() => {
    processTransaction();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background Image */}
      <Image
        source={require("../../assets/images/nfc-background.png")}
        style={styles.backgroundImage}
        contentFit="cover"
      />

      {/* Header */}
      <ScreenHeader showBack={false} rightText={getActionTitle()} />

      {/* Center Content */}
      <View style={styles.centerContent}>
        {/* ASCII Loader */}
        <View style={styles.loaderContainer}>
          <ASCIILoader size="large" color={Colors.dark.text} />
        </View>

        {/* Step Counter */}
        <Text style={styles.stepCounter}>
          {stepNumber}/{totalSteps}
        </Text>

        {/* Status Text */}
        <Text style={styles.statusText}>{getStepLabel(currentStep)}</Text>
      </View>

      {/* Bottom Details Card */}
      <View style={[styles.bottomCard, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {/* Card Border */}
        <View style={styles.cardBorder}>
          {/* Corner Brackets */}
          <View style={[styles.cornerBracket, styles.cornerTL]} />
          <View style={[styles.cornerBracket, styles.cornerTR]} />
          <View style={[styles.cornerBracket, styles.cornerBL]} />
          <View style={[styles.cornerBracket, styles.cornerBR]} />
          {/* Card Background */}
          <View style={styles.cardBackground}>
            <View style={styles.cardContent}>
              {/* Amount */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>{amount} SOL</Text>
              </View>

              {/* Recipient (if applicable) */}
              {recipient ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Recipient</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {recipient.slice(0, 8)}...{recipient.slice(-8)}
                  </Text>
                </View>
              ) : null}

              {/* Source */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Source</Text>
                <Text style={styles.detailValue}>{getSourceLabel()}</Text>
              </View>

              {/* Destination */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Destination</Text>
                <Text style={styles.detailValue}>{getDestinationLabel()}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Error Modal */}
      <CyberpunkErrorModal
        visible={errorModalVisible}
        title="TRANSACTION FAILED"
        message={errorMessage}
        onRetry={handleRetry}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderContainer: {
    marginBottom: Spacing.xl,
  },
  stepCounter: {
    fontFamily: Fonts.heading,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
  },
  statusText: {
    fontFamily: Fonts.heading,
    fontSize: Typography.subheading.fontSize,
    color: Colors.dark.text,
    letterSpacing: 3,
  },
  bottomCard: {
    position: "relative",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  cornerBracket: {
    position: "absolute",
    width: 12,
    height: 12,
    borderColor: Colors.dark.text,
    zIndex: 10,
  },
  cornerTL: {
    top: -3,
    left: -3,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  cornerTR: {
    top: -3,
    right: -3,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  cornerBL: {
    bottom: -3,
    left: -3,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
  },
  cornerBR: {
    bottom: -3,
    right: -3,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  cardBorder: {
    borderWidth: 0.7,
    borderColor: "#484848",
    padding: 3,
  },
  cardBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: Spacing.lg,
  },
  cardContent: {
    gap: Spacing.lg,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    fontFamily: Fonts.body,
    fontSize: Typography.small.fontSize,
    color: Colors.dark.textSecondary,
    textTransform: "capitalize",
  },
  detailValue: {
    fontFamily: Fonts.geistMono,
    fontSize: Typography.body.fontSize,
    color: Colors.dark.text,
    fontWeight: "600",
  },
});
