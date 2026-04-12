import axios from 'axios';
import { TOMTOM_API_KEY } from './apiKey';
import { executeFirebaseBackedApi } from './firebaseBackend';

/* ─────────────────────────────────────────────────────
   1. Reverse Geocoding — coordinates → address / city
   ───────────────────────────────────────────────────── */

export interface ReverseGeocodeResult {
  formattedAddress: string;
  city: string;
  country: string;
  countryCode: string;
  street?: string;
}

export async function reverseGeocode(
  lat: number,
  lon: number,
): Promise<ReverseGeocodeResult | null> {
  try {
    return await executeFirebaseBackedApi<ReverseGeocodeResult | null>({
      service: 'tomtom/reverse-geocode',
      request: { lat, lon },
      cacheTtlMs: 24 * 60 * 60 * 1000,
      execute: async () => {
        const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json`;
        const { data } = await axios.get<any>(url, {
          params: { key: TOMTOM_API_KEY },
        });

        const addr = data?.addresses?.[0]?.address;
        if (!addr) return null;

        return {
          formattedAddress: addr.freeformAddress ?? '',
          city: addr.municipality ?? addr.localName ?? '',
          country: addr.country ?? '',
          countryCode: addr.countryCode ?? '',
          street: addr.streetName,
        };
      },
    });
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────
   2. Full-text Search — address / POI text search → coordinates
   ───────────────────────────────────────────────────── */

export interface SearchSuggestion {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string; // 'POI' | 'Geography' | 'Address'
}

export async function searchLocation(
  query: string,
  lat?: number,
  lon?: number,
  limit: number = 8,
): Promise<SearchSuggestion[]> {
  if (!query.trim()) return [];

  try {
    return await executeFirebaseBackedApi<SearchSuggestion[]>({
      service: 'tomtom/search-location',
      request: { query, lat, lon, limit },
      cacheTtlMs: 30 * 60 * 1000,
      execute: async () => {
        const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json`;
        const { data } = await axios.get<any>(url, {
          params: {
            key: TOMTOM_API_KEY,
            lat,
            lon,
            limit,
            language: 'en-US',
            typeahead: true,
          },
        });
        const results = data?.results ?? [];

        return results.map((r: any): SearchSuggestion => ({
          id: r.id ?? String(Math.random()),
          name: r.poi?.name ?? r.address?.freeformAddress ?? 'Unknown',
          address: r.address?.freeformAddress ?? '',
          latitude: r.position?.lat ?? 0,
          longitude: r.position?.lon ?? 0,
          type: r.type ?? 'Unknown',
        }));
      },
    });
  } catch {
    return [];
  }
}

/* ─────────────────────────────────────────────────────
   3. Geocoding — address text → coordinates
   ───────────────────────────────────────────────────── */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  countryCode: string;
}

export async function geocodeAddress(
  query: string,
): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;

  try {
    return await executeFirebaseBackedApi<GeocodeResult | null>({
      service: 'tomtom/geocode',
      request: { query },
      cacheTtlMs: 24 * 60 * 60 * 1000,
      execute: async () => {
        const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json`;
        const { data } = await axios.get<any>(url, {
          params: { key: TOMTOM_API_KEY, limit: 1 },
        });

        const r = data?.results?.[0];
        if (!r) return null;

        return {
          latitude: r.position?.lat ?? 0,
          longitude: r.position?.lon ?? 0,
          formattedAddress: r.address?.freeformAddress ?? '',
          countryCode: r.address?.countryCode ?? '',
        };
      },
    });
  } catch {
    return null;
  }
}
