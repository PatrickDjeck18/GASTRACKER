import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import type { Coordinates } from '../types/station';

interface UseLocationReturn {
  coords: Coordinates | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Custom hook – request foreground location permission,
 * then fetch the GPS position once.
 */
export function useLocation(): UseLocationReturn {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission was denied.');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to retrieve location.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLocation();
  }, [fetchLocation]);

  return { coords, error, loading, refresh: fetchLocation };
}
