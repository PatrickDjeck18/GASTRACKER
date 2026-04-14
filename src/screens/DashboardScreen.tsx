import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { useIsDark } from '../hooks/useIsDark';
import { useLocation } from '../hooks/useLocation';
import { useStations } from '../hooks/useStations';
import { useAppStore } from '../store/useAppStore';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { bestPrice, formatPrice, getPriceTier } from '../utils/price';
import { formatDistance } from '../utils/geo';
import type { Station } from '../types/station';

/* ── helpers ────────────────────────────────────────── */
function SmallStationRow({
  station, allPrices, fuelFilter, isDark, onPress,
}: {
  station: Station; allPrices: number[]; fuelFilter: string | null; isDark: boolean; onPress: () => void;
}) {
  const thm = isDark ? Colors.dark : Colors.light;
  const best = bestPrice(station, fuelFilter);
  const priceVal = best?.price;
  const tier = priceVal ? getPriceTier(priceVal, allPrices) : 'unknown';
  
  const tierColors: Record<string, string> = {
    cheap: Colors.price.cheap, medium: Colors.price.medium,
    expensive: Colors.price.expensive, unknown: Colors.price.unknown,
  };
  const col = tierColors[tier];

  return (
    <TouchableOpacity
      style={[sr.row, { backgroundColor: isDark ? Colors.dark.surfaceHighlight : Colors.light.surface, borderColor: thm.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[sr.iconWrap, { backgroundColor: col + '15' }]}>
        <MaterialCommunityIcons name="gas-station" size={18} color={col} />
      </View>
      <View style={sr.info}>
        <Text style={[sr.name, { color: thm.text }]} numberOfLines={1}>
          {station.brand ?? station.name}
        </Text>
        <Text style={[sr.dist, { color: thm.textMuted }]}>
          {formatDistance(station.distance)} · {best?.fuelType ?? 'Unknown'}
        </Text>
      </View>
      <View style={sr.right}>
        {best ? (
          <Text style={[sr.price, { color: col }]}>
            {formatPrice(best.price, best.currency)}
          </Text>
        ) : (
          <Text style={[sr.price, { color: thm.textMuted, fontSize: 12 }]}>No price</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radii.lg, borderWidth: 1, gap: Spacing.md, marginBottom: Spacing.sm },
  iconWrap: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 2, letterSpacing: -0.2 },
  dist: { fontSize: 11, fontWeight: '500' },
  right: { alignItems: 'flex-end' },
  price: { fontSize: FontSize.md, fontWeight: '800', letterSpacing: -0.5 },
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN DASHBOARD
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function DashboardScreen() {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<any>>();

  // Location & nearest stations
  const { coords } = useLocation();
  const locationName = useAppStore((s) => s.locationName);
  const fuelFilter = useAppStore((s) => s.filters.fuelType);
  const searchRadius = useAppStore((s) => s.searchRadius);
  const setSelectedStation = useAppStore((s) => s.setSelectedStation);

  const { data: stations = [], isLoading } = useStations({
    lat: coords?.latitude,
    lon: coords?.longitude,
    radius: searchRadius,
    enabled: !!coords,
  });

  const previewStations = useMemo(() => {
    return [...stations]
      .filter((s) => bestPrice(s, fuelFilter) != null)
      .sort((a, b) => (bestPrice(a, fuelFilter)?.price ?? 0) - (bestPrice(b, fuelFilter)?.price ?? 0))
      .slice(0, 3);
  }, [stations, fuelFilter]);

  const allPrices = useMemo(
    () => previewStations.map((s) => bestPrice(s, fuelFilter)?.price).filter(Boolean) as number[],
    [previewStations, fuelFilter]
  );

  return (
    <ScrollView 
      style={[ds.container, { backgroundColor: thm.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[ds.header, { paddingTop: insets.top + Spacing.lg, backgroundColor: isDark ? Colors.dark.surfaceElevated : Colors.primary }]}>
        <View style={ds.greetingRow}>
          <View style={ds.iconBox}>
            <MaterialCommunityIcons name="steering" size={24} color={isDark ? Colors.primary : '#FFF'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ds.greeting, { color: isDark ? thm.text : '#FFF' }]}>Good Driving!</Text>
            <Text style={[ds.location, { color: isDark ? thm.textSecondary : 'rgba(255,255,255,0.8)' }]} numberOfLines={1}>
              <MaterialCommunityIcons name="map-marker" size={12} /> {locationName || 'Locating…'}
            </Text>
          </View>
        </View>
      </View>

      <View style={ds.content}>
        
        {/* Quick Actions */}
        <Text style={[ds.sectionTitle, { color: thm.textSecondary, marginTop: 0 }]}>Quick Explore</Text>
        <View style={ds.quickNavs}>
          <TouchableOpacity 
            style={[ds.quickNavCard, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primaryGlow }]}
            onPress={() => navigation.navigate('MapTab')}
          >
            <MaterialCommunityIcons name="map-search" size={26} color={Colors.primary} />
            <Text style={[ds.quickNavLabel, { color: Colors.primary }]}>Local Map</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[ds.quickNavCard, { backgroundColor: isDark ? Colors.dark.surfaceElevated : '#FFF', borderColor: thm.border }]}
            onPress={() => navigation.navigate('SavingsTab')}
          >
            <MaterialCommunityIcons name="calculator-variant" size={26} color={thm.text} />
            <Text style={[ds.quickNavLabel, { color: thm.text }]}>Calculator</Text>
          </TouchableOpacity>
        </View>

        {/* Global Prices Widget */}
        <TouchableOpacity 
          style={[ds.globalWidget, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PricesTab')}
        >
          <View style={[ds.globalIconWrap, { backgroundColor: Colors.price.cheapBg }]}>
            <MaterialCommunityIcons name="earth" size={24} color={Colors.price.cheap} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ds.widgetTitle, { color: thm.text }]}>Global Prices</Text>
            <Text style={[ds.widgetSub, { color: thm.textMuted }]}>Compare fuel across USA, Europe & Canada</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={thm.textMuted} />
        </TouchableOpacity>

        {/* Nearby Stations Preview */}
        <View style={ds.sectionHeader}>
          <Text style={[ds.sectionTitle, { color: thm.textSecondary, marginTop: 0 }]}>Cheapest Near Me</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ListTab')}>
            <Text style={[ds.viewAllTxt, { color: Colors.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={[ds.nearbyWidget, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
          ) : previewStations.length > 0 ? (
            <View>
              {previewStations.map((station) => (
                <SmallStationRow 
                  key={station.id} 
                  station={station} 
                  allPrices={allPrices} 
                  fuelFilter={fuelFilter} 
                  isDark={isDark}
                  onPress={() => {
                    setSelectedStation(station.id);
                    navigation.navigate('MapTab');
                  }}
                />
              ))}
              <TouchableOpacity 
                style={[ds.seeMapBtn, { backgroundColor: isDark ? Colors.dark.surfaceHighlight : Colors.light.surface }]}
                onPress={() => navigation.navigate('MapTab')}
              >
                <MaterialCommunityIcons name="map-marker-radius" size={16} color={thm.textSecondary} />
                <Text style={{ color: thm.textSecondary, fontWeight: '600', fontSize: 13 }}>See on Map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <MaterialCommunityIcons name="gas-station-off" size={32} color={thm.textMuted} />
              <Text style={{ marginTop: 8, color: thm.textSecondary, textAlign: 'center' }}>
                No nearby stations found. Try adjusting radius.
              </Text>
            </View>
          )}
        </View>

      </View>
    </ScrollView>
  );
}

const ds = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconBox: { width: 44, height: 44, borderRadius: Radii.lg, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: FontSize.xl, fontWeight: '800', letterSpacing: -0.5 },
  location: { fontSize: FontSize.sm, marginTop: 2, fontWeight: '500' },
  
  content: { padding: Spacing.lg },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.xl, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  viewAllTxt: { fontSize: FontSize.sm, fontWeight: '700' },

  quickNavs: { flexDirection: 'row', gap: Spacing.md },
  quickNavCard: { flex: 1, padding: Spacing.lg, borderRadius: Radii.xl, borderWidth: 1, alignItems: 'center', ...Shadows.sm },
  quickNavLabel: { fontSize: FontSize.sm, fontWeight: '700', marginTop: 8 },

  globalWidget: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radii.xl, borderWidth: 1, marginTop: Spacing.xl, ...Shadows.sm },
  globalIconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  widgetTitle: { fontSize: FontSize.md, fontWeight: '800', letterSpacing: -0.3 },
  widgetSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },

  nearbyWidget: { borderRadius: Radii.xl, borderWidth: 1, padding: Spacing.md, ...Shadows.sm },
  seeMapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radii.md, marginTop: 4 },
});
