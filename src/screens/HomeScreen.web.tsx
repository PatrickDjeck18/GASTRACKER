import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { useLocation } from '../hooks/useLocation';
import { useStations } from '../hooks/useStations';
import { useIsDark } from '../hooks/useIsDark';
import { useReverseGeocode } from '../hooks/useReverseGeocode';
import { useSearchLocation } from '../hooks/useSearchLocation';
import { useAppStore } from '../store/useAppStore';

import { TomTomMap } from '../components/TomTomMap';
import { StationDetailModal } from '../components/StationDetailModal';
import { EmptyState } from '../components/EmptyState';
import { SearchBar } from '../components/SearchBar';


import { bestPrice, getPriceTier } from '../utils/price';
import { Colors, Spacing, Radii, FontSize } from '../constants/theme';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { getLocalCurrencyCode } from '../services/fuelPriceService';

export default function HomeScreen() {
  const { t } = useTranslation();
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const countryCode = useAppStore((s) => s.countryCode);
  const manualCurrency = useAppStore((s) => s.manualCurrency);
  const localCurrency = useMemo(
    () => getLocalCurrencyCode(),
    [countryCode, manualCurrency],
  );

  const { coords, loading: locLoading, error: locError, refresh: reLocate } = useLocation();

  const searchRadius = useAppStore((s) => s.searchRadius);
  const fuelFilter = useAppStore((s) => s.filters.fuelType);
  const setSelectedStation = useAppStore((s) => s.setSelectedStation);
  const selectedId = useAppStore((s) => s.selectedStationId);
  const locationName = useAppStore((s) => s.locationName);
  const setLocationName = useAppStore((s) => s.setLocationName);

  const { maybeShowAd } = useInterstitialAd();

  const { data: geoResult } = useReverseGeocode({
    lat: coords?.latitude,
    lon: coords?.longitude,
    enabled: !!coords,
  });

  useEffect(() => {
    if (geoResult?.city) {
      setLocationName(geoResult.city);
    }
  }, [geoResult, setLocationName]);

  const {
    query: searchQuery,
    results: searchResults,
    loading: searchLoading,
    search: onSearch,
    clear: clearSearch,
  } = useSearchLocation(coords?.latitude, coords?.longitude);

  const [searchActive, setSearchActive] = useState(false);
  const [searchCentre, setSearchCentre] = useState(coords);
  const [mapMoved, setMapMoved] = useState(false);
  const [mapCenter, setMapCenter] = useState(coords);
  
  useEffect(() => {
    if (coords && !searchCentre) {
      setSearchCentre(coords);
      setMapCenter(coords);
    }
  }, [coords]);

  const stationsQueryKey = ['stations', searchCentre?.latitude, searchCentre?.longitude, searchRadius];
  const { data: stations = [], isLoading } = useStations({
    lat: searchCentre?.latitude,
    lon: searchCentre?.longitude,
    radius: searchRadius,
    enabled: !!searchCentre,
  });

  const allPrices = useMemo(
    () => stations.map((s) => bestPrice(s, fuelFilter)?.price).filter((p): p is number => p != null),
    [stations, fuelFilter],
  );

  const selectedStation = useMemo(
    () => (selectedId ? stations.find((s) => s.id === selectedId) ?? null : null),
    [selectedId, stations],
  );

  const handleStationSelect = useCallback((id: string) => {
    setSelectedStation(id || null);
  }, [setSelectedStation]);

  const handleRecenter = useCallback(() => {
    if (!coords) return;
    setMapCenter({ ...coords });
    setSearchCentre(coords);
    setMapMoved(false);
  }, [coords]);

  const handleSearchSelect = useCallback(
    (item: { latitude: number; longitude: number; name: string }) => {
      const newCoords = { latitude: item.latitude, longitude: item.longitude };
      setSearchCentre(newCoords);
      setMapCenter(newCoords);
      clearSearch();
      setSearchActive(false);
      setMapMoved(false);
    },
    [clearSearch],
  );

  if (locLoading) {
    return (
      <View style={[styles.center, { backgroundColor: thm.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadText, { color: thm.textSecondary }]}>
          {t('map.locating')}
        </Text>
      </View>
    );
  }

  if (locError || !coords) {
    return (
      <View style={[styles.center, { backgroundColor: thm.background }]}>
        <EmptyState
          icon="crosshairs-off"
          title={t('map.permissionDenied')}
          actionLabel="Retry"
          onAction={reLocate}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: thm.background }]}>
      <TomTomMap
        stations={stations}
        allPrices={allPrices}
        fuelFilter={fuelFilter}
        localCurrency={localCurrency}
        onSelectStation={handleStationSelect}
        selectedStationId={selectedId ?? undefined}
        isDark={isDark}
        userCoords={mapCenter}
        autoCenter={!mapMoved}
      />

      {/* ── Location name badge ────────────────── */}
      {locationName && !searchActive && (
        <View
          style={[
            styles.locationBadge,
            {
              backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
              borderColor: thm.border,
            },
          ]}
        >
          <MaterialCommunityIcons name="map-marker" size={16} color={Colors.primary} />
          <Text style={[styles.locationText, { color: thm.text }]} numberOfLines={1}>
            {locationName}
          </Text>
          <TouchableOpacity
            onPress={() => setSearchActive(true)}
            // @ts-ignore
            style={{ cursor: 'pointer' }}
          >
            <MaterialCommunityIcons name="magnify" size={18} color={thm.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Search bar overlay ─────────────────── */}
      {searchActive && (
        <SearchBar
          query={searchQuery}
          results={searchResults}
          loading={searchLoading}
          onChangeText={onSearch}
          onSelect={handleSearchSelect}
          onClear={() => {
            clearSearch();
            setSearchActive(false);
          }}
          placeholder={t('map.searchPlaceholder')}
        />
      )}

      {/* ── Floating controls ────────────────────── */}
      {/* Recenter FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
            borderColor: thm.border,
          },
        ]}
        activeOpacity={0.8}
        onPress={handleRecenter}
      >
        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={Colors.primary} />
      </TouchableOpacity>

      {/* Loading indicator overlay */}
      {isLoading && (
        <View style={styles.spinnerOverlay}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}

      {/* Station count badge */}
      {!isLoading && stations.length > 0 && (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface,
              borderColor: thm.border,
            },
          ]}
        >
          <MaterialCommunityIcons name="gas-station" size={16} color={Colors.primary} />
          <Text style={[styles.countText, { color: thm.text }]}>
            {stations.length}
          </Text>
        </View>
      )}

      {/* ── Station detail modal ─── */}
      {selectedStation && (
        <StationDetailModal
          station={selectedStation}
          allPrices={allPrices}
          userCoords={coords}
          onClose={() => setSelectedStation(null)}
          stationsQueryKey={stationsQueryKey}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
  },
  locationBadge: {
    position: 'absolute',
    top: Spacing.xl + (Platform.OS === 'web' ? 20 : 44),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    // @ts-ignore
    cursor: 'pointer',
    maxWidth: '85%',
  },
  locationText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xxxl + 6,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    // @ts-ignore
    cursor: 'pointer',
  },
  spinnerOverlay: {
    position: 'absolute',
    top: Spacing.xl + (Platform.OS === 'web' ? 24 : 48),
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: Spacing.xs,
    borderRadius: Radii.full,
  },
  countBadge: {
    position: 'absolute',
    bottom: Spacing.xxxl + 6,
    left: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.full,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  countText: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  adBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});