import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MODAL_WIDTH = Math.min(SCREEN_WIDTH - 24, 377);
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.8;
const CORNER_HEIGHT = 191;
const CORNER_CUT = 40;

interface CyberpunkModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeDisabled?: boolean;
}

function TopCorner() {
  return (
    <View style={styles.cornerContainer}>
      <Svg
        width="100%"
        height={CORNER_HEIGHT}
        viewBox="0 0 377 191"
        preserveAspectRatio="none"
      >
        <Path
          d="M0.5 40.5V190H376.5V40L337 0.5H40.5L0.5 40.5Z"
          fill="black"
        />
        <Path
          d="M0.5 190V40.5L40.5 0.5H337L376.5 40V190"
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
        viewBox="0 0 377 191"
        preserveAspectRatio="none"
      >
        <Path
          d="M376.5 150L376.5 0.5L0.500017 0.499967L0.500003 150.5L40 190L336.5 190L376.5 150Z"
          fill="black"
        />
        <Path
          d="M376.5 0.5L376.5 150L336.5 190L40 190L0.500003 150.5L0.500017 0.499967"
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
      <Svg width={85} height={92} viewBox="0 0 85 92">
        <Path
          d="M84.5 0.499996L40.5 0.499998C40.5 0.499998 16.121 24.5743 0.499998 40L0.5 91.5"
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
      <Svg width={92} height={85} viewBox="0 0 92 85">
        <Path
          d="M91 84.5V40.5C91 40.5 66.9257 16.121 51.5 0.5H0"
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
      <Svg width={85} height={92} viewBox="0 0 85 92">
        <Path
          d="M0 0L0 51.5C0 51.5 16.621 66.9257 41 91L85 91"
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
      <Svg width={85} height={92} viewBox="0 0 85 92">
        <Path
          d="M85 0L85 51.5C85 51.5 68.379 66.9257 44 91L0 91"
          stroke="#787878"
          strokeWidth={1}
          fill="none"
        />
      </Svg>
    </View>
  );
}

function CloseButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable 
      style={[styles.closeButton, disabled && styles.closeButtonDisabled]} 
      onPress={onPress}
      disabled={disabled}
    >
      <Svg width={42} height={42} viewBox="0 0 42 42">
        <Path
          d="M41.2539 20.9805L20.9805 41.2539L0.707031 20.9805L20.9805 0.707031L41.2539 20.9805Z"
          stroke={disabled ? "#444444" : "#747474"}
          strokeWidth={1}
          fill="none"
        />
        <Path d="M15.7363 15.7363L26.6013 26.6013" stroke={disabled ? "#555555" : "white"} strokeWidth={1} />
        <Path d="M15.7363 26.6016L26.6013 15.7365" stroke={disabled ? "#555555" : "white"} strokeWidth={1} />
      </Svg>
    </Pressable>
  );
}

export default function CyberpunkModal({
  visible,
  onClose,
  children,
  closeDisabled = false,
}: CyberpunkModalProps) {
  const handleClose = async () => {
    if (closeDisabled) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
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
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          <CloseButton onPress={handleClose} disabled={closeDisabled} />
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
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
  scrollView: {
    position: "absolute",
    top: CORNER_CUT + 20,
    bottom: CORNER_CUT + 60,
    left: 0,
    right: 0,
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 20,
  },
  closeButton: {
    position: "absolute",
    bottom: CORNER_CUT + 10,
    left: "50%",
    marginLeft: -21,
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonDisabled: {
    opacity: 0.3,
  },
  topLeftAccent: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 85,
    height: 92,
  },
  topRightAccent: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 92,
    height: 85,
  },
  bottomLeftAccent: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 85,
    height: 92,
  },
  bottomRightAccent: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 85,
    height: 92,
  },
});
