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
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { PublicKey } from "@solana/web3.js";
import Svg, { Path, Rect } from "react-native-svg";

import ScreenHeader from "@/components/ScreenHeader";
import CyberpunkButton from "@/components/CyberpunkButton";
import { Spacing, Fonts, Colors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getCompressedBalance } from "@/lib/private-shield";
import { createUnshieldTransaction, solToLamports } from "@/lib/shield-transaction";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "UnshieldAmount">;
type RouteProps = RouteProp<RootStackParamList, "UnshieldAmount">;

export default function UnshieldAmountScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { walletAddress } = route.params;

  const [amount, setAmount] = useState("");
  const [maxBalance, setMaxBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTx, setIsCreatingTx] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState(0.000005);
  const [inputWidth, setInputWidth] = useState(354);
  const inputHeight = 50;

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const pubkey = new PublicKey(walletAddress);
      const balance = await getCompressedBalance(pubkey);
      setMaxBalance(balance);
    } catch (error) {
      console.error("Failed to fetch compressed balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxPress = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const maxAmount = Math.max(0, maxBalance - 0.001);
    setAmount(maxAmount.toFixed(4));
  }, [maxBalance]);

  const handleContinue = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amountNum > maxBalance) {
      Alert.alert("Insufficient Balance", "Amount exceeds available private balance");
      return;
    }

    setIsCreatingTx(true);

    try {
      const pubkey = new PublicKey(walletAddress);
      const lamports = solToLamports(amountNum);
      
      const result = await createUnshieldTransaction(pubkey, lamports);
      
      if (!result.success || !result.unsignedTx) {
        Alert.alert("Error", result.error || "Failed to create transaction");
        setIsCreatingTx(false);
        return;
      }

      navigation.navigate("NFCReader", {
        sessionId: "unshield-flow",
        shieldAction: {
          type: "unshield",
          amount: amountNum,
          unsignedTx: result.unsignedTx,
          txFee: result.txFee || 5000,
          walletAddress,
        },
      });
    } catch (error) {
      console.error("Failed to create unshield tx:", error);
      Alert.alert("Error", "Failed to prepare transaction");
    } finally {
      setIsCreatingTx(false);
    }
  }, [amount, maxBalance, walletAddress, navigation]);

  const onInputLayout = (e: LayoutChangeEvent) => {
    setInputWidth(e.nativeEvent.layout.width);
  };

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= maxBalance;

  return (
    <View style={styles.container}>
      <ScreenHeader leftText="back" />

      <View style={styles.content}>
        <Text style={styles.title}>UNSHIELD BALANCE</Text>
        <Text style={styles.subtitle}>
          Convert private (compressed) balance back to public SOL
        </Text>

        <View style={styles.balanceInfo}>
          <Text style={styles.balanceLabel}>Available to unshield</Text>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.balanceValue}>{maxBalance.toFixed(4)} SOL</Text>
          )}
        </View>

        {/* Cyberpunk-styled input (same style as CyberpunkInput) */}
        <View style={[styles.inputWrapper, { height: inputHeight }]} onLayout={onInputLayout}>
          <Svg
            style={StyleSheet.absoluteFill}
            width={inputWidth}
            height={inputHeight}
            viewBox={`0 0 ${inputWidth} ${inputHeight}`}
          >
            {/* Inner background */}
            <Rect
              x={7.5}
              y={6.5}
              width={inputWidth - 15}
              height={35}
              fill="white"
              fillOpacity={0.1}
            />
            {/* Border */}
            <Rect
              x={3.85}
              y={3.85}
              width={inputWidth - 7.7}
              height={41.3}
              stroke="#484848"
              strokeWidth={0.7}
              fill="none"
            />
            {/* Top-right corner */}
            <Path
              d={`M${inputWidth - 9.5} 0.5H${inputWidth - 0.5}V9.5`}
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
            {/* Bottom-right corner */}
            <Path
              d={`M${inputWidth - 0.5} 40.5V49.5H${inputWidth - 9.5}`}
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
            {/* Top-left corner */}
            <Path
              d="M9.5 0.5H0.5V9.5"
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
            {/* Bottom-left corner */}
            <Path
              d="M0.5 40.5V49.5H9.5"
              stroke="white"
              strokeWidth={1}
              fill="none"
            />
          </Svg>

          {/* Content overlay */}
          <View style={styles.inputContentContainer}>
            <View style={styles.inputArea}>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.0000"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                keyboardType="decimal-pad"
                autoFocus
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
          <Text style={styles.feeLabel}>Estimated fee</Text>
          <Text style={styles.feeValue}>~{estimatedFee.toFixed(6)} SOL</Text>
        </View>

        <View style={styles.buttonContainer}>
          <CyberpunkButton
            title="Continue"
            onPress={handleContinue}
            loading={isCreatingTx}
            disabled={!isValidAmount}
            width={200}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: 100,
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
    marginBottom: Spacing["2xl"],
  },
  balanceInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: Spacing.xl,
  },
  balanceLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  balanceValue: {
    fontFamily: Fonts.circular.book,
    fontSize: 16,
    color: "#FFFFFF",
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
  amountInput: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: Fonts.circular.book,
    letterSpacing: 0.5,
    padding: 0,
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
    marginBottom: Spacing["2xl"],
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
  buttonContainer: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
});
