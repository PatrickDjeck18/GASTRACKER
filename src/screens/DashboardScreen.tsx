import React, { useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeInDown, FadeInRight, FadeInUp, FadeIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, type NavigationProp } from '@react-navigation/native';

import { useIsDark } from '../hooks/useIsDark';
import { useLocation } from '../hooks/useLocation';
import { useStations } from '../hooks/useStations';
import { useAppStore } from '../store/useAppStore';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { bestPrice, formatPrice, getPriceTier, tierColor } from '../utils/price';
import { formatDistance } from '../utils/geo';
import { getLocalCurrencyCode } from '../services/fuelPriceService';
import * as notificationService from '../services/notifications';
import type { Station } from '../types/station';
import { NativeAd } from '../components/NativeAd';
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/* ── Time-aware greeting ────────────────────────────── */
function getGreeting(): { line1: string; line2: string; icon: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 6)  return { line1: 'Good', line2: 'Night',      icon: 'weather-night',         emoji: '🌙' };
  if (h < 12) return { line1: 'Good', line2: 'Morning',    icon: 'weather-sunny',         emoji: '☀️' };
  if (h < 17) return { line1: 'Good', line2: 'Afternoon',  icon: 'white-balance-sunny',   emoji: '🌤️' };
  if (h < 21) return { line1: 'Good', line2: 'Evening',    icon: 'weather-sunset',        emoji: '🌅' };
  return { line1: 'Good', line2: 'Night', icon: 'weather-night', emoji: '🌙' };
}

/* ── Stat Pill ──────────────────────────────────────── */
function StatPill({
  icon, label, value, color, isDark, delay,
}: { icon: string; label: string; value: string; color: string; isDark: boolean; delay: number }) {
  const thm = isDark ? Colors.dark : Colors.light;
  return (
    <AnimatedTouchable
      entering={FadeInUp.delay(delay).springify().damping(18)}
      style={[stat.pill, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
      activeOpacity={0.85}
    >
      <View style={[stat.iconWrap, { borderColor: color + '30', backgroundColor: color + '10' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={[stat.value, { color: color === thm.text ? thm.text : color }]}>{value}</Text>
      <Text style={[stat.label, { color: thm.textMuted }]}>{label}</Text>
    </AnimatedTouchable>
  );
}
const stat = StyleSheet.create({
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: Radii.xl,
    borderWidth: 1,
    gap: 8,
    ...Shadows.sm,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  value: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});

/* ── Quick Action Card ──────────────────────────────── */
function QuickAction({
  icon, label, subtitle, color, bgColor, borderColor, onPress, delay, isDark,
}: {
  icon: string; label: string; subtitle: string;
  color: string; bgColor: string; borderColor: string;
  onPress: () => void; delay: number; isDark: boolean;
}) {
  const thm = isDark ? Colors.dark : Colors.light;
  return (
    <AnimatedTouchable
      entering={FadeInRight.delay(delay).springify().damping(16)}
      style={[qa.card, { backgroundColor: bgColor, borderColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[qa.iconWrap, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      </View>
      <Text style={[qa.label, { color: thm.text }]}>{label}</Text>
      <Text style={[qa.sub, { color: thm.textMuted }]}>{subtitle}</Text>
    </AnimatedTouchable>
  );
}
const qa = StyleSheet.create({
  card: {
    flex: 1,
    padding: Spacing.xl,
    borderRadius: Radii.xxl,
    borderWidth: 1,
    gap: 6,
    ...Shadows.md,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: Radii.lg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: FontSize.lg, fontWeight: '800', letterSpacing: -0.3 },
  sub:   { fontSize: 13, fontWeight: '500', lineHeight: 18 },
});

/* ── Station Row (premium) ──────────────────────────── */
function StationRow({
  station, allPrices, fuelFilter, isDark, localCurrency, onPress, index,
}: {
  station: Station; allPrices: number[]; fuelFilter: string | null;
  isDark: boolean; localCurrency: string; onPress: () => void; index: number;
}) {
  const thm = isDark ? Colors.dark : Colors.light;
  const best = bestPrice(station, fuelFilter);
  const priceVal = best?.price;
  const tier = priceVal ? getPriceTier(priceVal, allPrices) : 'unknown';
  const col = tierColor(tier);

  return (
    <AnimatedTouchable
      entering={FadeInDown.delay(100 + index * 80).springify().damping(18)}
      style={[sRow.card, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Rank badge */}
      <View style={[sRow.rank, { backgroundColor: index === 0 ? Colors.price.cheap + '20' : thm.surfaceElevated }]}>
        <Text style={[sRow.rankTxt, { color: index === 0 ? Colors.price.cheap : thm.textMuted }]}>
          {index === 0 ? '★' : `#${index + 1}`}
        </Text>
      </View>

      {/* Icon */}
      <View style={[sRow.iconWrap, { backgroundColor: col + '12' }]}>
        <MaterialCommunityIcons name="gas-station" size={20} color={col} />
      </View>

      {/* Info */}
      <View style={sRow.info}>
        <Text style={[sRow.name, { color: thm.text }]} numberOfLines={1}>
          {station.brand ?? station.name}
        </Text>
        <View style={sRow.metaRow}>
          <MaterialCommunityIcons name="map-marker-distance" size={11} color={thm.textMuted} />
          <Text style={[sRow.meta, { color: thm.textMuted }]}>
            {formatDistance(station.distance)}
          </Text>
          {best?.fuelType ? (
            <>
              <Text style={[sRow.dot, { color: thm.textMuted }]}>·</Text>
              <Text style={[sRow.meta, { color: thm.textMuted }]}>{best.fuelType}</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Price */}
      <View style={[sRow.priceBadge, { backgroundColor: col + '12', borderColor: col + '25' }]}>
        {best ? (
          <Text style={[sRow.price, { color: col }]}>
            {formatPrice(best.price, localCurrency)}
          </Text>
        ) : (
          <Text style={[sRow.price, { color: thm.textMuted }]}>—</Text>
        )}
      </View>
    </AnimatedTouchable>
  );
}
const sRow = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    paddingLeft: Spacing.sm,
    borderRadius: Radii.xl,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  rank: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  rankTxt: { fontSize: 11, fontWeight: '900' },
  iconWrap: {
    width: 38, height: 38, borderRadius: Radii.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 2, letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 11, fontWeight: '500' },
  dot: { fontSize: 11 },
  priceBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radii.full, borderWidth: 1,
  },
  price: { fontSize: FontSize.md, fontWeight: '900', letterSpacing: -0.5 },
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN DASHBOARD
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function DashboardScreen() {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<any>>();
  const countryCode = useAppStore((s) => s.countryCode);
  const manualCurrency = useAppStore((s) => s.manualCurrency);
  const localCurrency = useMemo(
    () => getLocalCurrencyCode(),
    [countryCode, manualCurrency],
  );

  /* ── data ─── */
  const { coords } = useLocation();
  const locationName = useAppStore((s) => s.locationName);
  const fuelFilter = useAppStore((s) => s.filters.fuelType);
  const searchRadius = useAppStore((s) => s.searchRadius);
  const setSelectedStation = useAppStore((s) => s.setSelectedStation);
  const savedCalculations = useAppStore((s) => s.savedCalculations);
  const retention = useAppStore((s) => s.retention ?? {
    lastOpenDate: null,
    lastOpenAt: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalSessions: 0,
    weeklySavingsGoal: 25,
  });
  const trackAppOpen = useAppStore((s) => s.trackAppOpen);

  const { data: stations = [], isLoading, isRefetching, refetch } = useStations({
    lat: coords?.latitude,
    lon: coords?.longitude,
    radius: searchRadius,
    enabled: !!coords,
  });

  useFocusEffect(
    useCallback(() => {
      if (coords) {
        void refetch();
      }
    }, [refetch, coords])
  );

  const allPrices = useMemo(
    () => stations.map((s) => bestPrice(s, fuelFilter)?.price).filter(Boolean) as number[],
    [stations, fuelFilter],
  );

  const cheapestStations = useMemo(() => {
    return [...stations]
      .filter((s) => bestPrice(s, fuelFilter) != null)
      .sort((a, b) => (bestPrice(a, fuelFilter)?.price ?? 0) - (bestPrice(b, fuelFilter)?.price ?? 0))
      .slice(0, 5);
  }, [stations, fuelFilter]);

  /* ── derived stats ─── */
  const stationCount = stations.length;
  const minPrice = allPrices.length ? Math.min(...allPrices) : null;
  const avgPrice = allPrices.length
    ? (allPrices.reduce((a, b) => a + b, 0) / allPrices.length)
    : null;
  const greeting = getGreeting();
  const thisWeekStart = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // Sunday = 0
    const mondayOffset = day === 0 ? 6 : day - 1;
    const start = new Date(now);
    start.setDate(now.getDate() - mondayOffset);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }, []);

  const weeklyNetSavings = useMemo(
    () =>
      savedCalculations
        .filter((c) => c.date >= thisWeekStart)
        .reduce((acc, c) => acc + c.net, 0),
    [savedCalculations, thisWeekStart],
  );

  const weeklyGoal = retention.weeklySavingsGoal;
  const weeklyProgress = Math.max(0, Math.min(1, weeklyNetSavings / weeklyGoal));

  const bestOverall = useMemo(() => {
    const candidates = stations
      .map((s) => ({ station: s, best: bestPrice(s, fuelFilter) }))
      .filter((x): x is { station: Station; best: NonNullable<ReturnType<typeof bestPrice>> } => !!x.best);

    if (candidates.length === 0) return null;

    const prices = candidates.map((c) => c.best.price);
    const dists = candidates.map((c) => c.station.distance);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minDist = Math.min(...dists);
    const maxDist = Math.max(...dists);

    const score = (price: number, distance: number) => {
      const pNorm = maxPrice === minPrice ? 0 : (price - minPrice) / (maxPrice - minPrice);
      const dNorm = maxDist === minDist ? 0 : (distance - minDist) / (maxDist - minDist);
      return pNorm * 0.7 + dNorm * 0.3;
    };

    return [...candidates].sort(
      (a, b) => score(a.best.price, a.station.distance) - score(b.best.price, b.station.distance),
    )[0];
  }, [stations, fuelFilter]);

  const bestOverallSaving = useMemo(() => {
    if (!bestOverall || avgPrice == null) return null;
    return Math.max(0, avgPrice - bestOverall.best.price);
  }, [bestOverall, avgPrice]);

  useEffect(() => {
    trackAppOpen();
  }, [trackAppOpen]);

  useEffect(() => {
    if (typeof notificationService.maybeSendWeeklySavingsSummary === 'function') {
      notificationService
        .maybeSendWeeklySavingsSummary(savedCalculations, localCurrency)
        .catch(() => {});
    }
  }, [savedCalculations, localCurrency]);

  /* ── handlers ─── */
  const goToStation = useCallback((id: string) => {
    setSelectedStation(id);
    navigation.navigate('MapTab');
  }, [setSelectedStation, navigation]);

  /* ── render ─── */
  return (
    <View style={[ds.container, { backgroundColor: thm.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ══════ HEADER ══════ */}
        <View style={[ds.header, { paddingTop: insets.top + Spacing.lg }]}>
          {/* Greeting Row */}
          <Animated.View entering={FadeInDown.delay(50).springify()} style={ds.greetingRow}>
            <View style={ds.greetingLeft}>
              <View style={ds.greetingTextRow}>
                <Text style={[ds.greeting, { color: thm.text }]}>
                  {greeting.line1}{'\n'}{greeting.line2}
                </Text>
                <Text style={ds.emoji}>{greeting.emoji}</Text>
              </View>
              <View style={ds.locationBadge}>
                <View style={ds.locationDot} />
                <Text style={ds.location} numberOfLines={1}>
                  {locationName || 'Locating…'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[ds.settingsBtn, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
              onPress={() => navigation.navigate('SettingsTab')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="cog-outline" size={24} color={thm.text} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Main Card (Best Overall) ── */}
          {bestOverall ? (
            <AnimatedTouchable
              entering={FadeInDown.delay(100).springify()}
              style={ds.mainCard}
              onPress={() => goToStation(bestOverall.station.id)}
              activeOpacity={0.9}
            >
              <View style={ds.mainCardGlow} />
              <View style={ds.mainCardPill}>
                <MaterialCommunityIcons name="star-four-points" size={14} color="#10B981" />
                <Text style={ds.mainCardPillTxt}>BEST PRICE NEAR YOU</Text>
              </View>
              
              <View style={ds.mainCardContent}>
                <View style={ds.mainCardLeft}>
                  <Text style={ds.mainCardTitle} numberOfLines={1}>
                    {bestOverall.station.brand ?? bestOverall.station.name}
                  </Text>
                  <Text style={ds.mainCardSub} numberOfLines={1}>
                    {formatDistance(bestOverall.station.distance)} • {bestOverall.best.fuelType} • Updated 2m ago ✓
                  </Text>
                </View>
                <View style={ds.mainCardRight}>
                  <Text style={ds.mainCardCurrency}>{localCurrency}</Text>
                  <Text style={ds.mainCardPrice}>{bestOverall.best.price.toFixed(2)}</Text>
                  {bestOverallSaving != null ? (
                    <Text style={ds.mainCardSaving}>
                      Save ~{formatPrice(bestOverallSaving, localCurrency)}/L vs avg
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={ds.mainCardBtn}>
                <MaterialCommunityIcons name="compass" size={18} color="#FFFFFF" />
                <Text style={ds.mainCardBtnTxt}>Navigate Now • 3 min drive</Text>
              </View>
            </AnimatedTouchable>
          ) : null}

          {/* ── Stats Row ── */}
          <View style={ds.statsRow}>
            <StatPill
              icon="gas-station"
              label="Stations"
              value={isLoading ? '…' : `${stationCount}`}
              color={thm.text}
              isDark={isDark}
              delay={150}
            />
            <StatPill
              icon="trending-down"
              label="Best"
              value={minPrice != null ? formatPrice(minPrice, '').trim() : '—'}
              color={Colors.price.cheap}
              isDark={isDark}
              delay={250}
            />
            <StatPill
              icon="chart-bar"
              label="Average"
              value={avgPrice != null ? formatPrice(avgPrice, '').trim() : '—'}
              color={Colors.price.medium}
              isDark={isDark}
              delay={350}
            />
          </View>

          {/* ── Retention strip ── */}
          <Animated.View
            entering={FadeInDown.delay(420).springify()}
            style={[ds.retentionCard, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
          >
            <View style={ds.retentionLeft}>
              <View style={[ds.retentionIcon, { backgroundColor: '#FF6B0015' }]}>
                <MaterialCommunityIcons name="fire" size={28} color="#FF6B00" />
              </View>
              <View style={{flex: 1}}>
                <Text style={[ds.retentionTitle, { color: thm.text }]}>
                  {retention.currentStreak} Day Streak
                </Text>
                <Text style={[ds.retentionSub, { color: thm.textMuted }]}>
                  {retention.totalSessions} fill-ups • {formatPrice(weeklyNetSavings, localCurrency)} / {formatPrice(weeklyGoal, localCurrency)} savings goal
                </Text>
                <View style={[ds.goalBarBg, { backgroundColor: thm.surfaceElevated, marginTop: 8 }]}>
                  <View style={[ds.goalBarFill, { width: `${weeklyProgress * 100}%` }]} />
                </View>
              </View>
              <View style={[ds.flameBadge, { backgroundColor: '#FF6B0015' }]}>
                <Text style={ds.flameBadgeTxt}>{retention.currentStreak}</Text>
                <MaterialCommunityIcons name="fire" size={14} color="#FF6B00" />
              </View>
            </View>
          </Animated.View>
        </View>

        {/* ══════ CONTENT ══════ */}
        <View style={ds.content}>

          {/* ── Quick Actions ── */}
          <Animated.View entering={FadeIn.delay(200)} style={ds.sectionHeaderRow}>
            <Text style={[ds.sectionTitle, { color: thm.textMuted }]}>QUICK ACTIONS</Text>
          </Animated.View>

          <View style={ds.quickRow}>
            <QuickAction
              icon="map-search"
              label="Local Map"
              subtitle="Explore nearby stations"
              color={Colors.primary}
              bgColor={thm.card}
              borderColor={thm.cardBorder}
              onPress={() => navigation.navigate('MapTab')}
              delay={300}
              isDark={isDark}
            />
            <QuickAction
              icon="sack"
              label="Savings"
              subtitle="Calculate fuel costs"
              color={Colors.warning}
              bgColor={thm.card}
              borderColor={thm.cardBorder}
              onPress={() => navigation.navigate('SavingsTab')}
              delay={400}
              isDark={isDark}
            />
          </View>

          {/* ── Global Prices Widget ── */}
          <AnimatedTouchable
            entering={FadeInDown.delay(450).springify().damping(18)}
            style={[ds.globalWidget, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('PricesTab')}
          >
            <View style={[ds.globalIconWrap, { backgroundColor: Colors.price.cheapBg }]}>
              <MaterialCommunityIcons name="earth" size={22} color={Colors.price.cheap} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ds.widgetTitle, { color: thm.text }]}>Global Prices</Text>
              <Text style={[ds.widgetSub, { color: thm.textMuted }]}>
                Compare fuel across USA, Europe, Australia & more
              </Text>
            </View>
            <View style={[ds.chevronWrap, { backgroundColor: thm.surfaceElevated }]}>
              <MaterialCommunityIcons name="chevron-right" size={18} color={thm.textMuted} />
            </View>
          </AnimatedTouchable>

          {/* ── Cheapest Near Me ── */}
          <Animated.View entering={FadeIn.delay(500)} style={ds.sectionHeaderRow}>
            <Text style={[ds.sectionTitle, { color: thm.textMuted }]}>CHEAPEST NEAR ME</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ListTab')} hitSlop={12}>
              <View style={ds.viewAllRow}>
                <Text style={[ds.viewAllTxt, { color: Colors.primary }]}>View All</Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <NativeAd />

          {isLoading ? (
            <Animated.View entering={FadeIn.delay(400)}>
              <DashboardSkeleton isDark={isDark} />
            </Animated.View>
          ) : cheapestStations.length > 0 ? (
            <View>
              {cheapestStations.map((station, idx) => (
                <StationRow
                  key={station.id}
                  station={station}
                  allPrices={allPrices}
                  fuelFilter={fuelFilter}
                  isDark={isDark}
                  localCurrency={localCurrency}
                  index={idx}
                  onPress={() => goToStation(station.id)}
                />
              ))}

              {/* See on Map CTA */}
              <AnimatedTouchable
                entering={FadeInDown.delay(600).springify()}
                style={[ds.mapCta, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '25' }]}
                onPress={() => navigation.navigate('MapTab')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="map-marker-multiple" size={18} color={Colors.primary} />
                <Text style={[ds.mapCtaTxt, { color: Colors.primary }]}>
                  View all on Map
                </Text>
                <MaterialCommunityIcons name="arrow-right" size={16} color={Colors.primary} />
              </AnimatedTouchable>
            </View>
          ) : (
            <Animated.View
              entering={FadeInDown.delay(300).springify()}
              style={[ds.emptyState, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
            >
              <View style={[ds.emptyIcon, { backgroundColor: thm.surfaceElevated }]}>
                <MaterialCommunityIcons name="gas-station-off-outline" size={32} color={thm.textMuted} />
              </View>
              <Text style={[ds.emptyTitle, { color: thm.text }]}>No Stations Found</Text>
              <Text style={[ds.emptySub, { color: thm.textSecondary }]}>
                Open the Map tab to search for nearby fuel stations
              </Text>
              <TouchableOpacity
                style={[ds.emptyBtn, { backgroundColor: Colors.primary }]}
                onPress={() => navigation.navigate('MapTab')}
              >
                <MaterialCommunityIcons name="magnify" size={16} color="#FFF" />
                <Text style={ds.emptyBtnTxt}>Explore Map</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ── Dashboard Skeleton Loader ─────────────────────── */
function DashboardSkeleton({ isDark }: { isDark: boolean }) {
  const thm = isDark ? Colors.dark : Colors.light;
  return (
    <View style={{ gap: Spacing.sm }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          entering={FadeInDown.delay(i * 100).springify()}
          style={[sk.card, { backgroundColor: thm.shimmer, borderColor: thm.borderSubtle }]}
        >
          <View style={sk.row}>
            <View style={[sk.circle, { backgroundColor: thm.border }]} />
            <View style={sk.lines}>
              <View style={[sk.line, { backgroundColor: thm.border, width: '65%' }]} />
              <View style={[sk.line, { backgroundColor: thm.border, width: '40%', height: 8 }]} />
            </View>
            <View style={[sk.badge, { backgroundColor: thm.border }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}
const sk = StyleSheet.create({
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  circle: { width: 38, height: 38, borderRadius: Radii.lg },
  lines: { flex: 1, gap: 6 },
  line: { height: 12, borderRadius: 6 },
  badge: { width: 60, height: 26, borderRadius: Radii.full },
});

/* ── styles ───────────────────────────────────────────── */
const ds = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  greetingLeft: { flex: 1 },
  greetingTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  greeting: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  emoji: { fontSize: 32, marginTop: 4 },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  locationDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#10B981',
  },
  location: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#94A3B8',
    flex: 1,
  },
  settingsBtn: {
    width: 48, height: 48,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 4,
    ...Shadows.sm,
  },

  /* Main Card */
  mainCard: {
    backgroundColor: '#091A14',
    borderRadius: Radii.xxl,
    padding: Spacing.xl,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  mainCardGlow: {
    position: 'absolute',
    right: -60,
    bottom: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#10B981',
    opacity: 0.15,
  },
  mainCardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    marginBottom: Spacing.xl,
    gap: 6,
  },
  mainCardPillTxt: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  mainCardLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  mainCardTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 4,
  },
  mainCardSub: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  mainCardRight: {
    alignItems: 'flex-end',
  },
  mainCardCurrency: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: -6,
  },
  mainCardPrice: {
    color: '#10B981',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 56,
  },
  mainCardSaving: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  mainCardBtn: {
    backgroundColor: '#10B981',
    borderRadius: Radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  mainCardBtnTxt: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '800',
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  retentionCard: {
    marginTop: Spacing.md,
    borderRadius: Radii.xxl,
    borderWidth: 1,
    padding: Spacing.xl,
    ...Shadows.sm,
  },
  retentionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  retentionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retentionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  retentionSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  goalBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: '#FF6B00',
    borderRadius: 4,
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.full,
    gap: 4,
  },
  flameBadgeTxt: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '800',
  },

  /* Content */
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },

  /* Section Headers */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllTxt: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  /* Quick Actions */
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  /* Global Widget */
  globalWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radii.xxl,
    borderWidth: 1,
    marginTop: Spacing.lg,
    ...Shadows.sm,
  },
  globalIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  widgetTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  widgetSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 16,
  },
  chevronWrap: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },

  /* Map CTA */
  mapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radii.xl,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  mapCtaTxt: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    borderRadius: Radii.xxl,
    borderWidth: 1,
    ...Shadows.sm,
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.full,
  },
  emptyBtnTxt: {
    color: '#FFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
