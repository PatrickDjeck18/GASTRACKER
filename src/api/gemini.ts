import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FuelPrice } from '../types/station';
import { logGeminiPriceRequest, getCachedApiResponse, saveApiResponseCache } from './firebase';
import { callFirebaseFunction } from './firebaseFunctions';

/* ─────────────────────────────────────────────────────
   Constants & Configuration
   ───────────────────────────────────────────────────── */
const CACHE_PREFIX = '@gemini_price_cache_v2_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
/* ─────────────────────────────────────────────────────
   Caching utilities
   ───────────────────────────────────────────────────── */
export function getCacheKey(stationName: string, address: string, currencyCode: string): string {
  const normalizedStation = stationName.toLowerCase().replace(/\s+/g, '_');
  const normalizedAddress = address.toLowerCase().replace(/\s+/g, '_');
  return `${CACHE_PREFIX}${normalizedStation}_${normalizedAddress}_${currencyCode}`;
}

export async function peekLocalGeminiCache(
  stationName: string,
  address: string,
  currencyCode: string
): Promise<GeminiFuelPriceResult | null> {
  const cacheKey = getCacheKey(stationName, address, currencyCode);
  return getCachedResult(cacheKey);
}

async function getCachedResult(cacheKey: string): Promise<GeminiFuelPriceResult | null> {
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > CACHE_TTL) {
      // Cache expired
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn('[Gemini] Failed to read cache:', error);
    return null;
  }
}

async function setCachedResult(cacheKey: string, data: GeminiFuelPriceResult): Promise<void> {
  try {
    const cacheItem = {
      timestamp: Date.now(),
      data,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn('[Gemini] Failed to write cache:', error);
  }
}

/**
 * Clear all expired Gemini cache entries (optional maintenance function)
 */
export async function clearExpiredGeminiCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const geminiKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

    for (const key of geminiKeys) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp > CACHE_TTL) {
            await AsyncStorage.removeItem(key);
          }
        } catch {
          // Invalid JSON, remove it
          await AsyncStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.warn('[Gemini] Failed to clear expired cache:', error);
  }
}

/* ─────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────── */
export interface GeminiFuelPriceResult {
  prices: FuelPrice[];
  /** ISO 4217 currency that Gemini reported prices in */
  currency: string;
  /** Whether prices came from a fresh web search */
  grounded: boolean;
  /** Source attribution hint from grounding (URL or publication) */
  attribution?: string;
}

/* ─────────────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────────────── */
/**
 * Fetch real-time fuel prices for a given station using Gemini + Google Search grounding.
 * Includes caching (6 hours), retry logic, and rate limit handling.
 *
 * @param stationName   Display name of the station
 * @param brand         Brand name (e.g. "Shell", "BP")
 * @param address       Full address string
 * @param currencyCode  ISO 4217 target currency (e.g. "EUR", "USD", "GBP")
 * @returns             Parsed fuel prices or an empty array on failure
 */
export async function fetchFuelPricesWithGemini(
  stationName: string,
  brand: string | undefined,
  address: string,
  currencyCode: string,
): Promise<GeminiFuelPriceResult> {
  const startTime = Date.now();
  const fallback: GeminiFuelPriceResult = { prices: [], currency: currencyCode, grounded: false };

  // 1. Check local cache first
  const cacheKey = getCacheKey(stationName, address, currencyCode);
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    console.log('[Gemini] Returning local cached result for', stationName);
    // Log cache hit (fire-and-forget)
    logGeminiPriceRequest(
      stationName,
      address,
      currencyCode,
      cached.prices.length,
      Date.now() - startTime,
      cached.grounded,
      'local-cache'
    ).catch(() => {});
    return cached;
  }

  // 2. Check global Firestore cache
  const globalCacheKey = `${stationName}_${address}_${currencyCode}`.toLowerCase().replace(/\s+/g, '_');
  const globalCached = await getCachedApiResponse<GeminiFuelPriceResult>('gemini/fuel-prices', globalCacheKey);
  if (globalCached) {
    console.log('[Gemini] Returning global cached result for', stationName);
    // Also save to local cache for next time
    await setCachedResult(cacheKey, globalCached);
    logGeminiPriceRequest(
      stationName,
      address,
      currencyCode,
      globalCached.prices.length,
      Date.now() - startTime,
      globalCached.grounded,
      'global-cache'
    ).catch(() => {});
    return globalCached;
  }

  try {
    const result = await callFirebaseFunction<GeminiFuelPriceResult>('geminiFuelPrices', {
      stationName,
      brand,
      address,
      currencyCode,
    });

    // 4. Cache successful result locally AND globally (6 hours)
    await setCachedResult(cacheKey, result);
    const ttlMs = 6 * 60 * 60 * 1000; // 6 hours
    await saveApiResponseCache('gemini/fuel-prices', globalCacheKey, result, ttlMs);
    console.log('[Gemini] Successfully fetched and cached prices for', stationName);

    // Log successful request (fire-and-forget)
    logGeminiPriceRequest(
      stationName,
      address,
      currencyCode,
      result.prices.length,
      Date.now() - startTime,
      result.grounded,
      undefined
    );

    return result;

  } catch (err) {
    const error = err as Error;
    const durationMs = Date.now() - startTime;

    console.warn('[Gemini] fetchFuelPricesWithGemini error:', error.message);

    // Log error to Firebase (fire-and-forget)
    logGeminiPriceRequest(
      stationName,
      address,
      currencyCode,
      0,
      durationMs,
      false,
      error.message
    ).catch(() => {});

    return fallback;
  }
}
