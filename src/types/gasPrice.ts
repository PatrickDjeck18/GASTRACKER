/* ── Gas Price API response types ─────────────────── */

/** European country fuel price from /europeanCountries */
export interface EuropeanCountryPrice {
  currency: string;    // e.g. "euro"
  lpg: string;         // e.g. "1,155" or "-"
  diesel: string;      // e.g. "2,350"
  gasoline: string;    // e.g. "2,157"
  country: string;     // e.g. "Germany"
}

/** USA state fuel price from /allUsaPrice */
export interface UsaStatePrice {
  currency: string;    // "usd"
  name: string;        // e.g. "California"
  regular: string;     // e.g. "$5.622"
  midGrade: string;    // e.g. "$5.782"
  premium: string;     // e.g. "$6.024"
  diesel: string;      // e.g. "$7.513"
}

/** USA city/metro area fuel price from /stateUsaPrice?state=XX */
export interface UsaCityPrice {
  currency: string;
  gasoline: string;
  midGrade: string;
  premium: string;
  diesel: string;
  name: string;
  lowername: string;
}

/** API response wrapper */
export interface GasPriceApiResponse<T> {
  success: boolean;
  result: T;
}

/** Normalized fuel price entry for display */
export interface RegionalFuelPrice {
  region: 'europe' | 'usa' | 'canada';
  name: string;          // country, state, or province name
  currency: string;      // "EUR", "USD", "CAD"
  gasoline: number | null;
  diesel: number | null;
  lpg: number | null;
  midGrade: number | null;
  premium: number | null;
}

/** Regions the API supports */
export type GasPriceRegion = 'europe' | 'usa' | 'canada';
