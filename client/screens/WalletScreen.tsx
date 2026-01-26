import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { PublicKey } from "@solana/web3.js";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";
import WalletCard from "@/components/WalletCard";
import BottomNavigation from "@/components/BottomNavigation";
import CyberpunkModal from "@/components/CyberpunkModal";
import { getBalance } from "@/lib/solana-rpc";
import { getCompressedBalance } from "@/lib/private-shield";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Wallet">;

const theme = Colors.dark;

function GriplockLogo() {
  return (
    <Svg width="100%" height={47} viewBox="0 0 379 47" fill="none">
      <Path
        d="M178.941 5.81063C178.94 5.81119 178.939 5.81147 178.937 5.81203L184.893 11.7633L181.836 14.8177L175.384 8.37211C172.917 10.8359 171.39 14.2394 171.39 18C171.39 25.5189 177.49 31.6139 185.016 31.6139C190.193 31.6139 194.695 28.7287 197.001 24.48H183.394V20.16H202.902C201.834 29.0827 194.234 36 185.016 36C175.066 36 167 27.9411 167 18C167 11.4608 170.49 5.73632 175.711 2.58398L178.941 5.81063ZM201.104 9.89297C202.183 12.0265 202.851 14.4036 203 16.92H194.217L201.104 9.89297ZM196.676 4.27922C197.657 5.11244 198.549 6.04852 199.332 7.07133L191.873 14.6805L189.149 11.9588L196.676 4.27922ZM190.198 0.755156C191.534 1.15537 192.805 1.70724 193.99 2.38922L186.855 9.66797L184.13 6.94547L190.198 0.755156ZM185.016 0C185.465 6.53152e-06 185.911 0.0155306 186.352 0.0478125L181.837 4.65398L178.423 1.24313C180.465 0.44071 182.689 2.6857e-05 185.016 0Z"
        fill="url(#paint0_linear_wallet)"
      />
      <Path
        d="M156 18.5L0 18.5"
        stroke="white"
        strokeOpacity={0.5}
        strokeWidth={0.5}
      />
      <Path
        d="M212 18.5L379 18.5"
        stroke="white"
        strokeOpacity={0.5}
        strokeWidth={0.5}
      />
      <Path
        d="M213 18.5C213 34.5163 200.016 47 184 47C167.984 47 155 34.5163 155 18.5H156C156 33.964 168.536 47 184 47C199.464 47 212 33.964 212 18.5H213Z"
        fill="#787878"
      />
      <Defs>
        <LinearGradient
          id="paint0_linear_wallet"
          x1="185"
          y1="0"
          x2="185"
          y2="36"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#DBE4ED" />
          <Stop offset="1" stopColor="#A3BAD2" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

function CreateWalletButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.createWalletButton} onPress={onPress}>
      <Svg width="100%" height="100%" viewBox="0 0 152 39" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Path d="M3.5 3.5H148.5V34.5H3.5V3.5Z" fill="white" fillOpacity={0.25} />
        <Path d="M142.5 0.5H151.5V9.5" stroke="white" strokeWidth={1} fill="none" />
        <Path d="M151.5 29.5L151.5 38.5L142.5 38.5" stroke="white" strokeWidth={1} fill="none" />
        <Path d="M9.5 0.5H0.5V9.5" stroke="white" strokeWidth={1} fill="none" />
        <Path d="M0.5 29.5L0.5 38.5L9.5 38.5" stroke="white" strokeWidth={1} fill="none" />
      </Svg>
      <Text style={styles.createWalletText}>Add more</Text>
    </Pressable>
  );
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { walletAddress } = useWebRTC();
  const [addMoreModalVisible, setAddMoreModalVisible] = useState(false);
  const [privateInfoModalVisible, setPrivateInfoModalVisible] = useState(false);
  const [publicBalance, setPublicBalance] = useState(0);
  const [privateBalance, setPrivateBalance] = useState(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!walletAddress) {
      setPublicBalance(0);
      setPrivateBalance(0);
      return;
    }

    setIsLoadingBalance(true);
    try {
      const pubkey = new PublicKey(walletAddress);
      
      // Fetch both balances in parallel
      const [balanceInfo, compressedBal] = await Promise.all([
        getBalance(pubkey),
        getCompressedBalance(pubkey),
      ]);

      setPublicBalance(balanceInfo.sol);
      setPrivateBalance(compressedBal);
      
      console.log('[WalletScreen] Public balance:', balanceInfo.sol, 'SOL');
      console.log('[WalletScreen] Private balance:', compressedBal, 'SOL');
    } catch (error) {
      console.error('[WalletScreen] Failed to fetch balances:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleReceive = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("Receive");
  };

  const handleReceivePrivately = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("ReceivePrivately");
  };

  const handleCreateWallet = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddMoreModalVisible(true);
  };

  const handleScan = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("QRScanner", { sessionId: "" });
  };

  const handlePrivateBalanceInfo = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPrivateInfoModalVisible(true);
  };

  const handleWalletDetail = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate("WalletDetail");
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundWrapper}>
        <Image
          source={require("../../assets/images/nfc-background.png")}
          style={styles.backgroundImage}
          contentFit="cover"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing["3xl"], paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <GriplockLogo />
        </View>

        <WalletCard
          walletName="Main wallet"
          publicBalance={publicBalance}
          privateBalance={privateBalance}
          onPress={handleWalletDetail}
          onReceive={handleReceive}
          onReceivePrivately={handleReceivePrivately}
          onSwipeNext={() => {}}
          onRefresh={fetchBalances}
          refreshing={isLoadingBalance}
          onPrivateBalanceInfo={handlePrivateBalanceInfo}
        />

        <View style={styles.createWalletContainer}>
          <CreateWalletButton onPress={handleCreateWallet} />
        </View>
      </ScrollView>

      <View style={styles.bottomNavWrapper}>
        <BottomNavigation
          activeTab="grid"
          onCenterPress={handleScan}
          centerButtonTestID="button-scan-qr"
        />
      </View>

      <CyberpunkModal
        visible={addMoreModalVisible}
        onClose={() => setAddMoreModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>COMING SOON</Text>
          <Text style={styles.modalDescription}>
            This feature is currently being developed{"\n"}and not yet available
          </Text>
        </View>
      </CyberpunkModal>

      <CyberpunkModal
        visible={privateInfoModalVisible}
        onClose={() => setPrivateInfoModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>PRIVATE BALANCE</Text>
          <Text style={styles.modalDescription}>
            Hidden funds that only you can see. This balance is invisible to everyone else on the blockchain.{"\n\n"}
            These funds are locked. To use them, unshield first to move to your public balance.{"\n\n"}
            Go to Wallet Details to shield or unshield your funds.
          </Text>
        </View>
      </CyberpunkModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundRoot,
  },
  backgroundWrapper: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
    marginHorizontal: -Spacing["2xl"],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  createWalletContainer: {
    marginTop: Spacing["3xl"],
    alignItems: "center",
  },
  createWalletButton: {
    width: 152,
    height: 39,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  createWalletText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  bottomNavWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
  },
  modalContent: {
    flex: 1,
    alignItems: "center",
    paddingTop: 20,
  },
  modalTitle: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: theme.text,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  modalDescription: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 60,
    paddingHorizontal: 20,
  },
});
