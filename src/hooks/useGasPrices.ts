import { useQuery } from '@tanstack/react-query';
import { fetchRegionalPrices } from '../api/gasPrice';
import { getLocalCurrencyCode } from '../services/fuelPriceService';
import type { GasPriceRegion, RegionalFuelPrice } from '../types/gasPrice';

/** 
 * React Query hook to fetch regional gas prices filtered and converted to user's local currency.
 */
export function useGasPrices(region: GasPriceRegion) {
  // Get active currency from device using service utility
  const currencyCode = getLocalCurrencyCode();

  return useQuery<RegionalFuelPrice[], Error>({
    queryKey: ['gasPrices', region, currencyCode],
    queryFn: () => fetchRegionalPrices(region, currencyCode),
    staleTime: 12 * 60 * 60 * 1000, // 12h
    gcTime: 24 * 60 * 60 * 1000,  // 24h
    retry: 2,
  });
}
