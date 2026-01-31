import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Keypair } from "@solana/web3.js";

import { Colors, Spacing, Fonts, Typography } from "@/constants/theme";
import { RootStackParamList, PrivateSendActionParams } from "@/navigation/RootStackNavigator";
import ScreenHeader from "@/components/ScreenHeader";
import CyberpunkErrorModal from "@/components/CyberpunkErrorModal";
import {
  preparePrivateSend,
  executePrivateSend,
  signTransaction,
  signEncryptionMessage,
} from "@/lib/transaction-history-api";
import { useWebRTC } from "@/context/WebRTCContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PrivateSendProcess">;
type RouteProps = RouteProp<RootStackParamList, "PrivateSendProcess">;

type ProcessStep = 'preparing' | 'signing' | 'executing' | 'complete' | 'error';

export default function PrivateSendProcessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { setWalletAddress, setSolanaKeypair } = useWebRTC();
  
  const { privateSendAction, keypairSecretKey } = route.params;
  
  const [currentStep, setCurrentStep] = useState<ProcessStep>('preparing');
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  
  const pulseAnim = useSharedValue(0.5);
  
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);
  
  useEffect(() => {
    processPrivateSend();
  }, []);
  
  const processPrivateSend = async () => {
    try {
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairSecretKey));
      const senderAddress = keypair.publicKey.toBase58();
      
      console.log('[PrivateSend] === PROCESS START ===');
      console.log('[PrivateSend] Source:', privateSendAction.source);
      console.log('[PrivateSend] Sender:', senderAddress);
      console.log('[PrivateSend] Recipient:', privateSendAction.recipientAddress);
      console.log('[PrivateSend] Amount:', privateSendAction.amount);
      
      // Step 1: Prepare
      setCurrentStep('preparing');
      console.log('[PrivateSend] Step 1: Calling /api/private-send/prepare...');
      const prepareResult = await preparePrivateSend({
        source: privateSendAction.source,
        senderPublicKey: senderAddress,
        recipientAddress: privateSendAction.recipientAddress,
        amount: privateSendAction.amount,
      });
      
      if (!prepareResult.success || !prepareResult.unsignedTx) {
        console.log('[PrivateSend] Prepare failed:', prepareResult.error);
        throw new Error(prepareResult.error || "Failed to prepare transaction");
      }
      
      console.log('[PrivateSend] Prepare successful');
      console.log('[PrivateSend] Quote ID:', prepareResult.quoteId);
      console.log('[PrivateSend] Fees:', prepareResult.fees);
      
      // Step 2: Sign transaction
      setCurrentStep('signing');
      console.log('[PrivateSend] Step 2: Signing transaction...');
      const signedTx = signTransaction(prepareResult.unsignedTx, keypair);
      console.log('[PrivateSend] Transaction signed');
      
      // Step 3: Sign encryption message
      console.log('[PrivateSend] Step 3: Signing encryption message...');
      const encryptionSignature = signEncryptionMessage(keypair);
      console.log('[PrivateSend] Encryption message signed');
      
      // Step 4: Execute
      setCurrentStep('executing');
      console.log('[PrivateSend] Step 4: Calling /api/private-send/execute...');
      const executeResult = await executePrivateSend({
        quoteId: prepareResult.quoteId!,
        signedTx,
        encryptionSignature,
        source: privateSendAction.source,
        senderPublicKey: senderAddress,
        recipientAddress: privateSendAction.recipientAddress,
        amount: privateSendAction.amount,
      });
      
      if (!executeResult.success) {
        console.log('[PrivateSend] Execute failed:', executeResult.error);
        throw new Error(executeResult.error || "Private send failed");
      }
      
      console.log('[PrivateSend] === PROCESS COMPLETE ===');
      console.log('[PrivateSend] Signature:', executeResult.signature);
      console.log('[PrivateSend] Amount received:', executeResult.amountReceived);
      
      setCurrentStep('complete');
      
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setSolanaKeypair(keypair);
      setWalletAddress(senderAddress);
      
      navigation.reset({
        index: 0,
        routes: [{
          name: 'Success',
          params: {
            actionType: 'privateSend',
            amount: privateSendAction.amount,
            amountReceived: executeResult.amountReceived,
            signature: executeResult.signature,
          }
        }],
      });
      
    } catch (error) {
      console.log('[PrivateSend] ERROR:', error instanceof Error ? error.message : error);
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
    setCurrentStep('preparing');
    processPrivateSend();
  };
  
  const handleCancel = () => {
    setErrorModalVisible(false);
    navigation.goBack();
  };
  
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));
  
  const getStepText = () => {
    switch (currentStep) {
      case 'preparing': return 'PREPARING TRANSACTION...';
      case 'signing': return 'SIGNING TRANSACTION...';
      case 'executing': return 'BROADCASTING...';
      case 'complete': return 'COMPLETE';
      case 'error': return 'ERROR';
      default: return 'PROCESSING...';
    }
  };
  
  const getStepNumber = () => {
    switch (currentStep) {
      case 'preparing': return '1/3';
      case 'signing': return '2/3';
      case 'executing': return '3/3';
      default: return '';
    }
  };
  
  return (
    <View style={styles.background}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader 
          leftText="back home"
          rightText="Private Send"
          showBack={false}
        />
        
        <View style={styles.content}>
          <View style={styles.processingContainer}>
            <Animated.View style={[styles.loaderContainer, pulseStyle]}>
              <Text style={styles.loaderText}>◢◤</Text>
            </Animated.View>
            
            <Text style={styles.stepNumber}>{getStepNumber()}</Text>
            <Text style={styles.stepText}>{getStepText()}</Text>
            
            <View style={styles.detailsContainer}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>{privateSendAction.amount} SOL</Text>
              
              <Text style={styles.detailLabel}>Recipient</Text>
              <Text style={styles.detailValueSmall}>
                {privateSendAction.recipientAddress.slice(0, 8)}...{privateSendAction.recipientAddress.slice(-8)}
              </Text>
              
              <Text style={styles.detailLabel}>Source</Text>
              <Text style={styles.detailValue}>
                {privateSendAction.source === 'public' ? 'Public Balance' : 'Shielded Balance'}
              </Text>
            </View>
          </View>
        </View>
        
        <CyberpunkErrorModal
          visible={errorModalVisible}
          title="TRANSACTION FAILED"
          message={errorMessage}
          retryText="RETRY"
          cancelText="CANCEL"
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: Colors.light.backgroundRoot,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  processingContainer: {
    alignItems: 'center',
  },
  loaderContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  loaderText: {
    fontSize: 48,
    color: Colors.light.primary,
    fontFamily: Fonts.heading,
  },
  stepNumber: {
    fontSize: Typography.small.fontSize,
    color: Colors.light.textSecondary,
    fontFamily: Fonts.mono,
    marginBottom: Spacing.xs,
  },
  stepText: {
    fontSize: Typography.subheading.fontSize,
    color: Colors.light.primary,
    fontFamily: Fonts.heading,
    textAlign: 'center',
    marginBottom: Spacing["3xl"],
  },
  detailsContainer: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 300,
  },
  detailLabel: {
    fontSize: Typography.small.fontSize,
    color: Colors.light.textSecondary,
    fontFamily: Fonts.mono,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Typography.body.fontSize,
    color: Colors.light.text,
    fontFamily: Fonts.heading,
    marginBottom: Spacing.md,
  },
  detailValueSmall: {
    fontSize: Typography.caption.fontSize,
    color: Colors.light.text,
    fontFamily: Fonts.mono,
    marginBottom: Spacing.md,
  },
});
