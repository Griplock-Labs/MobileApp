import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { Colors, Spacing, Fonts } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { useWebRTC } from '@/context/WebRTCContext';
import {
  getDeviceObject,
  getDeviceKey,
  getRecoveryData,
  deleteWallet,
} from '@/lib/v2/wallet-store';
import { unlockWithPinAndDevice } from '@/lib/v2/shares';
import { Keypair } from '@solana/web3.js';
import type { WalletProfile } from '@/lib/v2/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type V2UnlockRouteProp = RouteProp<RootStackParamList, 'V2Unlock'>;

function LogoFill({ filledCount }: { filledCount: number }) {
  return (
    <View style={logoStyles.container}>
      <Svg width={110} height={110} viewBox="0 0 110 110">
        <Path d="M36.1514 17.7041L36.1416 17.71L36.3164 17.8848L54.3721 35.9414L45.291 45.0225L25.5928 25.3242L25.4668 25.4502C17.902 33.011 13.2227 43.4594 13.2227 55C13.2227 78.0731 31.9269 96.7773 55 96.7773C70.8742 96.7773 84.6794 87.9236 91.749 74.8857L91.8926 74.6221H50.2285V61.7783H109.403C106.064 88.8569 82.9817 109.821 55 109.821C24.723 109.821 0.178721 85.277 0.178711 55C0.178719 35.1336 10.7464 17.7362 26.5674 8.12012L36.1514 17.7041ZM104.07 30.5342C107.26 36.9203 109.241 44.0157 109.711 51.5215H83.5166L104.07 30.5342ZM90.6074 13.3184C93.5048 15.796 96.1413 18.5696 98.4688 21.5938L75.9326 44.6045L67.8662 36.5381L90.6074 13.3184ZM70.8711 2.51172C74.8232 3.70515 78.5865 5.33347 82.1064 7.33984L60.6133 29.2852L52.5469 21.2188L70.8711 2.51172ZM55 0.178711C56.2356 0.178714 57.4616 0.221342 58.6768 0.301758L45.2939 13.9658L35.1943 3.86719C41.3372 1.48617 48.0156 0.178726 55 0.178711Z" stroke="rgba(255,255,255,0.3)" strokeWidth={0.357143} fill="transparent" />
        {filledCount >= 1 ? (
          <Path d="M36.4537 17.7536C36.4501 17.7554 36.4465 17.7571 36.4429 17.7589L54.6254 35.9418L45.2916 45.2756L25.5929 25.5769C18.0603 33.1056 13.4009 43.5088 13.4009 55.0001C13.4009 77.9745 32.0255 96.5992 55 96.5992C70.7977 96.5992 84.5379 87.7928 91.581 74.8215H106.318C98.3638 95.4023 78.3874 110 55 110C24.6243 110 1.04951e-05 85.3757 0 55.0001C7.74953e-06 35.0187 10.6555 17.5265 26.5939 7.89453L36.4537 17.7536Z" fill="white" />
        ) : null}
        {filledCount >= 2 ? (
          <Path d="M109.608 61.6006C109.057 66.2068 107.936 70.6378 106.319 74.8218H91.5819C91.5857 74.8148 91.5896 74.8077 91.5934 74.8006H50.0508V61.6006H109.608Z" fill="white" />
        ) : null}
        {filledCount >= 3 ? (
          <Path d="M104.118 30.2305C107.411 36.7489 109.446 44.0118 109.901 51.6998H83.0908L104.118 30.2305Z" fill="white" />
        ) : null}
        {filledCount >= 4 ? (
          <Path d="M90.5989 13.0742C93.5948 15.6206 96.3147 18.4821 98.7065 21.608L75.9344 44.8585L67.6162 36.5403L90.5989 13.0742Z" fill="white" />
        ) : null}
        {filledCount >= 5 ? (
          <Path d="M70.8198 2.30957C74.8984 3.53236 78.7774 5.21652 82.3973 7.30015L60.6154 29.54L52.2969 21.2214L70.8198 2.30957Z" fill="white" />
        ) : null}
        {filledCount >= 6 ? (
          <Path d="M54.9999 0C56.3714 2.84221e-06 57.7315 0.0499106 59.0778 0.148577L45.2957 14.2205L34.874 3.79883C41.1072 1.34679 47.8963 1.49269e-05 54.9999 0Z" fill="white" />
        ) : null}
      </Svg>
    </View>
  );
}

const logoStyles = StyleSheet.create({
  container: {
    width: 110,
    height: 110,
    marginBottom: Spacing['3xl'],
    marginTop: -Spacing['4xl'],
  },
});

export default function V2UnlockScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<V2UnlockRouteProp>();
  const { nfcUid, walletProfile, shieldAction, privateSendAction, sendAction } = route.params;
  const { setWalletAddress, setSolanaKeypair } = useWebRTC();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const shakeAnim = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));

  const triggerShake = useCallback(() => {
    shakeAnim.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [shakeAnim]);

  const handleUnlock = useCallback(async (enteredPin: string) => {
    setIsUnlocking(true);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));

      const recoveryData = await getRecoveryData(walletProfile.walletId);
      if (!recoveryData) {
        throw new Error('Recovery data not found on device');
      }

      const deviceObject = await getDeviceObject(walletProfile.walletId);
      if (!deviceObject) {
        throw new Error('Device data not found');
      }

      const deviceKey = await getDeviceKey(walletProfile.walletId);
      if (!deviceKey) {
        throw new Error('Device key not found');
      }

      const secret = walletProfile.authPolicy.secretRequired ? undefined : undefined;

      const result = unlockWithPinAndDevice(
        recoveryData,
        deviceObject,
        deviceKey,
        enteredPin,
        secret
      );

      if (result.address !== walletProfile.address) {
        throw new Error('Wallet address mismatch - wrong PIN');
      }

      console.log('[V2Unlock] Successfully reconstructed wallet:', result.address);

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const keypair = Keypair.fromSeed(result.masterSecret);
      result.masterSecret.fill(0);

      if (shieldAction) {
        if (result.address !== shieldAction.walletAddress) {
          console.log('[V2Unlock] Wallet mismatch for shield action');
          navigation.goBack();
          return;
        }
        navigation.replace('Processing', {
          actionType: shieldAction.type,
          amount: shieldAction.amount,
          source: 'public',
          keypairSecretKey: Array.from(keypair.secretKey),
          unsignedTx: shieldAction.unsignedTx,
          walletAddress: shieldAction.walletAddress,
        });
        return;
      }

      if (sendAction) {
        if (result.address !== sendAction.walletAddress) {
          console.log('[V2Unlock] Wallet mismatch for send action');
          navigation.goBack();
          return;
        }
        navigation.replace('Processing', {
          actionType: 'send',
          amount: sendAction.amount,
          recipient: sendAction.recipientAddress,
          keypairSecretKey: Array.from(keypair.secretKey),
          walletAddress: sendAction.walletAddress,
        });
        return;
      }

      if (privateSendAction) {
        if (result.address !== privateSendAction.walletAddress) {
          console.log('[V2Unlock] Wallet mismatch for private send action');
          navigation.goBack();
          return;
        }
        navigation.replace('Processing', {
          actionType: 'privateSend',
          amount: privateSendAction.amount,
          source: privateSendAction.source,
          recipient: privateSendAction.recipientAddress,
          keypairSecretKey: Array.from(keypair.secretKey),
          walletAddress: privateSendAction.walletAddress,
        });
        return;
      }

      setSolanaKeypair(keypair);
      setWalletAddress?.(result.address);
      navigation.replace('Wallet');
    } catch (err: any) {
      console.error('[V2Unlock] Unlock failed:', err);
      setIsUnlocking(false);

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      triggerShake();

      if (newAttempts >= 5) {
        setError('Too many attempts. Please wait.');
        setTimeout(() => {
          setAttempts(0);
          setError('');
        }, 30000);
      } else {
        setError('Wrong PIN. Try again.');
      }
      setPin('');
    }
  }, [walletProfile, shieldAction, sendAction, privateSendAction, attempts, navigation, setWalletAddress, setSolanaKeypair, triggerShake]);

  const handlePress = useCallback(
    (digit: string) => {
      if (pin.length >= 6 || isUnlocking || attempts >= 5) return;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        setTimeout(() => handleUnlock(newPin), 200);
      }
    },
    [pin, isUnlocking, attempts, handleUnlock]
  );

  const handleDelete = useCallback(() => {
    if (pin.length > 0 && !isUnlocking) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setPin(pin.slice(0, -1));
    }
  }, [pin, isUnlocking]);

  const handleDeleteWallet = useCallback(() => {
    Alert.alert(
      'Delete Wallet?',
      'This will remove wallet data from this device. You can re-setup by tapping NFC again. Recovery file backup is recommended first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWallet(walletProfile.walletId, walletProfile.nfcUidHash);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            } catch (err) {
              console.error('[V2Unlock] Delete wallet failed:', err);
              Alert.alert('Error', 'Failed to delete wallet data.');
            }
          },
        },
      ]
    );
  }, [walletProfile, navigation]);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.goBack();
  }, [navigation]);

  const truncatedAddress = walletProfile.address
    ? `${walletProfile.address.slice(0, 6)}...${walletProfile.address.slice(-4)}`
    : '';

  const isActionFlow = !!shieldAction || !!privateSendAction || !!sendAction;

  const KEYPAD_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'];

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} testID="button-back">
          <Svg width={19} height={9} viewBox="0 0 19 9" fill="none">
            <Path
              d="M18 4.5H1M1 4.5L4.5 1M1 4.5L4.5 8"
              stroke="white"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Text style={styles.headerTitle}>UNLOCK</Text>
        <Pressable onPress={handleDeleteWallet} style={styles.backButton} testID="button-delete-wallet">
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
              stroke="#666666"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Animated.View style={[styles.pinSection, shakeStyle]}>
          <LogoFill filledCount={pin.length} />

          <View style={styles.titleSection}>
            <Text style={styles.pinTitle}>ENTER YOUR PIN</Text>
            <Text style={styles.pinSubtitle}>Enter your 6 Digit Secure PIN</Text>
            {isActionFlow ? (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>
                  {shieldAction ? `${shieldAction.type === 'shield' ? 'SHIELD' : 'UNSHIELD'} ${shieldAction.amount} SOL` : null}
                  {sendAction ? `SEND ${sendAction.amount} SOL` : null}
                  {privateSendAction ? `PRIVATE SEND ${privateSendAction.amount} SOL` : null}
                </Text>
              </View>
            ) : null}
            {attempts > 0 ? (
              <Text style={styles.attemptsText}>
                {5 - attempts} attempts remaining
              </Text>
            ) : null}
          </View>

          {error ? (
            <Animated.View entering={FadeIn.duration(200)}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          {isUnlocking ? (
            <View style={styles.unlockingContainer}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.unlockingText}>Decrypting wallet...</Text>
            </View>
          ) : null}
        </Animated.View>

        <View style={[styles.keypad, attempts >= 5 ? styles.keypadDisabled : null]}>
        {KEYPAD_NUMBERS.map((key, index) => {
          if (key === '') {
            return <View key={`empty-${index}`} style={styles.keyEmpty} />;
          }

          const displayText = key === 'backspace' ? '<' : key;
          const testID = key === 'backspace' ? 'button-delete' : `button-pin-${key}`;

          return (
            <Pressable
              key={key}
              style={styles.keyWrapper}
              onPress={() => key === 'backspace' ? handleDelete() : handlePress(key)}
              testID={testID}
            >
              {({ pressed }) => (
                <View style={styles.keyContainer}>
                  <Svg width={62} height={62} viewBox="0 0 62 62" style={styles.keySvg}>
                    <Rect
                      x={3.72}
                      y={3.72}
                      width={54.56}
                      height={54.56}
                      fill="white"
                      fillOpacity={pressed ? 0.2 : 0.1}
                    />
                    <Rect
                      x={0.31}
                      y={0.31}
                      width={61.38}
                      height={61.38}
                      stroke="#484848"
                      strokeWidth={0.62}
                      fill="transparent"
                    />
                  </Svg>
                  <Text style={styles.keyText}>{displayText}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  pinSection: {
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  pinTitle: {
    fontFamily: Fonts.astroSpace,
    fontSize: 24,
    color: Colors.dark.text,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  pinSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  actionBadge: {
    backgroundColor: 'rgba(164, 186, 210, 0.15)',
    borderWidth: 1,
    borderColor: '#A4BAD2',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.md,
  },
  actionBadgeText: {
    fontFamily: Fonts.astroSpace,
    fontSize: 11,
    color: '#A4BAD2',
    letterSpacing: 1,
  },
  attemptsText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: '#FF6B6B',
    marginTop: Spacing.sm,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  unlockingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.lg,
  },
  unlockingText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#888888',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 270,
    gap: 16,
    marginBottom: Spacing['4xl'],
  },
  keypadDisabled: {
    opacity: 0.5,
  },
  keyWrapper: {
    width: 62,
    height: 62,
  },
  keyContainer: {
    width: 62,
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keySvg: {
    position: 'absolute',
  },
  keyEmpty: {
    width: 62,
    height: 62,
  },
  keyText: {
    fontFamily: Fonts.body,
    fontSize: 20,
    color: Colors.dark.text,
  },
});
