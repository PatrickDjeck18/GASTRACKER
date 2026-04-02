import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, FlatList, Modal, Pressable,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocation }        from '../hooks/useLocation';
import { useStations }        from '../hooks/useStations';
import { useIsDark }          from '../hooks/useIsDark';
import { useReverseGeocode }  from '../hooks/useReverseGeocode';
import { useSearchLocation }  from '../hooks/useSearchLocation';
import { usePriceAlert }      from '../hooks/usePriceAlert';
import { useAppStore }        from '../store/useAppStore';
import { useInterstitialAd }  from '../hooks/useInterstitialAd';

import { TomTomMap, type TomTomMapRef } from '../components/TomTomMap';
import { StationDetailModal } from '../components/StationDetailModal';
import { EmptyState }         from '../components/EmptyState';
import { SearchBar }          from '../components/SearchBar';
import { AdBanner }           from '../components/AdBanner';

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
  dark ? 'rgba(10,16,30,0.88)' : 'rgba(255,255,255,0.93)';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUB-COMPONENTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Fuel filter chips ──────────────────────────────── */
function FuelChips({
  selected, onChange, isDark,
}: { selected: string | null; onChange: (v: string | null) => void; isDark: boolean }) {
  const border = isDark ? Colors.dark.border : Colors.light.border;
  const text   = isDark ? Colors.dark.text   : Colors.light.text;
  const muted  = isDark ? Colors.dark.textMuted : Colors.light.textMuted;

  return (
    <ScrollView
      horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={fc.row} style={fc.scroll}
    >
      {/* All */}
      <TouchableOpacity
        style={[fc.chip, { backgroundColor: !selected ? Colors.primary : glass(isDark), borderColor: !selected ? Colors.primary : border }]}
        onPress={() => onChange(null)} activeOpacity={0.75}
      >
        <MaterialCommunityIcons name="gas-station-outline" size={13} color={!selected ? '#FFF' : muted} />
        <Text style={[fc.label, { color: !selected ? '#FFF' : text }]}>All</Text>
      </TouchableOpacity>

      {FUEL_TYPES.map((ft) => {
        const on = selected === ft.tomtomMatch;
        return (
          <TouchableOpacity
            key={ft.key}
            style={[fc.chip, { backgroundColor: on ? Colors.primary : glass(isDark), borderColor: on ? Colors.primary : border }]}
            onPress={() => onChange(on ? null : ft.tomtomMatch)} activeOpacity={0.75}
          >
            <Text style={[fc.label, { color: on ? '#FFF' : text }]}>
              {ft.tomtomMatch}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
const fc = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row:    { paddingHorizontal: Spacing.lg, paddingVertical: 5, gap: 8 },
  chip:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radii.full, borderWidth: 1 },
  label:  { fontSize: FontSize.sm, fontWeight: '700', letterSpacing: -0.2 },
});

/* ── Price legend ───────────────────────────────────── */
function PriceLegend({ isDark }: { isDark: boolean }) {
  const sec = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  return (
    <View style={[pl.wrap, { backgroundColor: glass(isDark), borderColor: isDark ? Colors.dark.border : Colors.light.border }]}>
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
  wrap: { borderRadius: Radii.lg, paddingVertical: 7, paddingHorizontal: 10, gap: 5, borderWidth: 1 },
  row:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:  { width: 8, height: 8, borderRadius: 4 },
  txt:  { fontSize: 10, fontWeight: '600' },
});

/* ── Control button ─────────────────────────────────── */
function CtrlBtn({
  icon, onPress, isDark, color,
}: { icon: string; onPress: () => void; isDark: boolean; color?: string }) {
  const border = isDark ? Colors.dark.border : Colors.light.border;
  return (
    <TouchableOpacity
      style={[cb.btn, { backgroundColor: glass(isDark), borderColor: border }]}
      onPress={onPress} activeOpacity={0.8}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color ?? Colors.primary} />
    </TouchableOpacity>
  );
}
const cb = StyleSheet.create({
  btn: { width: 48, height: 48, borderRadius: Radii.full, justifyContent: 'center', alignItems: 'center', borderWidth: 1, ...Shadows.lg },
});

/* ── Mini station peek card ─────────────────────────── */
function PeekCard({
  station, allPrices, fuelFilter, isDark, onPress,
}: { station: Station; allPrices: number[]; fuelFilter: string | null; isDark: boolean; onPress: () => void }) {
  const border = isDark ? Colors.dark.border : Colors.light.border;
  const text   = isDark ? Colors.dark.text   : Colors.light.text;
  const muted  = isDark ? Colors.dark.textMuted : Colors.light.textMuted;
  const best   = bestPrice(station, fuelFilter);
  const price  = best ? formatPrice(best.price, best.currency) : '—';
  const tier   = best ? getPriceTier(best.price, allPrices) : 'unknown';
  const pColor: Record<string, string> = { cheap: Colors.price.cheap, medium: Colors.price.medium, expensive: Colors.price.expensive, unknown: Colors.price.unknown };

  return (
    <TouchableOpacity
      style={[pk.card, { backgroundColor: glass(isDark), borderColor: best ? pColor[tier] + '80' : border }]}
      onPress={onPress} activeOpacity={0.8}
    >
      <View style={pk.iconWrap}>
        <MaterialCommunityIcons name="gas-station" size={20} color={Colors.primary} />
      </View>
      <Text style={[pk.name, { color: text }]} numberOfLines={1}>{station.brand ?? station.name}</Text>
      <Text style={[pk.price, { color: best ? pColor[tier] : muted }]}>{price}</Text>
      <View style={pk.distRow}>
        <MaterialCommunityIcons name="map-marker" size={10} color={muted} />
        <Text style={[pk.dist, { color: muted }]}>{formatDistance(station.distance)}</Text>
      </View>
    </TouchableOpacity>
  );
}
const pk = StyleSheet.create({
  card:    { width: 130, borderRadius: Radii.xl, borderWidth: 1.5, padding: Spacing.md, marginRight: Spacing.md, ...Shadows.md },
  iconWrap:{ width: 34, height: 34, borderRadius: Radii.md, backgroundColor: Colors.primaryMuted, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  name:    { fontSize: 12, fontWeight: '700', marginBottom: 2, letterSpacing: -0.2 },
  price:   { fontSize: FontSize.lg, fontWeight: '800', letterSpacing: -0.5, marginBottom: 3 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dist:    { fontSize: 10, fontWeight: '500' },
});

/* ── Radius picker modal ────────────────────────────── */
function RadiusPicker({
  visible, current, onSelect, onClose, isDark,
}: { visible: boolean; current: number; onSelect: (v: number) => void; onClose: () => void; isDark: boolean }) {
  const surf   = isDark ? Colors.dark.surface : Colors.light.surface;
  const border = isDark ? Colors.dark.border  : Colors.light.border;
  const text   = isDark ? Colors.dark.text    : Colors.light.text;
  const elev   = isDark ? Colors.dark.surfaceElevated : Colors.light.surfaceElevated;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={rm.backdrop} onPress={onClose} />
      <View style={[rm.sheet, { backgroundColor: surf, borderColor: border }]}>
        <View style={[rm.handle, { backgroundColor: border }]} />
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:    { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: Radii.xxl, borderTopRightRadius: Radii.xxl, borderTopWidth: 1, padding: Spacing.xxl, paddingBottom: Spacing.huge, alignItems: 'center' },
  handle:   { width: 40, height: 4, borderRadius: 2, marginBottom: Spacing.xl },
  title:    { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: -0.4, marginBottom: Spacing.xl, alignSelf: 'flex-start' },
  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, alignSelf: 'flex-start' },
  opt:      { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: Radii.full, borderWidth: 1 },
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

  /* ── price alerts ─── */
  const { checkNow } = usePriceAlert();
  useEffect(() => { if (coords && !locLoading) checkNow(coords.latitude, coords.longitude); }, [coords, locLoading, checkNow]);

  /* ── search ─── */
  const { query: sq, results: sr, loading: sl, search: onSearch, clear: clearSearch } = useSearchLocation(coords?.latitude, coords?.longitude);
  const [searchActive, setSearchActive] = useState(false);

  /* ── map ref & state ─── */
  const mapRef = useRef<TomTomMapRef>(null);
  const [mapMoved,        setMapMoved]        = useState(false);
  const [searchCentre,    setSearchCentre]    = useState(coords);
  const [mapCenter,       setMapCenter]       = useState(coords);
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);

  useEffect(() => {
    if (coords && !searchCentre) { setSearchCentre(coords); setMapCenter(coords); }
  }, [coords]);

  /* ── stations ─── */
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
        .slice(0, 6),
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
    if (id) maybeShowAd();
  }, [setSelectedStation, maybeShowAd]);

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
            <View style={[g.locBadge, { backgroundColor: glass(isDark), borderColor: thm.border }]}>
              <MaterialCommunityIcons name="map-marker" size={16} color={Colors.primary} />
              <Text style={[g.locText, { color: thm.text }]} numberOfLines={1}>{locationName}</Text>
              <TouchableOpacity onPress={() => setSearchActive(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="magnify" size={18} color={thm.textMuted} />
              </TouchableOpacity>
            </View>
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
      <View style={[g.rightControls, { bottom: ctrlBottom }]}>
        <CtrlBtn icon="plus"            onPress={() => mapRef.current?.zoomIn()}  isDark={isDark} />
        <CtrlBtn icon="minus"           onPress={() => mapRef.current?.zoomOut()} isDark={isDark} />
        <CtrlBtn icon="crosshairs-gps"  onPress={handleRecenter}                   isDark={isDark} color={mapMoved ? thm.textMuted : Colors.primary} />
      </View>

      {/* ── BOTTOM-LEFT: station count badge ─────────── */}
      {!isLoading && stations.length > 0 && !searchActive && (
        <TouchableOpacity
          style={[g.countBadge, { backgroundColor: glass(isDark), borderColor: thm.border, bottom: ctrlBottom }]}
          onPress={() => setShowRadiusPicker(true)} activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="gas-station" size={15} color={Colors.primary} />
          <Text style={[g.countTxt, { color: thm.text }]}>{stations.length}</Text>
          {minPrice != null && (
            <Text style={[g.countSub, { color: thm.textSecondary }]}>
              from {formatPrice(minPrice)}
            </Text>
          )}
          <MaterialCommunityIcons name="chevron-up" size={14} color={thm.textMuted} />
        </TouchableOpacity>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <View style={[g.spinner, { top: insets.top + 90 }]}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}

      {/* ── BOTTOM PEEK: cheapest stations strip ─────── */}
      {showPeek && (
        <View style={[g.peek, { bottom: peekBottom, backgroundColor: isDark ? 'rgba(7,11,20,0.0)' : 'rgba(240,244,255,0.0)' }]}>
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
    gap: 8,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1,
    maxWidth: '85%',
    ...Shadows.lg,
  },
  locText: { fontSize: FontSize.md, fontWeight: '700', flexShrink: 1, letterSpacing: -0.2 },

  /* price legend */
  legendWrap: { position: 'absolute', right: Spacing.lg },

  /* right controls */
  rightControls: {
    position: 'absolute',
    right: Spacing.lg,
    gap: Spacing.sm,
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
    borderWidth: 1,
    ...Shadows.lg,
  },
  countTxt: { fontSize: FontSize.md, fontWeight: '800' },
  countSub: { fontSize: FontSize.xs, fontWeight: '600' },

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
