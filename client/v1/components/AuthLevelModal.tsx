import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import CyberpunkModal from "./CyberpunkModal";
import { Colors, Spacing, Fonts } from "../constants/theme";

export type AuthLevel = "nfc_pin" | "nfc_secret" | "nfc_pin_secret";

interface AuthOption {
  id: AuthLevel;
  title: string;
  subtitle: string;
  description: string;
  strength: number;
}

const AUTH_OPTIONS: AuthOption[] = [
  {
    id: "nfc_pin",
    title: "NFC + PIN",
    subtitle: "STANDARD",
    description: "Tap your NFC card and enter your 6-digit PIN. Quick and convenient for everyday use.",
    strength: 1,
  },
  {
    id: "nfc_secret",
    title: "NFC + SECRET",
    subtitle: "ENHANCED",
    description: "Your secret phrase is stored once and combined with NFC for wallet derivation. Stronger protection without memorizing PINs.",
    strength: 2,
  },
  {
    id: "nfc_pin_secret",
    title: "NFC + PIN + SECRET",
    subtitle: "MAXIMUM",
    description: "Triple-factor security. Your stored secret + NFC + PIN creates a unique wallet. Maximum protection for high-value assets.",
    strength: 3,
  },
];

function StrengthIndicator({ level }: { level: number }) {
  return (
    <View style={styles.strengthContainer}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.strengthBar,
            i <= level && styles.strengthBarActive,
            i <= level && level === 3 && styles.strengthBarMax,
          ]}
        />
      ))}
    </View>
  );
}

function ShieldIcon({ active }: { active: boolean }) {
  return (
    <Svg width={24} height={28} viewBox="0 0 24 28">
      <Path
        d="M12 1L2 5V13C2 19.63 6.22 25.79 12 27C17.78 25.79 22 19.63 22 13V5L12 1Z"
        stroke={active ? "#FFFFFF" : "#555555"}
        strokeWidth={1.5}
        fill={active ? "rgba(255, 255, 255, 0.1)" : "transparent"}
      />
      {active && (
        <Path
          d="M9 14L11 16L15 12"
          stroke="#FFFFFF"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </Svg>
  );
}

function AuthOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: AuthOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect();
  };

  return (
    <Pressable
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={handlePress}
    >
      <View style={styles.optionHeader}>
        <View style={styles.optionLeft}>
          <ShieldIcon active={selected} />
          <View style={styles.optionTitles}>
            <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
              {option.title}
            </Text>
            <Text style={[styles.optionSubtitle, selected && styles.optionSubtitleSelected]}>
              {option.subtitle}
            </Text>
          </View>
        </View>
        <StrengthIndicator level={option.strength} />
      </View>
      <Text style={styles.optionDescription}>{option.description}</Text>
      {selected && (
        <View style={styles.selectedIndicator}>
          <Svg width={16} height={16} viewBox="0 0 16 16">
            <Circle cx={8} cy={8} r={7} stroke="#888888" strokeWidth={1} fill="none" />
            <Circle cx={8} cy={8} r={4} fill="#FFFFFF" />
          </Svg>
        </View>
      )}
    </Pressable>
  );
}

interface AuthLevelModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (level: AuthLevel) => void;
  currentLevel?: AuthLevel;
  isFirstTime?: boolean;
}

export default function AuthLevelModal({
  visible,
  onClose,
  onSelect,
  currentLevel,
  isFirstTime = false,
}: AuthLevelModalProps) {
  const [selectedLevel, setSelectedLevel] = React.useState<AuthLevel | undefined>(currentLevel);

  React.useEffect(() => {
    if (visible) {
      setSelectedLevel(currentLevel);
    }
  }, [visible, currentLevel]);

  const handleConfirm = async () => {
    if (selectedLevel) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onSelect(selectedLevel);
    }
  };

  return (
    <CyberpunkModal visible={visible} onClose={onClose} closeDisabled={isFirstTime}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {isFirstTime ? "SELECT AUTH LEVEL" : "CHANGE AUTH LEVEL"}
        </Text>
        <Text style={styles.subtitle}>
          {isFirstTime
            ? "Choose your preferred authentication method"
            : "Update your security preferences"}
        </Text>

        <View style={styles.optionsContainer}>
          {AUTH_OPTIONS.map((option) => (
            <AuthOptionCard
              key={option.id}
              option={option}
              selected={selectedLevel === option.id}
              onSelect={() => setSelectedLevel(option.id)}
            />
          ))}
        </View>

        <Pressable
          style={[styles.confirmButton, !selectedLevel && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!selectedLevel}
        >
          <Svg
            style={StyleSheet.absoluteFill}
            width="100%"
            height={48}
            viewBox="0 0 280 48"
            preserveAspectRatio="none"
          >
            <Path
              d="M0.5 8L8 0.5H272L279.5 8V40L272 47.5H8L0.5 40V8Z"
              fill={selectedLevel ? "rgba(255, 255, 255, 0.05)" : "rgba(85, 85, 85, 0.2)"}
              stroke={selectedLevel ? "#888888" : "#555555"}
              strokeWidth={1}
            />
          </Svg>
          <Text style={[styles.confirmText, !selectedLevel && styles.confirmTextDisabled]}>
            {isFirstTime ? "CONFIRM" : "UPDATE"}
          </Text>
        </Pressable>
      </View>
    </CyberpunkModal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  title: {
    fontFamily: Fonts.astroSpace,
    fontSize: 18,
    color: Colors.dark.text,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: Fonts.circular.book,
    fontSize: 13,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  optionsContainer: {
    width: "100%",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: "#333333",
    backgroundColor: "rgba(20, 20, 20, 0.8)",
    padding: Spacing.lg,
    position: "relative",
  },
  optionCardSelected: {
    borderColor: "#888888",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  optionTitles: {
    gap: 2,
  },
  optionTitle: {
    fontFamily: Fonts.circular.bold,
    fontSize: 14,
    color: Colors.dark.text,
  },
  optionTitleSelected: {
    color: "#FFFFFF",
  },
  optionSubtitle: {
    fontFamily: Fonts.circular.book,
    fontSize: 10,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
  },
  optionSubtitleSelected: {
    color: "#AAAAAA",
  },
  optionDescription: {
    fontFamily: Fonts.circular.book,
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 18,
  },
  strengthContainer: {
    flexDirection: "row",
    gap: 3,
  },
  strengthBar: {
    width: 16,
    height: 4,
    backgroundColor: "#333333",
  },
  strengthBarActive: {
    backgroundColor: "#888888",
  },
  strengthBarMax: {
    backgroundColor: "#FFFFFF",
  },
  selectedIndicator: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
  },
  confirmButton: {
    width: 280,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    fontFamily: Fonts.circular.bold,
    fontSize: 13,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  confirmTextDisabled: {
    color: "#555555",
  },
});
