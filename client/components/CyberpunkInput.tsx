import React from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Rect } from 'react-native-svg';

interface CyberpunkInputProps {
  value: string;
  label?: string;
  onCopy?: () => void;
  truncate?: boolean;
}

export default function CyberpunkInput({
  value,
  label,
  onCopy,
  truncate = true,
}: CyberpunkInputProps) {
  const [width, setWidth] = React.useState(354);
  const height = 50;

  const truncateAddress = (address: string) => {
    if (!truncate || address.length <= 16) return address;
    return `${address.slice(0, 7)}...${address.slice(-6)}`;
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCopy?.();
  };

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.container, { height }]} onLayout={onLayout}>
        <Svg
          style={StyleSheet.absoluteFill}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          {/* Inner background */}
          <Rect
            x={7.5}
            y={6.5}
            width={width - 15}
            height={35}
            fill="white"
            fillOpacity={0.1}
          />
          {/* Border */}
          <Rect
            x={3.85}
            y={3.85}
            width={width - 7.7}
            height={41.3}
            stroke="#484848"
            strokeWidth={0.7}
            fill="none"
          />
          {/* Top-right corner */}
          <Path
            d={`M${width - 9.5} 0.5H${width - 0.5}V9.5`}
            stroke="white"
            strokeWidth={1}
            fill="none"
          />
          {/* Bottom-right corner */}
          <Path
            d={`M${width - 0.5} 40.5V49.5H${width - 9.5}`}
            stroke="white"
            strokeWidth={1}
            fill="none"
          />
          {/* Top-left corner */}
          <Path
            d="M9.5 0.5H0.5V9.5"
            stroke="white"
            strokeWidth={1}
            fill="none"
          />
          {/* Bottom-left corner */}
          <Path
            d="M0.5 40.5V49.5H9.5"
            stroke="white"
            strokeWidth={1}
            fill="none"
          />
        </Svg>

        {/* Content overlay */}
        <View style={styles.contentContainer}>
          <View style={styles.inputArea}>
            <Text style={styles.valueText} numberOfLines={1}>
              {truncateAddress(value)}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.copyButton,
              pressed && styles.copyButtonPressed,
            ]}
            onPress={handleCopy}
          >
            <Text style={styles.copyButtonText}>Copy</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    color: '#888888',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 8,
  },
  container: {
    position: 'relative',
    width: '100%',
  },
  contentContainer: {
    position: 'absolute',
    top: 6.5,
    left: 7.5,
    right: 7.5,
    height: 35,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputArea: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  valueText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
  },
  copyButton: {
    backgroundColor: '#D9D9D9',
    width: 79,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 3,
  },
  copyButtonPressed: {
    backgroundColor: '#BBBBBB',
  },
  copyButtonText: {
    color: '#000000',
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
});
