import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Colors, Radii, Spacing } from '../constants/theme';
import { useIsDark } from '../hooks/useIsDark';

export function SkeletonCards({ count = 3 }: { count?: number }) {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.card,
            {
              backgroundColor: thm.shimmer,
              borderColor: thm.borderSubtle,
              opacity,
            },
          ]}
        >
          <View style={styles.topRow}>
            <View style={[styles.circle, { backgroundColor: thm.border }]} />
            <View style={[styles.badge, { backgroundColor: thm.border }]} />
          </View>
          <View style={[styles.line, { backgroundColor: thm.border, width: '80%' }]} />
          <View style={[styles.line, { backgroundColor: thm.border, width: '40%', height: 10 }]} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  card: {
    width: 150,
    height: 110,
    borderRadius: Radii.xxl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginRight: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  badge: {
    width: 50,
    height: 20,
    borderRadius: Radii.sm,
  },
  line: {
    height: 14,
    borderRadius: 7,
    marginBottom: 8,
  },
});
