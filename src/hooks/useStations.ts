import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAndEnrichStations, enrichStation } from '../services/fuelPriceService';
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
  const queryClient = useQueryClient();
  const queryKey = ['stations', lat, lon, radius];

  return useQuery<Station[], Error>({
    queryKey,
    queryFn: () => fetchAndEnrichStations(lat!, lon!, radius, queryClient, queryKey),
    enabled: enabled && lat != null && lon != null,
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,   // 5 min
    gcTime: 15 * 60 * 1000,     // 15 min
    retry: 2,
  });
}

/**
 * Hook to enrich a single station on-demand (e.g. when user opens the detail modal).
 * Updates the station in-place inside the React Query cache.
 */
export function useEnrichStation() {
  const qc = useQueryClient();

  return async function enrich(station: Station, queryKey: unknown[]): Promise<Station> {
    if (station.fuelPrices.length > 0) return station;

    const enriched = await enrichStation(station);

    // Update the cached station list so the map markers also reflect the new price
    qc.setQueryData<Station[]>(queryKey, (prev) => {
      if (!prev) return prev;
      return prev.map((s) => (s.id === enriched.id ? enriched : s));
    });

    return enriched;
  };
}
