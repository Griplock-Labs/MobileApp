import React, { useState } from "react";
import { View, StyleSheet, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";

import { Colors, Fonts, Spacing } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useAuthPreference, AuthLevel } from "@/context/AuthPreferenceContext";
import ScreenHeader from "@/components/ScreenHeader";
import AuthLevelModal from "@/components/AuthLevelModal";
import SecretSetupModal from "@/components/SecretSetupModal";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Settings">;

const theme = Colors.dark;

function ChevronRightIcon() {
  return (
    <Svg width={8} height={14} viewBox="0 0 8 14" fill="none">
      <Path
        d="M1 1L7 7L1 13"
        stroke="white"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SettingsItem({
  title,
  value,
  onPress,
  showChevron = true,
}: {
  title: string;
  value?: string;
  onPress: () => void;
  showChevron?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsItem,
        pressed && styles.settingsItemPressed,
      ]}
      onPress={onPress}
    >
      <Text style={styles.settingsItemTitle}>{title}</Text>
      <View style={styles.settingsItemRight}>
        {value ? <Text style={styles.settingsItemValue}>{value}</Text> : null}
        {showChevron ? <ChevronRightIcon /> : null}
      </View>
    </Pressable>
  );
}

function getAuthLevelLabel(level: AuthLevel | null): string {
  switch (level) {
    case "nfc_pin":
      return "NFC + PIN";
    case "nfc_secret":
      return "NFC + Secret";
    case "nfc_pin_secret":
      return "NFC + PIN + Secret";
    default:
      return "Not set";
  }
}

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { authLevel, setAuthLevel, hasSecret, setSecret } = useAuthPreference();
  
  const [showAuthLevelModal, setShowAuthLevelModal] = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);

  const appVersion = Constants.expoConfig?.version || "1.0.0";

  const handleAuthLevelPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAuthLevelModal(true);
  };

  const handleUpdateSecretPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSecretModal(true);
  };

  const handleAuthLevelSelect = async (level: AuthLevel) => {
    await setAuthLevel(level);
    setShowAuthLevelModal(false);
    // Only show secret modal if switching to secret mode AND no secret exists yet
    if ((level === "nfc_secret" || level === "nfc_pin_secret") && !hasSecret) {
      setShowSecretModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader showBack leftText="Settings" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY</Text>
          
          <SettingsItem
            title="Authentication Level"
            value={getAuthLevelLabel(authLevel)}
            onPress={handleAuthLevelPress}
          />
          
          <SettingsItem
            title="Update Secret"
            value={hasSecret ? "Set" : "Not set"}
            onPress={handleUpdateSecretPress}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>{appVersion}</Text>
          </View>
        </View>
      </ScrollView>

      <AuthLevelModal
        visible={showAuthLevelModal}
        onClose={() => setShowAuthLevelModal(false)}
        onSelect={handleAuthLevelSelect}
        currentLevel={authLevel || undefined}
        isFirstTime={false}
      />

      <SecretSetupModal
        visible={showSecretModal}
        onClose={() => setShowSecretModal(false)}
        onConfirm={async (secret) => {
          await setSecret(secret);
          setShowSecretModal(false);
        }}
        isUpdate={hasSecret}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundRoot,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120,
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing["3xl"],
  },
  sectionTitle: {
    fontFamily: Fonts.heading,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    letterSpacing: 2,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  settingsItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  settingsItemPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  settingsItemTitle: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: theme.text,
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  settingsItemValue: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 8,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  infoLabel: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: theme.text,
  },
  infoValue: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
});
