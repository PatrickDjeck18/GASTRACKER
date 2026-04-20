import { getLocales } from 'expo-localization';
import { peekLocalGeminiCache, fetchFuelPricesWithGemini } from '../api/gemini';
import { searchGasStations } from '../api/tomtom';
import { saveEnrichedStation, logUserSearch } from '../api/firebase';
import { useAppStore } from '../store/useAppStore';
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
  const { manualCurrency, countryCode } = useAppStore.getState();
  if (manualCurrency) return manualCurrency.toUpperCase();
  if (countryCode) return regionToCurrency(countryCode);

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
  const startTime = Date.now();
  
  const stations = await searchGasStations(lat, lon, radius);

  logUserSearch(lat, lon, radius, stations.length).catch(() => {});

  if (stations.length === 0) return [];

  console.log(`[FuelPriceService] Found ${stations.length} stations in ${Date.now() - startTime}ms, enriching with Gemini in background...`);

  if (queryClient && queryKey) {
    queryClient.setQueryData<Station[]>(queryKey, stations);
    enrichAllStationsInBackground(stations, queryClient, queryKey).catch(() => {});
  }

  return stations;
}

async function enrichAllStationsInBackground(
  stations: Station[],
  queryClient: QueryClient,
  queryKey: unknown[],
): Promise<void> {
  const currency = getLocalCurrencyCode();
  const BATCH_SIZE = 10;
  const DELAY_BETWEEN_BATCHES = 500;

  console.log(`[Enrich] Starting batched enrichment for ${stations.length} stations with currency ${currency}`);

  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(stations.length / BATCH_SIZE);
    
    console.log(`[Enrich] Processing batch ${batchNum}/${totalBatches} (${batch.length} stations)`);

    const results = await Promise.allSettled(
      batch.map(async (station) => {
        const cached = await peekLocalGeminiCache(station.name, station.address, currency);
        if (cached && cached.prices.length > 0) {
          return { station, prices: cached.prices, grounded: cached.grounded, attribution: cached.attribution };
        }

        try {
          const result = await fetchFuelPricesWithGemini(station.name, station.brand, station.address, currency);
          if (result.prices.length > 0) {
            saveEnrichedStation(
              { ...station, fuelPrices: result.prices, priceSource: result.grounded ? 'gemini-grounded' : 'gemini', priceAttribution: result.attribution },
              result.grounded ? 'gemini-grounded' : 'gemini',
              result.attribution,
            ).catch(() => {});
            return { station, prices: result.prices, grounded: result.grounded, attribution: result.attribution };
          }
        } catch (err) {
          console.warn(`[Enrich] ${station.name}:`, err instanceof Error ? err.message : err);
        }
        return null;
      })
    );

    const enrichedCount = results.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
    console.log(`[Enrich] Batch ${batchNum}: ${enrichedCount}/${batch.length} stations enriched`);

    const updates = results
      .map((r, idx) => r.status === 'fulfilled' ? r.value : null)
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .map(({ station, prices, grounded, attribution }) => ({
        station,
        fuelPrices: prices,
        priceSource: grounded ? 'gemini-grounded' : 'gemini',
        priceAttribution: attribution,
      }));

    if (updates.length > 0) {
      queryClient.setQueryData<Station[]>(queryKey, (prev) => {
        if (!prev) return prev;
        return prev.map((s) => {
          const update = updates.find((u) => u.station.id === s.id);
          return update ? { ...s, fuelPrices: update.fuelPrices, priceSource: update.priceSource, priceAttribution: update.priceAttribution } : s;
        });
      });
    }

    if (i + BATCH_SIZE < stations.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log('[Enrich] All stations enriched');
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
