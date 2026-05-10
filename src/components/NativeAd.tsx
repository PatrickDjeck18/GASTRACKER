import React, { useState } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import NativeAdView, { TaglineView, HeadlineView, AdvertiserView, CallToActionView, IconView, MediaView, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';
import { Colors, Spacing, Radii, FontSize, Shadows } from '../constants/theme';
import { useIsDark } from '../hooks/useIsDark';

// Get unit IDs from extra config
const extra = Constants.expoConfig?.extra || Constants.manifest?.extra;
const nativeAdAndroidId = extra?.admobNativeAndroidId;
const nativeAdIosId = extra?.admobNativeIosId;

const AD_UNIT_ID = Platform.select({
  android: nativeAdAndroidId || 'ca-app-pub-4253750298784159/3663481248',
  ios: nativeAdIosId || 'ca-app-pub-4253750298784159/4613600838',
}) || TestIds.NATIVE;

interface NativeAdProps {
  variant?: 'compact' | 'expanded';
}

export const NativeAd = ({ variant = 'expanded' }: NativeAdProps) => {
  const isDark = useIsDark();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(false);

  // Don't show ads on web
  if (Platform.OS === 'web') {
    return null;
  }

  // Check if components exist (Native Ads are a premium feature in some versions of this library)
  if (!NativeAdView || !HeadlineView) {
    console.warn('[NativeAd] NativeAdView or subcomponents are not available in this version of the library.');
    return null;
  }

  if (adError) {
    return null;
  }

  const themeColors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
        minHeight: 120, // Must have height to trigger ad load and display
      }
    ]}>
      {!adLoaded && !adError && (
        <View style={styles.loadingPlaceholder}>
          <Text style={{ color: themeColors.textMuted, fontSize: 12 }}>Ad Loading...</Text>
        </View>
      )}
      <NativeAdView
        adUnitId={AD_UNIT_ID}
        onAdLoaded={() => setAdLoaded(true)}
        onAdFailedToLoad={(error) => {
          console.warn('[NativeAd] Failed to load:', error);
          setAdError(true);
        }}
        style={styles.adView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            {IconView && <IconView style={styles.icon} />}
            <View style={styles.headerText}>
              {HeadlineView && (
                <HeadlineView
                  style={[styles.headline, { color: themeColors.text }]}
                  numberOfLines={1}
                />
              )}
              {AdvertiserView && (
                <AdvertiserView
                  style={[styles.advertiser, { color: themeColors.textSecondary }]}
                />
              )}
            </View>
            <View style={[styles.adBadge, { backgroundColor: themeColors.border }]}>
              <Text style={[styles.adBadgeText, { color: themeColors.textSecondary }]}>AD</Text>
            </View>
          </View>

          {variant === 'expanded' && MediaView && (
            <MediaView style={styles.media} />
          )}

          {TaglineView && (
            <TaglineView
              style={[styles.tagline, { color: themeColors.textSecondary }]}
              numberOfLines={2}
            />
          )}

          {CallToActionView && (
            <CallToActionView
              style={[styles.cta, { backgroundColor: Colors.primary }]}
              textStyle={styles.ctaText}
              buttonAndroidStyle={{ backgroundColor: Colors.primary, borderRadius: Radii.sm }}
            />
          )}
        </View>
      </NativeAdView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  adView: {
    width: '100%',
    minHeight: 120,
  },
  loadingPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xs,
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  headline: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
  advertiser: {
    fontSize: FontSize.xs,
  },
  adBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: Spacing.xs,
  },
  adBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  media: {
    width: '100%',
    height: 180,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  tagline: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  cta: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.md,
  },
  ctaText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
});
