import { getLocales } from 'expo-localization';
import { peekLocalGeminiCache, fetchFuelPricesWithGemini } from '../api/gemini';
import { searchGasStations } from '../api/tomtom';
import { saveEnrichedStation, logUserSearch } from '../api/firebase';
import type { Station } from '../types/station';
import type { QueryClient } from '@tanstack/react-query';

/* ─────────────────────────────────────────────────────
   Currency detection
   ───────────────────────────────────────────────────── */

/**
 * Returns the best ISO 4217 currency code for the device's locale.
 * Falls back to 'EUR' if not determinable.
 */
export function getLocalCurrencyCode(): string {
  try {
    const locales = getLocales();
    if (!locales || locales.length === 0) return 'EUR';
    
    // First try: native currency code from device locale
    const currency = locales[0]?.currencyCode;
    if (currency) return currency;
    
    // Fallback: map region code to currency manually
    const region = locales[0]?.regionCode ?? '';
    if (region) return regionToCurrency(region);
  } catch {
    // getLocales failed
  }
  return 'EUR';
}

const REGION_CURRENCY_MAP: Record<string, string> = {
  US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD',
  CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN',
  CZ: 'CZK', HU: 'HUF', RO: 'RON', BG: 'BGN', RU: 'RUB',
  TR: 'TRY', BR: 'BRL', MX: 'MXN', IN: 'INR', CN: 'CNY',
  JP: 'JPY', KR: 'KRW', ZA: 'ZAR', NG: 'NGN', KE: 'KES',
  GH: 'GHS', EG: 'EGP', MA: 'MAD', AE: 'AED', SA: 'SAR',
  // All EU Eurozone countries default → EUR
};

function regionToCurrency(region: string): string {
  return REGION_CURRENCY_MAP[region.toUpperCase()] ?? 'EUR';
}

/* ─────────────────────────────────────────────────────
   Enrichment strategy
   ───────────────────────────────────────────────────── */

// How many of the nearest stations to eagerly enrich with Gemini
const EAGER_ENRICH_COUNT = 5;

/**
 * Fetch stations from TomTom and return them **immediately**.
 * Gemini enrichment happens in the background — prices will appear
 * on the map as each station is enriched via React Query cache updates.
 */
export async function fetchAndEnrichStations(
  lat: number,
  lon: number,
  radius: number,
  queryClient?: QueryClient,
  queryKey?: unknown[],
): Promise<Station[]> {
  // 1. Get station list from TomTom (fast, direct API call)
  const stations = await searchGasStations(lat, lon, radius);

  // Log user search (fire-and-forget)
  logUserSearch(lat, lon, radius, stations.length).catch(() => {});

  if (stations.length === 0) return [];

  // 2. Synchronously check local cache to pre-populate stations instantly
  //    This avoids massive UI re-renders if prices are already fetched locally.
  const currency = getLocalCurrencyCode();
  const eagerGroup = stations.slice(0, EAGER_ENRICH_COUNT);
  const networkQueue: Station[] = [];

  await Promise.all(
    eagerGroup.map(async (station) => {
      const cached = await peekLocalGeminiCache(station.name, station.address, currency);
      if (cached && cached.prices.length > 0) {
        // Hydrate instantly
        station.fuelPrices = cached.prices;
        station.priceSource = cached.grounded ? 'gemini-grounded' : 'gemini';
        station.priceAttribution = cached.attribution;
      } else {
        // Needs fresh fetch
        networkQueue.push(station);
      }
    })
  );

  // 3. Kick off background enrichment ONLY for stations not found in cache
  if (queryClient && queryKey && networkQueue.length > 0) {
    enrichInBackground(networkQueue, queryClient, queryKey);
  }

  return stations;
}

/**
 * Enrich the nearest stations with Gemini prices in the background.
 * Each successfully enriched station updates the React Query cache,
 * causing the map markers to update with prices progressively.
 */
async function enrichInBackground(
  stations: Station[],
  queryClient: QueryClient,
  queryKey: unknown[],
): Promise<void> {
  const currency = getLocalCurrencyCode();
  const eagerGroup = stations.slice(0, EAGER_ENRICH_COUNT);

  console.log(`[Enrich] Starting parallel background enrichment for ${eagerGroup.length} stations`);

  // Run all enrichments in parallel
  await Promise.allSettled(
    eagerGroup.map(async (station) => {
      try {
        const result = await fetchFuelPricesWithGemini(
          station.name,
          station.brand,
          station.address,
          currency,
        );

        if (result.prices.length > 0) {
          const priceSource = result.grounded ? 'gemini-grounded' : 'gemini';

          // Update the React Query cache immediately as this specific station resolves
          queryClient.setQueryData<Station[]>(queryKey, (prev) => {
            if (!prev) return prev;
            return prev.map((s) =>
              s.id === station.id
                ? { ...s, fuelPrices: result.prices, priceSource, priceAttribution: result.attribution }
                : s
            );
          });

          console.log(`[Enrich] ✓ ${station.brand ?? station.name} — ${result.prices.length} prices`);

          saveEnrichedStation(
            { ...station, fuelPrices: result.prices, priceSource, priceAttribution: result.attribution },
            priceSource,
            result.attribution,
          ).catch(() => {});
        }
      } catch (err) {
        console.warn(`[Enrich] ✗ ${station.name}:`, err instanceof Error ? err.message : err);
      }
    })
  );

  console.log('[Enrich] Background enrichment complete');
}

/**
 * Enrich a single specific station with Gemini prices on-demand.
 * Call this when the user selects a station that has no prices yet.
 */
export async function enrichStation(station: Station): Promise<Station> {
  if (station.fuelPrices.length > 0) return station; // already has prices

  const currency = getLocalCurrencyCode();
  const result = await fetchFuelPricesWithGemini(
    station.name,
    station.brand,
    station.address,
    currency,
  );

  const priceSource: import('../types/station').PriceSource = result.grounded ? 'gemini-grounded' : 'gemini';
  const enrichedStation: import('../types/station').Station = {
    ...station,
    fuelPrices: result.prices,
    priceSource,
    priceAttribution: result.attribution,
  };

  // Save enriched station to Firebase if we got prices
  if (result.prices.length > 0) {
    saveEnrichedStation(enrichedStation, priceSource, result.attribution).catch(() => {});
  }

  return enrichedStation;
}
