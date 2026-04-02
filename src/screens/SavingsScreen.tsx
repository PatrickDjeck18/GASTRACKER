import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Animated, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsDark }      from '../hooks/useIsDark';
import { useAppStore }    from '../store/useAppStore';
import { useLocation }    from '../hooks/useLocation';
import { useStations }    from '../hooks/useStations';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { bestPrice, formatPrice, getPriceTier, currencySymbol } from '../utils/price';
import { formatDistance } from '../utils/geo';
import type { Station }   from '../types/station';

/* ── helpers ──────────────────────────────────────────── */
type Result = {
  fillSaving: number;
  tripCost: number;
  net: number;
  monthly: number;
  worthIt: boolean;
  currency: string;
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FIELD — styled input with label + icon
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Field({
  label, icon, value, onChange, placeholder, suffix, isDark,
}: {
  label: string; icon: string; value: string; onChange: (v: string) => void;
  placeholder?: string; suffix?: string; isDark: boolean;
}) {
  const thm    = isDark ? Colors.dark : Colors.light;
  const active = useRef(new Animated.Value(0)).current;
  const onFocus = () => Animated.timing(active, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  const onBlur  = () => Animated.timing(active, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  const borderColor = active.interpolate({ inputRange: [0, 1], outputRange: [thm.border, Colors.primary] });

  // Handle decimal separators for different locales
  const handleChange = (text: string) => {
    const formatted = text.replace(',', '.');
    if (/^\d*\.?\d*$/.test(formatted)) {
      onChange(formatted);
    }
  };

  return (
    <View style={f.group}>
      <Text style={[f.label, { color: thm.textSecondary }]}>{label}</Text>
      <Animated.View style={[f.wrap, { backgroundColor: thm.surfaceElevated, borderColor }]}>
        <MaterialCommunityIcons name={icon} size={18} color={thm.textMuted} style={f.icon} />
        <TextInput
          style={[f.input, { color: thm.text }]}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder ?? '0'}
          placeholderTextColor={thm.textMuted}
          keyboardType="decimal-pad"
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {suffix ? <Text style={[f.suffix, { color: thm.textMuted }]}>{suffix}</Text> : null}
      </Animated.View>
    </View>
  );
}
const f = StyleSheet.create({
  group:  { marginBottom: Spacing.lg },
  label:  { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
  wrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: Radii.lg, paddingHorizontal: Spacing.md },
  icon:   { marginRight: Spacing.sm },
  input:  { flex: 1, fontSize: FontSize.md, fontWeight: '600', paddingVertical: 13 },
  suffix: { fontSize: FontSize.sm, fontWeight: '600', marginLeft: 4 },
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STATION ROW — price bar comparison
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function StationRow({
  station, rank, allPrices, fuelFilter, isDark, isCheapest,
}: {
  station: Station; rank: number; allPrices: number[];
  fuelFilter: string | null; isDark: boolean; isCheapest: boolean;
}) {
  const thm  = isDark ? Colors.dark : Colors.light;
  const best = bestPrice(station, fuelFilter);
  if (!best) return null;

  const tier    = getPriceTier(best.price, allPrices);
  const barW    = useRef(new Animated.Value(0)).current;
  const mn      = Math.min(...allPrices);
  const mx      = Math.max(...allPrices);
  const pct     = mx === mn ? 0.5 : (best.price - mn) / (mx - mn);
  const barPct  = Math.max(0.15, 1 - pct); // invert so cheapest = full bar
  const tierColors: Record<string, string> = {
    cheap: Colors.price.cheap, medium: Colors.price.medium,
    expensive: Colors.price.expensive, unknown: Colors.price.unknown,
  };
  const col = tierColors[tier] ?? Colors.price.unknown;

  useEffect(() => {
    Animated.timing(barW, { toValue: barPct, duration: 600 + rank * 120, useNativeDriver: false }).start();
  }, [barPct, rank]);

  return (
    <View style={[sr.row, isCheapest && { backgroundColor: Colors.price.cheapBg, borderRadius: Radii.lg }]}>
      <View style={[sr.rankWrap, { backgroundColor: isCheapest ? Colors.price.cheap : thm.surfaceElevated }]}>
        <Text style={[sr.rank, { color: isCheapest ? '#FFF' : thm.textMuted }]}>{rank}</Text>
      </View>
      <View style={sr.info}>
        <Text style={[sr.name, { color: thm.text }]} numberOfLines={1}>
          {station.brand ?? station.name}
        </Text>
        <View style={sr.barBg}>
          <Animated.View style={[sr.bar, { backgroundColor: col, width: barW.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>
      <View style={sr.right}>
        <Text style={[sr.price, { color: col }]}>{formatPrice(best.price, best.currency)}</Text>
        <Text style={[sr.dist, { color: thm.textMuted }]}>{formatDistance(station.distance)}</Text>
      </View>
    </View>
  );
}
const sr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4, gap: Spacing.sm },
  rankWrap: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  rank:     { fontSize: 11, fontWeight: '800' },
  info:     { flex: 1 },
  name:     { fontSize: 12, fontWeight: '700', marginBottom: 4, letterSpacing: -0.2 },
  barBg:    { height: 5, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  bar:      { height: 5, borderRadius: 3 },
  right:    { alignItems: 'flex-end', minWidth: 60 },
  price:    { fontSize: 13, fontWeight: '800', letterSpacing: -0.3 },
  dist:     { fontSize: 10, fontWeight: '500', marginTop: 2 },
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RESULT METRIC
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Metric({ icon, label, value, color, isDark }: {
  icon: string; label: string; value: string; color: string; isDark: boolean;
}) {
  const thm = isDark ? Colors.dark : Colors.light;
  return (
    <View style={mt.row}>
      <View style={[mt.iconWrap, { backgroundColor: color + '1A' }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
      </View>
      <Text style={[mt.label, { color: thm.textSecondary }]}>{label}</Text>
      <Text style={[mt.value, { color }]}>{value}</Text>
    </View>
  );
}
const mt = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  iconWrap:{ width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  label:   { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  value:   { fontSize: FontSize.md, fontWeight: '800', letterSpacing: -0.3 },
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN SCREEN
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function SavingsScreen() {
  const isDark  = useIsDark();
  const thm     = isDark ? Colors.dark : Colors.light;
  const { t }   = useTranslation();
  const insets  = useSafeAreaInsets();

  /* ── store data ─── */
  const { coords }    = useLocation();
  const fuelFilter    = useAppStore((s) => s.filters.fuelType);
  const searchRadius  = useAppStore((s) => s.searchRadius);
  const savings       = useAppStore((s) => s.savings);
  const setSavings    = useAppStore((s) => s.setSavings);
  const { data: stations = [] } = useStations({
    lat: coords?.latitude, lon: coords?.longitude,
    radius: searchRadius, enabled: !!coords,
  });

  /* ── sorted stations with price ─── */
  const rankedStations = useMemo(() => {
    return [...stations]
      .filter((s) => bestPrice(s, fuelFilter) != null)
      .sort((a, b) => (bestPrice(a, fuelFilter)?.price ?? 0) - (bestPrice(b, fuelFilter)?.price ?? 0))
      .slice(0, 5);
  }, [stations, fuelFilter]);

  const cheapest = rankedStations[0] ?? null;
  const cheapestBest = cheapest ? bestPrice(cheapest, fuelFilter) : null;
  const currency = cheapestBest?.currency ?? 'EUR';
  const sym      = currencySymbol(currency);

  const allPrices = useMemo(
    () => rankedStations.map((s) => bestPrice(s, fuelFilter)!.price),
    [rankedStations, fuelFilter],
  );

  /* ── form state (synced with store) ─── */
  const [result,     setResult]     = useState<Result | null>(null);
  const resultAnim = useRef(new Animated.Value(0)).current;

  // Auto-suggest usual price if empty
  useEffect(() => {
    if (cheapestBest && !savings.usualPrice) {
      // Suggest 10% more than cheapest
      // We don't auto-set it in the store to avoid annoying the user,
      // but we use it in calculation if usualPrice is empty.
    }
  }, [cheapestBest, savings.usualPrice]);

  const calculate = useCallback(() => {
    const tank   = parseFloat(savings.tankSize);
    const usual  = parseFloat(savings.usualPrice) || (cheapestBest ? cheapestBest.price * 1.1 : 0);
    const eco    = parseFloat(savings.economy);
    const cheapP = cheapestBest?.price ?? 0;
    const dist   = cheapest?.distance  ?? 0;

    if (!cheapest) {
      Alert.alert(t('common.error') || 'Error', t('savings.emptyHint') || 'Find stations on the map first.');
      return;
    }
    if (isNaN(tank) || tank <= 0) {
      Alert.alert(t('common.error') || 'Error', "Please enter a valid tank size (e.g. 50)");
      return;
    }
    if (isNaN(eco) || eco <= 0) {
      Alert.alert(t('common.error') || 'Error', "Please enter a valid fuel economy (e.g. 15)");
      return;
    }

    const effectiveUsual = usual || cheapP * 1.1;
    const fillSaving = (effectiveUsual - cheapP) * tank;
    const tripFuel   = (dist * 2) / eco;
    const tripCost   = tripFuel * effectiveUsual;
    const net        = fillSaving - tripCost;
    const monthly    = net * 4;

    setResult({ fillSaving, tripCost, net, monthly, worthIt: net > 0, currency });

    resultAnim.setValue(0);
    Animated.spring(resultAnim, { 
      toValue: 1, 
      useNativeDriver: true, 
      friction: 8,
      tension: 40 
    }).start();
  }, [savings, cheapestBest, cheapest, currency, resultAnim, t]);

  /* ── render ─── */
  return (
    <KeyboardAvoidingView style={[g.flex, { backgroundColor: thm.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>

      {/* ── HERO HEADER ─── */}
      <View style={[g.header, { paddingTop: insets.top + Spacing.lg, backgroundColor: isDark ? Colors.dark.surfaceElevated : Colors.primary, borderBottomColor: isDark ? Colors.dark.border : 'transparent' }]}>
        <View style={g.headerIcon}>
          <MaterialCommunityIcons name="piggy-bank" size={28} color={isDark ? Colors.primary : '#FFF'} />
        </View>
        <View style={g.headerText}>
          <Text style={[g.heroTitle, { color: isDark ? thm.text : '#FFF' }]}>{t('savings.title')}</Text>
          <Text style={[g.heroSub, { color: isDark ? thm.textSecondary : 'rgba(255,255,255,0.8)' }]}>
            {t('savings.heroSub')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[g.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── CHEAPEST STATION HERO CARD ─── */}
        {cheapest && cheapestBest ? (
          <View style={[g.heroCard, { backgroundColor: Colors.price.cheapBg, borderColor: Colors.price.cheapBorder }]}>
            <View style={g.heroCardLeft}>
              <View style={g.trophyRing}>
                <MaterialCommunityIcons name="trophy" size={22} color={Colors.price.cheap} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={g.cheapTag}>{t('savings.cheapestNearby')}</Text>
                <Text style={[g.cheapName, { color: thm.text }]} numberOfLines={1}>
                  {cheapest.brand ?? cheapest.name}
                </Text>
                <Text style={[g.cheapAddr, { color: thm.textSecondary }]} numberOfLines={1}>
                  {formatDistance(cheapest.distance)} · {cheapestBest.fuelType}
                </Text>
              </View>
            </View>
            <View style={g.heroCardRight}>
              <Text style={g.cheapPrice}>{sym}{cheapestBest.price.toFixed(2)}</Text>
              <Text style={[g.cheapUnit, { color: Colors.price.cheap }]}>/L</Text>
            </View>
          </View>
        ) : (
          <View style={[g.emptyHint, { backgroundColor: thm.surfaceElevated, borderColor: thm.border }]}>
            <MaterialCommunityIcons name="map-search" size={28} color={thm.textMuted} />
            <Text style={[g.emptyTxt, { color: thm.textMuted }]}>
              {t('savings.emptyHint')}
            </Text>
          </View>
        )}

        {/* ── STATION COMPARISON ─── */}
        {rankedStations.length > 1 && (
          <View style={[g.card, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}>
            <View style={g.sectionHead}>
              <MaterialCommunityIcons name="chart-bar" size={18} color={Colors.primary} />
              <Text style={[g.sectionTitle, { color: thm.text }]}>{t('savings.priceComparison')}</Text>
              <Text style={[g.sectionMeta, { color: thm.textMuted }]}>{t('savings.stationsCount', { count: rankedStations.length })}</Text>
            </View>
            <View style={{ gap: 2 }}>
              {rankedStations.map((s, i) => (
                <StationRow
                  key={s.id}
                  station={s}
                  rank={i + 1}
                  allPrices={allPrices}
                  fuelFilter={fuelFilter}
                  isDark={isDark}
                  isCheapest={i === 0}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── CALCULATOR ─── */}
        <View style={[g.card, { backgroundColor: thm.card, borderColor: thm.cardBorder }]}>
          <View style={g.sectionHead}>
            <MaterialCommunityIcons name="calculator-variant" size={18} color={Colors.primary} />
            <Text style={[g.sectionTitle, { color: thm.text }]}>{t('savings.trueSavingsCalc')}</Text>
          </View>

          <Field 
            label={t('savings.tankSize')}             
            icon="car-cog"    
            value={savings.tankSize}   
            onChange={(v) => setSavings({ tankSize: v })}   
            suffix="L"    
            isDark={isDark} 
          />
          <Field 
            label={`${t('savings.yourPrice')} (${sym}/L)`}    
            icon="currency-usd" 
            value={savings.usualPrice} 
            onChange={(v) => setSavings({ usualPrice: v })} 
            placeholder={cheapestBest ? `${sym}${(cheapestBest.price * 1.1).toFixed(2)}` : `e.g. ${sym}1.65`} 
            isDark={isDark} 
          />
          <Field 
            label={t('savings.kmPerLiter')}      
            icon="speedometer" 
            value={savings.economy}    
            onChange={(v) => setSavings({ economy: v })}   
            suffix="km/L" 
            isDark={isDark} 
          />

          <TouchableOpacity
            style={[g.calcBtn, { backgroundColor: Colors.primary, opacity: (!cheapestBest) ? 0.6 : 1 }]}
            onPress={calculate}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="calculator-variant-outline" size={20} color="#FFF" />
            <Text style={g.calcBtnTxt}>{t('savings.cta')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── RESULTS ─── */}
        {result && (
          <Animated.View
            style={[
              g.card,
              {
                backgroundColor: thm.card,
                borderColor: result.worthIt ? Colors.price.cheapBorder : Colors.price.expensiveBorder,
                borderWidth: 1.5,
                transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
                opacity: resultAnim,
              },
            ]}
          >
            {/* Verdict banner */}
            <View style={[g.verdict, { backgroundColor: result.worthIt ? Colors.price.cheapBg : Colors.price.expensiveBg }]}>
              <MaterialCommunityIcons
                name={result.worthIt ? 'check-circle' : 'close-circle'}
                size={22}
                color={result.worthIt ? Colors.price.cheap : Colors.price.expensive}
              />
              <View style={{ flex: 1 }}>
                <Text style={[g.verdictTitle, { color: result.worthIt ? Colors.price.cheap : Colors.price.expensive }]}>
                  {result.worthIt ? t('savings.worthIt') : t('savings.notWorthIt')}
                </Text>
                <Text style={[g.verdictSub, { color: thm.textSecondary }]}>
                  {result.worthIt
                    ? t('savings.saveAmount', { amount: `${sym}${Math.abs(result.net).toFixed(2)}` })
                    : t('savings.costAmount', { amount: `${sym}${Math.abs(result.net).toFixed(2)}` })}
                </Text>
              </View>
            </View>

            {/* Net savings big number */}
            <View style={g.bigNumWrap}>
              <Text style={[g.bigNum, { color: result.worthIt ? Colors.price.cheap : Colors.price.expensive }]}>
                {result.net >= 0 ? '+' : ''}{sym}{result.net.toFixed(2)}
              </Text>
              <Text style={[g.bigNumLabel, { color: thm.textSecondary }]}>{t('savings.netSavingPerFill')}</Text>
            </View>

            {/* Breakdown */}
            <View style={[g.dividerLine, { backgroundColor: thm.border }]} />
            <View style={{ gap: 2 }}>
              <Metric icon="piggy-bank"    label={t('savings.nominal')}      value={`+${sym}${result.fillSaving.toFixed(2)}`} color={Colors.price.cheap}     isDark={isDark} />
              <Metric icon="gas-station"   label={t('savings.tripCost')}     value={`-${sym}${result.tripCost.toFixed(2)}`}  color={Colors.price.expensive}  isDark={isDark} />
              <View style={[g.dividerLine, { backgroundColor: thm.border }]} />
              <Metric icon="calendar-month" label={t('savings.monthlySaving')}  value={`${result.monthly >= 0 ? '+' : ''}${sym}${Math.abs(result.monthly).toFixed(2)}`}
                color={result.monthly >= 0 ? Colors.primary : Colors.price.expensive} isDark={isDark} />
            </View>

            {/* Tip */}
            <View style={[g.tip, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primaryGlow }]}>
              <MaterialCommunityIcons name="lightbulb-outline" size={14} color={Colors.primary} />
              <Text style={[g.tipTxt, { color: Colors.primary }]}>
                {t('savings.tipMonthly')}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ── styles ─────────────────────────────────────────────── */
const g = StyleSheet.create({
  flex: { flex: 1 },

  /* hero header */
  header:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, borderBottomWidth: 1 },
  headerIcon:  { width: 52, height: 52, borderRadius: Radii.xl, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerText:  { flex: 1 },
  heroTitle:   { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.6 },
  heroSub:     { fontSize: FontSize.sm, marginTop: 3, lineHeight: 18 },

  content: { padding: Spacing.lg, gap: Spacing.lg },

  /* cheapest hero card */
  heroCard:    { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: Radii.xl, borderWidth: 1.5, gap: Spacing.md },
  heroCardLeft:{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  heroCardRight:{ alignItems: 'flex-end' },
  trophyRing:  { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16,185,129,0.2)', justifyContent: 'center', alignItems: 'center' },
  cheapTag:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, color: Colors.price.cheap, marginBottom: 2 },
  cheapName:   { fontSize: FontSize.md, fontWeight: '800', letterSpacing: -0.3 },
  cheapAddr:   { fontSize: FontSize.xs, marginTop: 2 },
  cheapPrice:  { fontSize: FontSize.xxl + 2, fontWeight: '800', color: Colors.price.cheap, letterSpacing: -1 },
  cheapUnit:   { fontSize: FontSize.xs, fontWeight: '600', textAlign: 'right' },

  emptyHint:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.xl, borderRadius: Radii.xl, borderWidth: 1 },
  emptyTxt:    { flex: 1, fontSize: FontSize.sm, lineHeight: 20 },

  /* generic card */
  card:        { borderRadius: Radii.xl, borderWidth: 1, padding: Spacing.xl },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  sectionTitle:{ fontSize: FontSize.md, fontWeight: '800', flex: 1, letterSpacing: -0.3 },
  sectionMeta: { fontSize: FontSize.xs, fontWeight: '600' },

  /* calc button */
  calcBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.sm, paddingVertical: Spacing.lg + 2, borderRadius: Radii.full, ...Shadows.colored(Colors.primary) },
  calcBtnTxt:  { color: '#FFF', fontWeight: '800', fontSize: FontSize.md, letterSpacing: -0.2 },

  /* result */
  verdict:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, borderRadius: Radii.lg, marginBottom: Spacing.xl },
  verdictTitle:{ fontSize: FontSize.md, fontWeight: '800', letterSpacing: -0.3 },
  verdictSub:  { fontSize: FontSize.xs, marginTop: 3, lineHeight: 18 },
  bigNumWrap:  { alignItems: 'center', paddingVertical: Spacing.xl },
  bigNum:      { fontSize: 52, fontWeight: '800', letterSpacing: -2 },
  bigNumLabel: { fontSize: FontSize.sm, fontWeight: '600', marginTop: 4 },
  dividerLine: { height: 1, marginVertical: Spacing.md },

  /* tip */
  tip:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.lg, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  tipTxt: { flex: 1, fontSize: FontSize.xs, fontWeight: '600', lineHeight: 16 },
});
