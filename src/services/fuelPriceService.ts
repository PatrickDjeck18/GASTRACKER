import { getLocales } from 'expo-localization';
import { searchGasStations } from '../api/tomtom';
import { fetchFuelPricesWithGemini } from '../api/gemini';
import type { Station } from '../types/station';

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
 * Fetch stations from TomTom, then enrich the nearest ones with
 * real-time Gemini fuel prices. Remaining stations get Gemini prices
 * only if explicitly requested via `enrichStation()`.
 */
export async function fetchAndEnrichStations(
  lat: number,
  lon: number,
  radius: number,
): Promise<Station[]> {
  // 1. Get station list from TomTom (name, brand, exact address, coordinates)
  const stations = await searchGasStations(lat, lon, radius);
  if (stations.length === 0) return [];

  const currency = getLocalCurrencyCode();

  // 2. Eagerly enrich the nearest N stations (already sorted by distance from TomTom)
  const eagerGroup = stations.slice(0, EAGER_ENRICH_COUNT);

  await Promise.allSettled(
    eagerGroup.map(async (station) => {
      // Only call Gemini if TomTom didn't already supply prices
      if (station.fuelPrices.length === 0) {
        const result = await fetchFuelPricesWithGemini(
          station.name,
          station.brand,
          station.address,
          currency,
        );
        if (result.prices.length > 0) {
          station.fuelPrices = result.prices;
          station.priceSource = result.grounded ? 'gemini-grounded' : 'gemini';
          station.priceAttribution = result.attribution;
        }
      } else {
        station.priceSource = 'tomtom';
      }
    }),
  );

  // Mark remaining stations so the UI knows they haven't been enriched yet
  for (const station of stations.slice(EAGER_ENRICH_COUNT)) {
    if (station.fuelPrices.length > 0) {
      station.priceSource = 'tomtom';
    }
  }

  return stations;
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

  return {
    ...station,
    fuelPrices: result.prices,
    priceSource: result.grounded ? 'gemini-grounded' : 'gemini',
    priceAttribution: result.attribution,
  };
}
