import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { trafficColor, trafficLabel } from '../api/traffic';
import { Colors, Spacing, Radii, FontSize } from '../constants/theme';
import type { TrafficFlowInfo } from '../types/traffic';

import type { StyleProp, ViewStyle } from 'react-native';

interface Props {
  traffic: TrafficFlowInfo | null | undefined;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Badge showing traffic flow status with color coding.
 */
export function TrafficBadge({ traffic, compact = false, style }: Props) {
  if (!traffic) return null;

  const color = trafficColor(traffic.level);
  const label = trafficLabel(traffic.level);

  if (compact) {
    return (
      <View style={[styles.compactBadge, { backgroundColor: color + '20', borderColor: color + '40', borderWidth: 1 }, style]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.compactText, { color }]}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: color + '40', backgroundColor: color + '10' }]}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name="traffic-light" size={18} color={color} />
        <Text style={[styles.title, { color }]}>Traffic: {label}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={[styles.detail, { color: Colors.dark.textSecondary }]}>
          {Math.round(traffic.currentSpeed)} km/h
        </Text>
        <Text style={[styles.detail, { color: Colors.dark.textMuted }]}>
          {' '}/ {Math.round(traffic.freeFlowSpeed)} km/h free flow
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    marginLeft: 26,
  },
  detail: {
    fontSize: FontSize.xs,
  },
});
