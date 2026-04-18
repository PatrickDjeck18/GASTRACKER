import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import type { Coordinates } from '../types/station';
import { useAppStore } from '../store/useAppStore';

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
  const setUserLocation = useAppStore((s) => s.setUserLocation);

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

      const knownLoc = await Location.getLastKnownPositionAsync({
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
      });

      if (knownLoc) {
        setCoords({
          latitude: knownLoc.coords.latitude,
          longitude: knownLoc.coords.longitude,
        });
        setUserLocation(knownLoc.coords.latitude, knownLoc.coords.longitude);
        // We set loading false early so UI can show cached data quickly
        setLoading(false);
      }

      // Fetch fresh position in background to get accurate location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      let countryCode: string | null = null;
      try {
        const rev = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        countryCode = rev[0]?.isoCountryCode ?? null;
      } catch {
        // Reverse geocoding is best-effort only.
      }
      setUserLocation(loc.coords.latitude, loc.coords.longitude, countryCode);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to retrieve location.',
      );
    } finally {
      setLoading(false);
    }
  }, [setUserLocation]);

  useEffect(() => {
    void fetchLocation();
  }, [fetchLocation]);

  return { coords, error, loading, refresh: fetchLocation };
}
