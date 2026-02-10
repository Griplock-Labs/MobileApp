import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  LayoutChangeEvent,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { PublicKey } from "@solana/web3.js";
import Svg, { Path, Rect } from "react-native-svg";

import ScreenHeader from "@/components/ScreenHeader";
import CyberpunkButton from "@/components/CyberpunkButton";
import { Spacing, Fonts } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getBalance } from "@/lib/solana-rpc";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Send">;
type RouteProps = RouteProp<RootStackParamList, "Send">;

export default function SendScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { walletAddress } = route.params;

  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [inputWidth, setInputWidth] = useState(354);
  const inputHeight = 50;

  const estimatedFee = 0.000005;

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const pubkey = new PublicKey(walletAddress);
      const balanceData = await getBalance(pubkey);
      setBalance(balanceData.sol);
    } catch (error) {
      console.error("[Send] Failed to fetch balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxPress = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const maxAmount = Math.max(0, balance - estimatedFee - 0.001);
    setAmount(maxAmount.toFixed(6));
  }, [balance, estimatedFee]);

  const validateAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleContinue = useCallback(async () => {
    console.log('[Send] Continue button pressed');
    console.log('[Send] Recipient:', recipientAddress);
    console.log('[Send] Amount:', amount);
    console.log('[Send] Balance:', balance);

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!validateAddress(recipientAddress)) {
      console.log('[Send] Invalid address');
      Alert.alert("Invalid Address", "Please enter a valid Solana address");
      return;
    }

    if (recipientAddress === walletAddress) {
      console.log('[Send] Cannot send to self');
      Alert.alert("Invalid Recipient", "Cannot send to your own wallet");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      console.log('[Send] Invalid amount');
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amountNum > balance - estimatedFee) {
      console.log('[Send] Insufficient balance');
      Alert.alert("Insufficient Balance", "Amount exceeds available balance after fees");
      return;
    }

    console.log('[Send] Validation passed, navigating to NFCReader');
    console.log('[Send] sendAction:', {
      recipientAddress,
      amount: amountNum,
      walletAddress,
    });

    navigation.navigate("NFCReader", {
      sessionId: "send-flow",
      sendAction: {
        recipientAddress,
        amount: amountNum,
        walletAddress,
      },
    });
  }, [amount, balance, estimatedFee, recipientAddress, walletAddress, navigation]);

  const onInputLayout = (e: LayoutChangeEvent) => {
    setInputWidth(e.nativeEvent.layout.width);
  };

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= balance - estimatedFee;
  const isValidAddress = recipientAddress.length > 0 && validateAddress(recipientAddress);
  const canContinue = isValidAmount && isValidAddress;

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setRecipientAddress(text.trim());
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.log('[Send] Paste failed:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader leftText="back" />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>SEND SOL</Text>
        <Text style={styles.subtitle}>
          Direct transfer to any Solana address
        </Text>

        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.balanceValue}>{balance.toFixed(6)} SOL</Text>
          )}
        </View>

        <Text style={styles.inputLabel}>Recipient address</Text>
        <View style={[styles.inputWrapper, { height: inputHeight }]} onLayout={onInputLayout}>
          <Svg
            style={StyleSheet.absoluteFill}
            width={inputWidth}
            height={inputHeight}
            viewBox={`0 0 ${inputWidth} ${inputHeight}`}
          >
            <Rect
              x={7.5}
              y={6.5}
              width={inputWidth - 15}
              height={35}
              fill="white"
              fillOpacity={0.1}
            />
            <Rect
              x={3.85}
              y={3.85}
              width={inputWidth - 7.7}
              height={41.3}
              stroke="#484848"
              strokeWidth={0.7}
              fill="none"
            />
            <Path
              d={`M${inputWidth - 9.5} 0.5H${inputWidth - 0.5}V9.5`}
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
            <Path
              d={`M${inputWidth - 0.5} 40.5V49.5H${inputWidth - 9.5}`}
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
            <Path
              d="M9.5 0.5H0.5V9.5"
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
            <Path
              d="M0.5 40.5V49.5H9.5"
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
          </Svg>

          <View style={styles.inputContentContainer}>
            <View style={styles.inputArea}>
              <TextInput
                style={styles.textInput}
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                placeholder="Enter SOL address"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Pressable 
              style={styles.pasteButton} 
              onPress={handlePaste}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.pasteButtonText}>PASTE</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.inputLabel}>Amount</Text>
        <View style={[styles.inputWrapper, { height: inputHeight }]}>
          <Svg
            style={StyleSheet.absoluteFill}
            width={inputWidth}
            height={inputHeight}
            viewBox={`0 0 ${inputWidth} ${inputHeight}`}
          >
            <Rect
              x={7.5}
              y={6.5}
              width={inputWidth - 15}
              height={35}
              fill="white"
              fillOpacity={0.1}
            />
            <Rect
              x={3.85}
              y={3.85}
              width={inputWidth - 7.7}
              height={41.3}
              stroke="#484848"
              strokeWidth={0.7}
              fill="none"
            />
            <Path
              d={`M${inputWidth - 9.5} 0.5H${inputWidth - 0.5}V9.5`}
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
            <Path
              d={`M${inputWidth - 0.5} 40.5V49.5H${inputWidth - 9.5}`}
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
            <Path
              d="M9.5 0.5H0.5V9.5"
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
            <Path
              d="M0.5 40.5V49.5H9.5"
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
          </Svg>

          <View style={styles.inputContentContainer}>
            <View style={styles.inputArea}>
              <TextInput
                style={styles.textInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.000000"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                keyboardType="decimal-pad"
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.maxButton,
                pressed && styles.maxButtonPressed,
              ]}
              onPress={handleMaxPress}
            >
              <Text style={styles.maxButtonText}>MAX</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.feeInfo}>
          <Text style={styles.feeLabel}>Network fee</Text>
          <Text style={styles.feeValue}>~{estimatedFee.toFixed(6)} SOL</Text>
        </View>

        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            This is a direct on-chain transfer. The transaction will be visible on blockchain explorers.
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <CyberpunkButton
            title="Continue"
            onPress={handleContinue}
            disabled={!canContinue}
            width={200}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  balanceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: Spacing.xl,
  },
  balanceLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  balanceValue: {
    fontFamily: Fonts.circular.book,
    fontSize: 16,
    color: "#FFFFFF",
  },
  inputLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
    marginBottom: Spacing.lg,
  },
  inputContentContainer: {
    position: "absolute",
    top: 6.5,
    left: 7.5,
    right: 7.5,
    height: 35,
    flexDirection: "row",
    alignItems: "center",
  },
  inputArea: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  textInput: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: Fonts.circular.book,
    letterSpacing: 0.5,
    padding: 0,
  },
  pasteButton: {
    backgroundColor: "#D9D9D9",
    width: 60,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 3,
  },
  pasteButtonText: {
    color: "#000000",
    fontSize: 11,
    fontFamily: Fonts.body,
    fontWeight: "600",
    letterSpacing: 1,
  },
  maxButton: {
    backgroundColor: "#D9D9D9",
    width: 60,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 3,
  },
  maxButtonPressed: {
    backgroundColor: "#BBBBBB",
  },
  maxButtonText: {
    color: "#000000",
    fontSize: 11,
    fontFamily: Fonts.body,
    letterSpacing: 0.5,
  },
  feeInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  feeLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  feeValue: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  infoNote: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoNoteText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 16,
  },
  buttonContainer: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
});
