import React, { useState, useCallback } from "react";
import { View, StyleSheet, Platform, Pressable, Text } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";

import { Colors, Spacing, Fonts, Typography, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useWebRTC } from "@/context/WebRTCContext";
import { deriveSolanaAddress } from "@/lib/crypto";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "PINInput">;
type RouteProps = RouteProp<RootStackParamList, "PINInput">;

const PIN_LENGTH = 6;
const KEYPAD_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"];

export default function PINInputScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { sendWalletData, setWalletAddress, status: connectionStatus } = useWebRTC();
  
  const shakeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(1);

  const dotsAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeAnim.value },
      { scale: scaleAnim.value },
    ],
  }));

  const deriveWalletAddress = (nfcData: string, pinCode: string): string => {
    return deriveSolanaAddress(nfcData, pinCode);
  };

  const handleKeyPress = useCallback(async (key: string) => {
    if (isProcessing) return;

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (key === "delete") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      setIsProcessing(true);
      
      scaleAnim.value = withSequence(
        withSpring(1.1, { damping: 15 }),
        withSpring(1, { damping: 15 })
      );

      try {
        const walletAddress = deriveWalletAddress(
          route.params.nfcData,
          newPin
        );

        if (connectionStatus !== "connected") {
          throw new Error("Dashboard not connected");
        }

        const sent = sendWalletData(newPin);
        if (!sent) {
          throw new Error("Failed to send encrypted data");
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
      }
    }
  }, [pin, isProcessing, navigation, route.params, connectionStatus, sendWalletData, setWalletAddress]);

  const renderDot = (index: number) => {
    const isFilled = index < pin.length;
    return (
      <View
        key={index}
        style={[
          styles.dot,
          isFilled && styles.dotFilled,
        ]}
      />
    );
  };

  const renderKey = (key: string, index: number) => {
    if (key === "") {
      return <View key={`empty-${index}`} style={styles.keyEmpty} />;
    }

    if (key === "delete") {
      return (
        <Pressable
          key={key}
          style={({ pressed }) => [
            styles.key,
            pressed && styles.keyPressed,
          ]}
          onPress={() => handleKeyPress(key)}
          testID="button-delete"
        >
          <Feather name="delete" size={24} color={Colors.dark.text} />
        </Pressable>
      );
    }

    return (
      <Pressable
        key={key}
        style={({ pressed }) => [
          styles.key,
          pressed && styles.keyPressed,
        ]}
        onPress={() => handleKeyPress(key)}
        testID={`button-key-${key}`}
      >
        <Text style={styles.keyText}>{key}</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: headerHeight + Spacing["5xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Feather name="lock" size={32} color={Colors.dark.primary} />
          <Text style={styles.title}>Enter Your PIN</Text>
          <Text style={styles.subtitle}>
            Enter your 6-digit security PIN
          </Text>
        </View>

        <Animated.View style={[styles.dotsContainer, dotsAnimStyle]}>
          {Array.from({ length: PIN_LENGTH }).map((_, index) => renderDot(index))}
        </Animated.View>

        <View style={styles.keypad}>
          {KEYPAD_NUMBERS.map((key, index) => renderKey(key, index))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          PIN is combined with your card to derive the wallet
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
    paddingHorizontal: Spacing["2xl"],
  },
  content: {
    flex: 1,
    alignItems: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: Typography.heading.fontSize,
    color: Colors.dark.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing["4xl"],
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.dark.primary,
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: Colors.dark.primary,
    ...Shadows.glow,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    maxWidth: 300,
    gap: Spacing.md,
  },
  key: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  keyPressed: {
    backgroundColor: Colors.dark.primary,
    borderColor: Colors.dark.primary,
  },
  keyEmpty: {
    width: 80,
    height: 80,
  },
  keyText: {
    fontFamily: Fonts.heading,
    fontSize: 28,
    color: Colors.dark.text,
  },
  footer: {
    alignItems: "center",
    paddingTop: Spacing.lg,
  },
  footerText: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: Colors.dark.textSecondary,
    textAlign: "center",
  },
});
