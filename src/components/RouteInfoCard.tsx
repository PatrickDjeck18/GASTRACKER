import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsDark } from '../hooks/useIsDark';
import { Colors, Spacing, Radii, FontSize } from '../constants/theme';
import { formatTravelTime, formatRouteDistance } from '../api/routing';
import type { RouteInfo } from '../types/routing';

interface Props {
  route: RouteInfo | null | undefined;
  isLoading: boolean;
}

/**
 * Compact card showing route ETA + distance + traffic delay.
 * Used inside StationDetailModal.
 */
export function RouteInfoCard({ route, isLoading }: Props) {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary + '30' }]}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: thm.textSecondary }]}>
          Calculating route…
        </Text>
      </View>
    );
  }

  if (!route) return null;

  const hasDelay = route.trafficDelaySeconds > 30;

  return (
    <View style={[styles.card, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary + '30' }]}>
      <Text style={[styles.title, { color: Colors.primary }]}>
        🚗  Route to station
      </Text>

      <View style={styles.infoRow}>
        {/* ETA */}
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.primary} />
          <Text style={[styles.infoValue, { color: thm.text }]}>
            {formatTravelTime(route.travelTimeSeconds)}
          </Text>
          <Text style={[styles.infoLabel, { color: thm.textMuted }]}>ETA</Text>
        </View>

        {/* Distance */}
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="road-variant" size={16} color={Colors.primary} />
          <Text style={[styles.infoValue, { color: thm.text }]}>
            {formatRouteDistance(route.distanceMeters)}
          </Text>
          <Text style={[styles.infoLabel, { color: thm.textMuted }]}>Distance</Text>
        </View>

        {/* Traffic delay */}
        {hasDelay && (
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="car-brake-alert"
              size={16}
              color={Colors.warning}
            />
            <Text style={[styles.infoValue, { color: Colors.warning }]}>
              +{formatTravelTime(route.trafficDelaySeconds)}
            </Text>
            <Text style={[styles.infoLabel, { color: thm.textMuted }]}>
              Delay
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoItem: {
    alignItems: 'center',
    gap: 2,
  },
  infoValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  infoLabel: {
    fontSize: FontSize.xs,
  },
});
