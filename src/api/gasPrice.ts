import { callFirebaseFunction } from './firebaseFunctions';
import { getCachedApiResponse, saveApiResponseCache } from './firebase';
import type { RegionalFuelPrice, GasPriceRegion } from '../types/gasPrice';

export async function fetchEuropeanPrices(): Promise<RegionalFuelPrice[]> {
  return await fetchRegionalPrices('europe');
}

export async function fetchUsaPrices(): Promise<RegionalFuelPrice[]> {
  return await fetchRegionalPrices('usa');
}

export async function fetchCanadaPrices(): Promise<RegionalFuelPrice[]> {
  return await fetchRegionalPrices('canada');
}

/** Fetch all regional prices for a given region via Gemini AI Firebase function */
export async function fetchRegionalPrices(region: GasPriceRegion): Promise<RegionalFuelPrice[]> {
  try {
    // 1. Check global Firestore cache first (12 hour TTL)
    const cacheKey = `regional_prices_${region}`;
    const globalCached = await getCachedApiResponse<RegionalFuelPrice[]>('gemini/regional-prices', cacheKey);

    // Only return cache if it has valid data (non-empty array)
    if (globalCached && Array.isArray(globalCached) && globalCached.length > 0) {
      console.log(`[GeminiRegional API] Returning global cached result for ${region} (${globalCached.length} items)`);
      return globalCached;
    }

    console.log(`[GeminiRegional API] Cache empty or invalid, fetching fresh data for ${region}`);

    // 2. Fetch fresh from Firebase Cloud Function
    const result = await callFirebaseFunction<{ success: boolean; result: RegionalFuelPrice[] }>('geminiRegionalPrices', {
      region
    });

    if (result && result.success && Array.isArray(result.result) && result.result.length > 0) {
      // 3. Save to global cache (12 hours)
      const ttlMs = 12 * 60 * 60 * 1000;
      await saveApiResponseCache('gemini/regional-prices', cacheKey, result.result, ttlMs);
      console.log(`[GeminiRegional API] Fetched ${result.result.length} items for ${region}`);
      return result.result;
    }

    console.warn('[GeminiRegional API] Invalid or empty result returned:', result);
    return [];
  } catch (err) {
    console.error('[GeminiRegional API] Error fetching regional prices:', err);
    return [];
  }
}
