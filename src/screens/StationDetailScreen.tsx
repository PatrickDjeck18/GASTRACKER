import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useIsDark } from '../hooks/useIsDark';
import { useTrafficFlow } from '../hooks/useTrafficFlow';
import { useEnrichStation } from '../hooks/useStations';
import { useRouteInfo } from '../hooks/useRouteInfo';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { useLocation } from '../hooks/useLocation';
import { useAppStore } from '../store/useAppStore';

import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { PriceTag } from '../components/PriceTag';
import { TrafficBadge } from '../components/TrafficBadge';
import { StaticMapPreview } from '../components/StaticMapPreview';
import { formatDistance } from '../utils/geo';
import { formatPrice, getPriceTier } from '../utils/price';
import { formatTravelTime, formatRouteDistance } from '../api/routing';
import { openNavigation, openPhone } from '../utils/navigation';
import { getLocalCurrencyCode } from '../services/fuelPriceService';
import type { Station } from '../types/station';
import { AnimatedTouchable } from '../components/AnimatedTouchable';
import { NativeAd } from '../components/NativeAd';

// Extend formatTravelTime for local use
function fmtTravelTime(s: number) { return formatTravelTime(s); }

/* ── Route param types ─────────────────────────── */
export type StationDetailParams = {
  StationDetail: {
    stationId: string;
    allPrices: number[];
    stationsQueryKey?: unknown[];
  };
};

/* ── Chip ───────────────────────────────────────── */
function InfoChip({
  icon, label, color, bgColor,
}: { icon: string; label: string; color: string; bgColor: string }) {
  return (
    <View style={[chip.wrap, { backgroundColor: bgColor, borderColor: color + '40' }]}>
      <MaterialCommunityIcons name={icon} size={14} color={color} />
      <Text style={[chip.txt, { color }]}>{label}</Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radii.full, borderWidth: 1,
  },
  txt: { fontSize: 12, fontWeight: '700' },
});

/* ── Route ribbon ───────────────────────────────── */
function RouteRibbon({
  travelTime, distance, delay, isDark,
}: { travelTime: number; distance: number; delay: number; isDark: boolean }) {
  const thm = isDark ? Colors.dark : Colors.light;
  const hasDelay = delay > 30;
  return (
    <Animated.View entering={FadeInDown.delay(300).springify()} style={[rr.wrap, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary + '30' }]}>
      <View style={rr.item}>
        <MaterialCommunityIcons name="clock-fast" size={18} color={Colors.primary} />
        <Text style={[rr.val, { color: thm.text }]}>{fmtTravelTime(travelTime)}</Text>
        <Text style={[rr.lbl, { color: thm.textMuted }]}>ETA</Text>
      </View>
      <View style={[rr.divider, { backgroundColor: Colors.primary + '20' }]} />
      <View style={rr.item}>
        <MaterialCommunityIcons name="road-variant" size={18} color={Colors.primary} />
        <Text style={[rr.val, { color: thm.text }]}>{formatRouteDistance(distance)}</Text>
        <Text style={[rr.lbl, { color: thm.textMuted }]}>Route</Text>
      </View>
      {hasDelay && (
        <>
          <View style={[rr.divider, { backgroundColor: Colors.primary + '20' }]} />
          <View style={rr.item}>
            <MaterialCommunityIcons name="car-brake-alert" size={18} color={Colors.warning} />
            <Text style={[rr.val, { color: Colors.warning }]}>+{fmtTravelTime(delay)}</Text>
            <Text style={[rr.lbl, { color: thm.textMuted }]}>Delay</Text>
          </View>
        </>
      )}
    </Animated.View>
  );
}
const rr = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radii.xl, borderWidth: 1,
    padding: Spacing.lg, marginBottom: Spacing.xl,
    justifyContent: 'space-around',
  },
  item: { alignItems: 'center', gap: 4, flex: 1 },
  val: { fontSize: FontSize.lg, fontWeight: '800', letterSpacing: -0.5 },
  lbl: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { width: 1, height: 40, borderRadius: 1 },
});

/* ─────────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────────── */
export default function StationDetailScreen() {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<StationDetailParams, 'StationDetail'>>();
  const { t } = useTranslation();
  const { maybeShowAd } = useInterstitialAd();
  const { coords } = useLocation();

  const { stationId, allPrices, stationsQueryKey = [] } = route.params;
  const localCurrency = getLocalCurrencyCode();

  /* ── station from store ─── */
  const stations = useAppStore((s) => s.cachedStations ?? []);
  const storeStation = stations.find((s) => s.id === stationId) ?? null;
  const [station, setStation] = useState<Station | null>(storeStation);

  /* ── enrichment ─── */
  const enrichStation = useEnrichStation();
  const [enriched, setEnriched] = useState<Station | null>(null);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    setEnriched(null);
    if (!station) return;
    if (station.fuelPrices.length === 0) {
      setEnriching(true);
      enrichStation(station, stationsQueryKey)
        .then((s) => setEnriched(s))
        .catch(() => {})
        .finally(() => setEnriching(false));
    }
  }, [station?.id]);

  const displayStation = enriched ?? station;

  /* ── traffic ─── */
  const { data: trafficInfo } = useTrafficFlow({
    lat: station?.coordinates.latitude,
    lon: station?.coordinates.longitude,
    enabled: !!station,
  });

  /* ── route info ─── */
  const { data: routeInfo, isLoading: routeLoading } = useRouteInfo({
    originLat: coords?.latitude,
    originLon: coords?.longitude,
    destLat: station?.coordinates.latitude,
    destLon: station?.coordinates.longitude,
    enabled: !!coords && !!station,
  });

  const handleBack = useCallback(() => {
    maybeShowAd();
    navigation.goBack();
  }, [navigation, maybeShowAd]);

  if (!station) {
    return (
      <View style={[s.center, { backgroundColor: thm.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const hasPrices = (displayStation?.fuelPrices.length ?? 0) > 0;
  const isGeminiSource = displayStation?.priceSource === 'gemini' || displayStation?.priceSource === 'gemini-grounded';
  const isGrounded = displayStation?.priceSource === 'gemini-grounded';

  return (
    <View style={[s.root, { backgroundColor: thm.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Hero Map Banner ─── */}
      <Animated.View entering={FadeIn.duration(400)} style={s.heroWrap}>
        <StaticMapPreview
          latitude={station.coordinates.latitude}
          longitude={station.coordinates.longitude}
          zoom={15}
          height={260}
        />

        {/* Gradient overlay */}
        <View style={s.heroOverlay} />

        {/* Back button */}
        <AnimatedTouchable
          style={[s.backBtn, { top: insets.top + 12 }]}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          hapticFeedback="Medium"
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
        </AnimatedTouchable>

        {/* Station name overlaid on map */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={[s.heroLabel, { bottom: 20, left: 20, right: 20 }]}
        >
          <View style={[s.heroBrand, { backgroundColor: Colors.primary }]}>
            <MaterialCommunityIcons name="gas-station" size={16} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroName} numberOfLines={1}>
              {station.brand ?? station.name}
            </Text>
            <Text style={s.heroAddr} numberOfLines={1}>
              {station.address}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* ── Scrollable Content ─── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Info chips row */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={s.chipsRow}>
          <InfoChip
            icon="map-marker-distance"
            label={formatDistance(station.distance)}
            color={Colors.primary}
            bgColor={Colors.primaryMuted}
          />
          {station.openingHours ? (
            <InfoChip
              icon="clock-outline"
              label={station.openingHours}
              color={Colors.warning}
              bgColor={Colors.warning + '12'}
            />
          ) : null}
          <TrafficBadge traffic={trafficInfo} compact style={{ flexShrink: 0, paddingHorizontal: Spacing.md }} />
        </Animated.View>

        {/* Route ribbon */}
        {routeLoading ? (
          <Animated.View entering={FadeIn} style={[rr.wrap, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary + '30' }]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={[s.routeLoading, { color: thm.textMuted }]}>Calculating route…</Text>
          </Animated.View>
        ) : routeInfo ? (
          <RouteRibbon
            travelTime={routeInfo.travelTimeSeconds}
            distance={routeInfo.distanceMeters}
            delay={routeInfo.trafficDelaySeconds}
            isDark={isDark}
          />
        ) : null}

        {/* ── Navigate Buttons ─── */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={s.navRow}>
          {/* In-App Navigation — primary CTA */}
          <AnimatedTouchable
            id="btn-inapp-navigate"
            style={[s.navPrimary, { backgroundColor: Colors.primary }]}
            activeOpacity={0.85}
            hapticFeedback="Success"
            onPress={() =>
              navigation.navigate('InAppNavigation', {
                destLat: station.coordinates.latitude,
                destLon: station.coordinates.longitude,
                stationName: station.brand ?? station.name,
              })
            }
          >
            <MaterialCommunityIcons name="navigation-variant" size={20} color="#FFF" />
            <Text style={s.navPrimaryTxt}>Navigate Here</Text>
          </AnimatedTouchable>

          {/* Waze */}
          <AnimatedTouchable
            id="btn-waze-navigate"
            style={[s.navSecondary, { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted }]}
            activeOpacity={0.8}
            onPress={() => openNavigation(station.coordinates.latitude, station.coordinates.longitude, station.name, 'waze')}
          >
            <MaterialCommunityIcons name="waze" size={22} color={Colors.primary} />
          </AnimatedTouchable>

          {/* Default maps */}
          <AnimatedTouchable
            id="btn-maps-navigate"
            style={[s.navSecondary, { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted }]}
            activeOpacity={0.8}
            onPress={() => openNavigation(station.coordinates.latitude, station.coordinates.longitude, station.name, 'default')}
          >
            <MaterialCommunityIcons name="map-outline" size={22} color={Colors.primary} />
          </AnimatedTouchable>
        </Animated.View>

        {/* ── Native Ad ─── */}
        <Animated.View entering={FadeInDown.delay(240).springify()} style={{ marginHorizontal: -Spacing.lg }}>
          <NativeAd variant="compact" />
        </Animated.View>

        {/* ── Fuel Prices Card ─── */}
        <Animated.View
          entering={FadeInDown.delay(280).springify()}
          style={[s.priceCard, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
        >
          {/* Card header */}
          <View style={s.priceCardHeader}>
            <View style={[s.priceCardIcon, { backgroundColor: Colors.primaryMuted }]}>
              <MaterialCommunityIcons name="water" size={18} color={Colors.primary} />
            </View>
            <Text style={[s.sectionTitle, { color: thm.text }]}>
              {t('station.fuels')}
            </Text>
            {isGeminiSource && (
              <View style={[s.aiBadge, { backgroundColor: isGrounded ? Colors.price.cheapBg : '#9C27B015', borderColor: isGrounded ? Colors.price.cheap : '#CE93D8' }]}>
                <MaterialCommunityIcons name="google" size={11} color={isGrounded ? Colors.price.cheap : '#CE93D8'} />
                <Text style={[s.aiBadgeTxt, { color: isGrounded ? Colors.price.cheap : '#CE93D8' }]}>
                  {isGrounded ? 'AI · Verified' : 'AI'}
                </Text>
              </View>
            )}
          </View>

          {enriching ? (
            <View style={s.enrichRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={[s.enrichTxt, { color: thm.textMuted }]}>Looking up live prices…</Text>
            </View>
          ) : hasPrices ? (
            <>
              {displayStation!.fuelPrices.map((fp, i) => {
                const tier = getPriceTier(fp.price, allPrices);
                const isLast = i === displayStation!.fuelPrices.length - 1;
                return (
                  <Animated.View
                    key={i}
                    entering={FadeInDown.delay(300 + i * 60).springify()}
                    style={[
                      s.fuelRow,
                      !isLast && { borderBottomColor: thm.borderSubtle, borderBottomWidth: StyleSheet.hairlineWidth },
                    ]}
                  >
                    <Text style={[s.fuelType, { color: thm.text }]}>{fp.fuelType}</Text>
                    <PriceTag label={formatPrice(fp.price, localCurrency)} tier={tier} size="sm" />
                  </Animated.View>
                );
              })}
              {isGeminiSource && displayStation?.priceAttribution ? (
                <Text style={[s.attribution, { color: thm.textMuted }]} numberOfLines={2}>
                  Source: {displayStation.priceAttribution}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={[s.noPrice, { color: thm.textMuted }]}>
              {t('station.noPrice')}
            </Text>
          )}
        </Animated.View>

        {/* ── Phone ─── */}
        {station.phone ? (
          <Animated.View entering={FadeInDown.delay(380).springify()}>
            <AnimatedTouchable
              id="btn-call-station"
              style={[s.phoneRow, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
              onPress={() => openPhone(station.phone!)}
              activeOpacity={0.7}
            >
              <View style={[s.phoneIcon, { backgroundColor: Colors.primary + '15' }]}>
                <MaterialCommunityIcons name="phone" size={20} color={Colors.primary} />
              </View>
              <Text style={[s.phoneTxt, { color: thm.text }]}>{station.phone}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={thm.textMuted} style={{ marginLeft: 'auto' }} />
            </AnimatedTouchable>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Hero */
  heroWrap: { height: 260, position: 'relative' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Simulate gradient using bottom-heavy shadow
    borderBottomWidth: 0,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 42, height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
    ...Shadows.md,
  },
  heroLabel: {
    position: 'absolute',
    flexDirection: 'row', alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: Radii.xl,
    padding: Spacing.md,
    paddingRight: Spacing.lg,
  },
  heroBrand: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  heroName: {
    color: '#FFF', fontSize: FontSize.lg, fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroAddr: {
    color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '500', marginTop: 2,
  },

  /* Scroll content */
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },

  /* Chips */
  chipsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: Spacing.sm, marginBottom: Spacing.lg,
  },

  /* Route loading */
  routeLoading: {
    fontSize: FontSize.sm, fontStyle: 'italic', marginLeft: Spacing.sm,
  },

  /* Nav buttons */
  navRow: {
    flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl,
  },
  navPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: Spacing.lg, borderRadius: Radii.xl,
    ...Shadows.colored(Colors.primary),
  },
  navPrimaryTxt: {
    color: '#FFF', fontWeight: '800', fontSize: FontSize.md,
  },
  navSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderRadius: Radii.xl, borderWidth: 1,
  },

  /* Price card */
  priceCard: {
    borderRadius: Radii.xl, borderWidth: 1,
    padding: Spacing.xl, marginBottom: Spacing.lg,
  },
  priceCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg,
  },
  priceCardIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.md, fontWeight: '800', letterSpacing: -0.2,
  },
  aiBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radii.full, borderWidth: 1, marginLeft: 'auto',
  },
  aiBadgeTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  enrichRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg,
  },
  enrichTxt: { fontSize: FontSize.sm, fontStyle: 'italic' },
  fuelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  fuelType: { fontSize: FontSize.md, fontWeight: '600' },
  noPrice: { fontSize: FontSize.sm, fontStyle: 'italic', paddingVertical: Spacing.md },
  attribution: { fontSize: 10, marginTop: Spacing.sm, lineHeight: 14 },

  /* Phone */
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderRadius: Radii.xl, borderWidth: 1,
  },
  phoneIcon: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  phoneTxt: { fontSize: FontSize.md, fontWeight: '600' },
});
