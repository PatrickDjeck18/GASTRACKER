import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useIsDark } from '../hooks/useIsDark';
import { Colors, Radii, Spacing } from '../constants/theme';

function Bone({ width, height, radius = Radii.sm }: { width: number | string; height: number; radius?: number }) {
  const isDark = useIsDark();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: isDark ? '#1F2937' : '#E5E7EB',
          opacity,
        },
      ]}
    />
  );
}

/** Skeleton card that mimics StationCard while loading */
export function StationCardSkeleton() {
  const isDark = useIsDark();
  const bg = isDark ? Colors.dark.surface : Colors.light.surface;
  const border = isDark ? Colors.dark.border : Colors.light.border;

  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
      <View style={styles.row}>
        <Bone width={44} height={44} radius={Radii.full} />
        <View style={styles.textBlock}>
          <Bone width="70%" height={16} />
          <View style={{ height: 6 }} />
          <Bone width="50%" height={12} />
        </View>
        <Bone width={60} height={28} radius={Radii.md} />
      </View>
      <View style={{ height: Spacing.sm }} />
      <Bone width="90%" height={12} />
    </View>
  );
}

/** Full-screen skeleton with multiple cards */
export function StationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.listWrap}>
      {Array.from({ length: count }).map((_, i) => (
        <StationCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  listWrap: {
    padding: Spacing.lg,
  },
});
