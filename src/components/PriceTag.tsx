import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { tierColor, tierBg, tierBorder, type PriceTier } from '../utils/price';
import { Radii, FontSize, Spacing } from '../constants/theme';

interface PriceTagProps {
  label: string;
  tier: PriceTier;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const sizes = {
  sm: { fontSize: FontSize.xs, px: Spacing.sm, py: 3, iconSize: 0 },
  md: { fontSize: FontSize.sm, px: Spacing.md, py: Spacing.xs + 1, iconSize: 0 },
  lg: { fontSize: FontSize.lg, px: Spacing.lg + 2, py: Spacing.sm + 1, iconSize: 0 },
};

export function PriceTag({ label, tier, size = 'md', animate = false }: PriceTagProps) {
  const s = sizes[size];
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [animate, glowAnim]);

  const opacity = animate ? glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) : 1;

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: tierBg(tier),
          borderColor: tierBorder(tier),
          paddingHorizontal: s.px,
          paddingVertical: s.py,
          opacity,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: tierColor(tier), fontSize: s.fontSize },
        ]}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  text: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
