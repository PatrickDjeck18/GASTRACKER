import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { AD_REQUEST_OPTIONS } from '../constants/adMob';

/* ─────────────────────────────────────────────────────
 * Ad Unit IDs
 * In production, replace these with your real Ad-Unit IDs.
 * ────────────────────────────────────────────────────── */
const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: 'ca-app-pub-4253750298784159/9999906497',
      android: 'ca-app-pub-4253750298784159/4286851714',
      default: TestIds.INTERSTITIAL,
    })!;

/** Minimum interval (ms) between interstitial ads */
const AD_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

/** Number of "actions" before an ad is shown */
const ACTIONS_BEFORE_AD = 1;

/**
 * Hook to manage interstitial ads with:
 * - Automatic preloading
 * - Cooldown timer
 * - Automatic periodic trigger (every 2 minutes)
 */
export function useInterstitialAd() {
  const interstitial = useRef<InterstitialAd | null>(null);
  const isLoaded = useRef(false);
  const lastShown = useRef(0);
  const actionCount = useRef(0);

  // ... loadAd logic remains same ...

  // Create and preload the ad
  const loadAd = useCallback(() => {
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
      ...AD_REQUEST_OPTIONS,
    });

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      isLoaded.current = true;
    });

    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      isLoaded.current = false;
      loadAd();
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      isLoaded.current = false;
    });

    ad.load();
    interstitial.current = ad;

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, []);

  useEffect(() => {
    const cleanup = loadAd();
    return cleanup;
  }, [loadAd]);

  /**
   * Force-show the ad immediately. Respects cooldown.
   */
  const showAdNow = useCallback(() => {
    const now = Date.now();
    if (now - lastShown.current < AD_COOLDOWN_MS) return;

    if (isLoaded.current && interstitial.current) {
      interstitial.current.show();
      lastShown.current = now;
      actionCount.current = 0;
    }
  }, []);

  /**
   * Automatic background timer to check for ad availability every 3 minutes.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      showAdNow();
    }, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, [showAdNow]);

  /**
   * Call this on a user action.
   */
  const maybeShowAd = useCallback(() => {
    actionCount.current += 1;
    if (actionCount.current < ACTIONS_BEFORE_AD) return;
    showAdNow();
  }, [showAdNow]);

  return { maybeShowAd, showAdNow };
}
