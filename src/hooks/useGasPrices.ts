import { useQuery } from '@tanstack/react-query';
import { fetchRegionalPrices } from '../api/gasPrice';
import type { GasPriceRegion, RegionalFuelPrice } from '../types/gasPrice';

/**
 * React Query hook to fetch regional gas prices from the RapidAPI Gas Price API.
 * Caches results for 10 minutes (prices don't change frequently).
 */
export function useGasPrices(region: GasPriceRegion) {
  return useQuery<RegionalFuelPrice[], Error>({
    queryKey: ['gasPrices', region],
    queryFn: () => fetchRegionalPrices(region),
    staleTime: 12 * 60 * 60 * 1000,  // 12 hours
    gcTime: 24 * 60 * 60 * 1000,      // 24 hours
    retry: 2,
  });
}
