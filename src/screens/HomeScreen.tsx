import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, FlatList, Modal, Pressable,
} from 'react-native';
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
import { AdBanner }           from '../components/AdBanner';
import { SkeletonCards }      from '../components/SkeletonCards';
import { getLocalCurrencyCode } from '../services/fuelPriceService';

import { bestPrice, formatPrice, getPriceTier } from '../utils/price';
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
  const glassBg = glass(isDark);
  const borderC = borderSubtle(isDark);

  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={fc.row} style={fc.scroll}
    >
      {/* All */}
      <TouchableOpacity
        style={[fc.chip, !selected ? fc.chipActive : { backgroundColor: glassBg, borderColor: borderC }]}
        onPress={() => onChange(null)} activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="gas-station-outline" size={14} color={!selected ? '#FFF' : muted} />
        <Text style={[fc.label, { color: !selected ? '#FFF' : text }]}>All</Text>
      </TouchableOpacity>

      {FUEL_TYPES.map((ft, idx) => {
        const on = selected === ft.tomtomMatch;
        return (
          <Animated.View key={ft.key} entering={FadeInRight.delay(idx * 100).springify()}>
            <TouchableOpacity
              style={[fc.chip, on ? fc.chipActive : { backgroundColor: glassBg, borderColor: borderC }]}
              onPress={() => onChange(on ? null : ft.tomtomMatch)} activeOpacity={0.8}
            >
              <Text style={[fc.label, { color: on ? '#FFF' : text }]}>
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
  chip:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radii.full, borderWidth: 1, ...Shadows.sm },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  label:  { fontSize: FontSize.md, fontWeight: '700', letterSpacing: -0.2 },
});

/* ── Price legend ───────────────────────────────────── */
function PriceLegend({ isDark }: { isDark: boolean }) {
  const sec = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  return (
    <View style={[pl.wrap, { backgroundColor: glass(isDark), borderColor: borderSubtle(isDark) }]}>
      {[
        { color: Colors.price.cheap,     label: 'Cheap' },
        { color: Colors.price.medium,    label: 'Fair'  },
        { color: Colors.price.expensive, label: 'High'  },
      ].map((i) => (
        <View key={i.label} style={pl.row}>
          <View style={[pl.dot, { backgroundColor: i.color }]} />
          <Text style={[pl.txt, { color: sec }]}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}
const pl = StyleSheet.create({
  wrap: { borderRadius: Radii.xl, paddingVertical: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, ...Shadows.sm },
  row:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:  { width: 10, height: 10, borderRadius: 5 },
  txt:  { fontSize: 11, fontWeight: '700' },
});

/* ── Control button ─────────────────────────────────── */
function CtrlBtn({
  icon, onPress, isDark, color,
}: { icon: string; onPress: () => void; isDark: boolean; color?: string }) {
  return (
    <TouchableOpacity
      style={cb.btn}
      onPress={onPress} activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color ?? Colors.primary} />
    </TouchableOpacity>
  );
}
const cb = StyleSheet.create({
  btn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
});

/* ── Mini station peek card ─────────────────────────── */
function PeekCard({
  station, allPrices, fuelFilter, isDark, onPress,
}: { station: Station; allPrices: number[]; fuelFilter: string | null; isDark: boolean; onPress: () => void }) {
  const text   = isDark ? Colors.dark.text   : Colors.light.text;
  const muted  = isDark ? Colors.dark.textMuted : Colors.light.textMuted;
  const best   = bestPrice(station, fuelFilter);
  const price  = best ? formatPrice(best.price, best.currency) : '—';
  const tier   = best ? getPriceTier(best.price, allPrices) : 'unknown';
  const pColor: Record<string, string> = { cheap: Colors.price.cheap, medium: Colors.price.medium, expensive: Colors.price.expensive, unknown: Colors.price.unknown };

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()}>
      <TouchableOpacity
        style={[pk.card, { backgroundColor: glass(isDark), borderColor: borderSubtle(isDark) }]}
        onPress={onPress} activeOpacity={0.9}
      >
        <View style={pk.topRow}>
          <View style={[pk.iconWrap, { backgroundColor: Colors.primary + '15' }]}>
            <MaterialCommunityIcons name="gas-station" size={22} color={Colors.primary} />
          </View>
          <View style={[pk.priceBadge, { backgroundColor: pColor[tier] + '15', borderColor: pColor[tier] + '30' }]}>
            <Text style={[pk.price, { color: pColor[tier] }]}>{price}</Text>
          </View>
        </View>
        <Text style={[pk.name, { color: text }]} numberOfLines={1}>{station.brand ?? station.name}</Text>
        <View style={pk.distRow}>
          <MaterialCommunityIcons name="near-me" size={14} color={muted} />
          <Text style={[pk.dist, { color: muted }]}>{formatDistance(station.distance)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}
const pk = StyleSheet.create({
  card:    { width: 160, borderRadius: Radii.xxl, borderWidth: 1, padding: Spacing.lg, marginRight: Spacing.md, ...Shadows.lg },
  topRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  iconWrap:{ width: 38, height: 38, borderRadius: Radii.lg, justifyContent: 'center', alignItems: 'center' },
  priceBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.full, borderWidth: 1 },
  price:   { fontSize: FontSize.md, fontWeight: '900', letterSpacing: -0.5 },
  name:    { fontSize: FontSize.md, fontWeight: '800', marginBottom: 6, letterSpacing: -0.3 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dist:    { fontSize: 13, fontWeight: '600' },
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
  const localCurrency = useMemo(() => getLocalCurrencyCode(), []);

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
  const { data: stations = [], isLoading } = useStations({
    lat: searchCentre?.latitude, lon: searchCentre?.longitude, radius: searchRadius, enabled: !!searchCentre,
  });

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
  const ctrlBottom   = tabBarH + (showPeek ? PEEK_H : 0) + Spacing.lg;

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
              style={[g.locBadge, { backgroundColor: glass(isDark), borderColor: borderSubtle(isDark) }]}
            >
              <MaterialCommunityIcons name="map-marker-outline" size={20} color={Colors.primary} />
              <View style={g.locInfo}>
                <Text style={[g.locText, { color: thm.text }]} numberOfLines={1}>{locationName}</Text>
                <Text style={[g.locSub, { color: thm.textMuted }]}>Current Location</Text>
              </View>
              <TouchableOpacity 
                style={[g.searchBtn, { backgroundColor: thm.surfaceElevated }]} 
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

      {/* ── TOP-RIGHT: price legend ──────────────────── */}
      {!searchActive && (
        <View style={[g.legendWrap, { top: insets.top + Spacing.sm }]}>
          <PriceLegend isDark={isDark} />
        </View>
      )}

      {/* ── RIGHT: zoom + recenter controls ─────────── */}
      <View style={[g.rightControls, { bottom: ctrlBottom, backgroundColor: glass(isDark), borderColor: borderSubtle(isDark) }]}>
        <CtrlBtn icon="plus"            onPress={() => mapRef.current?.zoomIn()}  isDark={isDark} />
        <View style={[g.separator, { backgroundColor: borderSubtle(isDark) }]} />
        <CtrlBtn icon="minus"           onPress={() => mapRef.current?.zoomOut()} isDark={isDark} />
        <View style={[g.separator, { backgroundColor: borderSubtle(isDark) }]} />
        <CtrlBtn icon="crosshairs-gps"  onPress={handleRecenter}                   isDark={isDark} color={mapMoved ? Colors.primary : thm.textMuted} />
      </View>

      {/* ── BOTTOM-LEFT: station count badge ─────────── */}
      {!isLoading && stations.length > 0 && !searchActive && (
        <TouchableOpacity
          style={[g.countBadge, { backgroundColor: glass(isDark), borderColor: borderSubtle(isDark), bottom: ctrlBottom }]}
          onPress={() => setShowRadiusPicker(true)} activeOpacity={0.8}
        >
          <View style={g.countIconWrap}>
            <MaterialCommunityIcons name="gas-station" size={16} color="#FFF" />
          </View>
          <View style={g.countCol}>
            <Text style={[g.countTxt, { color: thm.text }]}>{stations.length} <Text style={{fontWeight: '400', fontSize: FontSize.xs}}>Stations</Text></Text>
            {minPrice != null && (
              <Text style={[g.countSub, { color: Colors.price.cheap }]}>
                from {formatPrice(minPrice, localCurrency)}
              </Text>
            )}
          </View>
          <MaterialCommunityIcons name="tune-vertical" size={18} color={thm.textMuted} style={{marginLeft: 8}} />
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
        <View style={[g.peek, { bottom: peekBottom }]}>
          <FlatList
            data={topStations}
            horizontal
            keyExtractor={(s) => s.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={g.peekList}
            renderItem={({ item }) => (
              <PeekCard
                station={item}
                allPrices={allPrices}
                fuelFilter={fuelFilter}
                isDark={isDark}
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

      {/* ── Ad banner ────────────────────────────────── */}
      {!selectedStation && !showPeek && (
        <AdBanner style={g.adBanner} />
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
    paddingRight: Spacing.sm,
    paddingLeft: Spacing.xl,
    paddingVertical: 8,
    borderRadius: Radii.xl,
    borderWidth: 1,
    minWidth: '70%',
    maxWidth: '90%',
    ...Shadows.lg,
  },
  locInfo: { flex: 1, justifyContent: 'center' },
  locText: { fontSize: FontSize.md, fontWeight: '800', letterSpacing: -0.5 },
  locSub:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', opacity: 0.6 },
  searchBtn: { width: 38, height: 38, borderRadius: Radii.lg, justifyContent: 'center', alignItems: 'center' },

  /* price legend */
  legendWrap: { position: 'absolute', right: Spacing.lg },

  /* right controls */
  rightControls: {
    position: 'absolute',
    right: Spacing.lg,
    borderRadius: Radii.full,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  separator: { height: 1.5, width: '60%', alignSelf: 'center' },

  /* station count badge */
  countBadge: {
    position: 'absolute',
    left: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: Spacing.lg,
    paddingLeft: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    ...Shadows.lg,
  },
  countIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  countCol: { justifyContent: 'center' },
  countTxt: { fontSize: FontSize.sm, fontWeight: '800' },
  countSub: { fontSize: FontSize.xs, fontWeight: '700' },

  /* loading spinner */
  spinner: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: Spacing.sm,
    borderRadius: Radii.full,
  },

  /* peek strip */
  peek:     { position: 'absolute', left: 0, right: 0 },
  peekList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },

  /* ad banner */
  adBanner: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
