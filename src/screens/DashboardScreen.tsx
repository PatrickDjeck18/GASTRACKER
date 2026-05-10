import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, type NavigationProp } from '@react-navigation/native';

import { useIsDark } from '../hooks/useIsDark';
import { useLocation } from '../hooks/useLocation';
import { useStations } from '../hooks/useStations';
import { useAppStore } from '../store/useAppStore';
import { useReverseGeocode } from '../hooks/useReverseGeocode';
import { useSearchLocation } from '../hooks/useSearchLocation';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { bestPrice, formatPrice, getPriceTier, tierColor } from '../utils/price';
import { formatDistance } from '../utils/geo';
import { getLocalCurrencyCode } from '../services/fuelPriceService';
import { currencySymbol } from '../utils/price';
import { FUEL_TYPES } from '../constants/fuelTypes';
import { TomTomMap, type TomTomMapRef } from '../components/TomTomMap';
import { SearchBar } from '../components/SearchBar';
import { AnimatedTouchable } from '../components/AnimatedTouchable';
import { NativeAd } from '../components/NativeAd';
import type { Station } from '../types/station';
import * as notificationService from '../services/notifications';

const { height: SCREEN_H } = Dimensions.get('window');
const MAP_H = Math.round(SCREEN_H * 0.45);
const TAB_H = 66;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return { text: 'Good Night 🌙' };
  if (h < 12) return { text: 'Good Morning ☀️' };
  if (h < 17) return { text: 'Good Afternoon 🌤️' };
  if (h < 21) return { text: 'Good Evening 🌅' };
  return { text: 'Good Night 🌙' };
}

/* ── Fuel chip row ── */
function FuelChips({ selected, onChange, isDark }: { selected: string | null; onChange: (v: string | null) => void; isDark: boolean }) {
  const text = isDark ? Colors.dark.text : Colors.light.text;
  const bg   = isDark ? Colors.dark.surfaceElevated : '#FFF';
  const bc   = isDark ? Colors.dark.border : '#E2E8F0';
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fc.row}>
      <TouchableOpacity style={[fc.chip, !selected ? fc.on : { backgroundColor: bg, borderColor: bc, borderWidth: 1 }]} onPress={() => onChange(null)}>
        <MaterialCommunityIcons name="gas-station" size={14} color={!selected ? '#FFF' : text} />
        <Text style={[fc.lbl, { color: !selected ? '#FFF' : text }]}>All</Text>
      </TouchableOpacity>
      {FUEL_TYPES.map(ft => {
        const active = selected === ft.tomtomMatch;
        return (
          <TouchableOpacity key={ft.key} style={[fc.chip, active ? fc.on : { backgroundColor: bg, borderColor: bc, borderWidth: 1 }]} onPress={() => onChange(active ? null : ft.tomtomMatch)}>
            <Text style={[fc.lbl, { color: active ? '#FFF' : text }]}>{ft.tomtomMatch}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
const fc = StyleSheet.create({
  row:  { paddingHorizontal: Spacing.lg, paddingVertical: 8, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.full, ...Shadows.sm },
  on:   { backgroundColor: '#0F172A', borderColor: '#0F172A', borderWidth: 1 },
  lbl:  { fontSize: 12, fontWeight: '700' },
});

/* ── Station row ── */
function StationRow({ station, allPrices, fuelFilter, isDark, localCurrency, onPress, index }: {
  station: Station; allPrices: number[]; fuelFilter: string | null;
  isDark: boolean; localCurrency: string; onPress: () => void; index: number;
}) {
  const thm = isDark ? Colors.dark : Colors.light;
  const best = bestPrice(station, fuelFilter);
  const tier = best?.price ? getPriceTier(best.price, allPrices) : 'unknown';
  const col = tierColor(tier);
  return (
    <AnimatedTouchable
      entering={FadeInDown.delay(80 * index).springify().damping(18)}
      style={[sr.card, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
      onPress={onPress} activeOpacity={0.78}
    >
      <View style={[sr.rank, { backgroundColor: index === 0 ? Colors.price.cheap + '20' : thm.surfaceElevated }]}>
        <Text style={[sr.rankTxt, { color: index === 0 ? Colors.price.cheap : thm.textMuted }]}>{index === 0 ? '★' : `#${index + 1}`}</Text>
      </View>
      <View style={[sr.icon, { backgroundColor: col + '15' }]}>
        <MaterialCommunityIcons name="gas-station" size={18} color={col} />
      </View>
      <View style={sr.info}>
        <Text style={[sr.name, { color: thm.text }]} numberOfLines={1}>{station.brand ?? station.name}</Text>
        <Text style={[sr.sub, { color: thm.textMuted }]}>{formatDistance(station.distance)}{best?.fuelType ? ` · ${best.fuelType}` : ''}</Text>
      </View>
      <View style={[sr.badge, { backgroundColor: col + '15', borderColor: col + '30', borderWidth: 1 }]}>
        <Text style={[sr.price, { color: col }]}>{best ? formatPrice(best.price, localCurrency) : '—'}</Text>
      </View>
    </AnimatedTouchable>
  );
}
const sr = StyleSheet.create({
  card:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.xl, borderWidth: 1, marginBottom: Spacing.sm, gap: Spacing.sm, ...Shadows.sm },
  rank:    { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  rankTxt: { fontSize: 10, fontWeight: '900' },
  icon:    { width: 36, height: 36, borderRadius: Radii.md, justifyContent: 'center', alignItems: 'center' },
  info:    { flex: 1 },
  name:    { fontSize: FontSize.md, fontWeight: '700', marginBottom: 2, letterSpacing: -0.2 },
  sub:     { fontSize: 11, fontWeight: '500' },
  badge:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.full },
  price:   { fontSize: FontSize.md, fontWeight: '900', letterSpacing: -0.5 },
});

/* ━━━ MAIN ━━━ */
export default function DashboardScreen() {
  const isDark = useIsDark();
  const thm    = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<any>>();

  const countryCode    = useAppStore(s => s.countryCode);
  const manualCurrency = useAppStore(s => s.manualCurrency);
  const localCurrency  = useMemo(() => getLocalCurrencyCode(), [countryCode, manualCurrency]);

  /* location */
  const { coords, loading: locLoading } = useLocation();
  const locationName    = useAppStore(s => s.locationName);
  const setLocationName = useAppStore(s => s.setLocationName);
  const { data: geo }   = useReverseGeocode({ lat: coords?.latitude, lon: coords?.longitude, enabled: !!coords });
  useEffect(() => { if (geo?.city) setLocationName(geo.city); }, [geo, setLocationName]);

  /* store */
  const searchRadius       = useAppStore(s => s.searchRadius);
  const fuelFilter         = useAppStore(s => s.filters.fuelType);
  const setFilters         = useAppStore(s => s.setFilters);
  const setSelectedStation = useAppStore(s => s.setSelectedStation);
  const setCachedStations  = useAppStore(s => s.setCachedStations);
  const savedCalculations  = useAppStore(s => s.savedCalculations);
  const trackAppOpen       = useAppStore(s => s.trackAppOpen);

  /* map */
  const mapRef = useRef<TomTomMapRef>(null);
  const [mapMoved, setMapMoved]       = useState(false);
  const [mapCenterState, setMapCenter] = useState<typeof coords>(null);
  const mapCenter = mapCenterState ?? coords;

  useEffect(() => { if (coords && !mapCenterState) setMapCenter(coords); }, [coords, mapCenterState]);

  /* search */
  const { query: sq, results: sr2, loading: sl, search: onSearch, clear: clearSearch } = useSearchLocation(coords?.latitude, coords?.longitude);
  const [searchActive, setSearchActive] = useState(false);

  /* stations */
  const { data: stations = [], isLoading, isRefetching, refetch } = useStations({
    lat: coords?.latitude, lon: coords?.longitude, radius: searchRadius, enabled: !!coords,
  });
  useEffect(() => { if (stations.length > 0) setCachedStations(stations); }, [stations, setCachedStations]);
  useFocusEffect(useCallback(() => { if (coords) void refetch(); }, [refetch, coords]));
  useEffect(() => { trackAppOpen(); }, [trackAppOpen]);
  useEffect(() => {
    notificationService.maybeSendWeeklySavingsSummary?.(savedCalculations, localCurrency).catch(() => {});
  }, [savedCalculations, localCurrency]);

  const allPrices = useMemo(
    () => stations.map(s => bestPrice(s, fuelFilter)?.price).filter(Boolean) as number[],
    [stations, fuelFilter],
  );
  const cheapest = useMemo(
    () => [...stations].filter(s => bestPrice(s, fuelFilter) != null)
      .sort((a, b) => (bestPrice(a, fuelFilter)?.price ?? 0) - (bestPrice(b, fuelFilter)?.price ?? 0))
      .slice(0, 15),
    [stations, fuelFilter],
  );
  const minPrice = allPrices.length ? Math.min(...allPrices) : null;
  const avgPrice = allPrices.length ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : null;
  const sym = currencySymbol(localCurrency);

  const handleSelect = useCallback((id: string) => {
    if (!id) return;
    setSelectedStation(id);
    navigation.navigate('StationDetail', { stationId: id, allPrices });
  }, [setSelectedStation, navigation, allPrices]);

  const handleRecenter = useCallback(() => {
    if (!coords) return;
    setMapCenter({ ...coords });
    setMapMoved(false);
  }, [coords]);

  const handleSearchSelect = useCallback((item: { latitude: number; longitude: number; name: string }) => {
    setMapCenter({ latitude: item.latitude, longitude: item.longitude });
    clearSearch(); setSearchActive(false); setMapMoved(false);
  }, [clearSearch]);

  const greeting = getGreeting();

  return (
    <View style={[g.root, { backgroundColor: thm.background }]}>

      {/* ══ MAP HERO ══ */}
      <View style={[g.mapWrap, { height: MAP_H }]}>
        {locLoading ? (
          <View style={[g.mapCenter, { backgroundColor: thm.surface }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[g.locatingTxt, { color: thm.textMuted }]}>Locating…</Text>
          </View>
        ) : (
          <TomTomMap
            ref={mapRef}
            stations={stations}
            allPrices={allPrices}
            fuelFilter={fuelFilter}
            localCurrency={localCurrency}
            onSelectStation={handleSelect}
            isDark={isDark}
            userCoords={mapCenter}
            autoCenter={!mapMoved}
            onMapMoved={() => setMapMoved(true)}
          />
        )}

        {/* Top overlay: location badge + search */}
        <View style={[g.mapTop, { top: insets.top + 8 }]}>
          {searchActive ? (
            <SearchBar
              query={sq} results={sr2} loading={sl}
              onChangeText={onSearch}
              onSelect={handleSearchSelect}
              onClear={() => { clearSearch(); setSearchActive(false); }}
              placeholder="Search location…"
            />
          ) : (
            <View style={[g.locBadge, { backgroundColor: isDark ? 'rgba(17,17,24,0.92)' : 'rgba(255,255,255,0.95)', borderColor: thm.border, borderWidth: 1 }]}>
              <View style={g.liveDot} />
              <Text style={[g.locTxt, { color: thm.text }]} numberOfLines={1}>{locationName || 'Locating…'}</Text>
              <TouchableOpacity style={[g.searchBtn, { backgroundColor: isDark ? '#1A1A24' : '#F1F5F9' }]} onPress={() => setSearchActive(true)}>
                <MaterialCommunityIcons name="magnify" size={18} color={thm.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Fuel chips overlay */}
        {!searchActive && (
          <View style={g.chipsWrap}>
            <FuelChips selected={fuelFilter} onChange={k => setFilters({ fuelType: k })} isDark={isDark} />
          </View>
        )}

        {/* Map controls */}
        <View style={g.mapControls}>
          <TouchableOpacity style={[g.ctrlBtn, { backgroundColor: isDark ? Colors.dark.surfaceElevated : '#FFF' }]} onPress={() => mapRef.current?.zoomIn()}>
            <MaterialCommunityIcons name="plus" size={20} color={thm.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[g.ctrlBtn, { backgroundColor: isDark ? Colors.dark.surfaceElevated : '#FFF' }]} onPress={() => mapRef.current?.zoomOut()}>
            <MaterialCommunityIcons name="minus" size={20} color={thm.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[g.ctrlBtn, { backgroundColor: isDark ? Colors.dark.surfaceElevated : '#FFF' }]} onPress={handleRecenter}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={mapMoved ? Colors.primary : thm.text} />
          </TouchableOpacity>
        </View>

        {/* Stats strip pinned to bottom of map */}
        {!isLoading && stations.length > 0 && (
          <Animated.View entering={FadeInDown.springify()} style={[g.statsStrip, { backgroundColor: isDark ? 'rgba(10,10,15,0.92)' : 'rgba(255,255,255,0.95)', borderColor: thm.border }]}>
            <View style={g.statItem}>
              <Text style={[g.statVal, { color: Colors.price.cheap }]}>{minPrice != null ? `${sym}${minPrice.toFixed(2)}` : '—'}</Text>
              <Text style={[g.statLbl, { color: thm.textMuted }]}>CHEAPEST</Text>
            </View>
            <View style={[g.statDiv, { backgroundColor: thm.border }]} />
            <View style={g.statItem}>
              <Text style={[g.statVal, { color: thm.text }]}>{stations.length}</Text>
              <Text style={[g.statLbl, { color: thm.textMuted }]}>STATIONS</Text>
            </View>
            <View style={[g.statDiv, { backgroundColor: thm.border }]} />
            <View style={g.statItem}>
              <Text style={[g.statVal, { color: Colors.price.medium }]}>{avgPrice != null ? `${sym}${avgPrice.toFixed(2)}` : '—'}</Text>
              <Text style={[g.statLbl, { color: thm.textMuted }]}>AVERAGE</Text>
            </View>
            <View style={[g.statDiv, { backgroundColor: thm.border }]} />
            <View style={g.statItem}>
              <View style={g.livePulse} />
              <Text style={[g.statLbl, { color: '#10B981', fontWeight: '700' }]}>LIVE</Text>
            </View>
          </Animated.View>
        )}
        {isLoading && (
          <View style={[g.loadingStrip, { backgroundColor: isDark ? 'rgba(10,10,15,0.88)' : 'rgba(255,255,255,0.92)' }]}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={[g.loadingTxt, { color: thm.textMuted }]}>Fetching prices…</Text>
          </View>
        )}
      </View>

      {/* ══ SCROLLABLE CONTENT ══ */}
      <ScrollView
        style={g.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_H + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {/* Greeting header */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={[g.greetRow, { paddingTop: Spacing.lg }]}>
          <View style={{ flex: 1 }}>
            <Text style={[g.greetTxt, { color: thm.text }]}>{greeting.text}</Text>
            <Text style={[g.greetSub, { color: thm.textMuted }]}>{cheapest.length > 0 ? `${cheapest.length} cheap stations found nearby` : 'Pull down to refresh'}</Text>
          </View>
          <TouchableOpacity style={[g.settingsBtn, { backgroundColor: thm.card, borderColor: thm.cardBorder, borderWidth: 1 }]} onPress={() => navigation.navigate('SettingsTab')}>
            <MaterialCommunityIcons name="cog-outline" size={22} color={thm.text} />
          </TouchableOpacity>
        </Animated.View>

        <View style={g.content}>
          {/* Section header */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={g.sectionRow}>
            <Text style={[g.sectionTxt, { color: thm.textMuted }]}>CHEAPEST NEAR ME</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ListTab')} hitSlop={12}>
              <Text style={[g.viewAll, { color: Colors.primary }]}>View All →</Text>
            </TouchableOpacity>
          </Animated.View>

          <NativeAd />

          {/* Station list */}
          {isLoading ? (
            <View style={{ gap: Spacing.sm }}>
              {[0, 1, 2].map(i => (
                <Animated.View key={i} entering={FadeInDown.delay(i * 100).springify()} style={[g.skeleton, { backgroundColor: thm.shimmer, borderColor: thm.borderSubtle }]}>
                  <View style={[g.skCircle, { backgroundColor: thm.border }]} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={[g.skLine, { backgroundColor: thm.border, width: '60%' }]} />
                    <View style={[g.skLine, { backgroundColor: thm.border, width: '35%', height: 8 }]} />
                  </View>
                  <View style={[g.skBadge, { backgroundColor: thm.border }]} />
                </Animated.View>
              ))}
            </View>
          ) : cheapest.length > 0 ? (
            cheapest.map((station, idx) => (
              <StationRow
                key={station.id}
                station={station}
                allPrices={allPrices}
                fuelFilter={fuelFilter}
                isDark={isDark}
                localCurrency={localCurrency}
                index={idx}
                onPress={() => handleSelect(station.id)}
              />
            ))
          ) : (
            <View style={[g.empty, { backgroundColor: thm.card, borderColor: thm.cardBorder, borderWidth: 1 }]}>
              <MaterialCommunityIcons name="gas-station-off-outline" size={32} color={thm.textMuted} />
              <Text style={[g.emptyTxt, { color: thm.text }]}>No stations found</Text>
              <Text style={[g.emptySub, { color: thm.textMuted }]}>Try expanding your search radius</Text>
            </View>
          )}

          {/* Quick links row */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={g.quickRow}>
            <AnimatedTouchable style={[g.quickCard, { backgroundColor: thm.card, borderColor: thm.cardBorder, borderWidth: 1 }]} onPress={() => navigation.navigate('PricesTab')} activeOpacity={0.8}>
              <View style={[g.quickIcon, { backgroundColor: Colors.price.cheapBg }]}>
                <MaterialCommunityIcons name="earth" size={20} color={Colors.price.cheap} />
              </View>
              <Text style={[g.quickLbl, { color: thm.text }]}>Global Prices</Text>
              <Text style={[g.quickSub, { color: thm.textMuted }]}>Compare worldwide</Text>
            </AnimatedTouchable>
            <AnimatedTouchable style={[g.quickCard, { backgroundColor: thm.card, borderColor: thm.cardBorder, borderWidth: 1 }]} onPress={() => navigation.navigate('SavingsTab')} activeOpacity={0.8}>
              <View style={[g.quickIcon, { backgroundColor: Colors.accentGlow }]}>
                <MaterialCommunityIcons name="piggy-bank-outline" size={20} color={Colors.accent} />
              </View>
              <Text style={[g.quickLbl, { color: thm.text }]}>Savings</Text>
              <Text style={[g.quickSub, { color: thm.textMuted }]}>Calculate costs</Text>
            </AnimatedTouchable>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const g = StyleSheet.create({
  root:        { flex: 1 },
  mapWrap:     { position: 'relative', overflow: 'hidden' },
  mapCenter:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  locatingTxt: { marginTop: 12, fontSize: FontSize.sm, fontWeight: '500' },

  /* map overlays */
  mapTop:    { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  locBadge:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 6, paddingVertical: 8, borderRadius: Radii.full, ...Shadows.lg },
  liveDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  locTxt:    { flex: 1, fontSize: FontSize.md, fontWeight: '700', letterSpacing: -0.3 },
  searchBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  chipsWrap: { position: 'absolute', bottom: 52, left: 0, right: 0, zIndex: 10 },
  mapControls: { position: 'absolute', right: 12, bottom: 60, gap: 8, zIndex: 10 },
  ctrlBtn:   { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', ...Shadows.md },

  /* stats strip */
  statsStrip: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderTopWidth: 1, zIndex: 10 },
  statItem:   { flex: 1, alignItems: 'center' },
  statVal:    { fontSize: FontSize.md, fontWeight: '900', letterSpacing: -0.4 },
  statLbl:    { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginTop: 1 },
  statDiv:    { width: 1, height: 26 },
  livePulse:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginBottom: 2 },

  /* loading strip */
  loadingStrip: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  loadingTxt:   { fontSize: FontSize.sm, fontWeight: '600' },

  /* scrollable */
  scroll:     { flex: 1 },
  greetRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  greetTxt:   { fontSize: FontSize.xxl, fontWeight: '900', letterSpacing: -0.6 },
  greetSub:   { fontSize: FontSize.sm, fontWeight: '500', marginTop: 3 },
  settingsBtn:{ width: 44, height: 44, borderRadius: Radii.full, justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  content:    { paddingHorizontal: Spacing.xl },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTxt: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  viewAll:    { fontSize: FontSize.sm, fontWeight: '700' },

  /* skeleton */
  skeleton:   { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.xl, borderWidth: 1, marginBottom: Spacing.sm, gap: Spacing.sm },
  skCircle:   { width: 36, height: 36, borderRadius: 18 },
  skLine:     { height: 12, borderRadius: 6 },
  skBadge:    { width: 56, height: 28, borderRadius: Radii.full },

  /* empty */
  empty:      { alignItems: 'center', padding: Spacing.xxxl, borderRadius: Radii.xxl, gap: Spacing.sm },
  emptyTxt:   { fontSize: FontSize.lg, fontWeight: '800', marginTop: 4 },
  emptySub:   { fontSize: FontSize.sm, fontWeight: '500', textAlign: 'center' },

  /* quick cards */
  quickRow:   { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  quickCard:  { flex: 1, padding: Spacing.lg, borderRadius: Radii.xxl, gap: 4, ...Shadows.sm },
  quickIcon:  { width: 40, height: 40, borderRadius: Radii.md, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickLbl:   { fontSize: FontSize.md, fontWeight: '800', letterSpacing: -0.3 },
  quickSub:   { fontSize: 12, fontWeight: '500' },
});
