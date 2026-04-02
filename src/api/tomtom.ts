import axios from 'axios';
import { TOMTOM_API_KEY, assertApiKey } from './apiKey';
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

const API_KEY = TOMTOM_API_KEY;

const BASE = 'https://api.tomtom.com/search/2';

/* ─────────────────────────────────────────────────────
   1.  Category Search  — find gas stations nearby
   ───────────────────────────────────────────────────── */
export async function searchGasStations(
  lat: number,
  lon: number,
  radius: number = DEFAULT_SEARCH_RADIUS,
  limit: number = DEFAULT_RESULT_LIMIT,
): Promise<Station[]> {
  if (!API_KEY) {
    console.warn('[TomTom] No API key set – check extra.tomtomApiKey in app.config.ts');
    return [];
  }

  const url = `${BASE}/categorySearch/gas%20station.json`;

  const { data } = await axios.get<TomTomSearchResponse>(url, {
    params: {
      key: API_KEY,
      lat,
      lon,
      radius,
      limit,
      categorySet: GAS_STATION_CATEGORY,
    },
  });

  const stations: Station[] = data.results.map((r) => {
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

  /* Try to enrich stations that carry a fuelPrice data-source id */
  const withFuelIds = data.results.filter((r) => r.dataSources?.fuelPrice?.id);

  await Promise.allSettled(
    withFuelIds.map(async (r) => {
      const station = stations.find((s) => s.id === r.id);
      if (!station) return;
      const prices = await fetchFuelPrices(r.dataSources!.fuelPrice!.id);
      if (prices.length > 0) station.fuelPrices = prices;
    }),
  );

  return stations;
}

/* ─────────────────────────────────────────────────────
   2.  Fuel Prices  — POI Details for a single station
   ───────────────────────────────────────────────────── */
export async function fetchFuelPrices(
  fuelPriceId: string,
): Promise<FuelPrice[]> {
  try {
    const url = `${BASE}/poiDetails.json`;
    const { data } = await axios.get(url, {
      params: {
        key: API_KEY,
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
  } catch {
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
