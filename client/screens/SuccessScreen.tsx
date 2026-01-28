import React, { useEffect } from "react";
import { View, StyleSheet, Text, ImageBackground, Image } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";

import { Colors, Spacing, Fonts, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import ScreenHeader from "@/components/ScreenHeader";
import CyberpunkInput from "@/components/CyberpunkInput";
import CyberpunkButton from "@/components/CyberpunkButton";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Success">;
type RouteProps = RouteProp<RootStackParamList, "Success">;

export default function SuccessScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  
  const { actionType, amount, signature } = route.params || {};
  
  const scaleAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(0);
  
  useEffect(() => {
    scaleAnim.value = withSpring(1, { damping: 12, stiffness: 100 });
    opacityAnim.value = withDelay(200, withSpring(1));
  }, []);
  
  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };
  
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));
  
  const textStyle = useAnimatedStyle(() => ({
    opacity: opacityAnim.value,
  }));
  
  const title = actionType === 'shield' ? 'FUND SHIELDED' : actionType === 'unshield' ? 'FUND UNSHIELDED' : 'TRANSACTION COMPLETE';
  const subtitle = actionType === 'shield' ? 'Successfully shielded' : actionType === 'unshield' ? 'Successfully unshielded' : 'Transaction completed';
  
  return (
    <ImageBackground
      source={require("../../assets/images/success-bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <ScreenHeader rightText="Success" />
      
      <View style={styles.content}>
        <Animated.View style={[styles.headerSection, textStyle]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          
          {amount !== undefined ? (
            <Text style={styles.amountValue}>{amount} SOL</Text>
          ) : null}
        </Animated.View>
        
        <Animated.View style={[styles.logoContainer, iconStyle]}>
          <Image
            source={require("../../assets/images/griplock-logo-green.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
        
        <Animated.View style={[styles.bottomSection, { paddingBottom: insets.bottom + Spacing["2xl"] }, textStyle]}>
          {signature ? (
            <View style={styles.txContainer}>
              <Text style={styles.txLabel}>Transaction ID</Text>
              <CyberpunkInput
                value={signature}
                truncate={true}
              />
            </View>
          ) : null}
          
          <View style={styles.buttonContainer}>
            <CyberpunkButton
              title="Back home"
              onPress={handleContinue}
              width={180}
            />
          </View>
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundRoot,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  headerSection: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
  },
  title: {
    fontFamily: Fonts.astroSpace,
    fontSize: 20,
    color: Colors.dark.text,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: Typography.caption.fontSize,
    color: "#4ADE80",
    marginBottom: Spacing.xl,
  },
  amountValue: {
    fontFamily: Fonts.circular.bold,
    fontSize: 28,
    color: Colors.dark.text,
  },
  logoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  bottomSection: {
    alignItems: "center",
  },
  txContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  txLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
  },
  buttonContainer: {
    alignItems: "center",
  },
});
