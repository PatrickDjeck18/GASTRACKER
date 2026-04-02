export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface FuelPrice {
  fuelType: string;
  price: number;
  currency: string;
  lastUpdated?: string;
}

export interface Station {
  id: string;
  name: string;
  brand?: string;
  address: string;
  coordinates: Coordinates;
  distance: number; // km
  fuelPrices: FuelPrice[];
  phone?: string;
  openingHours?: string;
  categories?: string[];
}

/* ── TomTom API shapes ────────────────────────────── */

export interface TomTomPOI {
  name: string;
  phone?: string;
  brands?: Array<{ name: string }>;
  categorySet?: Array<{ id: number }>;
  categories?: string[];
  openingHours?: {
    mode: string;
    timeRanges: Array<{
      startTime: { date: string; hour: number; minute: number };
      endTime: { date: string; hour: number; minute: number };
    }>;
  };
}

export interface TomTomAddress {
  streetNumber?: string;
  streetName?: string;
  municipality?: string;
  countrySubdivision?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  countryCodeISO3?: string;
  freeformAddress?: string;
}

export interface TomTomSearchResult {
  type: string;
  id: string;
  score: number;
  dist?: number;
  info?: string;
  poi: TomTomPOI;
  address: TomTomAddress;
  position: { lat: number; lon: number };
  dataSources?: {
    fuelPrice?: { id: string };
  };
}

export interface TomTomSearchResponse {
  summary: {
    query: string;
    queryType: string;
    queryTime: number;
    numResults: number;
    offset: number;
    totalResults: number;
    fuzzyLevel: number;
    geoBias?: { lat: number; lon: number };
  };
  results: TomTomSearchResult[];
}

export interface TomTomFuelPriceResult {
  fuelType: string;
  price: number;
  currency: string;
  lastUpdated?: string;
}

/* ── App-level enums ──────────────────────────────── */

export type SortMode = 'price' | 'distance';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
