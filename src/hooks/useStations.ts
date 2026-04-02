import { useQuery } from '@tanstack/react-query';
import { searchGasStations } from '../api/tomtom';
import { DEFAULT_SEARCH_RADIUS } from '../constants/fuelTypes';
import type { Station } from '../types/station';

interface UseStationsOptions {
  lat: number | undefined;
  lon: number | undefined;
  radius?: number;
  enabled?: boolean;
}

export function useStations({
  lat,
  lon,
  radius = DEFAULT_SEARCH_RADIUS,
  enabled = true,
}: UseStationsOptions) {
  return useQuery<Station[], Error>({
    queryKey: ['stations', lat, lon, radius],
    queryFn: () => searchGasStations(lat!, lon!, radius),
    enabled: enabled && lat != null && lon != null,
    staleTime: 2 * 60 * 1000,        // 2 min
    gcTime: 5 * 60 * 1000,            // 5 min
    retry: 2,
  });
}
