import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, FlatList, Modal, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocation }        from '../hooks/useLocation';
import { useStations }        from '../hooks/useStations';
import { useIsDark }          from '../hooks/useIsDark';
import { useReverseGeocode }  from '../hooks/useReverseGeocode';
import { useSearchLocation }  from '../hooks/useSearchLocation';
import { useAppStore }        from '../store/useAppStore';
import { useInterstitialAd }  from '../hooks/useInterstitialAd';

import { TomTomMap, type TomTomMapRef } from '../components/TomTomMap';
import { StationDetailModal } from '../components/StationDetailModal';
import { EmptyState }         from '../components/EmptyState';
import { SearchBar }          from '../components/SearchBar';

import { SkeletonCards }      from '../components/SkeletonCards';
import { getLocalCurrencyCode } from '../services/fuelPriceService';

import { bestPrice, formatPrice, getPriceTier, currencySymbol } from '../utils/price';
import { formatDistance }     from '../utils/geo';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { FUEL_TYPES }         from '../constants/fuelTypes';
import type { Station }       from '../types/station';

/* ── constants ─────────────────────────────────────── */
const TAB_BAR_H = 65;
const PEEK_H    = 116;
const RADIUS_OPTIONS = [
  { label: '2 km',  value: 2000  },
  { label: '5 km',  value: 5000  },
  { label: '10 km', value: 10000 },
  { label: '20 km', value: 20000 },
  { label: '50 km', value: 50000 },
];

/* ── glass helper ───────────────────────────────────── */
const glass = (dark: boolean) =>
  dark ? Colors.dark.glass : Colors.light.glass;
const borderSubtle = (dark: boolean) =>
  dark ? Colors.dark.glassBorder : Colors.light.glassBorder;


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUB-COMPONENTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Fuel filter chips ──────────────────────────────── */
function FuelChips({
  selected, onChange, isDark,
}: { selected: string | null; onChange: (v: string | null) => void; isDark: boolean }) {
  const text   = isDark ? Colors.dark.text   : Colors.light.text;
  const muted  = isDark ? Colors.dark.textMuted : Colors.light.textMuted;
  const glassBg = isDark ? Colors.dark.surfaceElevated : '#FFFFFF';
  const borderC = isDark ? Colors.dark.border : '#E2E8F0';

  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={fc.row} style={fc.scroll}
    >
      {/* All */}
      <TouchableOpacity
        style={[fc.chip, !selected ? fc.chipActive : { backgroundColor: glassBg, borderWidth: 1, borderColor: borderC }]}
        onPress={() => onChange(null)} activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="gas-station" size={16} color={!selected ? '#EF4444' : muted} />
        <Text style={[fc.label, { color: !selected ? '#FFFFFF' : text }]}>All</Text>
      </TouchableOpacity>

      {FUEL_TYPES.map((ft, idx) => {
        const on = selected === ft.tomtomMatch;
        return (
          <Animated.View key={ft.key} entering={FadeInRight.delay(idx * 100).springify()}>
            <TouchableOpacity
              style={[fc.chip, on ? fc.chipActive : { backgroundColor: glassBg, borderWidth: 1, borderColor: borderC }]}
              onPress={() => onChange(on ? null : ft.tomtomMatch)} activeOpacity={0.8}
            >
              <Text style={[fc.label, { color: on ? '#FFFFFF' : text }]}>
                {ft.tomtomMatch}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}
const fc = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row:    { paddingHorizontal: Spacing.lg, paddingVertical: 8, gap: 10 },
  chip:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radii.full, ...Shadows.sm },
  chipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A', borderWidth: 1 },
  label:  { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
});

/* ── Control button ─────────────────────────────────── */
function CtrlBtn({
  icon, onPress, isDark, color,
}: { icon: string; onPress: () => void; isDark: boolean; color?: string }) {
  return (
    <TouchableOpacity
      style={[cb.btn, { backgroundColor: isDark ? Colors.dark.surfaceElevated : '#FFFFFF' }]}
      onPress={onPress} activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color ?? (isDark ? '#FFF' : '#000')} />
    </TouchableOpacity>
  );
}
const cb = StyleSheet.create({
  btn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', ...Shadows.md },
});

/* ── Mini station peek card ─────────────────────────── */
function PeekCard({
  station, allPrices, fuelFilter, isDark, localCurrency, isBest, onPress,
}: { station: Station; allPrices: number[]; fuelFilter: string | null; isDark: boolean; localCurrency: string; isBest?: boolean; onPress: () => void }) {
  const text  = isDark ? Colors.dark.text      : Colors.light.text;
  const muted = isDark ? Colors.dark.textMuted : Colors.light.textMuted;
  const sec   = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const best  = bestPrice(station, fuelFilter);
  const priceValue = best ? best.price.toFixed(2) : '—';
  
  const tier  = best ? getPriceTier(best.price, allPrices) : 'unknown';
  const tierColors: Record<string, string> = {
    cheap: Colors.price.cheap, medium: Colors.price.medium,
    expensive: Colors.price.expensive, unknown: Colors.price.unknown,
  };
  const tc = isBest ? Colors.price.cheap : (tier === 'medium' ? '#F59E0B' : tierColors[tier]);

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      <TouchableOpacity
        style={[
          pk.card,
          { backgroundColor: isDark ? Colors.dark.surfaceElevated : '#FFFFFF', borderColor: isDark ? Colors.dark.border : '#E2E8F0', borderWidth: 1 },
          isBest && { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: '#10B981', borderWidth: 2 }
        ]}
        onPress={onPress} activeOpacity={0.88}
      >
        {isBest && (
          <View style={pk.bestBadge}>
            <MaterialCommunityIcons name="star-four-points" size={10} color="#FFF" />
            <Text style={pk.bestBadgeTxt}>BEST PRICE</Text>
          </View>
        )}

        <View style={pk.headerRow}>
          <View style={[pk.iconSquare, { backgroundColor: isDark ? '#1F2937' : '#0F172A' }]}>
            <MaterialCommunityIcons name="gas-station" size={20} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[pk.name, { color: text }]} numberOfLines={1}>
              {station.brand ?? station.name}
            </Text>
            <Text style={[pk.addr, { color: sec }]} numberOfLines={1}>
              {station.address?.split(',')[0]} • {formatDistance(station.distance)} away
            </Text>
          </View>
        </View>

        <View style={pk.priceRow}>
          <View style={pk.priceLeft}>
            <Text style={[pk.currency, { color: sec }]}>{localCurrency}</Text>
            <Text style={[pk.priceText, { color: tc }]}>{priceValue}</Text>
          </View>
          <View style={pk.priceRight}>
            <View style={pk.priceRightTop}>
              <MaterialCommunityIcons name="navigation-variant" size={12} color={muted} />
              <Text style={[pk.distText, { color: muted }]}>3 min drive</Text>
            </View>
            <Text style={[pk.updatedText, { color: muted }]}>Updated 4m ago ✓</Text>
          </View>
        </View>

        <View style={pk.trendRow}>
          <MaterialCommunityIcons name="chart-bar" size={14} color={isBest ? tc : '#F59E0B'} style={{opacity: 0.6}} />
          <Text style={[pk.trendText, { color: isBest ? tc : '#F59E0B' }]}>
            {isBest ? '↓ R0.37 vs area avg' : '→ stable this week'}
          </Text>
        </View>

        <View style={[pk.navBtn, { backgroundColor: isBest ? '#10B981' : (isDark ? '#1F2937' : '#0F172A') }]}>
          <MaterialCommunityIcons name="compass" size={16} color={isBest ? '#FFFFFF' : '#F59E0B'} />
          <Text style={[pk.navBtnTxt, { color: '#FFFFFF' }]}>
            {isBest ? 'Navigate • 3 min' : 'Navigate'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const pk = StyleSheet.create({
  card: { width: 260, borderRadius: Radii.xxl, overflow: 'hidden', marginRight: Spacing.md, padding: Spacing.lg, ...Shadows.md },
  bestBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: Radii.lg },
  bestBadgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md, paddingRight: 30 },
  iconSquare: { width: 40, height: 40, borderRadius: Radii.md, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: FontSize.lg, fontWeight: '800', letterSpacing: -0.4, marginBottom: 2 },
  addr: { fontSize: 11, fontWeight: '500', opacity: 0.8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.xs },
  priceLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  currency: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  priceText: { fontSize: 32, fontWeight: '900', letterSpacing: -1, lineHeight: 36 },
  priceRight: { alignItems: 'flex-end', paddingBottom: 4 },
  priceRightTop: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  distText: { fontSize: 11, fontWeight: '600' },
  updatedText: { fontSize: 10, fontWeight: '500' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.md },
  trendText: { fontSize: 10, fontWeight: '700', opacity: 0.9 },
  navBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radii.xl },
  navBtnTxt: { fontSize: FontSize.md, fontWeight: '800' },
});

/* ── Radius picker modal ────────────────────────────── */
function RadiusPicker({
  visible, current, onSelect, onClose, isDark,
}: { visible: boolean; current: number; onSelect: (v: number) => void; onClose: () => void; isDark: boolean }) {
  const surf   = isDark ? Colors.dark.surface : Colors.light.surface;
  const border = borderSubtle(isDark);
  const text   = isDark ? Colors.dark.text    : Colors.light.text;
  const elev   = isDark ? Colors.dark.surfaceElevated : Colors.light.surfaceElevated;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={rm.backdrop} onPress={onClose} />
      <View style={[rm.sheet, { backgroundColor: surf, borderColor: border }]}>
        <View style={[rm.handle, { backgroundColor: isDark ? '#333' : '#CCC' }]} />
        <Text style={[rm.title, { color: text }]}>Search Radius</Text>
        <View style={rm.grid}>
          {RADIUS_OPTIONS.map((o) => {
            const on = o.value === current;
            return (
              <TouchableOpacity
                key={o.value}
                style={[rm.opt, { backgroundColor: on ? Colors.primary : elev, borderColor: on ? Colors.primary : border }]}
                onPress={() => { onSelect(o.value); onClose(); }} activeOpacity={0.8}
              >
                <Text style={[rm.optTxt, { color: on ? '#FFF' : text }]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
const rm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:    { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: Radii.xxl, borderTopRightRadius: Radii.xxl, padding: Spacing.xxl, paddingBottom: Spacing.huge, alignItems: 'center', ...Shadows.xl },
  handle:   { width: 48, height: 5, borderRadius: 3, marginBottom: Spacing.xl },
  title:    { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.5, marginBottom: Spacing.xl, alignSelf: 'flex-start' },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, alignSelf: 'flex-start' },
  opt:      { paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg, borderRadius: Radii.full, borderWidth: 1, ...Shadows.sm },
  optTxt:   { fontSize: FontSize.md, fontWeight: '700' },
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN SCREEN
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function HomeScreen() {
  const { t } = useTranslation();
  const isDark = useIsDark();
  const thm    = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const countryCode = useAppStore((s) => s.countryCode);
  const manualCurrency = useAppStore((s) => s.manualCurrency);
  const localCurrency = useMemo(
    () => getLocalCurrencyCode(),
    [countryCode, manualCurrency],
  );

  /* ── location ─── */
  const { coords, loading: locLoading, error: locError, refresh: reLocate } = useLocation();

  /* ── store ─── */
  const searchRadius      = useAppStore((s) => s.searchRadius);
  const fuelFilter        = useAppStore((s) => s.filters.fuelType);
  const setSelectedStation = useAppStore((s) => s.setSelectedStation);
  const selectedId        = useAppStore((s) => s.selectedStationId);
  const locationName      = useAppStore((s) => s.locationName);
  const setLocationName   = useAppStore((s) => s.setLocationName);
  const setFilters        = useAppStore((s) => s.setFilters);
  const setSearchRadius   = useAppStore((s) => s.setSearchRadius);

  /* ── ads ─── */
  const { maybeShowAd } = useInterstitialAd();

  /* ── reverse geocode ─── */
  const { data: geo } = useReverseGeocode({ lat: coords?.latitude, lon: coords?.longitude, enabled: !!coords });
  useEffect(() => { if (geo?.city) setLocationName(geo.city); }, [geo, setLocationName]);

  /* ── search ─── */
  const { query: sq, results: sr, loading: sl, search: onSearch, clear: clearSearch } = useSearchLocation(coords?.latitude, coords?.longitude);
  const [searchActive, setSearchActive] = useState(false);

  /* ── map ref & state ─── */
  const mapRef = useRef<TomTomMapRef>(null);
  const [mapMoved, setMapMoved] = useState(false);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);

  // Use state for center but fall back to live coords if state is not yet set
  const [searchCentreState, setSearchCentre] = useState<typeof coords>(null);
  const [mapCenterState, setMapCenter] = useState<typeof coords>(null);

  const searchCentre = searchCentreState || coords;
  const mapCenter = mapCenterState || coords;

  useEffect(() => {
    if (coords && !searchCentreState) {
      setSearchCentre(coords);
      setMapCenter(coords);
    }
  }, [coords, searchCentreState]);

  /* ── stations ─── */
  const stationsQueryKey = ['stations', searchCentre?.latitude, searchCentre?.longitude, searchRadius];
  const { data: stations = [], isLoading, refetch } = useStations({
    lat: searchCentre?.latitude, lon: searchCentre?.longitude, radius: searchRadius, enabled: !!searchCentre,
  });

  useFocusEffect(
    useCallback(() => {
      if (searchCentre) {
        void refetch();
      }
    }, [refetch, searchCentre])
  );

  /* ── derived ─── */
  const allPrices = useMemo(
    () => stations.map((s) => bestPrice(s, fuelFilter)?.price).filter((p): p is number => p != null),
    [stations, fuelFilter],
  );

  const selectedStation = useMemo(
    () => (selectedId ? stations.find((s) => s.id === selectedId) ?? null : null),
    [selectedId, stations],
  );

  const topStations = useMemo(
    () =>
      [...stations]
        .filter((s) => bestPrice(s, fuelFilter) != null)
        .sort((a, b) => (bestPrice(a, fuelFilter)?.price ?? 0) - (bestPrice(b, fuelFilter)?.price ?? 0))
        .slice(0, 10),
    [stations, fuelFilter],
  );

  const minPrice = allPrices.length ? Math.min(...allPrices) : null;

  /* ── layout helpers ─── */
  const tabBarH      = TAB_BAR_H + insets.bottom;
  const showPeek     = !selectedStation && !searchActive && topStations.length > 0;
  const peekBottom   = tabBarH;
  const ctrlBottom   = tabBarH + (showPeek ? 350 : 0) + Spacing.lg;

  /* ── callbacks ─── */
  const handleSelect = useCallback((id: string) => {
    setSelectedStation(id || null);
  }, [setSelectedStation]);

  const handleRecenter = useCallback(() => {
    if (!coords) return;
    setMapCenter({ ...coords });
    setSearchCentre(coords);
    setMapMoved(false);
  }, [coords]);

  const handleSearchSelect = useCallback((item: { latitude: number; longitude: number; name: string }) => {
    const c = { latitude: item.latitude, longitude: item.longitude };
    setSearchCentre(c); setMapCenter(c); clearSearch(); setSearchActive(false); setMapMoved(false);
  }, [clearSearch]);

  /* ── guards ─── */
  if (locLoading) {
    return (
      <View style={[g.center, { backgroundColor: thm.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[g.loadTxt, { color: thm.textSecondary }]}>{t('map.locating')}</Text>
      </View>
    );
  }
  if (locError || !coords) {
    return (
      <View style={[g.center, { backgroundColor: thm.background }]}>
        <EmptyState icon="crosshairs-off" title={t('map.permissionDenied')} actionLabel="Retry" onAction={reLocate} />
      </View>
    );
  }

  /* ── render ─── */
  return (
    <View style={g.flex}>
      {/* ── Full-screen map ─────────────────────────── */}
      <TomTomMap
        ref={mapRef}
        stations={stations}
        allPrices={allPrices}
        fuelFilter={fuelFilter}
        localCurrency={localCurrency}
        onSelectStation={handleSelect}
        selectedStationId={selectedId}
        isDark={isDark}
        userCoords={mapCenter}
        autoCenter={!mapMoved}
        onMapMoved={() => setMapMoved(true)}
      />

      {/* ── TOP: search or location + chips ─────────── */}
      {searchActive ? (
        <SearchBar
          query={sq} results={sr} loading={sl}
          onChangeText={onSearch}
          onSelect={handleSearchSelect}
          onClear={() => { clearSearch(); setSearchActive(false); }}
          placeholder={t('map.searchPlaceholder')}
        />
      ) : (
        <View style={[g.topStack, { top: insets.top + Spacing.sm }]}>
          {/* Location badge */}
          {locationName ? (
            <Animated.View 
              entering={FadeInDown.springify()}
              style={[g.locBadge, { backgroundColor: isDark ? Colors.dark.surfaceElevated : '#FFFFFF', borderColor: isDark ? Colors.dark.border : '#E2E8F0' }]}
            >
              <View style={g.liveDotWrap}>
                <View style={g.liveDot} />
              </View>
              <View style={g.locInfo}>
                <Text style={[g.locText, { color: thm.text }]} numberOfLines={1}>{locationName}</Text>
                <Text style={[g.locSub, { color: thm.textMuted }]}>CURRENT LOCATION</Text>
              </View>
              <TouchableOpacity 
                style={[g.searchBtn, { backgroundColor: isDark ? '#333' : '#F1F5F9' }]} 
                onPress={() => setSearchActive(true)} 
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <MaterialCommunityIcons name="magnify" size={20} color={thm.text} />
              </TouchableOpacity>
            </Animated.View>
          ) : null}

          {/* Fuel filter chips */}
          <FuelChips selected={fuelFilter} onChange={(k) => setFilters({ fuelType: k })} isDark={isDark} />
        </View>
      )}

      {/* ── RIGHT: zoom + recenter controls ─────────── */}
      <View style={[g.rightControls, { bottom: ctrlBottom + 60 }]}>
        <CtrlBtn icon="plus" onPress={() => mapRef.current?.zoomIn()} isDark={isDark} />
        <View style={{height: 10}} />
        <CtrlBtn icon="minus" onPress={() => mapRef.current?.zoomOut()} isDark={isDark} />
        <View style={{height: 10}} />
        <CtrlBtn icon="crosshairs-gps" onPress={handleRecenter} isDark={isDark} color={mapMoved ? Colors.primary : (isDark ? '#FFF' : '#000')} />
      </View>

      {/* ── BOTTOM-LEFT: station count badge ─────────── */}
      {!isLoading && stations.length > 0 && !searchActive && (
        <TouchableOpacity
          style={[g.countBadge, { backgroundColor: isDark ? Colors.dark.surfaceElevated : '#FFFFFF', bottom: ctrlBottom }]}
          onPress={() => setShowRadiusPicker(true)} activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="clock-outline" size={14} color={thm.textMuted} />
          <Text style={[g.countTxt, { color: thm.textMuted }]}>
            Prices updated 4 min ago • {stations.length} stations
          </Text>
        </TouchableOpacity>
      )}

      {/* Loading spinner (top) */}
      {isLoading && !locationName && (
        <View style={[g.spinner, { top: insets.top + 90 }]}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}

      {/* ── BOTTOM PEEK: cheapest stations strip ─────── */}
      {showPeek && (
        <View style={[g.peek, { bottom: peekBottom, backgroundColor: thm.background }]}>
          <View style={g.handleWrap}>
            <View style={g.handle} />
          </View>
          <View style={g.sheetHeader}>
            <Text style={[g.sheetTitle, { color: thm.textSecondary }]}>CHEAPEST NEARBY</Text>
            <View style={g.savedBadge}>
              <MaterialCommunityIcons name="sack" size={12} color="#10B981" />
              <Text style={g.savedBadgeTxt}>Saved {currencySymbol(localCurrency)}18 today</Text>
            </View>
          </View>
          <FlatList
            data={topStations}
            horizontal
            keyExtractor={(s) => s.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={g.peekList}
            renderItem={({ item, index }) => (
              <PeekCard
                station={item}
                allPrices={allPrices}
                fuelFilter={fuelFilter}
                isDark={isDark}
                localCurrency={localCurrency}
                isBest={index === 0}
                onPress={() => handleSelect(item.id)}
              />
            )}
          />
        </View>
      )}

      {/* ── SKELETON LOADING ─── */}
      {!showPeek && isLoading && (
        <View style={[g.peek, { bottom: peekBottom }]}>
          <SkeletonCards count={3} />
        </View>
      )}

      {/* ── Station detail modal ─────────────────────── */}
      {selectedStation && (
        <StationDetailModal
          station={selectedStation}
          allPrices={allPrices}
          userCoords={coords}
          onClose={() => setSelectedStation(null)}
          stationsQueryKey={stationsQueryKey}
        />
      )}

      {/* ── Radius picker ────────────────────────────── */}
      <RadiusPicker
        visible={showRadiusPicker}
        current={searchRadius}
        onSelect={setSearchRadius}
        onClose={() => setShowRadiusPicker(false)}
        isDark={isDark}
      />
    </View>
  );
}

/* ── styles ───────────────────────────────────────────── */
const g = StyleSheet.create({
  flex:    { flex: 1 },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadTxt: { marginTop: Spacing.md, fontSize: FontSize.md },

  /* top overlay stack */
  topStack: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    gap: Spacing.sm,
  },

  /* location badge */
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
    paddingLeft: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    minWidth: '72%',
    maxWidth: '92%',
    ...Shadows.lg,
  },
  liveDotWrap: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(16,185,129,0.2)', justifyContent: 'center', alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  locInfo: { flex: 1 },
  locText: { fontSize: FontSize.lg, fontWeight: '800', letterSpacing: -0.4 },
  locSub:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.7 },
  searchBtn: { width: 36, height: 36, borderRadius: Radii.full, justifyContent: 'center', alignItems: 'center' },

  /* right controls */
  rightControls: {
    position: 'absolute',
    right: Spacing.lg,
    alignItems: 'center',
  },

  /* station count badge */
  countBadge: {
    position: 'absolute',
    left: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radii.full,
    ...Shadows.md,
  },
  countTxt: { fontSize: 12, fontWeight: '600' },

  /* peek strip */
  peek: { position: 'absolute', left: 0, right: 0, borderTopLeftRadius: Radii.xxl, borderTopRightRadius: Radii.xxl, ...Shadows.lg },
  handleWrap: { alignItems: 'center', paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  sheetTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full },
  savedBadgeTxt: { color: '#10B981', fontSize: 11, fontWeight: '800' },
  peekList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: Spacing.xl },

  /* ad banner */
  adBanner: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
