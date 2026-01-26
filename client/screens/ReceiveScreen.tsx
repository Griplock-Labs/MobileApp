import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";
import CyberpunkInput from "@/components/CyberpunkInput";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Receive">;

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

export default function ReceiveScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { walletAddress } = useWebRTC();

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <BackButton onPress={handleBack} />
        <Text style={styles.title}>Receive</Text>
      </View>

      <View style={styles.content}>
        {walletAddress ? (
          <View style={styles.qrContainer}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={walletAddress}
                size={180}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>
          </View>
        ) : null}

        <View style={styles.addressSection}>
          <CyberpunkInput
            value={walletAddress || "No wallet connected"}
            label="Wallet Address"
          />
        </View>

        <Text style={styles.infoText}>
          Share this address to receive SOL to your public wallet.
        </Text>
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
  infoText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: theme.textMuted,
    textAlign: "center",
  },
});
