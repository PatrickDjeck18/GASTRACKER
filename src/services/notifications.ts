import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { searchGasStations } from '../api/tomtom';
import { bestPrice } from '../utils/price';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ── Constants ──────────────────────────────────────── */

const BACKGROUND_TASK_NAME = 'CHEAP_FUEL_ALERT_TASK';
const PRICE_ALERT_KEY = '@fuel_price_alert';
const LAST_NOTIF_KEY = '@fuel_last_notification';
const LAST_WEEKLY_SUMMARY_KEY = '@fuel_last_weekly_summary';
const MIN_NOTIF_INTERVAL_MS = 30 * 60 * 1000; // 30 min between notifications
const ALERT_SEARCH_RADIUS = 5000; // 5 km
const QUIET_HOURS_START = 22; // 10 PM
const QUIET_HOURS_END = 6;    // 6 AM

/* ── Notification channel setup ─────────────────────── */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* ── Types ──────────────────────────────────────────── */

export interface PriceAlert {
  enabled: boolean;
  targetPrice: number;     // target price per unit (e.g. 1.50 EUR/L)
  currency: string;        // e.g. 'EUR'
  fuelType: string | null; // fuel type filter or null for any
}

interface SavedCalcLike {
  date: number;
  net: number;
}

function isQuietHours(now = new Date()): boolean {
  const h = now.getHours();
  return h >= QUIET_HOURS_START || h < QUIET_HOURS_END;
}

const DEFAULT_ALERT: PriceAlert = {
  enabled: false,
  targetPrice: 1.50,
  currency: 'EUR',
  fuelType: null,
};

/* ── Permission helpers ─────────────────────────────── */

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/* ── Android notification channel ───────────────────── */

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('fuel-alerts', {
      name: 'Fuel Price Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      description: 'Alerts when cheap fuel prices are found near you',
    });
  }
}

/* ── Save / Load price alert config ─────────────────── */

export async function savePriceAlert(alert: PriceAlert): Promise<void> {
  await AsyncStorage.setItem(PRICE_ALERT_KEY, JSON.stringify(alert));
}

export async function loadPriceAlert(): Promise<PriceAlert> {
  try {
    const raw = await AsyncStorage.getItem(PRICE_ALERT_KEY);
    if (!raw) return DEFAULT_ALERT;
    return { ...DEFAULT_ALERT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ALERT;
  }
}

/* ── Send a local notification ──────────────────────── */

export async function sendCheapFuelNotification(
  stationName: string,
  price: number,
  currency: string,
  fuelType: string,
  distance: number,
): Promise<void> {
  if (isQuietHours()) return;

  // Throttle: don't send more than once per MIN_NOTIF_INTERVAL
  const lastNotif = await AsyncStorage.getItem(LAST_NOTIF_KEY);
  if (lastNotif) {
    const elapsed = Date.now() - parseInt(lastNotif, 10);
    if (elapsed < MIN_NOTIF_INTERVAL_MS) return;
  }

  const sym = currencySymbol(currency);
  const distStr = distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⛽ Cheap Fuel Nearby!',
        body: `${stationName} has ${fuelType} at ${sym}${price.toFixed(2)}/L — only ${distStr} away`,
        data: { type: 'cheap_fuel', stationName, price, currency, fuelType },
        ...(Platform.OS === 'android' && { channelId: 'fuel-alerts' }),
      },
      trigger: null, // send immediately
    });

    await AsyncStorage.setItem(LAST_NOTIF_KEY, String(Date.now()));
  } catch (error) {
    // Handle "activity no longer available" error gracefully
    console.warn('[FuelAlert] Failed to send notification:', error);
    // Don't re-throw - this is expected when app is in background/closed
  }
}

/**
 * Send a weekly savings summary notification at most once per week.
 * Uses local time and avoids night-time delivery.
 */
export async function maybeSendWeeklySavingsSummary(
  savedCalculations: SavedCalcLike[],
  currency: string,
): Promise<void> {
  if (!savedCalculations.length || isQuietHours()) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;
  await setupNotificationChannel();

  const now = new Date();
  const day = now.getDay(); // Sun=0 ... Sat=6
  const hour = now.getHours();
  const isPreferredWindow = (day === 0 || day === 1) && hour >= 18 && hour <= 21;
  if (!isPreferredWindow) return;

  const lastSummary = await AsyncStorage.getItem(LAST_WEEKLY_SUMMARY_KEY);
  if (lastSummary) {
    const elapsed = Date.now() - parseInt(lastSummary, 10);
    if (elapsed < 6 * 24 * 60 * 60 * 1000) return; // ~once per week
  }

  const weekStart = new Date(now);
  const mondayOffset = day === 0 ? 6 : day - 1;
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartTs = weekStart.getTime();

  const weekEntries = savedCalculations.filter((c) => c.date >= weekStartTs);
  if (!weekEntries.length) return;

  const totalNet = weekEntries.reduce((acc, c) => acc + c.net, 0);
  if (totalNet <= 0) return;

  const sym = currencySymbol(currency);
  const fills = weekEntries.length;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📈 Weekly Fuel Savings',
        body: `You saved about ${sym}${totalNet.toFixed(2)} across ${fills} fill-up${fills > 1 ? 's' : ''} this week.`,
        data: { type: 'weekly_savings', totalNet, fills, currency },
        ...(Platform.OS === 'android' && { channelId: 'fuel-alerts' }),
      },
      trigger: null,
    });
    await AsyncStorage.setItem(LAST_WEEKLY_SUMMARY_KEY, String(Date.now()));
  } catch (error) {
    console.warn('[FuelAlert] Weekly summary notification failed:', error);
  }
}

/* ── Check prices and notify ────────────────────────── */

export async function checkAndNotify(
  lat: number,
  lon: number,
): Promise<void> {
  const alert = await loadPriceAlert();
  if (!alert.enabled || !alert.targetPrice) return;

  try {
    const stations = await searchGasStations(lat, lon, ALERT_SEARCH_RADIUS, 20);

    for (const station of stations) {
      const bp = bestPrice(station, alert.fuelType);
      if (!bp) continue;

      if (bp.price <= alert.targetPrice) {
        await sendCheapFuelNotification(
          station.brand ?? station.name,
          bp.price,
          bp.currency,
          bp.fuelType,
          station.distance,
        );
        return; // only one notification per check
      }
    }
  } catch (e) {
    console.warn('[FuelAlert] Check failed:', e);
  }
}

/* ── Foreground price check (called when app opens) ── */

export async function foregroundPriceCheck(
  lat: number,
  lon: number,
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;
  await setupNotificationChannel();
  await checkAndNotify(lat, lon);
}

/* ── Background task registration ───────────────────── */

TaskManager.defineTask(BACKGROUND_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[FuelAlert] Background task error:', error);
    return;
  }

  const locations = (data as any)?.locations;
  if (!locations || locations.length === 0) return;

  const { latitude, longitude } = locations[0].coords;
  await checkAndNotify(latitude, longitude);
});

export async function startBackgroundAlerts(): Promise<boolean> {
  const alert = await loadPriceAlert();
  if (!alert.enabled) return false;

  // Use foreground permissions only to comply with Google Play policy
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return false;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return false;

  await setupNotificationChannel();

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (isRegistered) return true;

  await Location.startLocationUpdatesAsync(BACKGROUND_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 2000,        // every 2 km of movement
    timeInterval: 15 * 60 * 1000,  // minimum 15 min between updates
    deferredUpdatesInterval: 15 * 60 * 1000,
    showsBackgroundLocationIndicator: false,
  });

  return true;
}

export async function stopBackgroundAlerts(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_TASK_NAME);
  }
}

/* ── Helpers ─────────────────────────────────────────── */

function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ', PLN: 'zł',
    CZK: 'Kč', SEK: 'kr', NOK: 'kr', DKK: 'kr', HUF: 'Ft',
    RON: 'lei', BGN: 'лв', TRY: '₺', BRL: 'R$', CAD: 'C$',
    AUD: 'A$', ZAR: 'R',
  };
  return map[code.toUpperCase()] ?? `${code} `;
}
