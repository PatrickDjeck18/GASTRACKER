/**
 * Gas Price API client (RapidAPI – collectapi/gas-price)
 *
 * Endpoints used:
 *  - GET /europeanCountries  → European fuel prices per country
 *  - GET /allUsaPrice        → US fuel prices per state
 *  - GET /stateUsaPrice?state=XX → US fuel prices per metro area in a state
 */

import type {
  EuropeanCountryPrice,
  UsaStatePrice,
  UsaCityPrice,
  GasPriceApiResponse,
  RegionalFuelPrice,
} from '../types/gasPrice';

/* ── Config ─────────────────────────────────────────── */
const BASE_URL = 'https://gas-price.p.rapidapi.com';
const API_KEY = 'e017978b26msha8eb61a482e14e0p17c7dajsnb6ef1fbab8fc';

const HEADERS = {
  'Content-Type': 'application/json',
  'x-rapidapi-host': 'gas-price.p.rapidapi.com',
  'x-rapidapi-key': API_KEY,
};

/* ── Helpers ────────────────────────────────────────── */

/** Parse European-style numbers "1,234" → 1.234 or return null for "-" / "0,000" */
function parseEuroPrice(val: string): number | null {
  if (!val || val === '-' || val === '0,000') return null;
  const cleaned = val.replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) || n <= 0 ? null : n;
}

/** Parse USD prices "$3.802" → 3.802 or return null */
function parseUsdPrice(val: string): number | null {
  if (!val || val === '-') return null;
  const cleaned = val.replace('$', '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) || n <= 0 ? null : n;
}

/* ── API Calls ──────────────────────────────────────── */

/** Fetch fuel prices for all European countries */
export async function fetchEuropeanPrices(): Promise<RegionalFuelPrice[]> {
  const res = await fetch(`${BASE_URL}/europeanCountries`, { headers: HEADERS });
  if (!res.ok) throw new Error(`European prices API error: ${res.status}`);

  const data: GasPriceApiResponse<EuropeanCountryPrice[]> = await res.json();
  if (!data.success || !Array.isArray(data.result)) {
    throw new Error('Invalid European prices response');
  }

  return data.result
    .filter((c) => c.country && c.country !== 'U.S.A') // skip USA entry in Europe list
    .map((c) => ({
      region: 'europe' as const,
      name: c.country,
      currency: 'EUR',
      gasoline: parseEuroPrice(c.gasoline),
      diesel: parseEuroPrice(c.diesel),
      lpg: parseEuroPrice(c.lpg),
      midGrade: null,
      premium: null,
    }));
}

/** Fetch fuel prices for all US states */
export async function fetchUsaPrices(): Promise<RegionalFuelPrice[]> {
  const res = await fetch(`${BASE_URL}/allUsaPrice`, { headers: HEADERS });
  if (!res.ok) throw new Error(`USA prices API error: ${res.status}`);

  const data: GasPriceApiResponse<UsaStatePrice[]> = await res.json();
  if (!data.success || !Array.isArray(data.result)) {
    throw new Error('Invalid USA prices response');
  }

  return data.result.map((s) => ({
    region: 'usa' as const,
    name: s.name,
    currency: 'USD',
    gasoline: parseUsdPrice(s.regular),
    diesel: parseUsdPrice(s.diesel),
    lpg: null,
    midGrade: parseUsdPrice(s.midGrade),
    premium: parseUsdPrice(s.premium),
  }));
}

/** Fetch all regional prices for a given region */
export async function fetchRegionalPrices(region: 'europe' | 'usa' | 'canada'): Promise<RegionalFuelPrice[]> {
  switch (region) {
    case 'europe': return fetchEuropeanPrices();
    case 'usa':    return fetchUsaPrices();
    case 'canada': return fetchCanadaPrices();
    default:       return [];
  }
}

/** Fetch fuel prices for Canada provinces (averages of cities) */
export async function fetchCanadaPrices(): Promise<RegionalFuelPrice[]> {
  const res = await fetch(`${BASE_URL}/canada`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Canada prices API error: ${res.status}`);

  interface CanadaState {
    state: string;
    cities: { name: string; currency: string; gasoline: string; diesel?: string }[];
  }
  const data: GasPriceApiResponse<CanadaState[]> = await res.json();
  if (!data.success || !Array.isArray(data.result)) {
    throw new Error('Invalid Canada prices response');
  }

  // Map provinces to regional prices by averaging their cities
  return data.result.map((prov) => {
    const validGas = prov.cities.map(c => parseUsdPrice(c.gasoline)).filter((v): v is number => v != null);
    const avgGas = validGas.length > 0 ? validGas.reduce((a, b) => a + b, 0) / validGas.length : null;
    
    // Some cities might have diesel but it's rare in this API for CA
    const validDiesel = prov.cities.map(c => c.diesel ? parseUsdPrice(c.diesel) : null).filter((v): v is number => v != null);
    const avgDiesel = validDiesel.length > 0 ? validDiesel.reduce((a, b) => a + b, 0) / validDiesel.length : null;

    return {
      region: 'canada' as const,
      name: prov.state,
      currency: 'CAD',
      gasoline: avgGas,
      diesel: avgDiesel,
      lpg: null,
      midGrade: null,
      premium: null,
    };
  });
}
