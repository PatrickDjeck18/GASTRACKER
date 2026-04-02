import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsDark } from '../hooks/useIsDark';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import type { SortMode } from '../types/station';

interface SortToggleProps {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}

export function SortToggle({ value, onChange }: SortToggleProps) {
  const isDark = useIsDark();
  const t = isDark ? Colors.dark : Colors.light;

  const options: { key: SortMode; label: string; icon: string }[] = [
    { key: 'distance', label: 'Closest', icon: 'map-marker-distance' },
    { key: 'price', label: 'Cheapest', icon: 'currency-usd' },
  ];

  return (
    <View style={[styles.wrap, { backgroundColor: isDark ? Colors.dark.surfaceElevated : '#E2E8F0' }]}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.tab,
              active && { backgroundColor: Colors.primary },
              active && (!isDark ? Shadows.sm : undefined),
            ]}
            activeOpacity={0.8}
            onPress={() => onChange(opt.key)}
          >
            <MaterialCommunityIcons 
              name={opt.icon} 
              size={16} 
              color={active ? '#FFF' : t.textMuted} 
              style={styles.icon} 
            />
            <Text
              style={[
                styles.label,
                { color: active ? '#FFF' : t.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: Radii.xl,
    padding: 4,
    minWidth: 200,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
