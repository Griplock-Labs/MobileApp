import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { getRandomValues } from 'expo-crypto';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

import { Colors, Spacing, Fonts, Typography, Shadows } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { createWallet } from '@/lib/v2/shares';
import {
  addWalletProfile,
  saveDeviceObject,
  saveDeviceKey,
  saveRecoveryData,
  getWalletByNfcUid,
} from '@/lib/v2/wallet-store';
import { exportRecoveryFile } from '@/lib/v2/recovery-file';
import type { RecoveryFileObject, WalletProfile } from '@/lib/v2/types';
import { bytesToHex } from '@/lib/v2/encoding';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type V2SetupRouteProp = RouteProp<RootStackParamList, 'V2Setup'>;

type SetupStep = 'pin' | 'confirm_pin' | 'secret_prompt' | 'secret_enter' | 'confirm_secret' | 'processing' | 'recovery' | 'success';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <View style={stepStyles.container}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          style={[
            stepStyles.dot,
            i < currentStep ? stepStyles.dotCompleted : null,
            i === currentStep ? stepStyles.dotActive : null,
          ]}
        />
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing['2xl'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
    borderRadius: 4,
  },
  dotCompleted: {
    backgroundColor: '#666666',
  },
});

function PINKeypad({
  pin,
  onPinChange,
  label,
  sublabel,
}: {
  pin: string;
  onPinChange: (pin: string) => void;
  label: string;
  sublabel?: string;
}) {
  const handlePress = useCallback(
    (digit: string) => {
      if (pin.length < 6) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPinChange(pin + digit);
      }
    },
    [pin, onPinChange]
  );

  const handleDelete = useCallback(() => {
    if (pin.length > 0) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPinChange(pin.slice(0, -1));
    }
  }, [pin, onPinChange]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <View style={pinStyles.container}>
      <Text style={pinStyles.label}>{label}</Text>
      {sublabel ? <Text style={pinStyles.sublabel}>{sublabel}</Text> : null}

      <View style={pinStyles.dotsRow}>
        {Array.from({ length: 6 }, (_, i) => (
          <View
            key={i}
            style={[pinStyles.pinDot, i < pin.length ? pinStyles.pinDotFilled : null]}
          />
        ))}
      </View>

      <View style={pinStyles.keypad}>
        {digits.map((digit, index) => {
          if (digit === '') {
            return <View key={index} style={pinStyles.keyEmpty} />;
          }
          if (digit === 'del') {
            return (
              <Pressable
                key={index}
                style={({ pressed }) => [pinStyles.key, pressed ? pinStyles.keyPressed : null]}
                onPress={handleDelete}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2zm-3 5l-5 5m0-5l5 5"
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={index}
              style={({ pressed }) => [pinStyles.key, pressed ? pinStyles.keyPressed : null]}
              onPress={() => handlePress(digit)}
            >
              <Text style={pinStyles.keyText}>{digit}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const pinStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  sublabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: Spacing['4xl'],
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#555555',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 270,
    justifyContent: 'center',
    gap: 12,
  },
  key: {
    width: 74,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
  },
  keyPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  keyEmpty: {
    width: 74,
    height: 56,
  },
  keyText: {
    fontFamily: Fonts.body,
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});

function SecretInput({
  value,
  onChangeText,
  label,
  sublabel,
}: {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <View style={secretStyles.container}>
      <Text style={secretStyles.label}>{label}</Text>
      {sublabel ? <Text style={secretStyles.sublabel}>{sublabel}</Text> : null}

      <View style={secretStyles.inputWrapper}>
        <View style={secretStyles.inputBorder}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height={52} viewBox="0 0 300 52">
            <Rect x={3} y={3} width={294} height={46} fill="white" fillOpacity={0.06} />
            <Path d="M10 0.5H0.5V10" stroke="white" strokeWidth={1} fill="none" />
            <Path d="M290 0.5H299.5V10" stroke="white" strokeWidth={1} fill="none" />
            <Path d="M0.5 42V51.5H10" stroke="white" strokeWidth={1} fill="none" />
            <Path d="M299.5 42V51.5H290" stroke="white" strokeWidth={1} fill="none" />
          </Svg>
          <View style={secretStyles.inputInner}>
            <Text style={secretStyles.inputText}>
              {value ? '•'.repeat(value.length) : ''}
            </Text>
            <View style={secretStyles.cursor} />
          </View>
        </View>
      </View>

      <View style={secretStyles.keyboardHint}>
        <Text style={secretStyles.hintText}>
          Use letters, numbers, and symbols
        </Text>
      </View>
    </View>
  );
}

const secretStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing['4xl'],
  },
  label: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },
  sublabel: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  inputWrapper: {
    width: '100%',
    paddingHorizontal: Spacing['2xl'],
    marginBottom: Spacing.lg,
  },
  inputBorder: {
    height: 52,
    position: 'relative',
  },
  inputInner: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputText: {
    fontFamily: Fonts.body,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },
  keyboardHint: {
    marginTop: Spacing.sm,
  },
  hintText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: '#555555',
  },
});

function ShieldIcon() {
  return (
    <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke="#FFFFFF"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 12l2 2 4-4"
        stroke="#FFFFFF"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DownloadIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
        stroke="#FFFFFF"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <Svg width={80} height={80} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke="#FFFFFF" strokeWidth={1} />
      <Path
        d="M9 12l2 2 4-4"
        stroke="#FFFFFF"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function V2SetupScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<V2SetupRouteProp>();
  const { nfcUid } = route.params;

  const [step, setStep] = useState<SetupStep>('pin');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [secret, setSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [useSecret, setUseSecret] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletId, setWalletId] = useState('');
  const [recoveryFile, setRecoveryFile] = useState<RecoveryFileObject | null>(null);
  const [recoveryExported, setRecoveryExported] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<WalletProfile | null>(null);

  const pulseAnim = useSharedValue(0);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulseAnim.value * 0.6,
  }));

  const getStepNumber = (): number => {
    switch (step) {
      case 'pin':
      case 'confirm_pin':
        return 0;
      case 'secret_prompt':
      case 'secret_enter':
      case 'confirm_secret':
        return 1;
      case 'processing':
        return 2;
      case 'recovery':
        return 3;
      case 'success':
        return 4;
      default:
        return 0;
    }
  };

  const handlePinComplete = useCallback(
    (newPin: string) => {
      setPin(newPin);
      if (newPin.length === 6) {
        setTimeout(() => {
          setError('');
          setStep('confirm_pin');
          setConfirmPin('');
        }, 200);
      }
    },
    []
  );

  const handleConfirmPinComplete = useCallback(
    (newConfirmPin: string) => {
      setConfirmPin(newConfirmPin);
      if (newConfirmPin.length === 6) {
        setTimeout(() => {
          if (newConfirmPin === pin) {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            setError('');
            setStep('secret_prompt');
          } else {
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            setError('PINs do not match');
            setConfirmPin('');
          }
        }, 200);
      }
    },
    [pin]
  );

  const handleSecretPrompt = useCallback((withSecret: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setUseSecret(withSecret);
    if (withSecret) {
      setStep('secret_enter');
    } else {
      handleCreateWallet(pin, undefined);
    }
  }, [pin]);

  const handleCreateWallet = useCallback(
    async (walletPin: string, walletSecret: string | undefined) => {
      setStep('processing');
      setIsProcessing(true);

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const deviceKey = new Uint8Array(32);
        getRandomValues(deviceKey);

        const result = createWallet({
          pin: walletPin,
          secret: walletSecret,
          nfcUid,
          deviceKey,
        });

        await saveDeviceObject(result.deviceObject);
        await saveDeviceKey(result.walletId, deviceKey);
        await saveRecoveryData(result.walletId, result.recoveryFile);

        setPendingProfile(result.walletProfile);
        setWalletAddress(result.address);
        setWalletId(result.walletId);
        setRecoveryFile(result.recoveryFile);

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        setIsProcessing(false);
        setStep('recovery');
      } catch (err: any) {
        console.error('[V2Setup] Wallet creation failed:', err);
        setIsProcessing(false);
        setError(err.message || 'Wallet creation failed');
        setStep('pin');
        setPin('');
        setConfirmPin('');
      }
    },
    [nfcUid]
  );

  const handleExportRecovery = useCallback(async () => {
    if (!recoveryFile) return;

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const success = await exportRecoveryFile(recoveryFile);
      if (success) {
        setRecoveryExported(true);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (err: any) {
      console.error('[V2Setup] Recovery export failed:', err);
      Alert.alert('Export Failed', 'Could not export recovery file. Please try again.');
    }
  }, [recoveryFile]);

  const finalizeSetup = useCallback(async () => {
    if (pendingProfile) {
      try {
        await addWalletProfile(pendingProfile);
        console.log('[V2Setup] Wallet profile saved to index');
        setPendingProfile(null);
      } catch (err) {
        console.error('[V2Setup] Failed to save wallet profile:', err);
      }
    }
    setStep('success');
  }, [pendingProfile]);

  const handleSkipRecovery = useCallback(() => {
    Alert.alert(
      'Skip Backup?',
      'Without a recovery file, you cannot recover your wallet if you lose this device. Are you sure?',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => finalizeSetup(),
        },
      ]
    );
  }, [finalizeSetup]);

  const handleGoToWallet = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [navigation]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'confirm_pin':
        setStep('pin');
        setPin('');
        setConfirmPin('');
        setError('');
        break;
      case 'secret_prompt':
        setStep('pin');
        setPin('');
        setConfirmPin('');
        break;
      case 'secret_enter':
        setStep('secret_prompt');
        setSecret('');
        break;
      case 'confirm_secret':
        setStep('secret_enter');
        setConfirmSecret('');
        break;
      default:
        navigation.goBack();
    }
  }, [step, navigation]);

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
    : '';

  const renderContent = () => {
    switch (step) {
      case 'pin':
        return (
          <Animated.View
            key="pin"
            entering={FadeIn.duration(300)}
            style={styles.stepContent}
          >
            <PINKeypad
              pin={pin}
              onPinChange={handlePinComplete}
              label="SET YOUR PIN"
              sublabel="Create a 6-digit PIN for this wallet"
            />
          </Animated.View>
        );

      case 'confirm_pin':
        return (
          <Animated.View
            key="confirm_pin"
            entering={SlideInRight.duration(300)}
            style={styles.stepContent}
          >
            <PINKeypad
              pin={confirmPin}
              onPinChange={handleConfirmPinComplete}
              label="CONFIRM PIN"
              sublabel="Re-enter your 6-digit PIN"
            />
            {error ? (
              <Animated.View entering={FadeIn} style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        );

      case 'secret_prompt':
        return (
          <Animated.View
            key="secret_prompt"
            entering={SlideInRight.duration(300)}
            style={[styles.stepContent, styles.centeredContent]}
          >
            <ShieldIcon />
            <Text style={styles.promptTitle}>ADD EXTRA SECURITY?</Text>
            <Text style={styles.promptSubtitle}>
              A secret passphrase adds another layer of protection. Your wallet will require both PIN and secret to unlock.
            </Text>

            <View style={styles.promptButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.promptButton,
                  styles.promptButtonPrimary,
                  pressed ? styles.promptButtonPressed : null,
                ]}
                onPress={() => handleSecretPrompt(true)}
              >
                <Text style={styles.promptButtonText}>ADD SECRET</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.promptButton,
                  styles.promptButtonSecondary,
                  pressed ? styles.promptButtonPressed : null,
                ]}
                onPress={() => handleSecretPrompt(false)}
              >
                <Text style={[styles.promptButtonText, styles.promptButtonTextSecondary]}>
                  SKIP
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        );

      case 'secret_enter':
        return (
          <Animated.View
            key="secret_enter"
            entering={SlideInRight.duration(300)}
            style={styles.stepContent}
          >
            <View style={styles.secretInputContainer}>
              <Text style={pinStyles.label}>ENTER SECRET</Text>
              <Text style={pinStyles.sublabel}>
                Choose a memorable passphrase
              </Text>

              <View style={styles.secretDisplay}>
                <Text style={styles.secretDots}>
                  {secret ? '\u2022'.repeat(secret.length) : ' '}
                </Text>
                <Animated.View style={[styles.secretCursor, pulseStyle]} />
              </View>

              <View style={styles.secretKeypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(
                  (digit, index) => {
                    if (digit === '') return <View key={index} style={pinStyles.keyEmpty} />;
                    if (digit === 'del') {
                      return (
                        <Pressable
                          key={index}
                          style={({ pressed }) => [
                            pinStyles.key,
                            pressed ? pinStyles.keyPressed : null,
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSecret((s) => s.slice(0, -1));
                          }}
                        >
                          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2zm-3 5l-5 5m0-5l5 5"
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </Svg>
                        </Pressable>
                      );
                    }
                    return (
                      <Pressable
                        key={index}
                        style={({ pressed }) => [
                          pinStyles.key,
                          pressed ? pinStyles.keyPressed : null,
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSecret((s) => s + digit);
                        }}
                      >
                        <Text style={pinStyles.keyText}>{digit}</Text>
                      </Pressable>
                    );
                  }
                )}
              </View>

              {secret.length >= 4 ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.continueButton,
                    pressed ? styles.continueButtonPressed : null,
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setStep('confirm_secret');
                    setConfirmSecret('');
                  }}
                >
                  <Text style={styles.continueButtonText}>CONTINUE</Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        );

      case 'confirm_secret':
        return (
          <Animated.View
            key="confirm_secret"
            entering={SlideInRight.duration(300)}
            style={styles.stepContent}
          >
            <View style={styles.secretInputContainer}>
              <Text style={pinStyles.label}>CONFIRM SECRET</Text>
              <Text style={pinStyles.sublabel}>
                Re-enter your secret passphrase
              </Text>

              <View style={styles.secretDisplay}>
                <Text style={styles.secretDots}>
                  {confirmSecret ? '\u2022'.repeat(confirmSecret.length) : ' '}
                </Text>
                <Animated.View style={[styles.secretCursor, pulseStyle]} />
              </View>

              <View style={styles.secretKeypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(
                  (digit, index) => {
                    if (digit === '') return <View key={index} style={pinStyles.keyEmpty} />;
                    if (digit === 'del') {
                      return (
                        <Pressable
                          key={index}
                          style={({ pressed }) => [
                            pinStyles.key,
                            pressed ? pinStyles.keyPressed : null,
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setConfirmSecret((s) => s.slice(0, -1));
                          }}
                        >
                          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2zm-3 5l-5 5m0-5l5 5"
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </Svg>
                        </Pressable>
                      );
                    }
                    return (
                      <Pressable
                        key={index}
                        style={({ pressed }) => [
                          pinStyles.key,
                          pressed ? pinStyles.keyPressed : null,
                        ]}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setConfirmSecret((s) => s + digit);
                        }}
                      >
                        <Text style={pinStyles.keyText}>{digit}</Text>
                      </Pressable>
                    );
                  }
                )}
              </View>

              {confirmSecret.length >= 4 ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.continueButton,
                    pressed ? styles.continueButtonPressed : null,
                  ]}
                  onPress={() => {
                    if (confirmSecret === secret) {
                      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      handleCreateWallet(pin, secret);
                    } else {
                      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      setError('Secrets do not match');
                      setConfirmSecret('');
                    }
                  }}
                >
                  <Text style={styles.continueButtonText}>CONFIRM</Text>
                </Pressable>
              ) : null}

              {error ? (
                <Animated.View entering={FadeIn} style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}
            </View>
          </Animated.View>
        );

      case 'processing':
        return (
          <Animated.View
            key="processing"
            entering={FadeIn.duration(300)}
            style={[styles.stepContent, styles.centeredContent]}
          >
            <Animated.View style={pulseStyle}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.processingTitle}>GENERATING WALLET</Text>
            <Text style={styles.processingSubtitle}>
              Splitting master secret into shares...
            </Text>
          </Animated.View>
        );

      case 'recovery':
        return (
          <Animated.View
            key="recovery"
            entering={FadeIn.duration(400)}
            style={[styles.stepContent, styles.centeredContent]}
          >
            <DownloadIcon />
            <Text style={styles.recoveryTitle}>BACKUP RECOVERY FILE</Text>
            <Text style={styles.recoverySubtitle}>
              Save this file somewhere safe. You will need it to recover your wallet if you lose this device.
            </Text>

            <View style={styles.walletInfoBox}>
              <Text style={styles.walletInfoLabel}>WALLET ADDRESS</Text>
              <Text style={styles.walletInfoValue}>{truncatedAddress}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.exportButton,
                pressed ? styles.exportButtonPressed : null,
                recoveryExported ? styles.exportButtonDone : null,
              ]}
              onPress={handleExportRecovery}
              disabled={recoveryExported}
            >
              <Text style={styles.exportButtonText}>
                {recoveryExported ? 'FILE SAVED' : 'EXPORT RECOVERY FILE'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.skipButton,
                pressed ? styles.skipButtonPressed : null,
              ]}
              onPress={recoveryExported ? finalizeSetup : handleSkipRecovery}
            >
              <Text style={styles.skipButtonText}>
                {recoveryExported ? 'CONTINUE' : 'SKIP FOR NOW'}
              </Text>
            </Pressable>
          </Animated.View>
        );

      case 'success':
        return (
          <Animated.View
            key="success"
            entering={FadeIn.duration(500)}
            style={[styles.stepContent, styles.centeredContent]}
          >
            <CheckCircleIcon />
            <Text style={styles.successTitle}>WALLET CREATED</Text>
            <Text style={styles.successSubtitle}>
              Your V2 wallet is ready. Tap your NFC card anytime to unlock.
            </Text>

            <View style={styles.successInfoBox}>
              <Text style={styles.successInfoLabel}>ADDRESS</Text>
              <Text style={styles.successInfoValue} selectable>
                {walletAddress}
              </Text>
            </View>

            <View style={styles.successInfoBox}>
              <Text style={styles.successInfoLabel}>SECURITY</Text>
              <Text style={styles.successInfoValue}>
                {useSecret ? 'NFC + PIN + SECRET' : 'NFC + PIN'}
              </Text>
            </View>

            <View style={styles.successInfoBox}>
              <Text style={styles.successInfoLabel}>RECOVERY</Text>
              <Text style={[styles.successInfoValue, !recoveryExported ? styles.warningText : null]}>
                {recoveryExported ? 'Backup saved' : 'No backup (at risk)'}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.goButton,
                pressed ? styles.goButtonPressed : null,
              ]}
              onPress={handleGoToWallet}
            >
              <Text style={styles.goButtonText}>GO TO HOME</Text>
            </Pressable>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  const showBackButton =
    step !== 'processing' && step !== 'success' && step !== 'recovery';

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.lg }]}>
      {showBackButton ? (
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="#FFFFFF"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>NEW WALLET</Text>
        <StepIndicator currentStep={getStepNumber()} totalSteps={5} />
      </View>

      {renderContent()}

      <View style={{ height: insets.bottom + Spacing.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: Spacing.lg,
    zIndex: 10,
    padding: Spacing.sm,
    marginTop: 50,
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: '#666666',
    letterSpacing: 3,
    marginBottom: Spacing.lg,
  },
  stepContent: {
    flex: 1,
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.dark.error,
  },
  promptTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: Spacing['2xl'],
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  promptSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['4xl'],
    paddingHorizontal: Spacing.lg,
  },
  promptButtons: {
    width: '100%',
    gap: Spacing.md,
  },
  promptButton: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  promptButtonPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  promptButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333333',
  },
  promptButtonPressed: {
    opacity: 0.6,
  },
  promptButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  promptButtonTextSecondary: {
    color: '#666666',
  },
  secretInputContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secretDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginBottom: Spacing['3xl'],
    paddingHorizontal: Spacing['2xl'],
  },
  secretDots: {
    fontFamily: Fonts.body,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 6,
  },
  secretCursor: {
    width: 2,
    height: 28,
    backgroundColor: '#FFFFFF',
    marginLeft: 2,
  },
  secretKeypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 270,
    justifyContent: 'center',
    gap: 12,
  },
  continueButton: {
    marginTop: Spacing['2xl'],
    height: 48,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 4,
  },
  continueButtonPressed: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  processingTitle: {
    fontFamily: Fonts.heading,
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: Spacing['3xl'],
    letterSpacing: 1,
  },
  processingSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#666666',
    marginTop: Spacing.md,
  },
  recoveryTitle: {
    fontFamily: Fonts.heading,
    fontSize: 22,
    color: '#FFFFFF',
    marginTop: Spacing['2xl'],
    letterSpacing: 1,
  },
  recoverySubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.md,
    marginBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
  },
  walletInfoBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: '#222222',
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  walletInfoLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: '#555555',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  walletInfoValue: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  exportButton: {
    width: '100%',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    marginBottom: Spacing.md,
  },
  exportButtonPressed: {
    opacity: 0.6,
  },
  exportButtonDone: {
    borderColor: '#444444',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  exportButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  skipButton: {
    padding: Spacing.md,
  },
  skipButtonPressed: {
    opacity: 0.5,
  },
  skipButtonText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#555555',
    letterSpacing: 1,
  },
  successTitle: {
    fontFamily: Fonts.heading,
    fontSize: 24,
    color: '#FFFFFF',
    marginTop: Spacing['2xl'],
    letterSpacing: 1,
  },
  successSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing.md,
    marginBottom: Spacing['3xl'],
  },
  successInfoBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: '#222222',
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  successInfoLabel: {
    fontFamily: Fonts.heading,
    fontSize: 10,
    color: '#555555',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  successInfoValue: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  warningText: {
    color: Colors.dark.warning,
  },
  goButton: {
    width: '100%',
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    marginTop: Spacing['2xl'],
  },
  goButtonPressed: {
    opacity: 0.6,
  },
  goButtonText: {
    fontFamily: Fonts.heading,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
});
