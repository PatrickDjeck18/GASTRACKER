export interface FuelTypeInfo {
  key: string;
  label: string;           // i18n key
  tomtomMatch: string;     // substring to match in TomTom fuelType field
}

export const FUEL_TYPES: FuelTypeInfo[] = [
  { key: 'euro95',   label: 'fuel.euro95',   tomtomMatch: 'Euro 95' },
  { key: 'euro98',   label: 'fuel.euro98',   tomtomMatch: 'Euro 98' },
  { key: 'diesel',   label: 'fuel.diesel',   tomtomMatch: 'Diesel' },
  { key: 'lpg',      label: 'fuel.lpg',      tomtomMatch: 'LPG' },
  { key: 'regular',  label: 'fuel.regular',  tomtomMatch: 'Regular' },
  { key: 'midgrade', label: 'fuel.midgrade', tomtomMatch: 'Midgrade' },
  { key: 'premium',  label: 'fuel.premium',  tomtomMatch: 'Premium' },
  { key: 'e85',      label: 'fuel.e85',      tomtomMatch: 'E85' },
  { key: 'cng',      label: 'fuel.cng',      tomtomMatch: 'CNG' },
];

/** TomTom category ID for petrol / gas stations */
export const GAS_STATION_CATEGORY = '7311';

/** Default search radius in metres */
export const DEFAULT_SEARCH_RADIUS = 5000;

/** Max allowed radius in metres */
export const MAX_SEARCH_RADIUS = 50_000;

/** Results cap per query */
export const DEFAULT_RESULT_LIMIT = 15;

/** Map defaults */
export const DEFAULT_LAT_DELTA = 0.045;
export const DEFAULT_LON_DELTA = 0.045;
