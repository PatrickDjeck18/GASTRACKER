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
  try {
    console.log(`[TomTom] Searching stations… Lat: ${lat}, Lon: ${lon}, Radius: ${radius}`);

    const url = 'https://api.tomtom.com/search/2/nearbySearch/.json';

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
    });

    console.log(`[TomTom] Received ${data.results?.length || 0} results`);

    return data.results.map((r) => {
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
  } catch (err: any) {
    const error = err.message || 'Unknown error';
    const status = err.response?.status;
    console.error(`[TomTom] searchGasStations error: ${error}`, { status });
    return [];
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
