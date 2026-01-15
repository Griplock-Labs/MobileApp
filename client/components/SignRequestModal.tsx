import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { SignRequest } from '@/context/WebRTCContext';

interface SignRequestModalProps {
  visible: boolean;
  request: SignRequest | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const ESTIMATED_GAS_FEE = 0.005 * 2;
const theme = Colors.dark;

export default function SignRequestModal({
  visible,
  request,
  onConfirm,
  onCancel,
}: SignRequestModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = 0.9;
      opacity.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleConfirm = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onCancel();
  };

  if (!request) return null;

  const isCompress = request.action === 'compress';
  const actionTitle = isCompress ? 'Hide Balance' : 'Show Balance';
  const actionDescription = isCompress
    ? 'Make your token balance private and hidden from public view.'
    : 'Make your token balance visible and publicly accessible.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.header}>
            <View style={[styles.iconContainer, isCompress ? styles.iconCompress : styles.iconDecompress]}>
              <Text style={styles.iconText}>{isCompress ? '🔒' : '🔓'}</Text>
            </View>
            <Text style={styles.title}>{actionTitle}</Text>
          </View>

          <Text style={styles.description}>{actionDescription}</Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Token</Text>
              <Text style={styles.detailValue}>{request.symbol}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>{request.amount} {request.symbol}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Est. Gas Fee</Text>
              <Text style={styles.detailValueFee}>~{ESTIMATED_GAS_FEE} SOL</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.processingText}>Processing transaction...</Text>
              </View>
            ) : (
              <>
                <Pressable style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCompress: {
    backgroundColor: 'rgba(164, 186, 210, 0.2)',
  },
  iconDecompress: {
    backgroundColor: 'rgba(6, 176, 64, 0.2)',
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: theme.text,
    textAlign: 'center',
  },
  description: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  detailsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
  },
  detailValue: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: theme.text,
  },
  detailValueFee: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    color: '#EF8300',
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: Spacing.xs,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: theme.text,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: theme.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: theme.buttonText,
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  processingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: Spacing.sm,
  },
});
