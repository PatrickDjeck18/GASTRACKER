import { Colors } from '../constants/theme';
import type { Station, FuelPrice } from '../types/station';

export type PriceTier = 'cheap' | 'medium' | 'expensive' | 'unknown';

/**
 * Classify a station's price relative to the range of all loaded stations.
 * Bottom third → cheap, middle → medium, top third → expensive.
 */
export function getPriceTier(
  price: number | undefined,
  allPrices: number[],
): PriceTier {
  if (price == null || allPrices.length === 0) return 'unknown';

  const sorted = [...allPrices].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length / 3)] ?? price;
  const hi = sorted[Math.floor((sorted.length * 2) / 3)] ?? price;

  if (price <= lo) return 'cheap';
  if (price >= hi) return 'expensive';
  return 'medium';
}

/** Map PriceTier → dot / marker colour */
export function tierColor(tier: PriceTier): string {
  switch (tier) {
    case 'cheap':
      return Colors.price.cheap;
    case 'medium':
      return Colors.price.medium;
    case 'expensive':
      return Colors.price.expensive;
    default:
      return Colors.price.unknown;
  }
}

/** Map PriceTier → background tint */
export function tierBg(tier: PriceTier): string {
  switch (tier) {
    case 'cheap':
      return Colors.price.cheapBg;
    case 'medium':
      return Colors.price.mediumBg;
    case 'expensive':
      return Colors.price.expensiveBg;
    default:
      return Colors.price.unknownBg;
  }
}

/** Map PriceTier → border color */
export function tierBorder(tier: PriceTier): string {
  switch (tier) {
    case 'cheap':
      return Colors.price.cheapBorder;
    case 'medium':
      return Colors.price.mediumBorder;
    case 'expensive':
      return Colors.price.expensiveBorder;
    default:
      return Colors.price.unknownBorder;
  }
}

/**
 * Return the "best" (lowest) price from a station's fuel list,
 * optionally filtered by fuel type key.
 */
export function bestPrice(
  station: Station,
  fuelTypeFilter?: string | null,
): FuelPrice | undefined {
  const list = station.fuelPrices;
  if (!list || list.length === 0) return undefined;

  const candidates = fuelTypeFilter
    ? list.filter((p) =>
        p.fuelType.toLowerCase().includes(fuelTypeFilter.toLowerCase()),
      )
    : list;

  if (candidates.length === 0) return undefined;
  return candidates.reduce((min, p) => (p.price < min.price ? p : min));
}

/** Compact price string, e.g. "€1.45" */
export function formatPrice(price: number, currency?: string): string {
  const sym = currencySymbol(currency ?? 'EUR');
  return `${sym}${price.toFixed(2)}`;
}

export function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    CHF: 'CHF ',
    PLN: 'zł',
    CZK: 'Kč',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    HUF: 'Ft',
    RON: 'lei',
    BGN: 'лв',
    TRY: '₺',
    BRL: 'R$',
    CAD: 'C$',
    AUD: 'A$',
    ZAR: 'R',
  };
  return map[code.toUpperCase()] ?? `${code} `;
}
