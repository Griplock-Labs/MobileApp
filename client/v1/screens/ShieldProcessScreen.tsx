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
import { RootStackParamList, ShieldActionParams } from "@/navigation/RootStackNavigator";
import ScreenHeader from "@/components/ScreenHeader";
import CyberpunkErrorModal from "@/components/CyberpunkErrorModal";
import { signAndBroadcastTransaction } from "@/lib/shield-transaction";
import { useWebRTC } from "@/context/WebRTCContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ShieldProcess">;
type RouteProps = RouteProp<RootStackParamList, "ShieldProcess">;

type ProcessStep = 'signing' | 'broadcasting' | 'confirming' | 'complete' | 'error';

export default function ShieldProcessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { setWalletAddress, setSolanaKeypair } = useWebRTC();
  
  const { shieldAction, keypairSecretKey } = route.params;
  
  const [currentStep, setCurrentStep] = useState<ProcessStep>('signing');
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
    processShieldTransaction();
  }, []);
  
  const processShieldTransaction = async () => {
    try {
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairSecretKey));
      const walletAddress = keypair.publicKey.toBase58();
      
      const actionLabel = shieldAction.type === 'shield' ? 'SHIELD' : 'UNSHIELD';
      console.log(`[${actionLabel}] === PROCESS START ===`);
      console.log(`[${actionLabel}] Wallet:`, walletAddress);
      console.log(`[${actionLabel}] Amount:`, shieldAction.amount, 'SOL');
      
      setCurrentStep('signing');
      console.log(`[${actionLabel}] Step 1: Signing transaction...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentStep('broadcasting');
      console.log(`[${actionLabel}] Step 2: Broadcasting transaction...`);
      
      const result = await signAndBroadcastTransaction(keypair, shieldAction.unsignedTx);
      
      if (!result.success) {
        console.log(`[${actionLabel}] Transaction failed:`, result.error);
        throw new Error(result.error || "Transaction failed");
      }
      
      setCurrentStep('confirming');
      console.log(`[${actionLabel}] Step 3: Confirming...`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`[${actionLabel}] === PROCESS COMPLETE ===`);
      console.log(`[${actionLabel}] Signature:`, result.signature);
      
      setCurrentStep('complete');
      
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      setSolanaKeypair(keypair);
      setWalletAddress(walletAddress);
      
      navigation.reset({
        index: 0,
        routes: [{
          name: 'Success',
          params: {
            actionType: shieldAction.type,
            amount: shieldAction.amount,
            signature: result.signature,
          }
        }],
      });
      
    } catch (error) {
      console.log('[ShieldProcess] ERROR:', error instanceof Error ? error.message : error);
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
    processShieldTransaction();
  };
  
  const handleCancel = () => {
    setErrorModalVisible(false);
    navigation.goBack();
  };
  
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));
  
  const getStepText = () => {
    const action = shieldAction.type === 'shield' ? 'SHIELDING' : 'UNSHIELDING';
    switch (currentStep) {
      case 'signing': return `SIGNING ${action}...`;
      case 'broadcasting': return 'BROADCASTING...';
      case 'confirming': return 'CONFIRMING...';
      case 'complete': return 'COMPLETE';
      case 'error': return 'ERROR';
      default: return 'PROCESSING...';
    }
  };
  
  const getStepNumber = () => {
    switch (currentStep) {
      case 'signing': return '1/3';
      case 'broadcasting': return '2/3';
      case 'confirming': return '3/3';
      default: return '';
    }
  };
  
  const actionTitle = shieldAction.type === 'shield' ? 'Shield' : 'Unshield';
  
  return (
    <View style={styles.background}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenHeader 
          leftText="back home"
          rightText={actionTitle}
          showBack={false}
        />
        
        <View style={styles.content}>
          <View style={styles.processingContainer}>
            <Animated.View style={[styles.loaderContainer, pulseStyle]}>
              <Text style={styles.loaderText}>
                {shieldAction.type === 'shield' ? '◢◤' : '◣◥'}
              </Text>
            </Animated.View>
            
            <Text style={styles.stepNumber}>{getStepNumber()}</Text>
            <Text style={styles.stepText}>{getStepText()}</Text>
            
            <View style={styles.detailsContainer}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>{shieldAction.amount} SOL</Text>
              
              <Text style={styles.detailLabel}>Action</Text>
              <Text style={styles.detailValue}>
                {shieldAction.type === 'shield' ? 'Public → Private' : 'Private → Public'}
              </Text>
              
              <Text style={styles.detailLabel}>Est. Fee</Text>
              <Text style={styles.detailValueSmall}>
                ~{(shieldAction.txFee / 1_000_000_000).toFixed(6)} SOL
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
