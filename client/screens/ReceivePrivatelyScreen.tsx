import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import QRCode from "react-native-qrcode-svg";
import { File, Paths } from "expo-file-system/next";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";
import { generateStealthReceiveAddress, StealthReceiveAddress } from "@/lib/stealth-address";
import { getBalance } from "@/lib/solana-rpc";
import { shieldFromStealthAddress } from "@/lib/private-shield";
import CyberpunkInput from "@/components/CyberpunkInput";
import CyberpunkButton from "@/components/CyberpunkButton";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ReceivePrivately">;

const theme = Colors.dark;

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backButton} onPress={onPress}>
      <Svg width={19} height={9} viewBox="0 0 19 9">
        <Path
          d="M4.14648 0.146409C4.34172 -0.048828 4.65825 -0.0487781 4.85352 0.146409C5.04878 0.341671 5.04878 0.658178 4.85352 0.85344L1.70703 3.99992H18.5C18.7761 3.99992 19 4.22378 19 4.49992C19 4.77604 18.7761 4.99992 18.5 4.99992H1.70703L4.85352 8.14641C5.04878 8.34167 5.04878 8.65818 4.85352 8.85344C4.65824 9.04857 4.3417 9.04866 4.14648 8.85344L0.146484 4.85344C0.112976 4.81992 0.0874347 4.78154 0.0654297 4.74211C0.0252168 4.67009 9.80679e-06 4.58827 0 4.49992C0 4.41129 0.0249792 4.32895 0.0654297 4.25676C0.0713863 4.24612 0.0762127 4.23481 0.0830078 4.22453L0.146484 4.14641L4.14648 0.146409Z"
          fill="white"
        />
      </Svg>
    </Pressable>
  );
}

const getStorageFile = (walletAddr: string) => 
  new File(Paths.document, `stealth_index_${walletAddr}.txt`);

export default function ReceivePrivatelyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { solanaKeypair, walletAddress } = useWebRTC();

  const [addressIndex, setAddressIndex] = useState<number | null>(null);
  const [stealthAddress, setStealthAddress] = useState<StealthReceiveAddress | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const loadAddressIndex = async () => {
      if (!walletAddress) return;
      try {
        const file = getStorageFile(walletAddress);
        if (file.exists) {
          const content = file.text();
          setAddressIndex(parseInt(content, 10));
        } else {
          setAddressIndex(0);
        }
      } catch (error) {
        console.error("Failed to load address index:", error);
        setAddressIndex(0);
      }
    };
    loadAddressIndex();
  }, [walletAddress]);

  useEffect(() => {
    const saveAddressIndex = async () => {
      if (!walletAddress || addressIndex === null) return;
      try {
        const file = getStorageFile(walletAddress);
        file.write(addressIndex.toString());
      } catch (error) {
        console.error("Failed to save address index:", error);
      }
    };
    saveAddressIndex();
  }, [walletAddress, addressIndex]);

  useEffect(() => {
    if (solanaKeypair && addressIndex !== null) {
      const addr = generateStealthReceiveAddress(solanaKeypair, addressIndex);
      setStealthAddress(addr);
    }
  }, [solanaKeypair, addressIndex]);

  const executeShield = async (balanceAmount: number) => {
    if (!stealthAddress || !solanaKeypair || balanceAmount <= 0) return;

    setClaiming(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const lamports = Math.floor(balanceAmount * LAMPORTS_PER_SOL);

      const result = await shieldFromStealthAddress(
        stealthAddress.keypair,
        solanaKeypair.publicKey,
        lamports
      );

      if (result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Shielded!",
          `${balanceAmount.toFixed(4)} SOL is now private. Use Unshield to withdraw.`
        );
        setBalance(0);
        setAddressIndex(prev => (prev ?? 0) + 1);
      } else {
        throw new Error(result.error || "Shield failed");
      }
    } catch (error) {
      console.error("Shield failed:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error instanceof Error ? error.message : "Shield failed");
    } finally {
      setClaiming(false);
    }
  };

  const checkTransfer = useCallback(async () => {
    if (!stealthAddress || !solanaKeypair) return;
    
    setLoading(true);
    try {
      const balanceInfo = await getBalance(stealthAddress.publicKey);
      setBalance(balanceInfo.sol);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (balanceInfo.sol > 0) {
        setLoading(false);
        await executeShield(balanceInfo.sol);
      } else {
        Alert.alert("No Transfer", "No SOL received yet.");
      }
    } catch (error) {
      console.error("Failed to check transfer:", error);
      Alert.alert("Error", "Failed to check. Try again.");
    } finally {
      setLoading(false);
    }
  }, [stealthAddress, solanaKeypair]);

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <BackButton onPress={handleBack} />
        <Text style={styles.title}>Receive Private</Text>
      </View>

      <View style={styles.content}>
        {stealthAddress ? (
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={stealthAddress.address}
                size={180}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
          </View>
        ) : null}

        <View style={styles.addressSection}>
          <CyberpunkInput
            value={stealthAddress?.address || "Generating..."}
            label="Stealth Address"
          />
        </View>

        <View style={styles.buttonContainer}>
          <CyberpunkButton
            title="Check Transfer"
            onPress={checkTransfer}
            loading={loading || claiming}
            disabled={loading || claiming}
          />
        </View>

        {claiming ? (
          <Text style={styles.statusText}>Shielding to private balance...</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundRoot,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  title: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: theme.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  addressSection: {
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statusText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
