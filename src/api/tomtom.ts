import axios from 'axios';
import { TOMTOM_API_KEY } from './apiKey';
import type {
  TomTomSearchResponse,
  TomTomFuelPriceResult,
  Station,
  FuelPrice,
} from '../types/station';
import { haversineDistance } from '../utils/geo';
import {
  GAS_STATION_CATEGORY,
  DEFAULT_SEARCH_RADIUS,
  DEFAULT_RESULT_LIMIT,
} from '../constants/fuelTypes';

const STATION_SEARCH_MEMORY_TTL = 60 * 1000; // 60 seconds

type StationSearchCacheEntry = {
  data: Station[];
  timestamp: number;
};

const stationSearchMemoryCache = new Map<string, StationSearchCacheEntry>();
const inFlightStationSearches = new Map<string, Promise<Station[]>>();

function stationSearchKey(lat: number, lon: number, radius: number, limit: number): string {
  // Round coords slightly to improve cache hits during tiny map jitters.
  return `${lat.toFixed(4)}_${lon.toFixed(4)}_${radius}_${limit}`;
}

/* ─────────────────────────────────────────────────────
   1.  Nearby Search  — find gas stations nearby
        Direct client-side call using TomTom API key from .env
   ───────────────────────────────────────────────────── */
export async function searchGasStations(
  lat: number,
  lon: number,
  radius: number = DEFAULT_SEARCH_RADIUS,
  limit: number = DEFAULT_RESULT_LIMIT,
): Promise<Station[]> {
  const key = stationSearchKey(lat, lon, radius, limit);
  const cached = stationSearchMemoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < STATION_SEARCH_MEMORY_TTL) {
    return cached.data;
  }

  const pending = inFlightStationSearches.get(key);
  if (pending) return pending;

  const request = (async () => {
    const url = 'https://api.tomtom.com/search/2/nearbySearch/.json';
    let lastErr: any = null;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        console.log(`[TomTom] Searching stations… Lat: ${lat}, Lon: ${lon}, Radius: ${radius} (attempt ${attempt})`);
        const { data } = await axios.get<TomTomSearchResponse>(url, {
          params: {
            key: TOMTOM_API_KEY,
            lat,
            lon,
            radius,
            limit,
            categorySet: GAS_STATION_CATEGORY,
            view: 'Unified',
            language: 'en-US',
          },
          timeout: 15000,
        });

        console.log(`[TomTom] Received ${data.results?.length || 0} results`);

        const mapped = data.results.map((r) => {
          const dist = r.dist
            ? r.dist / 1000
            : haversineDistance(lat, lon, r.position.lat, r.position.lon);

          return {
            id: r.id,
            name: r.poi.name,
            brand: r.poi.brands?.[0]?.name,
            address: r.address.freeformAddress ?? '',
            coordinates: {
              latitude: r.position.lat,
              longitude: r.position.lon,
            },
            distance: Math.round(dist * 100) / 100,
            fuelPrices: [],
            phone: r.poi.phone,
            categories: r.poi.categories,
            openingHours: formatOpeningHours(r.poi.openingHours),
          };
        });

        stationSearchMemoryCache.set(key, { data: mapped, timestamp: Date.now() });
        return mapped;
      } catch (err: any) {
        lastErr = err;
        const status = err?.response?.status;
        const message = err?.message || 'Unknown error';
        const isRetriable = !status || status >= 500 || err?.code === 'ECONNABORTED' || /network error/i.test(message);
        if (attempt < 2 && isRetriable) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
      }
    }

    const error = lastErr?.message || 'Unknown error';
    const status = lastErr?.response?.status;
    console.error(`[TomTom] searchGasStations error: ${error}`, { status });

    // Graceful fallback: return stale in-memory cache if present.
    const stale = stationSearchMemoryCache.get(key);
    return stale?.data ?? [];
  })();

  inFlightStationSearches.set(key, request);
  try {
    return await request;
  } finally {
    inFlightStationSearches.delete(key);
  }
}

/* ─────────────────────────────────────────────────────
   2.  Fuel Prices  — POI Details for a single station
       Direct client-side call
   ───────────────────────────────────────────────────── */
export async function fetchFuelPrices(
  fuelPriceId: string,
): Promise<FuelPrice[]> {
  try {
    const url = 'https://api.tomtom.com/search/2/poiDetails.json';
    const { data } = await axios.get<any>(url, {
      params: {
        key: TOMTOM_API_KEY,
        id: fuelPriceId,
        detailsType: 'fuelPrices',
      },
    });

    const raw: TomTomFuelPriceResult[] =
      data?.result?.fuelPrices ?? data?.fuelPrices ?? [];

    return raw.map((fp) => ({
      fuelType: fp.fuelType ?? 'Unknown',
      price: fp.price ?? 0,
      currency: fp.currency ?? 'EUR',
      lastUpdated: fp.lastUpdated,
    }));
  } catch (err: any) {
    console.warn('[TomTom] fetchFuelPrices error:', err.message);
    return [];
  }
}

/* ── helpers ──────────────────────────────────────── */
function formatOpeningHours(
  oh?: TomTomSearchResponse['results'][0]['poi']['openingHours'],
): string | undefined {
  if (!oh?.timeRanges?.length) return undefined;
  const r = oh.timeRanges[0];
  if (!r) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(r.startTime.hour)}:${pad(r.startTime.minute)} – ${pad(r.endTime.hour)}:${pad(r.endTime.minute)}`;
}
