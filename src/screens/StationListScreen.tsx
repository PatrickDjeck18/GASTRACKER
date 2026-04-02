import React, { useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocation } from '../hooks/useLocation';
import { useStations } from '../hooks/useStations';
import { useIsDark } from '../hooks/useIsDark';
import { useAppStore } from '../store/useAppStore';

import { StationCard } from '../components/StationCard';
import { SortToggle } from '../components/SortToggle';
import { StationDetailModal } from '../components/StationDetailModal';
import { StationListSkeleton } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { AdBanner } from '../components/AdBanner';

import { bestPrice } from '../utils/price';
import { Colors, Spacing, FontSize, Radii, Shadows } from '../constants/theme';
import type { Station } from '../types/station';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function StationListScreen() {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  /* ── location ─── */
  const { coords } = useLocation();

  /* ── store ─── */
  const sortMode = useAppStore((s) => s.sortMode);
  const setSortMode = useAppStore((s) => s.setSortMode);
  const fuelFilter = useAppStore((s) => s.filters.fuelType);
  const searchRadius = useAppStore((s) => s.searchRadius);
  const selectedId = useAppStore((s) => s.selectedStationId);
  const setSelectedStation = useAppStore((s) => s.setSelectedStation);

  /* ── data ─── */
  const {
    data: stations = [],
    isLoading,
    refetch,
    isRefetching,
  } = useStations({
    lat: coords?.latitude,
    lon: coords?.longitude,
    radius: searchRadius,
    enabled: !!coords,
  });

  /* ── derived ─── */
  const allPrices = useMemo(
    () =>
      stations
        .map((s) => bestPrice(s, fuelFilter)?.price)
        .filter((p): p is number => p != null),
    [stations, fuelFilter],
  );

  const sorted = useMemo(() => {
    const list = [...stations];
    if (sortMode === 'price') {
      list.sort((a, b) => {
        const pa = bestPrice(a, fuelFilter)?.price ?? Infinity;
        const pb = bestPrice(b, fuelFilter)?.price ?? Infinity;
        return pa - pb;
      });
    } else {
      list.sort((a, b) => a.distance - b.distance);
    }
    return list;
  }, [stations, sortMode, fuelFilter]);

  const selectedStation = useMemo(
    () => (selectedId ? stations.find((s) => s.id === selectedId) ?? null : null),
    [selectedId, stations],
  );

  /* ── render item ─── */
  const renderStation = useCallback(
    ({ item }: { item: Station }) => (
      <StationCard
        station={item}
        allPrices={allPrices}
        fuelFilter={fuelFilter}
        onPress={() => setSelectedStation(item.id)}
      />
    ),
    [allPrices, fuelFilter, setSelectedStation],
  );

  /* ── body ─── */
  if (isLoading) {
    return (
      <View style={[styles.flex, { backgroundColor: thm.background }]}>
        <StationListSkeleton count={6} />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: thm.background }]}>
      {/* Search Header Info */}
      <View style={[styles.headerContainer, { backgroundColor: thm.surfaceElevated, borderBottomColor: thm.border, paddingTop: Math.max(insets.top, Spacing.lg) }]}>
        <View style={styles.headerTop}>
          <View style={styles.titleWrap}>
            <Text style={[styles.pageTitle, { color: thm.text }]}>Nearby Stations</Text>
            <View style={[styles.badge, { backgroundColor: Colors.primaryGlow }]}>
              <Text style={[styles.badgeText, { color: Colors.primary }]}>{stations.length}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="gas-station-outline" size={32} color={Colors.primary} />
        </View>

        <View style={styles.sortBar}>
          <SortToggle value={sortMode} onChange={setSortMode} />
        </View>
      </View>

      {sorted.length === 0 ? (
        <EmptyState
          title="No stations found"
          subtitle="Try increasing your search radius or move the map to a different area."
          icon="gas-station-off-outline"
          actionLabel="Retry Search"
          onAction={() => refetch()}
        />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(s) => s.id}
          renderItem={renderStation}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      {/* ── Ad Banner ─── */}
      <AdBanner style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: thm.border }} />

      {selectedStation && (
        <StationDetailModal
          station={selectedStation}
          allPrices={allPrices}
          userCoords={coords}
          onClose={() => setSelectedStation(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  list: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
});
