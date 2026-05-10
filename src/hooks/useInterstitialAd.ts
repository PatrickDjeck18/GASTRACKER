import { useEffect, useCallback } from 'react';
import { Platform, AppState, type AppStateStatus } from 'react-native';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { AD_REQUEST_OPTIONS } from '../constants/adMob';

/* ─────────────────────────────────────────────────────
 * Ad Unit IDs
 * ────────────────────────────────────────────────────── */
const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: 'ca-app-pub-4253750298784159/3421762493',
      android: 'ca-app-pub-4253750298784159/8007874764',
      default: TestIds.INTERSTITIAL,
    })!;

/** Minimum interval (ms) between interstitial ads */
const AD_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

/** Number of "actions" before an ad is shown */
const ACTIONS_BEFORE_AD = 2;

/* ─────────────────────────────────────────────────────
 * Global Singleton State
 * ────────────────────────────────────────────────────── */
let globalInterstitial: InterstitialAd | null = null;
let globalIsLoaded = false;
let globalLastShown = 0;
let globalActionCount = 0;
let globalIsLoading = false;

/**
 * Load a new interstitial ad
 */
function loadAd() {
  if (globalIsLoaded || globalIsLoading || Platform.OS === 'web') return;
  
  globalIsLoading = true;
  const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
    ...AD_REQUEST_OPTIONS,
  });

  ad.addAdEventListener(AdEventType.LOADED, () => {
    globalIsLoaded = true;
    globalIsLoading = false;
  });

  ad.addAdEventListener(AdEventType.CLOSED, () => {
    globalIsLoaded = false;
    globalIsLoading = false;
    globalInterstitial = null;
    // Preload the next one
    loadAd();
  });

  ad.addAdEventListener(AdEventType.ERROR, (error) => {
    if (__DEV__) console.warn('Interstitial Ad Error:', error);
    globalIsLoaded = false;
    globalIsLoading = false;
    globalInterstitial = null;
    // Retry after 30 seconds
    setTimeout(loadAd, 30000);
  });

  ad.load();
  globalInterstitial = ad;
}

/**
 * Show the ad if conditions are met
 */
function showAdInternal() {
  if (Platform.OS === 'web') return false;

  const now = Date.now();
  
  // Initialize start time on first call if not set
  if (globalLastShown === 0) {
    globalLastShown = now;
    return false;
  }

  // Check cooldown
  if (now - globalLastShown < AD_COOLDOWN_MS) {
    return false;
  }

  // Only show if app is in foreground
  if (AppState.currentState !== 'active') {
    return false;
  }

  if (globalIsLoaded && globalInterstitial) {
    try {
      globalInterstitial.show();
      globalLastShown = now;
      globalActionCount = 0;
      return true;
    } catch (e) {
      console.error('Failed to show interstitial:', e);
      return false;
    }
  } else {
    // If not loaded but we wanted to show it, try loading now
    loadAd();
    return false;
  }
}

// Initial load attempt
if (Platform.OS !== 'web') {
  loadAd();
}

// Global timer to show ad every 3 minutes (checked every 10s for reliability)
const globalInterval = setInterval(() => {
  showAdInternal();
}, 10000);

/**
 * Hook to manage interstitial ads with global state.
 * Using this hook in multiple components is safe and shared.
 */
export function useInterstitialAd() {
  /**
   * Call this on a user action (e.g. clicking a station).
   */
  const maybeShowAd = useCallback(() => {
    globalActionCount += 1;
    if (globalActionCount >= ACTIONS_BEFORE_AD) {
      showAdInternal();
    }
  }, []);

  /**
   * Force-show the ad immediately (still respects 3-min cooldown).
   */
  const showAdNow = useCallback(() => {
    showAdInternal();
  }, []);

  useEffect(() => {
    // Ensure ad is loaded when hook is first used
    loadAd();
  }, []);

  return { maybeShowAd, showAdNow };
}
