import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, TextInput, Platform, ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLocalCurrencyCode } from '../services/fuelPriceService';

import { useGasPrices } from '../hooks/useGasPrices';
import { useIsDark } from '../hooks/useIsDark';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import type { GasPriceRegion, RegionalFuelPrice } from '../types/gasPrice';
import { NativeAd } from '../components/NativeAd';

/* ── Constants ─────────────────────────────────────── */
type SortKey = 'name' | 'gasoline' | 'diesel';
type FuelTab = 'gasoline' | 'diesel' | 'lpg' | 'midGrade' | 'premium';

const REGIONS: { key: GasPriceRegion; label: string; icon: string; emoji: string }[] = [
  { key: 'europe', label: 'Europe', icon: 'earth', emoji: '🇪🇺' },
  { key: 'usa', label: 'USA', icon: 'flag', emoji: '🇺🇸' },
  { key: 'canada', label: 'Canada', icon: 'flag', emoji: '🇨🇦' },
  { key: 'australia', label: 'Australia', icon: 'kangaroo', emoji: '🇦🇺' },
];

const FUEL_TABS_EU: { key: FuelTab; label: string }[] = [
  { key: 'gasoline', label: 'Gasoline' },
  { key: 'diesel', label: 'Diesel' },
  { key: 'lpg', label: 'LPG' },
];

const FUEL_TABS_US: { key: FuelTab; label: string }[] = [
  { key: 'gasoline', label: 'Regular' },
  { key: 'midGrade', label: 'Mid-Grade' },
  { key: 'premium', label: 'Premium' },
  { key: 'diesel', label: 'Diesel' },
];

const FUEL_TABS_CA: { key: FuelTab; label: string }[] = [
  { key: 'gasoline', label: 'Regular' },
];

const FUEL_TABS_AU: { key: FuelTab; label: string }[] = [
  { key: 'gasoline', label: 'Unleaded 91' },
  { key: 'midGrade', label: 'Premium 95' },
  { key: 'premium', label: 'Premium 98' },
  { key: 'diesel', label: 'Diesel' },
  { key: 'lpg', label: 'LPG' },
];

/* ── Country Flag Emoji Helper ─────────────────────── */
const COUNTRY_FLAGS: Record<string, string> = {
  'Albania': '🇦🇱', 'Andorra': '🇦🇩', 'Austria': '🇦🇹', 'Austria ': '🇦🇹', 'Azerbaijan': '🇦🇿',
  'Belarus': '🇧🇾', 'Belgium': '🇧🇪', 'Bosnia And Herzegovina': '🇧🇦',
  'Bulgaria': '🇧🇬', 'Croatia': '🇭🇷', 'Cyprus': '🇨🇾', 'Czech Republic': '🇨🇿',
  'Denmark': '🇩🇰', 'Estonia': '🇪🇪', 'Finland': '🇫🇮', 'France': '🇫🇷',
  'Georgia': '🇬🇪', 'Germany': '🇩🇪', 'Greece': '🇬🇷', 'Hungary': '🇭🇺',
  'Iceland': '🇮🇸', 'Ireland': '🇮🇪', 'Italy': '🇮🇹', 'Kosovo': '🇽🇰',
  'Latvia': '🇱🇻', 'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺',
  'North Macedonia': '🇲🇰', 'Malta': '🇲🇹', 'Moldova': '🇲🇩',
  'Montenegro': '🇲🇪', 'Netherlands': '🇳🇱', 'Norway': '🇳🇴',
  'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Romania': '🇷🇴', 'Russia': '🇷🇺',
  'Serbia': '🇷🇸', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'Spain': '🇪🇸',
  'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Turkey': '🇹🇷', 'Ukraine': '🇺🇦',
  'United Kingdom': '🇬🇧',
};

function getFlag(name: string, region: GasPriceRegion): string {
  if (region === 'usa') return '🇺🇸';
  if (region === 'canada') return '🇨🇦';
  if (region === 'australia') return '🇦🇺';
  return COUNTRY_FLAGS[name] ?? '🏳️';
}

/* ── Helpers ───────────────────────────────────────── */
function formatLocalCurrency(val: number | null, localCurrency: string): string {
  if (val == null) return '—';
  const code = localCurrency?.toUpperCase() ?? 'EUR';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }).format(val);
  } catch (e) {
    const symMap: Record<string, string> = {
      EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ', PLN: 'zł',
      CAD: 'CA$', AUD: 'A$', NZD: 'NZ$', JPY: '¥',
    };
    const sym = symMap[code] ?? code + ' ';
    return `${sym}${val.toFixed(3)}`;
  }
}

function getPriceTierColor(val: number | null, allPrices: number[]): string {
  if (val == null || allPrices.length === 0) return Colors.price.unknown;
  const sorted = [...allPrices].sort((a, b) => a - b);
  const idx = sorted.indexOf(val);
  const pct = idx / (sorted.length - 1 || 1);
  if (pct <= 0.33) return Colors.price.cheap;
  if (pct <= 0.66) return Colors.price.medium;
  return Colors.price.expensive;
}

function getVal(item: RegionalFuelPrice, fuelTab: FuelTab): number | null {
  return item[fuelTab] ?? null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PRICE CARD
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function PriceCard({
  item, rank, fuelTab, allPrices, isDark, region, userCurrency,
}: {
  item: RegionalFuelPrice; rank: number; fuelTab: FuelTab;
  allPrices: number[]; isDark: boolean; region: GasPriceRegion;
  userCurrency: string;
}) {
  const val = getVal(item, fuelTab);
  const tierColor = getPriceTierColor(val, allPrices);
  const thm = isDark ? Colors.dark : Colors.light;

  const isTop3 = rank <= 3 && val != null;
  const medalColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

  return (
    <View style={[
      s.card,
      {
        backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
        borderColor: isTop3 ? medalColors[rank] + '60' : (isDark ? Colors.dark.cardBorder : Colors.light.cardBorder),
        borderLeftColor: val != null ? tierColor : (isDark ? Colors.dark.cardBorder : Colors.light.cardBorder),
        borderLeftWidth: 4,
      },
    ]}>
      {/* Rank badge */}
      <View style={[s.rankBadge, {
        backgroundColor: isTop3 ? medalColors[rank] + '20' : (isDark ? Colors.dark.surfaceHighlight : Colors.light.surfaceHighlight),
      }]}>
        <Text style={[s.rankText, {
          color: isTop3 ? medalColors[rank] : thm.textMuted,
        }]}>
          {rank}
        </Text>
      </View>

      {/* Flag & name */}
      <View style={s.nameBlock}>
        <Text style={s.flag}>{getFlag(item.name, region)}</Text>
        <View style={s.nameCol}>
          <Text style={[s.countryName, { color: thm.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[s.currencyLabel, { color: thm.textMuted }]}>
            {userCurrency}/L
          </Text>
        </View>
      </View>

      {/* Price */}
      <View style={s.priceBlock}>
        <Text style={[s.priceVal, { color: val != null ? tierColor : thm.textMuted }]}>
          {formatLocalCurrency(val, userCurrency)}
        </Text>
        {val != null && (
          <View style={[s.pricePill, { backgroundColor: tierColor + '18' }]}>
            <View style={[s.priceDot, { backgroundColor: tierColor }]} />
            <Text style={[s.pillText, { color: tierColor }]}>
              {tierColor === Colors.price.cheap ? 'Low' : tierColor === Colors.price.medium ? 'Mid' : 'High'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SKELETON CARD (shown while loading)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function PriceCardSkeleton({ isDark }: { isDark: boolean }) {
  const shimmerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const lineColor = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
  return (
    <View style={[
      s.card,
      {
        backgroundColor: isDark ? Colors.dark.card : Colors.light.card,
        borderColor: isDark ? Colors.dark.cardBorder : Colors.light.cardBorder,
        borderLeftWidth: 4,
        borderLeftColor: shimmerColor,
      },
    ]}>
      {/* Rank circle */}
      <View style={[s.rankBadge, { backgroundColor: shimmerColor }]} />

      {/* Flag + name lines */}
      <View style={s.nameBlock}>
        <View style={{ width: 28, height: 24, borderRadius: 4, backgroundColor: shimmerColor }} />
        <View style={s.nameCol}>
          <View style={{ height: 14, width: '70%', borderRadius: 6, backgroundColor: lineColor, marginBottom: 6 }} />
          <View style={{ height: 10, width: '40%', borderRadius: 4, backgroundColor: shimmerColor }} />
        </View>
      </View>

      {/* Price block */}
      <View style={[s.priceBlock, { alignItems: 'flex-end', gap: 6 }]}>
        <View style={{ height: 18, width: 64, borderRadius: 6, backgroundColor: lineColor }} />
        <View style={{ height: 14, width: 40, borderRadius: 10, backgroundColor: shimmerColor }} />
      </View>
    </View>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN SCREEN
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function GasPricesScreen() {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [region, setRegion] = useState<GasPriceRegion>('europe');
  const [fuelTab, setFuelTab] = useState<FuelTab>('gasoline');
  const [sortKey, setSortKey] = useState<SortKey>('gasoline');
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState('');

  const { data: prices = [], isLoading, isFetching, refetch, isRefetching } = useGasPrices(region);
  const userCurrency = getLocalCurrencyCode();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );
  const { width: screenWidth } = useWindowDimensions();

  /* responsive region tab sizing */
  const isCompactRegionTabs = screenWidth < 390;
  const regionTabMinWidth = useMemo(() => {
    if (screenWidth < 360) return 84;
    if (screenWidth < 420) return 102;
    return 120;
  }, [screenWidth]);

  /* reset fuel tab when switching regions */
  const handleRegionChange = useCallback((r: GasPriceRegion) => {
    setRegion(r);
    setFuelTab('gasoline');
    setSortKey('gasoline');
    setSearch('');
  }, []);

  const fuelTabs = region === 'europe' ? FUEL_TABS_EU : (region === 'usa' ? FUEL_TABS_US : (region === 'canada' ? FUEL_TABS_CA : FUEL_TABS_AU));

  /* filter + sort */
  const filtered = useMemo(() => {
    let list = prices;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (sortKey === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const av = getVal(a, fuelTab) ?? Infinity;
      const bv = getVal(b, fuelTab) ?? Infinity;
      return sortAsc ? av - bv : bv - av;
    });
  }, [prices, search, sortKey, sortAsc, fuelTab]);

  /* all prices for tier coloring */
  const allPrices = useMemo(
    () => filtered.map((p) => getVal(p, fuelTab)).filter((v): v is number => v != null),
    [filtered, fuelTab],
  );

  /* stats */
  const avg = allPrices.length ? allPrices.reduce((s, v) => s + v, 0) / allPrices.length : null;
  const min = allPrices.length ? Math.min(...allPrices) : null;
  const max = allPrices.length ? Math.max(...allPrices) : null;

  const handleSort = useCallback(() => {
    if (sortKey === 'name') {
      setSortKey('gasoline');
      setSortAsc(true);
    } else {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortKey('name');
        setSortAsc(true);
      }
    }
  }, [sortKey, sortAsc]);

  /* ── Render ─── */
  return (
    <View style={[s.container, { backgroundColor: thm.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + Spacing.md, backgroundColor: isDark ? Colors.dark.surfaceElevated : Colors.light.surfaceElevated, borderBottomColor: thm.border }]}>
        <Text style={[s.headerTitle, { color: thm.text }]}>
          <MaterialCommunityIcons name="gas-station" size={22} color={Colors.primary} />{' '}
          Global Prices
        </Text>
        <Text style={[s.headerSub, { color: thm.textSecondary }]}>
          Live fuel prices by region
        </Text>
      </View>

      {/* Region tabs */}
      <View style={[s.regionWrap, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.regionRow}
        >
          {REGIONS.map((r) => {
            const active = region === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[
                  s.regionTab,
                  {
                    minWidth: regionTabMinWidth,
                    backgroundColor: active
                      ? (isDark ? Colors.primaryGlow : Colors.primaryMuted)
                      : (isDark ? Colors.dark.surfaceHighlight : Colors.light.surfaceHighlight),
                    borderColor: active ? Colors.primary : thm.border,
                  },
                ]}
                onPress={() => handleRegionChange(r.key)}
                activeOpacity={0.8}
              >
                <View style={s.regionTabInner}>
                  <Text style={s.regionEmoji}>{r.emoji}</Text>
                  <Text
                    style={[
                      s.regionLabel,
                      { color: active ? Colors.primary : thm.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {isCompactRegionTabs ? (r.key === 'australia' ? 'AU' : r.label.slice(0, 2).toUpperCase()) : r.label}
                  </Text>
                  {active ? <View style={s.regionActiveDot} /> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search bar */}
      <View style={[s.searchWrap, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface }]}>
        <View style={[s.searchBar, { backgroundColor: isDark ? Colors.dark.surfaceHighlight : Colors.light.surfaceHighlight, borderColor: thm.border }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={thm.textMuted} />
          <TextInput
            style={[s.searchInput, { color: thm.text }]}
            placeholder={region === 'europe' ? 'Search country…' : (region === 'australia' ? 'Search state/city…' : 'Search state…')}
            placeholderTextColor={thm.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color={thm.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Fuel type chips */}
      <View style={[s.chipRow, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface }]}>
        {fuelTabs.map((ft) => {
          const on = fuelTab === ft.key;
          return (
            <TouchableOpacity
              key={ft.key}
              style={[
                s.chip,
                {
                  backgroundColor: on ? Colors.primary : (isDark ? Colors.dark.surfaceHighlight : Colors.light.surfaceHighlight),
                  borderColor: on ? Colors.primary : thm.border,
                },
              ]}
              onPress={() => { setFuelTab(ft.key); setSortKey('gasoline'); setSortAsc(true); }}
              activeOpacity={0.75}
            >
              <Text style={[s.chipText, { color: on ? '#FFF' : thm.text }]}>{ft.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Stats row */}
      {!isLoading && allPrices.length > 0 && (
        <View style={[s.statsRow, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface }]}>
          {[
            { label: 'Lowest', val: min, color: Colors.price.cheap },
            { label: 'Average', val: avg, color: Colors.primary },
            { label: 'Highest', val: max, color: Colors.price.expensive },
          ].map((st) => (
            <View key={st.label} style={[s.statCard, { backgroundColor: isDark ? Colors.dark.surfaceHighlight : Colors.light.surfaceHighlight, borderColor: st.color + '30' }]}>
              <Text style={[s.statLabel, { color: thm.textMuted }]}>{st.label}</Text>
              <Text style={[s.statVal, { color: st.color }]}>
                {st.val != null ? formatLocalCurrency(st.val, userCurrency) : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Sort button */}
      {!isLoading && filtered.length > 0 && (
        <TouchableOpacity
          style={[s.sortBtn, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.surface }]}
          onPress={handleSort}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={sortKey === 'name' ? 'sort-alphabetical-ascending' : (sortAsc ? 'sort-ascending' : 'sort-descending')}
            size={16} color={Colors.primary}
          />
          <Text style={[s.sortText, { color: Colors.primary }]}>
            {sortKey === 'name' ? 'A → Z' : (sortAsc ? 'Cheapest first' : 'Expensive first')}
          </Text>
          <Text style={[s.countText, { color: thm.textMuted }]}>
            {filtered.length} {region === 'europe' ? 'countries' : (region === 'usa' ? 'states' : (region === 'australia' ? 'locations' : 'provinces'))}
          </Text>
        </TouchableOpacity>
      )}

      {/* Fetching banner — shown when background re-fetch is running but we already have data */}
      {isFetching && !isLoading && (
        <View style={[s.fetchingBanner, { backgroundColor: Colors.primaryMuted }]}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={[s.fetchingText, { color: Colors.primary }]}>
            Updating prices…
          </Text>
        </View>
      )}

      {/* List */}
      {isLoading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6, 7]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
          scrollEnabled={false}
          renderItem={() => <PriceCardSkeleton isDark={isDark} />}
          ListHeaderComponent={
            <View style={s.loadBanner}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={[s.loadBannerText, { color: thm.textSecondary }]}>
                Fetching {region === 'europe' ? 'European' : (region === 'usa' ? 'US' : (region === 'canada' ? 'Canadian' : 'Australian'))} prices…
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListHeaderComponent={<NativeAd variant="compact" />}
          renderItem={({ item, index }) => (
            <PriceCard
              item={item}
              rank={index + 1}
              fuelTab={fuelTab}
              allPrices={allPrices}
              isDark={isDark}
              region={region}
              userCurrency={userCurrency}
            />
          )}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <MaterialCommunityIcons name="gas-station-off-outline" size={48} color={thm.textMuted} />
              <Text style={[s.emptyText, { color: thm.textMuted }]}>
                No results for "{search}"
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

/* ── Styles ────────────────────────────────────────── */
const s = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },

  /* Region tabs */
  regionWrap: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  regionRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  regionTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Shadows.sm,
  },
  regionTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  regionEmoji: {
    fontSize: 14,
  },
  regionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  regionActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },

  /* Search */
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },

  /* Fuel chips */
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 7,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statVal: {
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  /* Sort */
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  sortText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  countText: {
    fontSize: FontSize.xs,
    marginLeft: 'auto',
  },

  /* Price card */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  nameBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  flag: {
    fontSize: 22,
  },
  nameCol: {
    flex: 1,
  },
  countryName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  currencyLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  priceBlock: {
    alignItems: 'flex-end',
    gap: 3,
  },
  priceVal: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  pricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  priceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  /* Loading */
  loadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  loadBannerText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  loadWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadText: {
    fontSize: FontSize.md,
  },
  fetchingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radii.full,
  },
  fetchingText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* List */
  listContent: {
    paddingTop: Spacing.sm,
  },

  /* Empty */
  emptyWrap: {
    alignItems: 'center',
    marginTop: Spacing.huge,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
  },
});
