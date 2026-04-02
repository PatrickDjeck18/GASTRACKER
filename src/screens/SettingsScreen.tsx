import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsDark } from '../hooks/useIsDark';
import { useAppStore } from '../store/useAppStore';
import { setAppLanguage } from '../i18n/index';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { FUEL_TYPES, DEFAULT_SEARCH_RADIUS, MAX_SEARCH_RADIUS } from '../constants/fuelTypes';
import { usePriceAlert } from '../hooks/usePriceAlert';

export default function SettingsScreen() {
  const isDark = useIsDark();
  const thm = isDark ? Colors.dark : Colors.light;
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const darkMode = useAppStore((s) => s.darkMode);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);
  const searchRadius = useAppStore((s) => s.searchRadius);
  const setSearchRadius = useAppStore((s) => s.setSearchRadius);
  const { alert, updateAlert } = usePriceAlert();

  const cardBg = thm.surfaceElevated;
  const border = thm.border;

  return (
    <View style={[styles.flex, { backgroundColor: thm.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: thm.surfaceElevated, borderBottomColor: thm.border, paddingTop: Math.max(insets.top, Spacing.xl) }]}>
        <Text style={[styles.pageTitle, { color: thm.text }]}>{t('settings.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Theme ──────────────────── */}
        <SectionTitle label={t('settings.theme')} thm={thm} />
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          {(['system', 'light', 'dark'] as const).map((m, index) => {
            const active = darkMode === m;
            const labels = {
              system: t('settings.themeSystem'),
              light: t('settings.themeLight'),
              dark: t('settings.themeDark'),
            };
            const icons = { system: 'theme-light-dark', light: 'white-balance-sunny', dark: 'moon-waning-crescent' };
            const isLast = index === 2;
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.themeOption, 
                  !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: thm.border },
                  active && { backgroundColor: Colors.primaryMuted }
                ]}
                activeOpacity={0.7}
                onPress={() => setDarkMode(m)}
              >
                <View style={[styles.iconWrap, { backgroundColor: active ? Colors.primaryGlow : thm.borderSubtle }]}>
                  <MaterialCommunityIcons
                    name={icons[m]}
                    size={20}
                    color={active ? Colors.primary : thm.textSecondary}
                  />
                </View>
                <Text style={[styles.themeLabel, { color: active ? Colors.primary : thm.text }]}>
                  {labels[m]}
                </Text>
                {active && (
                  <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Fuel type filter ──────── */}
        <SectionTitle label={t('settings.fuelType')} thm={thm} />
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border, padding: Spacing.md }]}>
          <View style={styles.chipWrap}>
            <TouchableOpacity
              style={[
                styles.chipOption,
                { backgroundColor: !filters.fuelType ? Colors.primary : thm.background, borderColor: !filters.fuelType ? Colors.primary : thm.border }
              ]}
              activeOpacity={0.7}
              onPress={() => setFilters({ fuelType: null })}
            >
              <Text style={[styles.chipLabel, { color: !filters.fuelType ? '#FFF' : thm.text }]}>
                All Types
              </Text>
            </TouchableOpacity>
            {FUEL_TYPES.map((ft) => {
              const active = filters.fuelType === ft.key;
              return (
                <TouchableOpacity
                  key={ft.key}
                  style={[
                    styles.chipOption,
                    { backgroundColor: active ? Colors.primary : thm.background, borderColor: active ? Colors.primary : thm.border }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setFilters({ fuelType: active ? null : ft.key })}
                >
                  <Text
                    style={[styles.chipLabel, { color: active ? '#FFF' : thm.text }]}
                  >
                    {t(ft.label)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Open now ──────────────── */}
        <View style={[styles.card, styles.row, { backgroundColor: cardBg, borderColor: border, marginTop: Spacing.xl }]}>
          <View style={[styles.iconWrap, { backgroundColor: Colors.primaryMuted }]}>
            <MaterialCommunityIcons name="clock-check-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={[styles.rowLabel, { color: thm.text }]}>{t('settings.openNow')}</Text>
          <Switch
            value={filters.openNowOnly}
            onValueChange={(v) => setFilters({ openNowOnly: v })}
            trackColor={{ false: thm.border, true: Colors.primary }}
            thumbColor={'#FFF'}
          />
        </View>

        {/* ── Search radius ─────────── */}
        <SectionTitle label={`Search Radius: ${(searchRadius / 1000).toFixed(0)} km`} thm={thm} />
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border, paddingVertical: Spacing.lg }]}>
          <View style={styles.sliderWrap}>
            {[5, 10, 15, 25, 50].map((km) => {
              const active = searchRadius === km * 1000;
              return (
                <TouchableOpacity
                  key={km}
                  style={[
                    styles.radiusChip, 
                    { backgroundColor: active ? Colors.primary : thm.background, borderColor: active ? Colors.primary : thm.border },
                    active && (!isDark ? Shadows.colored(Colors.primary) : undefined)
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSearchRadius(km * 1000)}
                >
                  <Text style={[styles.radiusText, { color: active ? '#FFF' : thm.text }]}>
                    {km}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Language ───────────────── */}
        <SectionTitle label={t('settings.language')} thm={thm} />
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border, padding: Spacing.md }]}>
          <View style={styles.chipWrap}>
            {[
              { code: 'en', flag: '🇬🇧', name: 'English' },
              { code: 'es', flag: '🇪🇸', name: 'Español' },
              { code: 'fr', flag: '🇫🇷', name: 'Français' },
              { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
            ].map((lang) => {
              const active = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langChip, 
                    { 
                      backgroundColor: active ? Colors.primaryMuted : thm.background, 
                      borderColor: active ? Colors.primary : thm.border 
                    }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setAppLanguage(lang.code)}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <Text style={[styles.langName, { color: active ? Colors.primary : thm.text }]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Price Alerts ──────────────── */}
        <SectionTitle label={t('settings.priceAlerts') || 'Price Alerts'} thm={thm} />
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.alertRow}>
            <View style={[styles.iconWrap, { backgroundColor: Colors.warning + '20' }]}>
              <MaterialCommunityIcons name="bell-ring-outline" size={20} color={Colors.warning} />
            </View>
            <View style={{ flex: 1, paddingRight: Spacing.md }}>
              <Text style={[styles.alertTitle, { color: thm.text }]}>
                {t('settings.alertsEnable') || 'Background Alerts'}
              </Text>
              <Text style={[styles.alertDesc, { color: thm.textMuted }]}>
                {t('settings.alertsHint') || 'Get notified when cheap fuel is nearby'}
              </Text>
            </View>
            <Switch
              value={alert.enabled}
              onValueChange={(val) => updateAlert({ enabled: val })}
              trackColor={{ false: thm.border, true: Colors.success }}
              thumbColor={'#FFF'}
            />
          </View>
        </View>

        {/* ── Privacy notice ─────────── */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('PrivacyPolicy')}
          activeOpacity={0.7}
          style={[styles.privacyCard, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary + '30' }]}
        >
          <MaterialCommunityIcons name="shield-check" size={24} color={Colors.primary} />
          <View style={styles.privacyContent}>
            <Text style={[styles.privacyTitle, { color: Colors.primary }]}>Privacy First</Text>
            <Text style={[styles.privacyText, { color: thm.textSecondary }]}>
              {t('settings.privacy') || 'Learn how we handle and protect your personal location data securely.'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ label, thm }: { label: string; thm: typeof Colors.dark }) {
  return (
    <Text style={[styles.sectionTitle, { color: thm.textSecondary }]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  content: { padding: Spacing.lg, paddingBottom: 60 },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  rowLabel: { flex: 1, fontSize: FontSize.md, fontWeight: '600' },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chipOption: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  chipLabel: { fontSize: FontSize.sm, fontWeight: '700' },
  sliderWrap: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  radiusChip: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  radiusText: { fontSize: FontSize.md, fontWeight: '800' },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  langFlag: { fontSize: 20 },
  langName: { fontSize: FontSize.sm, fontWeight: '700' },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xxxl,
    padding: Spacing.xl,
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    marginBottom: 4,
  },
  privacyText: { fontSize: FontSize.xs, lineHeight: 18 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  alertTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  alertDesc: {
    fontSize: FontSize.xs,
  },
});
