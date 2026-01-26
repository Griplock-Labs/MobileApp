import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import Animated, { AnimatedStyle } from "react-native-reanimated";

import { Colors, Spacing } from "@/constants/theme";

const theme = Colors.dark;

function GridIcon({
  size = 23,
  color = "white",
  active = false,
}: {
  size?: number;
  color?: string;
  active?: boolean;
}) {
  if (active) {
    return (
      <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
        <Path
          d="M9.1896 22.6741V5.81899C9.1896 5.52097 9.07121 5.23516 8.86048 5.02443C8.64975 4.8137 8.36394 4.69531 8.06592 4.69531H2.44755C1.85151 4.69531 1.27989 4.93209 0.858429 5.35355C0.436969 5.77501 0.200195 6.34663 0.200195 6.94266V20.4268C0.200195 21.0228 0.436969 21.5944 0.858429 22.0159C1.27989 22.4373 1.85151 22.6741 2.44755 22.6741H15.9317C16.5277 22.6741 17.0993 22.4373 17.5208 22.0159C17.9422 21.5944 18.179 21.0228 18.179 20.4268V14.8084C18.179 14.5104 18.0606 14.2246 17.8499 14.0138C17.6392 13.8031 17.3533 13.6847 17.0553 13.6847H0.200195"
          fill={color}
        />
        <Path
          d="M9.1896 22.6741V5.81899C9.1896 5.52097 9.07121 5.23516 8.86048 5.02443C8.64975 4.8137 8.36394 4.69531 8.06592 4.69531H2.44755C1.85151 4.69531 1.27989 4.93209 0.858429 5.35355C0.436969 5.77501 0.200195 6.34663 0.200195 6.94266V20.4268C0.200195 21.0228 0.436969 21.5944 0.858429 22.0159C1.27989 22.4373 1.85151 22.6741 2.44755 22.6741H15.9317C16.5277 22.6741 17.0993 22.4373 17.5208 22.0159C17.9422 21.5944 18.179 21.0228 18.179 20.4268V14.8084C18.179 14.5104 18.0606 14.2246 17.8499 14.0138C17.6392 13.8031 17.3533 13.6847 17.0553 13.6847H0.200195"
          stroke={Colors.dark.backgroundRoot}
          strokeWidth={0.401313}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M21.5503 0.200195H14.8082C14.1877 0.200195 13.6846 0.703282 13.6846 1.32387V8.06592C13.6846 8.68651 14.1877 9.1896 14.8082 9.1896H21.5503C22.1709 9.1896 22.674 8.68651 22.674 8.06592V1.32387C22.674 0.703282 22.1709 0.200195 21.5503 0.200195Z"
          fill={color}
          stroke={Colors.dark.backgroundRoot}
          strokeWidth={0.401313}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  
  return (
    <Svg width={size} height={size} viewBox="0 0 23 23" fill="none">
      <Path
        d="M9.19009 22.6741V5.81899C9.19009 5.52097 9.0717 5.23516 8.86097 5.02443C8.65024 4.8137 8.36443 4.69531 8.06641 4.69531H2.44803C1.852 4.69531 1.28038 4.93209 0.858917 5.35355C0.437457 5.77501 0.200684 6.34663 0.200684 6.94266V20.4268C0.200684 21.0228 0.437457 21.5944 0.858917 22.0159C1.28038 22.4373 1.852 22.6741 2.44803 22.6741H15.9321C16.5282 22.6741 17.0998 22.4373 17.5213 22.0159C17.9427 21.5944 18.1795 21.0228 18.1795 20.4268V14.8084C18.1795 14.5104 18.0611 14.2246 17.8504 14.0139C17.6397 13.8031 17.3538 13.6847 17.0558 13.6847H0.200684"
        stroke={color}
        strokeWidth={0.401313}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21.5505 0.200195H14.8085C14.1879 0.200195 13.6848 0.703282 13.6848 1.32387V8.06592C13.6848 8.68651 14.1879 9.1896 14.8085 9.1896H21.5505C22.1711 9.1896 22.6742 8.68651 22.6742 8.06592V1.32387C22.6742 0.703282 22.1711 0.200195 21.5505 0.200195Z"
        stroke={color}
        strokeWidth={0.401313}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function QRIcon() {
  return (
    <Svg width={61} height={61} viewBox="0 0 61 61" fill="none">
      <Path
        d="M15.0492 31.7054H30.0985V16.6562H15.0492V31.7054ZM18.3907 20.0741H26.757V28.3895H18.3907V20.0741ZM30.0985 0C13.4678 0 0 13.4678 0 30.0985C0 46.7291 13.4678 60.1969 30.0985 60.1969C46.7291 60.1969 60.1969 46.7291 60.1969 30.0985C60.1969 13.4678 46.7291 0 30.0985 0ZM11.7078 13.3658H33.4654V35.0468H11.7078V13.3658ZM50.1726 30.0474V33.3889H43.4897V36.7303H50.1726V43.4387H46.8312V40.0973H40.1483V45.1222H46.8312V48.4636H28.4405V45.1222H25.0991V41.7807H21.7321V48.4636H11.7078V38.4393H15.0492V41.7807H18.3907V38.4393H25.0991V35.0468H28.4405V41.7807H31.7819V38.4393H38.4903V33.3889H33.4654V30.0474H38.4903V26.7315H35.1233V23.3645H38.4903V20.0231H41.8317V23.3645H45.1731V16.6561H48.4891V23.3645H45.1731V26.7315H48.4891V30.0474H50.1726ZM48.4891 45.1222V48.4636H43.4897V45.1222H48.4891ZM41.8317 30.0474H45.1731V33.3889H41.8317V30.0474Z"
        fill="white"
      />
    </Svg>
  );
}

function SwapIcon({
  size = 22,
  color = "white",
  active = false,
}: {
  size?: number;
  color?: string;
  active?: boolean;
}) {
  const strokeWidth = active ? 2.5 : 1.5;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 7H21L17 3"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 7L17 11"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 17H3L7 13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 17L7 21"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export type BottomNavigationProps = {
  activeTab?: "grid" | "swap";
  onGridPress?: () => void;
  onSwapPress?: () => void;
  onCenterPress?: () => void;
  centerIcon?: React.ReactNode;
  circleColor?: string;
  centerButtonStyle?: AnimatedStyle<any>;
  centerButtonTestID?: string;
};

export default function BottomNavigation({
  activeTab = "grid",
  onGridPress,
  onSwapPress,
  onCenterPress,
  centerIcon,
  circleColor = "#747474",
  centerButtonStyle,
  centerButtonTestID,
}: BottomNavigationProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomNavContainer, { paddingBottom: insets.bottom }]}>
      <View style={styles.bottomNavWrapper}>
        <Svg
          width="100%"
          height={100}
          viewBox="0 0 428 100"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
        >
          <Path
            d="M249.215 30.7012H405.727L428 50.3655"
            stroke="#747474"
            strokeWidth={0.5}
          />
          <Path
            d="M178.785 30.9014H22.273L0.000100315 50.5657"
            stroke="#747474"
            strokeWidth={0.5}
          />
          <Circle
            cx={213.9}
            cy={34.9142}
            r={34.7135}
            stroke={circleColor}
            strokeWidth={0.5}
            fill="transparent"
          />
        </Svg>

        <View style={styles.navIconsOverlayWrapper}>
          <View style={styles.navIconsOverlay}>
            <Pressable style={styles.leftNavButton} onPress={onGridPress}>
              <GridIcon size={22} color={theme.text} active={activeTab === "grid"} />
            </Pressable>

            <Pressable style={styles.rightNavButton} onPress={onSwapPress}>
              <SwapIcon size={22} color={theme.text} active={activeTab === "swap"} />
            </Pressable>
          </View>

          <Animated.View style={[styles.scanButtonContainer, centerButtonStyle]}>
            <Pressable
              style={({ pressed }) => [
                styles.scanButton,
                pressed && styles.scanButtonPressed,
              ]}
              onPress={onCenterPress}
              testID={centerButtonTestID}
            >
              {centerIcon ? centerIcon : <QRIcon />}
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavContainer: {
    alignItems: "center",
    marginHorizontal: -Spacing["2xl"],
  },
  bottomNavWrapper: {
    position: "relative",
    width: "100%",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconsOverlayWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  navIconsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  leftNavButton: {
    width: "50%",
    height: 44,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  rightNavButton: {
    width: "50%",
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  scanButtonContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginTop: -28,
  },
  scanButton: {
    width: 50,
    height: 50,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  scanButtonPressed: {
    opacity: 0.7,
  },
});
