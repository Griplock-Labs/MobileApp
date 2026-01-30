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
import { Spacing, Fonts } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getCompressedBalance } from "@/lib/private-shield";
import { getBalance } from "@/lib/solana-rpc";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PrivateSend">;
type RouteProps = RouteProp<RootStackParamList, "PrivateSend">;

type SourceType = "public" | "shielded";

export default function PrivateSendScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { walletAddress } = route.params;

  const [source, setSource] = useState<SourceType>("public");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [publicBalance, setPublicBalance] = useState(0);
  const [shieldedBalance, setShieldedBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [inputWidth, setInputWidth] = useState(354);
  const inputHeight = 50;

  const selectedBalance = source === "public" ? publicBalance : shieldedBalance;
  const estimatedFee = source === "public" ? 0.008 : 0.012;

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const pubkey = new PublicKey(walletAddress);
      const [publicBal, compressedBal] = await Promise.all([
        getBalance(pubkey),
        getCompressedBalance(pubkey),
      ]);
      setPublicBalance(publicBal.sol);
      setShieldedBalance(compressedBal);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSourceChange = async (newSource: SourceType) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSource(newSource);
    setAmount("");
  };

  const handleMaxPress = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const maxAmount = Math.max(0, selectedBalance - estimatedFee - 0.001);
    setAmount(maxAmount.toFixed(4));
  }, [selectedBalance, estimatedFee]);

  const validateAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleContinue = useCallback(async () => {
    console.log('[PrivateSend] Continue button pressed');
    console.log('[PrivateSend] Source:', source);
    console.log('[PrivateSend] Recipient:', recipientAddress);
    console.log('[PrivateSend] Amount:', amount);
    console.log('[PrivateSend] Selected Balance:', selectedBalance);

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!validateAddress(recipientAddress)) {
      console.log('[PrivateSend] Invalid address');
      Alert.alert("Invalid Address", "Please enter a valid Solana address");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      console.log('[PrivateSend] Invalid amount');
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    if (amountNum > selectedBalance - estimatedFee) {
      console.log('[PrivateSend] Insufficient balance');
      Alert.alert("Insufficient Balance", `Amount exceeds available ${source} balance after fees`);
      return;
    }

    console.log('[PrivateSend] Validation passed, navigating to NFCReader');
    console.log('[PrivateSend] privateSendAction:', {
      source,
      recipientAddress,
      amount: amountNum,
      walletAddress,
    });

    navigation.navigate("NFCReader", {
      sessionId: "private-send-flow",
      privateSendAction: {
        source,
        recipientAddress,
        amount: amountNum,
        walletAddress,
      },
    });
  }, [source, amount, selectedBalance, estimatedFee, recipientAddress, walletAddress, navigation]);

  const onInputLayout = (e: LayoutChangeEvent) => {
    setInputWidth(e.nativeEvent.layout.width);
  };

  const amountNum = parseFloat(amount) || 0;
  const isValidAmount = amountNum > 0 && amountNum <= selectedBalance - estimatedFee;
  const isValidAddress = recipientAddress.length > 0 && validateAddress(recipientAddress);
  const canContinue = isValidAmount && isValidAddress;

  return (
    <View style={styles.container}>
      <ScreenHeader leftText="back" />

      <View style={styles.content}>
        <Text style={styles.title}>SEND PRIVATELY</Text>
        <Text style={styles.subtitle}>
          Send via Privacy Cash with full anonymity
        </Text>

        <Text style={styles.sectionLabel}>Send from</Text>
        <View style={styles.sourceSelector}>
          <Pressable
            style={[
              styles.sourceOption,
              source === "public" && styles.sourceOptionSelected,
            ]}
            onPress={() => handleSourceChange("public")}
          >
            <View style={styles.radioOuter}>
              {source === "public" && <View style={styles.radioInner} />}
            </View>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceLabel}>Public Balance</Text>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sourceBalance}>{publicBalance.toFixed(4)} SOL</Text>
              )}
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.sourceOption,
              source === "shielded" && styles.sourceOptionSelected,
            ]}
            onPress={() => handleSourceChange("shielded")}
          >
            <View style={styles.radioOuter}>
              {source === "shielded" && <View style={styles.radioInner} />}
            </View>
            <View style={styles.sourceInfo}>
              <Text style={styles.sourceLabel}>Shielded Balance</Text>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sourceBalance}>{shieldedBalance.toFixed(4)} SOL</Text>
              )}
            </View>
          </Pressable>
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
                placeholder="0.0000"
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
          <Text style={styles.feeLabel}>Estimated fee</Text>
          <Text style={styles.feeValue}>~{estimatedFee.toFixed(4)} SOL</Text>
        </View>

        <View style={styles.privacyNote}>
          <Text style={styles.privacyNoteText}>
            {source === "public" 
              ? "Funds deposited to Privacy Cash pool, then withdrawn to recipient. Sender identity hidden via ZK proof."
              : "Shielded balance decompressed, deposited to Privacy Cash, then withdrawn privately. Full anonymity."
            }
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
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: Spacing.sm,
  },
  sourceSelector: {
    marginBottom: Spacing.xl,
  },
  sourceOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    marginBottom: Spacing.sm,
  },
  sourceOptionSelected: {
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  sourceInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sourceLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "#FFFFFF",
  },
  sourceBalance: {
    fontFamily: Fonts.circular.book,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
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
  privacyNote: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  privacyNoteText: {
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
