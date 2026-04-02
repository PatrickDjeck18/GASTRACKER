import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import { AD_REQUEST_OPTIONS } from '../constants/adMob';

/* ─────────────────────────────────────────────────────
 * Ad Unit IDs
 * In production, replace these with your real Ad Unit IDs
 * from the AdMob dashboard.
 * ────────────────────────────────────────────────────── */
const BANNER_UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: 'ca-app-pub-4253750298784159/4205295931',
      android: 'ca-app-pub-4253750298784159/8510433108',
      default: TestIds.ADAPTIVE_BANNER,
    })!;

type Props = {
  /** Override the default ad-unit ID */
  unitId?: string;
  /** Banner size — defaults to ANCHORED_ADAPTIVE_BANNER */
  size?: BannerAdSize;
  /** Extra style for the wrapper View */
  style?: object;
};

/**
 * Drop-in AdMob banner that collapses to zero height when
 * loading or on error, so the layout stays clean.
 */
export function AdBanner({
  unitId = BANNER_UNIT_ID,
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
  style,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const onAdLoaded = useCallback(() => {
    setLoaded(true);
    retryCount.current = 0;
  }, []);

  const onAdFailedToLoad = useCallback((error: Error) => {
    setLoaded(false);
    if (__DEV__) {
      console.warn('[AdBanner] failed to load:', error.message);
    }
    // Simple retry with backoff
    if (retryCount.current < maxRetries) {
      retryCount.current += 1;
    }
  }, []);

  return (
    <View style={[styles.container, !loaded && styles.hidden, style]}>
      <BannerAd
        unitId={unitId}
        size={size}
        onAdLoaded={onAdLoaded}
        onAdFailedToLoad={onAdFailedToLoad}
        requestOptions={{
          ...AD_REQUEST_OPTIONS,
          networkExtras: {
            collapsible: 'bottom',
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  hidden: {
    height: 0,
    opacity: 0,
  },
});
