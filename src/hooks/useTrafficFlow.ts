import { useQuery } from '@tanstack/react-query';
import { getTrafficFlow } from '../api/traffic';
import type { TrafficFlowInfo } from '../types/traffic';

interface UseTrafficFlowOptions {
  lat?: number;
  lon?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch real-time traffic flow data for a location.
 */
export function useTrafficFlow({
  lat,
  lon,
  enabled = true,
}: UseTrafficFlowOptions) {
  return useQuery<TrafficFlowInfo | null, Error>({
    queryKey: ['trafficFlow', lat, lon],
    queryFn: () => getTrafficFlow(lat!, lon!),
    enabled: enabled && lat != null && lon != null,
    staleTime: 2 * 60 * 1000,   // 2 min
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
