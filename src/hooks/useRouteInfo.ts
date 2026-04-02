import { useQuery } from '@tanstack/react-query';
import { calculateRoute } from '../api/routing';
import type { RouteInfo } from '../types/routing';

interface UseRouteInfoOptions {
  originLat?: number;
  originLon?: number;
  destLat?: number;
  destLon?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch driving route info between two points using TomTom Routing API.
 */
export function useRouteInfo({
  originLat,
  originLon,
  destLat,
  destLon,
  enabled = true,
}: UseRouteInfoOptions) {
  return useQuery<RouteInfo | null, Error>({
    queryKey: ['route', originLat, originLon, destLat, destLon],
    queryFn: () =>
      calculateRoute(originLat!, originLon!, destLat!, destLon!),
    enabled:
      enabled &&
      originLat != null &&
      originLon != null &&
      destLat != null &&
      destLon != null,
    staleTime: 3 * 60 * 1000,   // 3 min
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
