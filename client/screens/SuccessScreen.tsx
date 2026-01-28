import React, { useEffect } from "react";
import { View, StyleSheet, Text, ImageBackground } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

import { Colors, Spacing, Fonts, Typography } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import ScreenHeader from "@/components/ScreenHeader";
import CyberpunkInput from "@/components/CyberpunkInput";
import CyberpunkButton from "@/components/CyberpunkButton";

function GriplockLogoGreen() {
  return (
    <Svg width={120} height={120} viewBox="0 0 50 50" fill="none">
      <Path
        d="M16.585 8.07031C16.5834 8.07109 16.5816 8.07149 16.5801 8.07227L24.8525 16.3379L20.6055 20.5801L11.6445 11.6279C8.2177 15.0498 6.09668 19.7769 6.09668 25C6.09668 35.4429 14.5701 43.9082 25.0225 43.9082C32.2135 43.9082 38.4664 39.901 41.6689 34H22.7705V28H49.8652C48.3818 40.3926 37.8258 50 25.0225 50C11.2029 50 4.75598e-07 38.8071 0 25C0 15.9178 4.84766 7.96711 12.0986 3.58887L16.585 8.07031ZM47.3682 13.7402C48.8669 16.7035 49.794 20.005 50.001 23.5H37.8027L47.3682 13.7402ZM41.2178 5.94336C42.5805 7.10061 43.8183 8.40072 44.9062 9.82129L34.5459 20.3896L30.7627 16.6094L41.2178 5.94336ZM32.2197 1.04883C34.0754 1.60468 35.8403 2.37117 37.4873 3.31836L27.5771 13.4277L23.792 9.64648L32.2197 1.04883ZM25.0225 0C25.6463 9.07155e-06 26.2656 0.0215703 26.8779 0.0664062L20.6074 6.46387L15.8662 1.72656C18.7019 0.612097 21.7908 3.73014e-05 25.0225 0Z"
        fill="url(#paint0_linear_success)"
      />
      <Defs>
        <LinearGradient
          id="paint0_linear_success"
          x1="25.0005"
          y1="0"
          x2="25.0005"
          y2="50"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#4ADE80" />
          <Stop offset="1" stopColor="#22C55E" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

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
          <GriplockLogoGreen />
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
