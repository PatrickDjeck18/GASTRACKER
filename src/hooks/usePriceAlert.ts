import { useEffect, useState, useCallback } from 'react';
import {
  loadPriceAlert,
  savePriceAlert,
  startBackgroundAlerts,
  stopBackgroundAlerts,
  foregroundPriceCheck,
  type PriceAlert,
} from '../services/notifications';

/** Hook to manage price alert settings with persistence. */
export function usePriceAlert() {
  const [alert, setAlert] = useState<PriceAlert>({
    enabled: false,
    targetPrice: 1.50,
    currency: 'EUR',
    fuelType: null,
  });
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    loadPriceAlert().then((saved) => {
      setAlert(saved);
      setLoaded(true);
    });
  }, []);

  // Update and persist
  const updateAlert = useCallback(async (patch: Partial<PriceAlert>) => {
    const updated = { ...alert, ...patch };
    setAlert(updated);
    await savePriceAlert(updated);

    // Toggle background task
    if (updated.enabled) {
      await startBackgroundAlerts();
    } else {
      await stopBackgroundAlerts();
    }
  }, [alert]);

  // Run foreground check
  const checkNow = useCallback(async (lat: number, lon: number) => {
    if (!alert.enabled) return;
    await foregroundPriceCheck(lat, lon);
  }, [alert.enabled]);

  return { alert, loaded, updateAlert, checkNow };
}
