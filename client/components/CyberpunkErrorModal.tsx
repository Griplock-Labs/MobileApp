import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Text,
  Dimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { Fonts, Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 24, 377);
const MODAL_HEIGHT = 320;
const CORNER_HEIGHT = 100;
const CORNER_CUT = 25;

interface CyberpunkErrorModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onRetry: () => void;
  cancelText?: string;
  retryText?: string;
}

function TopCorner() {
  return (
    <View style={styles.cornerContainer}>
      <Svg
        width="100%"
        height={CORNER_HEIGHT}
        viewBox="0 0 377 100"
        preserveAspectRatio="none"
      >
        <Path
          d="M0.5 25V99.5H376.5V25L351 0.5H26L0.5 25Z"
          fill="black"
        />
        <Path
          d="M0.5 99.5V25L26 0.5H351L376.5 25V99.5"
          stroke="#787878"
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

function BottomCorner() {
  return (
    <View style={styles.cornerContainer}>
      <Svg
        width="100%"
        height={CORNER_HEIGHT}
        viewBox="0 0 377 100"
        preserveAspectRatio="none"
      >
        <Path
          d="M376.5 75V0.5H0.5V75L26 99.5H351L376.5 75Z"
          fill="black"
        />
        <Path
          d="M376.5 0.5V75L351 99.5H26L0.5 75V0.5"
          stroke="#787878"
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

function MiddleSection() {
  return (
    <View style={styles.middleSection}>
      <View style={styles.leftBorder} />
      <View style={styles.rightBorder} />
    </View>
  );
}

function TopLeftAccent() {
  return (
    <View style={styles.topLeftAccent}>
      <Svg width={50} height={55} viewBox="0 0 50 55">
        <Path
          d="M49.5 0.5L24 0.5C24 0.5 9.5 14.5 0.5 24V54.5"
          stroke="#787878"
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

function TopRightAccent() {
  return (
    <View style={styles.topRightAccent}>
      <Svg width={55} height={50} viewBox="0 0 55 50">
        <Path
          d="M54.5 49.5V24C54.5 24 40.5 9.5 31 0.5H0.5"
          stroke="#787878"
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

function BottomLeftAccent() {
  return (
    <View style={styles.bottomLeftAccent}>
      <Svg width={50} height={55} viewBox="0 0 50 55">
        <Path
          d="M0.5 0.5V31C0.5 31 9.5 40.5 24 54.5H49.5"
          stroke="#787878"
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

function BottomRightAccent() {
  return (
    <View style={styles.bottomRightAccent}>
      <Svg width={50} height={55} viewBox="0 0 50 55">
        <Path
          d="M49.5 0.5V31C49.5 31 40.5 40.5 26 54.5H0.5"
          stroke="#787878"
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

function WarningIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Path
        d="M24 4L44 40H4L24 4Z"
        stroke="#FF6B6B"
        strokeWidth={2}
        fill="transparent"
      />
      <Path
        d="M24 18V28"
        stroke="#FF6B6B"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M24 34H24.02"
        stroke="#FF6B6B"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CancelButtonShape() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 115 40"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Path
        d="M0 32V0.5H104L114.5 10V40H11L0 32Z"
        fill="transparent"
        stroke="white"
        strokeWidth={0.6}
      />
    </Svg>
  );
}

function RetryButtonShape() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 115 40"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Path
        d="M0 32V0.5H104L114.5 10V40H11L0 32Z"
        fill="white"
      />
    </Svg>
  );
}

export default function CyberpunkErrorModal({
  visible,
  title,
  message,
  onCancel,
  onRetry,
  cancelText = "CANCEL",
  retryText = "RETRY",
}: CyberpunkErrorModalProps) {
  const handleCancel = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  const handleRetry = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetry();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <View style={styles.modalContainer}>
          <View style={styles.topCornerWrapper}>
            <TopCorner />
          </View>
          <MiddleSection />
          <View style={styles.bottomCornerWrapper}>
            <BottomCorner />
          </View>
          <TopLeftAccent />
          <TopRightAccent />
          <BottomLeftAccent />
          <BottomRightAccent />
          
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <WarningIcon />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>
              {message.length > 120 ? message.substring(0, 120) + "..." : message}
            </Text>
            <View style={styles.buttons}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleCancel}
                testID="button-error-cancel"
              >
                <CancelButtonShape />
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </Pressable>
              <Pressable
                style={styles.retryButton}
                onPress={handleRetry}
                testID="button-error-retry"
              >
                <RetryButtonShape />
                <Text style={styles.retryButtonText}>{retryText}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  modalContainer: {
    width: MODAL_WIDTH,
    height: MODAL_HEIGHT,
    position: "relative",
  },
  topCornerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CORNER_HEIGHT,
  },
  bottomCornerWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: CORNER_HEIGHT,
  },
  cornerContainer: {
    width: "100%",
    height: CORNER_HEIGHT,
  },
  middleSection: {
    position: "absolute",
    top: CORNER_HEIGHT - 1,
    bottom: CORNER_HEIGHT - 1,
    left: 0,
    right: 0,
    backgroundColor: "black",
  },
  leftBorder: {
    position: "absolute",
    left: 0.5,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#787878",
  },
  rightBorder: {
    position: "absolute",
    right: 0.5,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#787878",
  },
  content: {
    position: "absolute",
    top: CORNER_CUT + 16,
    bottom: CORNER_CUT + 16,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.astroSpace,
    fontSize: 16,
    color: "#FF6B6B",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  message: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: Spacing.xl,
  },
  buttons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButtonText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 1,
  },
  retryButton: {
    flex: 1,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  retryButtonText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: "#0A0A0A",
    fontWeight: "600",
    letterSpacing: 1,
  },
  topLeftAccent: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 50,
    height: 55,
  },
  topRightAccent: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 55,
    height: 50,
  },
  bottomLeftAccent: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 50,
    height: 55,
  },
  bottomRightAccent: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 50,
    height: 55,
  },
});
