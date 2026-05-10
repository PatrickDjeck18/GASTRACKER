import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsDark } from '../hooks/useIsDark';
import { Colors, Spacing, Radii, FontSize, Shadows, AnimDurations } from '../constants/theme';
import { PriceTag } from './PriceTag';
import { formatDistance } from '../utils/geo';
import { bestPrice, formatPrice, getPriceTier, type PriceTier } from '../utils/price';
import { getLocalCurrencyCode } from '../services/fuelPriceService';
import type { Station } from '../types/station';
import { AnimatedTouchable } from './AnimatedTouchable';

interface StationCardProps {
  station: Station;
  allPrices: number[];
  fuelFilter?: string | null;
  onPress: () => void;
}

export function StationCard({ station, allPrices, fuelFilter, onPress }: StationCardProps) {
  const isDark = useIsDark();
  const t = isDark ? Colors.dark : Colors.light;
  const localCurrency = getLocalCurrencyCode();
  const best = bestPrice(station, fuelFilter);
  const tier: PriceTier = best
    ? getPriceTier(best.price, allPrices)
    : 'unknown';
  const priceLabel = best ? formatPrice(best.price, localCurrency) : '—';
  const fuelLabel = best?.fuelType ?? '';

  return (
    <AnimatedTouchable
      onPress={onPress}
      hapticFeedback="Light"
      activeOpacity={0.9}
      style={[
        styles.card,
        {
          backgroundColor: t.card,
          borderColor: t.cardBorder,
          },
          isDark ? undefined : Shadows.sm,
        ]}
      >
        <View style={styles.content}>
          <View style={styles.leftGroup}>
            {/* Brand Logo / Icon Placeholder */}
            <View style={[styles.iconWrap, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primaryGlow }]}>
              <MaterialCommunityIcons name="gas-station-outline" size={24} color={Colors.primary} />
            </View>

            <View style={styles.info}>
              <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                {station.brand ?? station.name}
              </Text>
              <Text style={[styles.address, { color: t.textSecondary }]} numberOfLines={1}>
                {station.address}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <MaterialCommunityIcons name="map-marker-distance" size={12} color={t.textMuted} style={styles.metaIcon} />
                  <Text style={[styles.metaText, { color: t.textMuted }]}>
                    {formatDistance(station.distance)}
                  </Text>
                </View>
                {fuelLabel ? (
                  <>
                    <Text style={[styles.dot, { color: t.textMuted }]}>•</Text>
                    <View style={styles.metaBadge}>
                      <MaterialCommunityIcons name="water" size={12} color={Colors.primaryLight} style={styles.metaIcon} />
                      <Text style={[styles.metaText, { color: t.textMuted }]}>{fuelLabel}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.rightGroup}>
            <PriceTag label={priceLabel} tier={tier} animate={tier === 'cheap'} />
          </View>
        </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rightGroup: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  address: {
    fontSize: FontSize.sm,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    marginRight: 4,
  },
  metaText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  dot: {
    marginHorizontal: Spacing.sm,
    fontSize: FontSize.md,
  },
});
