import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useStations } from '../hooks/useStations';
import { useLocation } from '../hooks/useLocation';
import { useAppStore } from '../store/useAppStore';
import { useIsDark } from '../hooks/useIsDark';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { StationCard } from '../components/StationCard';
import { NativeAd } from '../components/NativeAd';
import { bestPrice } from '../utils/price';
import { EmptyState } from '../components/EmptyState';

export default function StationListScreen() {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  
  const { coords } = useLocation();
  const searchRadius = useAppStore((s) => s.searchRadius);
  const fuelFilter = useAppStore((s) => s.filters.fuelType);
  const setSelectedStation = useAppStore((s) => s.setSelectedStation);
  const locationName = useAppStore((s) => s.locationName);

  const { data: stations = [], isLoading, isRefetching, refetch } = useStations({
    lat: coords?.latitude,
    lon: coords?.longitude,
    radius: searchRadius,
    enabled: !!coords,
  });

  const allPrices = useMemo(
    () => stations.map((s) => bestPrice(s, fuelFilter)?.price).filter(Boolean) as number[],
    [stations, fuelFilter]
  );

  const dataWithAds = useMemo(() => {
    if (stations.length === 0) return [];
    
    const result: any[] = [];
    stations.forEach((station, index) => {
      result.push({ type: 'station', data: station });
      if ((index + 1) % 5 === 0) {
        result.push({ type: 'ad', id: `ad-${index}` });
      }
    });
    return result;
  }, [stations]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'ad') {
      return <NativeAd variant="compact" />;
    }
    
    return (
      <StationCard
        station={item.data}
        allPrices={allPrices}
        fuelFilter={fuelFilter}
        onPress={() => setSelectedStation(item.data.id)}
      />
    );
  };

  if (isLoading && !isRefetching) {
    return (
      <View style={[styles.center, { backgroundColor: thm.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: thm.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md, backgroundColor: isDark ? Colors.dark.surfaceElevated : Colors.light.surfaceElevated }]}>
        <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons name="format-list-bulleted" size={24} color={Colors.primary} />
            <Text style={[styles.title, { color: thm.text }]}>Station List</Text>
        </View>
        <Text style={[styles.subtitle, { color: thm.textSecondary }]}>
          {locationName ? `Nearby ${locationName}` : 'Finding stations nearby…'}
        </Text>
      </View>

      <FlatList
        data={dataWithAds}
        keyExtractor={(item, index) => item.type === 'ad' ? item.id : item.data.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="gas-station-off"
            title="No Stations Found"
            actionLabel="Refresh"
            onAction={refetch}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
    fontWeight: '500',
  },
  listContent: {
    padding: Spacing.lg,
  },
});