import { useQuery } from '@tanstack/react-query';
import { reverseGeocode, type ReverseGeocodeResult } from '../api/geocoding';

interface UseReverseGeocodeOptions {
  lat?: number;
  lon?: number;
  enabled?: boolean;
}

/**
 * Hook to reverse-geocode GPS coordinates into a city/address.
 */
export function useReverseGeocode({
  lat,
  lon,
  enabled = true,
}: UseReverseGeocodeOptions) {
  return useQuery<ReverseGeocodeResult | null, Error>({
    queryKey: ['reverseGeocode', lat, lon],
    queryFn: () => reverseGeocode(lat!, lon!),
    enabled: enabled && lat != null && lon != null,
    staleTime: 30 * 60 * 1000,  // 30 min (location name rarely changes)
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
}
