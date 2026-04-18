import { Colors } from '../constants/theme';
import { getLocalCurrencyCode } from '../services/fuelPriceService';
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

/**
 * Format a price using Intl.NumberFormat for locale-correct currency display.
 * Falls back to a simple symbol+value if Intl is unavailable or currency is unknown.
 */
export function formatPrice(price: number, currency?: string): string {
  const code = (currency ?? getLocalCurrencyCode() ?? 'EUR').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }).format(price);
  } catch {
    return `${currencySymbol(code)}${price.toFixed(2)}`;
  }
}

/** Simple currency symbol lookup (used as Intl fallback) */
export function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    EUR: '€', USD: '$',  GBP: '£',  CHF: 'CHF ', PLN: 'zł',
    CZK: 'Kč', SEK: 'kr', NOK: 'kr', DKK: 'kr',  HUF: 'Ft',
    RON: 'lei', BGN: 'лв', TRY: '₺', BRL: 'R$', CAD: 'C$',
    AUD: 'A$', NZD: 'NZ$', ZAR: 'R', NGN: '₦', KES: 'KSh',
    GHS: '₵', EGP: '£',  MAD: 'MAD', AED: 'د.إ', SAR: '﷼',
    INR: '₹', JPY: '¥',  CNY: '¥',  KRW: '₩', MXN: 'MX$',
    RUB: '₽', UAH: '₴',
  };
  return map[code.toUpperCase()] ?? `${code} `;
}
