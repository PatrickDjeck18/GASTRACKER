import AsyncStorage from '@react-native-async-storage/async-storage';
import { callFirebaseFunction } from './firebaseFunctions';
import { getCachedApiResponse, saveApiResponseCache } from './firebase';
import type { RegionalFuelPrice, GasPriceRegion } from '../types/gasPrice';

// Local cache constants
const LOCAL_CACHE_PREFIX = '@gemini_regional_cache_';
const LOCAL_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours for local cache
const GLOBAL_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours for Firebase cache

// Helper function to get local cache key
function getLocalCacheKey(region: GasPriceRegion, currencyCode: string): string {
  return `${LOCAL_CACHE_PREFIX}${region}_${currencyCode}`;
}

// Local cache functions
async function getLocalCachedResult<T>(cacheKey: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > LOCAL_CACHE_TTL) {
      // Cache expired
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.warn('[GeminiRegional] Failed to read local cache:', error);
    return null;
  }
}

async function setLocalCachedResult<T>(cacheKey: string, data: T): Promise<void> {
  try {
    const cacheItem = {
      timestamp: Date.now(),
      data,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
  } catch (error) {
    console.warn('[GeminiRegional] Failed to write local cache:', error);
  }
}

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(',', '.').replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRegionalResults(
  raw: unknown,
  region: GasPriceRegion,
  fallbackCurrency: string,
): RegionalFuelPrice[] {
  const asArray = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === 'object'
      ? ((raw as Record<string, unknown>).result ?? (raw as Record<string, unknown>).data ?? (raw as Record<string, unknown>).items)
      : null);

  if (!Array.isArray(asArray)) return [];

  return asArray
    .map((entry): RegionalFuelPrice | null => {
      if (!entry || typeof entry !== 'object') return null;
      const obj = entry as Record<string, unknown>;
      const name = String(obj.name ?? obj.country ?? obj.state ?? obj.province ?? '').trim();
      if (!name) return null;

      return {
        region,
        name,
        currency: String(obj.currency ?? fallbackCurrency).toUpperCase(),
        // Canada responses sometimes return "regular" instead of "gasoline".
        gasoline: parsePrice(obj.gasoline ?? obj.regular ?? obj.petrol),
        diesel: parsePrice(obj.diesel),
        lpg: parsePrice(obj.lpg),
        midGrade: parsePrice(obj.midGrade ?? obj.midgrade),
        premium: parsePrice(obj.premium),
      };
    })
    .filter((item): item is RegionalFuelPrice => item !== null);
}

export async function fetchEuropeanPrices(): Promise<RegionalFuelPrice[]> {
  return await fetchRegionalPrices('europe');
}

export async function fetchUsaPrices(): Promise<RegionalFuelPrice[]> {
  return await fetchRegionalPrices('usa');
}

export async function fetchCanadaPrices(): Promise<RegionalFuelPrice[]> {
  return await fetchRegionalPrices('canada');
}

/**
 * Fetch regional prices for a given region in the specified currency.
 * Uses a triple-caching strategy (Local AsyncStorage -> Firestore -> Gemini AI).
 */
export async function fetchRegionalPrices(region: GasPriceRegion, currencyCode: string = 'EUR'): Promise<RegionalFuelPrice[]> {
  const startTime = Date.now();
  const cacheKey = `regional_prices_${region}_${currencyCode}`;
  const localCacheKey = getLocalCacheKey(region, currencyCode);

  try {
    // 1. Check local AsyncStorage cache first (6 hour TTL)
    const localCached = await getLocalCachedResult<unknown>(localCacheKey);
    const normalizedLocal = normalizeRegionalResults(localCached, region, currencyCode);
    if (normalizedLocal.length > 0) {
      const duration = Date.now() - startTime;
      console.log(`[GeminiRegional] Returning local cached result for ${region} in ${currencyCode} (${normalizedLocal.length} items, ${duration}ms)`);
      return normalizedLocal;
    }

    // 2. Check global Firestore cache (12 hour TTL)
    const globalCached = await getCachedApiResponse<unknown>('gemini/regional-prices', cacheKey);
    const normalizedGlobal = normalizeRegionalResults(globalCached, region, currencyCode);
    if (normalizedGlobal.length > 0) {
      const duration = Date.now() - startTime;
      console.log(`[GeminiRegional] Returning global cached result for ${region} in ${currencyCode} (${normalizedGlobal.length} items, ${duration}ms)`);

      // Also save to local cache for faster access next time
      await setLocalCachedResult(localCacheKey, normalizedGlobal);
      return normalizedGlobal;
    }

    console.log(`[GeminiRegional] Cache empty or invalid, fetching fresh data for ${region} in ${currencyCode}`);

    // 3. Fetch fresh from Firebase Cloud Function with retry logic
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await callFirebaseFunction<{ success: boolean; result: RegionalFuelPrice[] }>(
          'geminiRegionalPrices',
          {
            region,
            currencyCode,
          },
          // Regional AI responses are larger and can exceed the default timeout.
          { timeoutMs: 45000 },
        );

        const normalized = normalizeRegionalResults(result?.result, region, currencyCode);
        if (result && result.success && normalized.length > 0) {
          // 4. Save to both caches
          await Promise.all([
            setLocalCachedResult(localCacheKey, normalized),
            saveApiResponseCache('gemini/regional-prices', cacheKey, normalized, GLOBAL_CACHE_TTL)
          ]);

          const duration = Date.now() - startTime;
          console.log(`[GeminiRegional] Fetched ${normalized.length} items for ${region} in ${currencyCode} (${duration}ms, attempt ${attempt})`);
          return normalized;
        } else {
          console.warn(`[GeminiRegional] Invalid or empty result returned on attempt ${attempt}:`, result);
          lastError = new Error('Invalid API response format');
        }
      } catch (err) {
        console.warn(`[GeminiRegional] Attempt ${attempt} failed:`, err);
        lastError = err as Error;

        // Wait before retry (exponential backoff)
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // All attempts failed
    console.error('[GeminiRegional] All fetch attempts failed:', lastError?.message);
    return [];

  } catch (err) {
    console.error('[GeminiRegional] Unexpected error fetching regional prices:', err);
    return [];
  }
}

/**
 * Clear expired local cache entries (optional maintenance function)
 */
export async function clearExpiredRegionalCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const regionalKeys = keys.filter(key => key.startsWith(LOCAL_CACHE_PREFIX));

    for (const key of regionalKeys) {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp > LOCAL_CACHE_TTL) {
            await AsyncStorage.removeItem(key);
          }
        } catch {
          // Invalid JSON, remove it
          await AsyncStorage.removeItem(key);
        }
      }
    }
  } catch (error) {
    console.warn('[GeminiRegional] Failed to clear expired local cache:', error);
  }
}
