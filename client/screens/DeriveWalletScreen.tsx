import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";
import { useAuthPreference } from "@/context/AuthPreferenceContext";
import { deriveSolanaKeypair } from "@/lib/crypto";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "DeriveWallet">;
type RouteParams = RouteProp<RootStackParamList, "DeriveWallet">;

export default function DeriveWalletScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteParams>();
  const { setSolanaKeypair, setWalletAddress } = useWebRTC();
  const { getSecret } = useAuthPreference();
  const [frame, setFrame] = useState(0);
  const frames = ['|', '/', '-', '\\'];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const deriveWallet = async () => {
      try {
        const { nfcData } = route.params;
        const secret = await getSecret();

        if (!secret) {
          console.log('[DeriveWallet] No secret found, going back');
          navigation.goBack();
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));

        const keypair = deriveSolanaKeypair(nfcData, undefined, secret);
        const walletAddress = keypair.publicKey.toBase58();
        
        console.log('[DeriveWallet] Wallet derived:', walletAddress);
        
        setSolanaKeypair(keypair);
        setWalletAddress(walletAddress);

        navigation.reset({
          index: 0,
          routes: [{ name: "Wallet" }],
        });
      } catch (error) {
        console.error('[DeriveWallet] Error:', error);
        navigation.goBack();
      }
    };

    deriveWallet();
  }, [route.params, getSecret, setSolanaKeypair, setWalletAddress, navigation]);

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.asciiFrame}>{frames[frame]}</Text>
        <Text style={styles.loadingText}>DERIVING WALLET</Text>
        <Text style={styles.subText}>Securing your keys...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  asciiFrame: {
    fontFamily: 'monospace',
    fontSize: 48,
    color: '#A4BAD2',
    marginBottom: Spacing["2xl"],
  },
  loadingText: {
    fontFamily: Fonts.astroSpace,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  subText: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: Spacing.sm,
  },
});
