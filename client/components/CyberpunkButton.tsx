import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

interface CyberpunkButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  width?: number;
}

export default function CyberpunkButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  width = 152,
}: CyberpunkButtonProps) {
  const height = 39;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { width, height },
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {/* Background */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Semi-transparent background */}
        <Rect
          x={3.5}
          y={3.5}
          width={width - 7}
          height={height - 7}
          fill="white"
          fillOpacity={0.25}
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
          d={`M${width - 0.5} ${height - 9.5}V${height - 0.5}H${width - 9.5}`}
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
          d={`M0.5 ${height - 9.5}V${height - 0.5}H9.5`}
          stroke="white"
          strokeWidth={1}
          fill="none"
        />
      </Svg>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.text}>{title}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
