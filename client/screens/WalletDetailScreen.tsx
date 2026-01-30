import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  Alert,
} from "react-native";
import Svg, { Path, Rect, Line } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import ScreenHeader from "@/components/ScreenHeader";
import { Spacing, Fonts } from "@/constants/theme";
import { useWebRTC } from "@/context/WebRTCContext";
import { getBalance } from "@/lib/solana-rpc";
import { getCompressedBalance } from "@/lib/private-shield";
import { PublicKey } from "@solana/web3.js";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "WalletDetail">;

function ShieldButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable style={styles.shieldButton} onPress={onPress}>
      <Text style={styles.shieldButtonText}>Shield</Text>
    </Pressable>
  );
}

function UnshieldButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable style={styles.unshieldButton} onPress={onPress}>
      <Text style={styles.unshieldButtonText}>Unshield</Text>
    </Pressable>
  );
}

function CornerArrowIcon() {
  return (
    <View style={styles.cornerArrowContainer}>
      <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
        <Path
          d="M10.25 6C10.25 5.86193 10.1381 5.75 10 5.75L7.75 5.75C7.61193 5.75 7.5 5.86193 7.5 6C7.5 6.13807 7.61193 6.25 7.75 6.25L9.75 6.25L9.75 8.25C9.75 8.38807 9.86193 8.5 10 8.5C10.1381 8.5 10.25 8.38807 10.25 8.25L10.25 6ZM6 10L6.17678 10.1768L10.1768 6.17678L10 6L9.82322 5.82322L5.82322 9.82322L6 10Z"
          fill="white"
        />
        <Rect x="0.25" y="0.25" width="15.5" height="15.5" stroke="white" strokeOpacity={0.25} strokeWidth={0.5} />
      </Svg>
    </View>
  );
}

function GridActionButton({ 
  label, 
  onPress 
}: { 
  label: string; 
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.gridActionButton} onPress={onPress}>
      <Text style={styles.gridActionButtonLabel}>{label}</Text>
      <CornerArrowIcon />
    </Pressable>
  );
}

function DashedDivider() {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.dashedLineContainer}>
      <Svg width={width} height={1}>
        <Line
          x1="0"
          y1="0.5"
          x2={width}
          y2="0.5"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={1}
          strokeDasharray="6 4"
        />
      </Svg>
    </View>
  );
}

function EmptyBoxIcon() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
      <Path
        d="M32 4L56 16V48L32 60L8 48V16L32 4Z"
        stroke="#4A4A4A"
        strokeWidth={2}
        fill="none"
      />
      <Path
        d="M32 28L56 16"
        stroke="#4A4A4A"
        strokeWidth={2}
      />
      <Path
        d="M32 28L8 16"
        stroke="#4A4A4A"
        strokeWidth={2}
      />
      <Path
        d="M32 28V60"
        stroke="#4A4A4A"
        strokeWidth={2}
      />
      <Path
        d="M20 10L44 22"
        stroke="#4A4A4A"
        strokeWidth={2}
      />
    </Svg>
  );
}

function formatSOL(sol: number): string {
  return `${sol.toFixed(4)} SOL`;
}

export default function WalletDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { walletAddress } = useWebRTC();
  const [publicBalance, setPublicBalance] = useState(0);
  const [privateBalance, setPrivateBalance] = useState(0);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) {
      setPublicBalance(0);
      setPrivateBalance(0);
      return;
    }

    try {
      const pubkey = new PublicKey(walletAddress);
      const [balanceInfo, compressedBal] = await Promise.all([
        getBalance(pubkey),
        getCompressedBalance(pubkey),
      ]);
      setPublicBalance(balanceInfo.sol);
      setPrivateBalance(compressedBal);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleShield = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!walletAddress) {
      Alert.alert("Error", "Wallet not connected");
      return;
    }
    if (publicBalance <= 0) {
      Alert.alert("No Balance", "You need public SOL to shield");
      return;
    }
    navigation.navigate("ShieldAmount", { walletAddress });
  };

  const handleUnshield = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!walletAddress) {
      Alert.alert("Error", "Wallet not connected");
      return;
    }
    if (privateBalance <= 0) {
      Alert.alert("No Balance", "You need private balance to unshield");
      return;
    }
    navigation.navigate("UnshieldAmount", { walletAddress });
  };

  const handleReceive = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleReceivePrivately = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSend = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSendPrivately = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!walletAddress) {
      Alert.alert("Error", "Wallet not connected");
      return;
    }
    if (privateBalance <= 0) {
      Alert.alert("No Balance", "You need private balance to send privately");
      return;
    }
    navigation.navigate("PrivateSend", { walletAddress });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader 
        leftText="back" 
        rightText="Settings"
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.walletTitle}>Main wallet</Text>

        <View style={styles.balanceSection}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Public balance</Text>
              <Text style={styles.balanceAmount}>{formatSOL(publicBalance)}</Text>
            </View>
            <ShieldButton onPress={handleShield} />
          </View>
        </View>

        <DashedDivider />

        <View style={styles.balanceSection}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Private balance</Text>
              <Text style={styles.balanceAmount}>{formatSOL(privateBalance)}</Text>
            </View>
            <UnshieldButton onPress={handleUnshield} />
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <View style={styles.horizontalDivider} />
          <View style={styles.actionsRow}>
            <View style={styles.gridCell}>
              <GridActionButton label="Receive" onPress={handleReceive} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.gridCell}>
              <GridActionButton label="Receive privately" onPress={handleReceivePrivately} />
            </View>
          </View>
          <View style={styles.horizontalDivider} />
          <View style={styles.actionsRow}>
            <View style={styles.gridCell}>
              <GridActionButton label="Send" onPress={handleSend} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.gridCell}>
              <GridActionButton label="Send privately" onPress={handleSendPrivately} />
            </View>
          </View>
          <View style={styles.horizontalDivider} />
        </View>

        <Text style={styles.transactionsTitle}>Transactions</Text>

        <View style={styles.emptyState}>
          <EmptyBoxIcon />
          <Text style={styles.emptyStateText}>No transaction history yet</Text>
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
    paddingBottom: 40,
  },
  walletTitle: {
    fontFamily: "Orbitron_400Regular",
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 32,
  },
  balanceSection: {
    paddingVertical: 16,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 4,
  },
  balanceAmount: {
    fontFamily: Fonts.circular.book,
    fontSize: 24,
    color: "#FFFFFF",
  },
  shieldButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 0.25,
    borderColor: "#FFFFFF",
  },
  shieldButtonText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: "#FFFFFF",
  },
  unshieldButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 0.25,
    borderColor: "#FFFFFF",
  },
  unshieldButtonText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: "#FFFFFF",
  },
  dashedLineContainer: {
    marginHorizontal: -Spacing.xl,
    height: 1,
  },
  actionsGrid: {
    marginTop: 24,
    marginBottom: 40,
    marginHorizontal: -Spacing.xl,
  },
  actionsRow: {
    flexDirection: "row",
  },
  gridCell: {
    flex: 1,
    padding: 4,
  },
  verticalDivider: {
    width: 0.5,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  horizontalDivider: {
    height: 0.5,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  gridActionButton: {
    flex: 1,
    height: 54,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  gridActionButtonLabel: {
    fontFamily: "GeistMono_400Regular",
    fontSize: 11,
    color: "#FFFFFF",
  },
  cornerArrowContainer: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  transactionsTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 32,
    letterSpacing: 1,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: 16,
  },
});
