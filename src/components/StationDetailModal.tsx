import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useIsDark } from '../hooks/useIsDark';
import { useTrafficFlow } from '../hooks/useTrafficFlow';
import { useEnrichStation } from '../hooks/useStations';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { PriceTag } from './PriceTag';
import { TrafficBadge } from './TrafficBadge';
import { StaticMapPreview } from './StaticMapPreview';
import { formatDistance } from '../utils/geo';
import { formatPrice, getPriceTier } from '../utils/price';
import { openNavigation, openPhone } from '../utils/navigation';
import type { Station } from '../types/station';
import { useTranslation } from 'react-i18next';
import { getLocalCurrencyCode } from '../services/fuelPriceService';

interface Props {
  station: Station | null;
  allPrices: number[];
  userCoords?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  /** The query key used for the station list, needed to update the cache */
  stationsQueryKey?: unknown[];
}

export function StationDetailModal({ station, allPrices, userCoords, onClose, stationsQueryKey }: Props) {
  const isDark = useIsDark();
  const t = isDark ? Colors.dark : Colors.light;
  const { t: tr } = useTranslation();
  const enrichStation = useEnrichStation();
  const { showAdNow } = useInterstitialAd();
  const localCurrency = getLocalCurrencyCode();

  /* ── Local enriched station state ─── */
  const [enriched, setEnriched] = useState<Station | null>(null);
  const [enriching, setEnriching] = useState(false);

  // Reset and auto-enrich when station changes
  useEffect(() => {
    setEnriched(null);
    if (!station) return;
    if (station.fuelPrices.length === 0) {
      setEnriching(true);
      enrichStation(station, stationsQueryKey ?? [])
        .then((s) => setEnriched(s))
        .catch(() => {})
        .finally(() => setEnriching(false));
    }
  }, [station?.id]);

  // Use enriched data if available, fall back to raw station
  const displayStation = enriched ?? station;

  const slideAnim = useRef(new Animated.Value(1000)).current;

  useEffect(() => {
    if (station) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 12,
      }).start();
    }
  }, [station, slideAnim]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 1000,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      showAdNow();
    });
  };


  /* ── Traffic flow (Traffic API) ─── */
  const { data: trafficInfo } = useTrafficFlow({
    lat: station?.coordinates.latitude,
    lon: station?.coordinates.longitude,
    enabled: !!station,
  });

  if (!station) return null;

  const hasPrices = (displayStation?.fuelPrices.length ?? 0) > 0;
  const isGeminiSource = displayStation?.priceSource === 'gemini' || displayStation?.priceSource === 'gemini-grounded';
  const isGrounded = displayStation?.priceSource === 'gemini-grounded';

  return (
    <Modal
      visible
      transparent
      onRequestClose={handleClose}
      animationType="fade"
      statusBarTranslucent
    >
      <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={handleClose} />

      <Animated.View 
        style={[
          styles.sheet, 
          { backgroundColor: t.surface, transform: [{ translateY: slideAnim }] },
          !isDark && Shadows.xl
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.mapContainer}>
            {/* Static map preview (Map Display API) */}
            <StaticMapPreview
              latitude={station.coordinates.latitude}
              longitude={station.coordinates.longitude}
              zoom={15}
              height={140}
            />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity 
              style={[styles.backIcon, { backgroundColor: t.surfaceElevated }]} 
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons name="chevron-left" size={26} color={t.text} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={[styles.stationName, { color: t.text }]}>
                {station.brand ?? station.name}
              </Text>
              <Text style={[styles.stationAddr, { color: t.textSecondary }]}>
                {station.address}
              </Text>
            </View>
          </View>

          {/* Distance + Hours + Traffic row */}
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: Colors.primaryMuted, borderColor: Colors.primaryGlow, borderWidth: 1 }]}>
              <MaterialCommunityIcons name="map-marker-distance" size={16} color={Colors.primary} />
              <Text style={[styles.chipText, { color: Colors.primary }]}>
                {formatDistance(station.distance)}
              </Text>
            </View>
            {station.openingHours ? (
              <View style={[styles.chip, { backgroundColor: Colors.warning + '20', borderColor: Colors.warning + '40', borderWidth: 1 }]}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.warning} />
                <Text style={[styles.chipText, { color: Colors.warning, fontWeight: '700' }]}>
                  {station.openingHours}
                </Text>
              </View>
            ) : null}
            {/* Traffic badge (Traffic Flow API) */}
            <TrafficBadge traffic={trafficInfo} compact style={{ flexShrink: 0, paddingHorizontal: Spacing.md }} />
          </View>


          {/* Fuel prices */}
          <View style={[styles.priceCard, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
            <View style={styles.priceCardHeader}>
              <MaterialCommunityIcons name="water" size={20} color={t.text} />
              <Text style={[styles.sectionTitle, { color: t.text }]}>
                {tr('station.fuels')}
              </Text>
              {/* AI badge */}
              {isGeminiSource && (
                <View style={[styles.aiBadge, { backgroundColor: isGrounded ? '#4CAF5020' : '#9C27B020', borderColor: isGrounded ? '#4CAF50' : '#9C27B0' }]}>
                  <MaterialCommunityIcons name="google" size={11} color={isGrounded ? '#4CAF50' : '#9C27B0'} />
                  <Text style={[styles.aiBadgeText, { color: isGrounded ? '#4CAF50' : '#9C27B0' }]}>
                    {isGrounded ? 'AI · Verified' : 'AI'}
                  </Text>
                </View>
              )}
            </View>

            {enriching ? (
              <View style={styles.enrichingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={[styles.enrichingText, { color: t.textMuted }]}>Looking up live prices…</Text>
              </View>
            ) : hasPrices ? (
              <>
                {displayStation!.fuelPrices.map((fp, i) => {
                  const tier = getPriceTier(fp.price, allPrices);
                  const isLast = i === displayStation!.fuelPrices.length - 1;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.fuelRow,
                        !isLast && { borderBottomColor: t.borderSubtle, borderBottomWidth: StyleSheet.hairlineWidth }
                      ]}
                    >
                      <Text style={[styles.fuelType, { color: t.text }]}>{fp.fuelType}</Text>
                      <PriceTag
                        label={formatPrice(fp.price, localCurrency)}
                        tier={tier}
                        size="sm"
                      />
                    </View>
                  );
                })}
                {/* Attribution */}
                {isGeminiSource && displayStation?.priceAttribution ? (
                  <Text style={[styles.attribution, { color: t.textMuted }]} numberOfLines={2}>
                    Source: {displayStation.priceAttribution}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={[styles.noPrice, { color: t.textMuted }]}>
                {tr('station.noPrice')}
              </Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
             {/* Replaced Google Maps button with default Maps */}
            <TouchableOpacity
              style={[styles.navBtn, { backgroundColor: Colors.primary }]}
              activeOpacity={0.8}
              onPress={() =>
                openNavigation(
                  station.coordinates.latitude,
                  station.coordinates.longitude,
                  station.name,
                  'default',
                )
              }
            >
              <MaterialCommunityIcons name="navigation-variant" size={22} color="#FFF" />
              <Text style={styles.navBtnText}>Directions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navBtnSecondary, { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted }]}
              activeOpacity={0.8}
              onPress={() =>
                openNavigation(
                  station.coordinates.latitude,
                  station.coordinates.longitude,
                  station.name,
                  'waze',
                )
              }
            >
              <MaterialCommunityIcons name="waze" size={22} color={Colors.primary} />
            </TouchableOpacity>

            {/* TomTom Navigation */}
            <TouchableOpacity
              style={[styles.navBtnSecondary, { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted }]}
              activeOpacity={0.8}
              onPress={() =>
                openNavigation(
                  station.coordinates.latitude,
                  station.coordinates.longitude,
                  station.name,
                  'tomtom',
                )
              }
            >
              <MaterialCommunityIcons name="compass-outline" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {station.phone ? (
            <TouchableOpacity
              style={[styles.phoneRow, { backgroundColor: t.card, borderColor: t.cardBorder }]}
              onPress={() => openPhone(station.phone!)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="phone" size={20} color={t.textSecondary} />
              <Text style={[styles.phoneText, { color: t.text }]}>{station.phone}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={t.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    borderTopLeftRadius: Radii.xxl,
    borderTopRightRadius: Radii.xxl,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 80 : 60,
  },
  mapContainer: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  stationName: {
    fontSize: FontSize.xl + 2,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  stationAddr: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  backIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    gap: 6,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  priceCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  priceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  fuelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  fuelType: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  noPrice: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    paddingVertical: Spacing.md,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginLeft: 'auto',
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  enrichingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  enrichingText: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
  attribution: {
    fontSize: 10,
    marginTop: Spacing.sm,
    lineHeight: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.xl,
  },
  navBtnText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: FontSize.md,
  },
  navBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  phoneText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
