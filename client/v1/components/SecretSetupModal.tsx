import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import * as Haptics from "expo-haptics";
import CyberpunkModal from "./CyberpunkModal";
import { Colors, Spacing, Fonts } from "../constants/theme";

interface SecretSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (secret: string) => void;
  isUpdate?: boolean;
}

function SecretInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  onToggleVisibility,
  showPassword,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry: boolean;
  onToggleVisibility: () => void;
  showPassword: boolean;
}) {
  return (
    <View style={styles.inputContainer}>
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height={52}
        viewBox="0 0 300 52"
        preserveAspectRatio="none"
      >
        <Path
          d="M0.5 6L6 0.5H294L299.5 6V46L294 51.5H6L0.5 46V6Z"
          fill="rgba(20, 20, 20, 0.9)"
          stroke="#444444"
          strokeWidth={1}
        />
      </Svg>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.dark.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable style={styles.eyeButton} onPress={onToggleVisibility}>
        <Svg width={20} height={20} viewBox="0 0 20 20">
          {showPassword ? (
            <>
              <Path
                d="M10 4C4 4 1 10 1 10C1 10 4 16 10 16C16 16 19 10 19 10C19 10 16 4 10 4Z"
                stroke={Colors.dark.textSecondary}
                strokeWidth={1.2}
                fill="none"
              />
              <Path
                d="M10 7C8.34 7 7 8.34 7 10C7 11.66 8.34 13 10 13C11.66 13 13 11.66 13 10C13 8.34 11.66 7 10 7Z"
                stroke={Colors.dark.textSecondary}
                strokeWidth={1.2}
                fill="none"
              />
            </>
          ) : (
            <>
              <Path
                d="M10 4C4 4 1 10 1 10C1 10 4 16 10 16C16 16 19 10 19 10C19 10 16 4 10 4Z"
                stroke={Colors.dark.textMuted}
                strokeWidth={1.2}
                fill="none"
              />
              <Path d="M3 17L17 3" stroke={Colors.dark.textMuted} strokeWidth={1.2} />
            </>
          )}
        </Svg>
      </Pressable>
    </View>
  );
}

export default function SecretSetupModal({
  visible,
  onClose,
  onConfirm,
  isUpdate = false,
}: SecretSetupModalProps) {
  const [secret, setSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setSecret("");
    setConfirmSecret("");
    setShowSecret(false);
    setShowConfirm(false);
    setError(null);
  };

  React.useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible]);

  const validateSecret = (): boolean => {
    if (secret.length < 4) {
      setError("Secret must be at least 4 characters");
      return false;
    }
    if (secret !== confirmSecret) {
      setError("Secrets do not match");
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validateSecret()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onConfirm(secret);
    resetForm();
  };

  const isValid = secret.length >= 4 && secret === confirmSecret;

  return (
    <CyberpunkModal visible={visible} onClose={onClose} closeDisabled={!isUpdate}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Svg width={48} height={48} viewBox="0 0 48 48">
            <Path
              d="M24 4L8 12V22C8 33.1 14.5 43.5 24 46C33.5 43.5 40 33.1 40 22V12L24 4Z"
              stroke="#888888"
              strokeWidth={2}
              fill="rgba(136, 136, 136, 0.1)"
            />
            <Path
              d="M24 20V28M24 32V32.01"
              stroke="#888888"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </View>

        <Text style={styles.title}>
          {isUpdate ? "UPDATE SECRET" : "SET YOUR SECRET"}
        </Text>
        <Text style={styles.subtitle}>
          {isUpdate
            ? "Enter a new secret phrase to update your authentication"
            : "Create a secret phrase for enhanced security. Remember it carefully - it cannot be recovered."}
        </Text>

        <View style={styles.inputsContainer}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>SECRET PHRASE</Text>
            <SecretInput
              value={secret}
              onChangeText={(text) => {
                setSecret(text);
                setError(null);
              }}
              placeholder="Enter your secret..."
              secureTextEntry={!showSecret}
              showPassword={showSecret}
              onToggleVisibility={() => setShowSecret(!showSecret)}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>CONFIRM SECRET</Text>
            <SecretInput
              value={confirmSecret}
              onChangeText={(text) => {
                setConfirmSecret(text);
                setError(null);
              }}
              placeholder="Confirm your secret..."
              secureTextEntry={!showConfirm}
              showPassword={showConfirm}
              onToggleVisibility={() => setShowConfirm(!showConfirm)}
            />
          </View>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.requirements}>
          <Text style={styles.requirementTitle}>REQUIREMENTS</Text>
          <View style={styles.requirementItem}>
            <View style={[styles.bullet, secret.length >= 4 && styles.bulletActive]} />
            <Text style={[styles.requirementText, secret.length >= 4 && styles.requirementMet]}>
              Minimum 4 characters
            </Text>
          </View>
          <View style={styles.requirementItem}>
            <View
              style={[
                styles.bullet,
                secret.length > 0 && secret === confirmSecret && styles.bulletActive,
              ]}
            />
            <Text
              style={[
                styles.requirementText,
                secret.length > 0 && secret === confirmSecret && styles.requirementMet,
              ]}
            >
              Secrets match
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.confirmButton, !isValid && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!isValid}
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
              fill={isValid ? "rgba(255, 255, 255, 0.05)" : "rgba(85, 85, 85, 0.2)"}
              stroke={isValid ? "#888888" : "#555555"}
              strokeWidth={1}
            />
          </Svg>
          <Text style={[styles.confirmText, !isValid && styles.confirmTextDisabled]}>
            {isUpdate ? "UPDATE SECRET" : "SET SECRET"}
          </Text>
        </Pressable>

        {/* Warning hidden - recovery feature coming soon */}
      </View>
    </CyberpunkModal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: Spacing.lg,
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
    paddingHorizontal: Spacing.md,
    lineHeight: 20,
  },
  inputsContainer: {
    width: "100%",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontFamily: Fonts.circular.medium,
    fontSize: 10,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    width: "100%",
    height: 52,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: Spacing.lg,
    paddingRight: 48,
    fontFamily: Fonts.circular.book,
    fontSize: 14,
    color: Colors.dark.text,
  },
  eyeButton: {
    position: "absolute",
    right: Spacing.md,
    padding: Spacing.xs,
  },
  errorText: {
    fontFamily: Fonts.circular.book,
    fontSize: 12,
    color: Colors.dark.error,
    marginBottom: Spacing.md,
  },
  requirements: {
    width: "100%",
    backgroundColor: "rgba(20, 20, 20, 0.6)",
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderLeftWidth: 2,
    borderLeftColor: "#888888",
  },
  requirementTitle: {
    fontFamily: Fonts.circular.medium,
    fontSize: 10,
    color: Colors.dark.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#444444",
  },
  bulletActive: {
    backgroundColor: "#FFFFFF",
  },
  requirementText: {
    fontFamily: Fonts.circular.book,
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  requirementMet: {
    color: "#FFFFFF",
  },
  confirmButton: {
    width: 280,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
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
