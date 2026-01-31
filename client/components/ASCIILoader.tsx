import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '@/constants/theme';

const SPINNER_FRAMES = [
  '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'
];

interface ASCIILoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

export function ASCIILoader({ 
  size = 'medium', 
  color = '#FFFFFF',
  text
}: ASCIILoaderProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    
    return () => clearInterval(interval);
  }, []);

  const fontSize = {
    small: 24,
    medium: 40,
    large: 64,
  }[size];

  return (
    <View style={styles.container}>
      <Text style={[styles.loader, { fontSize, color }]}>
        {SPINNER_FRAMES[frameIndex]}
      </Text>
      {text ? (
        <Text style={[styles.text, { color }]}>{text}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loader: {
    fontFamily: Fonts.mono,
    textAlign: 'center',
  },
  text: {
    fontFamily: Fonts.body,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default ASCIILoader;
