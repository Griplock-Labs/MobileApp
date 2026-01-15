import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, Platform, Pressable, Text } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import Svg, { Rect, Path } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { Colors, Spacing, Fonts, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";
import { deriveSolanaAddress } from "@/lib/crypto";
import ScreenHeader from "@/components/ScreenHeader";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PINInput">;
type RouteProps = RouteProp<RootStackParamList, "PINInput">;

const PIN_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DELAYS: Record<number, number> = {
  2: 5,
  3: 15,
  4: 30,
  5: 60,
};
const KEYPAD_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "backspace"];

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
    marginBottom: Spacing["2xl"],
  },
});

export default function PINInputScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const [pin, setPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { sendWalletAddress, setWalletAddress, status: connectionStatus, cleanup, notifyAttemptUpdate } = useWebRTC();
  
  const shakeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
      }
    };
  }, []);

  const startLockout = useCallback((seconds: number) => {
    setIsLockedOut(true);
    setLockoutRemaining(seconds);
    
    if (lockoutTimerRef.current) {
      clearInterval(lockoutTimerRef.current);
    }
    
    lockoutTimerRef.current = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          if (lockoutTimerRef.current) {
            clearInterval(lockoutTimerRef.current);
            lockoutTimerRef.current = null;
          }
          setIsLockedOut(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const dotsAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeAnim.value },
      { scale: scaleAnim.value },
    ],
  }));

  const deriveWalletAddress = (nfcData: string, pinCode: string): string => {
    return deriveSolanaAddress(nfcData, pinCode);
  };

  const handleSessionReset = useCallback(() => {
    cleanup();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [cleanup, navigation]);

  const handleKeyPress = useCallback(async (key: string) => {
    if (isProcessing || isLockedOut || attempts >= MAX_ATTEMPTS) return;

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (key === "backspace") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setIsProcessing(true);
      
      console.log('[PIN] 6 digits entered, processing...');
      console.log('[PIN] Route params:', JSON.stringify(route.params));
      console.log('[PIN] Connection status:', connectionStatus);
      console.log('[PIN] Attempts:', attempts);
      
      scaleAnim.value = withSequence(
        withSpring(1.1, { damping: 15 }),
        withSpring(1, { damping: 15 })
      );

      try {
        if (!route.params?.nfcData || !route.params?.sessionId) {
          console.log('[PIN] ERROR: Missing NFC data or sessionId');
          throw new Error("Missing required NFC data");
        }

        if (connectionStatus !== "connected") {
          console.log('[PIN] ERROR: Not connected, status:', connectionStatus);
          throw new Error("Dashboard not connected");
        }

        console.log('[PIN] Deriving wallet address...');
        const walletAddress = deriveWalletAddress(route.params.nfcData, newPin);
        console.log('[PIN] Wallet derived:', walletAddress);

        console.log('[PIN] Sending wallet address to dashboard...');
        const sent = sendWalletAddress(walletAddress);
        console.log('[PIN] Send result:', sent);
        if (!sent) {
          throw new Error("Failed to send wallet address");
        }

        setWalletAddress(walletAddress);

        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        navigation.replace("Success", {
          sessionId: route.params.sessionId,
          walletAddress,
        });
      } catch (error) {
        console.log('[PIN] CATCH ERROR:', error instanceof Error ? error.message : error);
        
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        shakeAnim.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
        
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        
        setPin("");
        setIsProcessing(false);
        
        const isHardLockout = newAttempts >= MAX_ATTEMPTS;
        notifyAttemptUpdate(newAttempts, MAX_ATTEMPTS, isHardLockout);
        
        const lockoutDelay = LOCKOUT_DELAYS[newAttempts] || 0;
        if (lockoutDelay > 0) {
          startLockout(lockoutDelay);
        }
      }
    }
  }, [pin, isProcessing, isLockedOut, attempts, navigation, route.params, connectionStatus, sendWalletAddress, setWalletAddress, shakeAnim, scaleAnim, startLockout, notifyAttemptUpdate]);

  const renderPinBox = (index: number) => {
    const isFilled = index < pin.length;
    return (
      <View
        key={index}
        style={[
          styles.pinBox,
          isFilled && styles.pinBoxFilled,
        ]}
      />
    );
  };

  const renderKey = (key: string, index: number) => {
    if (key === "") {
      return <View key={`empty-${index}`} style={styles.keyEmpty} />;
    }

    const displayText = key === "backspace" ? "<" : key;
    const testID = key === "backspace" ? "button-delete" : `button-key-${key}`;

    return (
      <Pressable
        key={key}
        style={styles.keyWrapper}
        onPress={() => handleKeyPress(key)}
        testID={testID}
      >
        {({ pressed }) => (
          <View style={styles.keyContainer}>
            <Svg width={70} height={70} viewBox="0 0 70 70" style={styles.keySvg}>
              <Rect
                x={4.2}
                y={4.2}
                width={61.6}
                height={61.6}
                fill="white"
                fillOpacity={pressed ? 0.2 : 0.1}
              />
              <Rect
                x={0.35}
                y={0.35}
                width={69.3}
                height={69.3}
                stroke="#484848"
                strokeWidth={0.7}
                fill="transparent"
              />
            </Svg>
            <Text style={styles.keyText}>{displayText}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  if (attempts >= MAX_ATTEMPTS && !isLockedOut) {
    return (
      <View style={styles.container}>
        <ScreenHeader rightText="Locked" />
        <View style={styles.content}>
          <LogoFill filledCount={0} />
          <View style={styles.titleSection}>
            <Text style={styles.title}>SESSION LOCKED</Text>
            <Text style={styles.subtitle}>Too many failed attempts</Text>
            <Text style={styles.lockoutText}>
              Please start a new session from the dashboard
            </Text>
          </View>
          <Pressable
            style={styles.resetButton}
            onPress={handleSessionReset}
            testID="button-reset-session"
          >
            <Text style={styles.resetButtonText}>Start New Session</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader rightText="Enter PIN" />

      <View style={styles.content}>
        <LogoFill filledCount={pin.length} />

        <View style={styles.titleSection}>
          <Text style={styles.title}>ENTER YOUR PIN</Text>
          <Text style={styles.subtitle}>Enter your 6 Digit Secure PIN</Text>
          
          {attempts > 0 ? (
            <Text style={styles.attemptsText}>
              {MAX_ATTEMPTS - attempts} attempts remaining
            </Text>
          ) : null}
          
          {isLockedOut ? (
            <Text style={styles.lockoutText}>
              Try again in {lockoutRemaining}s
            </Text>
          ) : null}
        </View>

        <View style={[styles.keypad, (isLockedOut || isProcessing) && styles.keypadDisabled]}>
          {KEYPAD_NUMBERS.map((key, index) => renderKey(key, index))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  title: {
    fontFamily: Fonts.astroSpace,
    fontSize: 24,
    color: Colors.dark.text,
    letterSpacing: 2,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: "rgba(255, 255, 255, 0.5)",
  },
  pinContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["4xl"],
  },
  pinBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#4A4A4A",
  },
  pinBoxFilled: {
    backgroundColor: Colors.dark.text,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    maxWidth: 310,
    gap: 32,
  },
  keyWrapper: {
    width: 70,
    height: 70,
  },
  keyContainer: {
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  keySvg: {
    position: "absolute",
  },
  keyEmpty: {
    width: 70,
    height: 70,
  },
  keyText: {
    fontFamily: Fonts.body,
    fontSize: 20,
    color: Colors.dark.text,
  },
  attemptsText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: "#FF6B6B",
    marginTop: Spacing.sm,
  },
  lockoutText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: "#FF6B6B",
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  keypadDisabled: {
    opacity: 0.5,
  },
  resetButton: {
    backgroundColor: "#A4BAD2",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: 8,
    marginTop: Spacing["2xl"],
  },
  resetButtonText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    color: "#0A0A0A",
    fontWeight: "600",
  },
});
