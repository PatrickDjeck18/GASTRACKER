import { useQuery } from '@tanstack/react-query';
import { fetchRegionalPrices } from '../api/gasPrice';
import { getLocalCurrencyCode } from '../services/fuelPriceService';
import type { GasPriceRegion, RegionalFuelPrice } from '../types/gasPrice';

/** 
 * React Query hook to fetch regional gas prices converted to the user's local currency.
 *
 * NOTE: placeholderData is intentionally NOT used here — showing stale data from a
 * previous region/currency query would flash incorrect currency symbols to the user.
 * isLoading stays true until real data for this (region, currency) pair arrives.
 */
export function useGasPrices(region: GasPriceRegion) {
  // Get active currency from device using service utility
  const currencyCode = getLocalCurrencyCode();

  return useQuery<RegionalFuelPrice[], Error>({
    queryKey: ['gasPrices', region, currencyCode],
    queryFn: () => fetchRegionalPrices(region, currencyCode),
    // No placeholderData — prevents wrong-currency flash when switching regions
    staleTime: 12 * 60 * 60 * 1000, // 12h
    gcTime: 24 * 60 * 60 * 1000,    // 24h
    retry: 2,
  });
}
