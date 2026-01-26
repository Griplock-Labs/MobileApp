import React, { useEffect } from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Colors, Fonts, Spacing } from "@/constants/theme";

interface WalletCardProps {
  walletName: string;
  publicBalance: number;
  privateBalance: number;
  onPress?: () => void;
  onReceive?: () => void;
  onReceivePrivately?: () => void;
  onSwipeNext?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onPrivateBalanceInfo?: () => void;
}

const theme = Colors.dark;

function CyberpunkCardBackground({ showArrow = false }: { showArrow?: boolean }) {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 380 179"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Path
        d="M110.25 0.25L101.25 20.236H7.75L0.25 29.5017V165.759L14.8269 178.25H305.75L317.25 158.889H370.75L379.25 149.621L379.25 20.236L363.111 0.25H110.25Z"
        stroke="white"
        strokeOpacity={0.5}
        strokeWidth={0.5}
      />
      <Path
        d="M113.25 3.87409L103.75 24.469H9.74262L4.25 31.3339V163.641L17.7319 174.25H303.847L315.313 155.162H369.759L376.25 148.039L376.25 21.9731L361.27 3.25L113.25 3.87409Z"
        fill="url(#cardGradient)"
      />
      {showArrow ? (
        <Path
          d="M324.25 170.75H365.25M365.25 170.75L361.023 167.25M365.25 170.75L361.023 174.25"
          stroke="white"
          strokeLinecap="round"
        />
      ) : null}
      <Defs>
        <LinearGradient
          id="cardGradient"
          x1="190.25"
          y1="3.25"
          x2="190.25"
          y2="174.25"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#131314" />
          <Stop offset="1" stopColor="#232527" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}

function ReceiveButtonShape() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 115 28"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Path
        d="M0 20.2637V0.302734H104.039L114.927 10.3983V28.1272H11.4927L0 20.2637Z"
        fill="white"
      />
    </Svg>
  );
}

function SendButtonShape() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 115 28"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Path
        d="M0 19.6589V0.302734H104.039L114.927 10.3983V28.1272H10.888L0 19.6589Z"
        fill="rgba(255,255,255,0.15)"
        stroke="white"
        strokeWidth={0.6}
      />
    </Svg>
  );
}

function InfoIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={2}
      />
      <Path
        d="M12 16V12M12 8H12.01"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (spinning) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 200 });
    }
  }, [spinning]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path
          d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C15.3019 3 18.1885 4.77814 19.7545 7.42909"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Path
          d="M21 3V8H16"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

export default function WalletCard({
  walletName,
  publicBalance,
  privateBalance,
  onPress,
  onReceive,
  onReceivePrivately,
  onSwipeNext,
  onRefresh,
  refreshing,
  onPrivateBalanceInfo,
}: WalletCardProps) {
  const formatSOL = (amount: number) => {
    return `${amount.toFixed(4)} SOL`;
  };

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <CyberpunkCardBackground showArrow={!!onSwipeNext} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.walletName}>{walletName}</Text>
        </View>

        {onRefresh ? (
          <Pressable 
            style={[styles.refreshButton, refreshing && styles.refreshButtonSpinning]} 
            onPress={onRefresh}
            disabled={refreshing}
          >
            <RefreshIcon spinning={refreshing} />
          </Pressable>
        ) : null}

        <View style={styles.balanceRow}>
          <View style={styles.balanceColumn}>
            <Text style={styles.balanceLabel}>Public Balance</Text>
            <Text style={styles.balanceAmount}>{formatSOL(publicBalance)}</Text>
          </View>
          <View style={styles.balanceColumn}>
            <Pressable style={styles.balanceLabelRow} onPress={onPrivateBalanceInfo}>
              <Text style={styles.balanceLabel}>Private Balance</Text>
              {onPrivateBalanceInfo ? (
                <View style={styles.infoIconWrapper}>
                  <InfoIcon />
                </View>
              ) : null}
            </Pressable>
            <Text style={styles.balanceAmount}>{formatSOL(privateBalance)}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionButton} onPress={onReceive}>
            <ReceiveButtonShape />
            <Text style={styles.actionButtonText}>Receive</Text>
          </Pressable>
          <Pressable style={styles.actionButtonOutline} onPress={onReceivePrivately}>
            <SendButtonShape />
            <Text style={styles.actionButtonOutlineText}>Receive Privately</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 380 / 179,
    position: "relative",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 14,
  },
  header: {
    position: "absolute",
    top: 1,
    left: 12,
  },
  refreshButton: {
    position: "absolute",
    top: 8,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButtonSpinning: {
    opacity: 0.5,
  },
  walletName: {
    fontFamily: Fonts.geistMono,
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  balanceColumn: {
    flex: 1,
  },
  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  balanceLabel: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 4,
  },
  infoIconWrapper: {
    marginBottom: 4,
    opacity: 0.8,
  },
  balanceAmount: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 16,
    color: theme.text,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: "auto",
  },
  actionButton: {
    width: 115,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  actionButtonText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: "#000000",
  },
  actionButtonOutline: {
    width: 115,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  actionButtonOutlineText: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
  },
});
