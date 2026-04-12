import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/* ─────────────────────────────────────────────────────
   Firebase Configuration
   ───────────────────────────────────────────────────── */

// Get Firebase config from Expo Constants (environment variables)
const firebaseConfig = {
    apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCvHaxxgftJgvmefWKK7JgVTaC5xwQw1_8',
    authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'fuelprice-d64ae.firebaseapp.com',
    projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'fuelprice-d64ae',
    storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'fuelprice-d64ae.firebasestorage.app',
    messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '64993832802',
    appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:64993832802:web:bec8a2c37d8dc18a7e463b',
    measurementId: Constants.expoConfig?.extra?.firebaseMeasurementId || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-EP5QNBNPWZ',
};

// Validate config
const isConfigValid = Object.values(firebaseConfig).every(value => value && value !== '');

/* ─────────────────────────────────────────────────────
   Firebase Initialization
   ───────────────────────────────────────────────────── */
let app: any = null;
let analytics: any = null;
let db: any = null;

if (isConfigValid) {
    try {
        app = initializeApp(firebaseConfig);
        // Analytics only works in browser/web environment.
        if (Platform.OS === 'web') {
            analytics = getAnalytics(app);
        }
        db = getFirestore(app);
        console.log('[Firebase] Initialized successfully');
    } catch (error) {
        console.error('[Firebase] Initialization error:', error);
    }
} else {
    console.warn('[Firebase] Configuration missing. Firebase services disabled.');
}

/* ─────────────────────────────────────────────────────
   Types for API Data Logging
   ───────────────────────────────────────────────────── */
export interface ApiLogEntry {
    /** API endpoint or service name (e.g., 'tomtom/search', 'gemini/fuel-prices') */
    service: string;
    /** Request parameters (latitude, longitude, station name, etc.) */
    request: Record<string, any>;
    /** Response data (stations, prices, errors) */
    response: Record<string, any>;
    /** Duration in milliseconds */
    durationMs?: number;
    /** Whether the request was successful */
    success: boolean;
    /** Error message if any */
    error?: string;
    /** ISO timestamp (set by server) */
    timestamp?: any;
}

export interface StationPriceEntry {
    stationId: string;
    stationName: string;
    brand?: string;
    address: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    fuelPrices: Array<{
        fuelType: string;
        price: number;
        currency: string;
        lastUpdated: string;
    }>;
    priceSource: 'tomtom' | 'gemini' | 'gemini-grounded' | 'manual';
    priceAttribution?: string;
    timestamp: any;
}

/* ─────────────────────────────────────────────────────
   Firestore Collections
   ───────────────────────────────────────────────────── */
const COLLECTIONS = {
    API_LOGS: 'api_logs',
    STATION_PRICES: 'station_prices',
    USER_SEARCHES: 'user_searches',
    API_CACHE: 'api_cache',
} as const;

export interface ApiCacheEntry<T = unknown> {
    service: string;
    requestKey: string;
    response: T;
    expiresAt: number;
    updatedAt: any;
}

function toCacheDocId(service: string, requestKey: string): string {
    const raw = `${service}:${requestKey}`;
    let hash = 5381;
    for (let i = 0; i < raw.length; i += 1) {
        hash = ((hash << 5) + hash) + raw.charCodeAt(i);
    }
    const normalized = Math.abs(hash).toString(16);
    return `${service.replace(/[^\w-]/g, '_')}_${normalized}`;
}

/* ─────────────────────────────────────────────────────
   Core Firebase Service Functions
   ───────────────────────────────────────────────────── */

/**
 * Log an API call to Firestore for analytics and debugging.
 * This runs in the background and never blocks the main flow.
 */
export async function logApiCall(entry: Omit<ApiLogEntry, 'timestamp'>): Promise<void> {
    if (!db) {
        console.warn('[Firebase] Database not available, skipping API log');
        return;
    }

    try {
        const docData: any = {
            ...entry,
            timestamp: serverTimestamp(),
        };
        // Firestore rejects explicit 'undefined' values
        Object.keys(docData).forEach(key => {
            if (docData[key] === undefined) {
                delete docData[key];
            }
        });
        await addDoc(collection(db, COLLECTIONS.API_LOGS), docData);
        console.debug('[Firebase] API call logged:', entry.service);
    } catch (error) {
        console.warn('[Firebase] Failed to log API call:', error);
        // Silently fail - logging should not break the app
    }
}

export async function getCachedApiResponse<T>(
    service: string,
    requestKey: string
): Promise<T | null> {
    if (!db) return null;

    try {
        const cacheDocRef = doc(db, COLLECTIONS.API_CACHE, toCacheDocId(service, requestKey));
        const snap = await getDoc(cacheDocRef);
        if (!snap.exists()) return null;
        const data = snap.data() as ApiCacheEntry<T>;
        if (!data || typeof data.expiresAt !== 'number' || data.expiresAt < Date.now()) {
            return null;
        }
        return data.response;
    } catch {
        return null;
    }
}

export async function saveApiResponseCache<T>(
    service: string,
    requestKey: string,
    response: T,
    ttlMs: number
): Promise<void> {
    if (!db) return;
    try {
        const cacheDocRef = doc(db, COLLECTIONS.API_CACHE, toCacheDocId(service, requestKey));
        await setDoc(cacheDocRef, {
            service,
            requestKey,
            response,
            expiresAt: Date.now() + ttlMs,
            updatedAt: serverTimestamp(),
        } as ApiCacheEntry<T>);
    } catch {
        // Cache writes should never break API calls.
    }
}

/**
 * Save station price data to Firestore for historical tracking.
 * Each station price update creates a new document with timestamp.
 */
export async function saveStationPrices(entry: Omit<StationPriceEntry, 'timestamp'>): Promise<void> {
    if (!db) {
        console.warn('[Firebase] Database not available, skipping station price save');
        return;
    }

    try {
        const docData: any = {
            ...entry,
            timestamp: serverTimestamp(),
        };
        Object.keys(docData).forEach(key => {
            if (docData[key] === undefined) {
                delete docData[key];
            }
        });
        await addDoc(collection(db, COLLECTIONS.STATION_PRICES), docData);
        console.debug('[Firebase] Station prices saved:', entry.stationName);
    } catch (error) {
        console.warn('[Firebase] Failed to save station prices:', error);
    }
}

/**
 * Log user search queries (anonymized) for understanding popular locations.
 */
export async function logUserSearch(
    lat: number,
    lon: number,
    radius: number,
    resultCount: number
): Promise<void> {
    if (!db) return;

    try {
        await addDoc(collection(db, COLLECTIONS.USER_SEARCHES), {
            coordinates: { lat, lon },
            radius,
            resultCount,
            timestamp: serverTimestamp(),
            // No user identifier for privacy
        });
    } catch (error) {
        // Ignore errors
    }
}

/* ─────────────────────────────────────────────────────
   Helper Functions for Specific API Services
   ───────────────────────────────────────────────────── */

/**
 * Log TomTom search API call with performance metrics.
 */
export async function logTomTomSearch(
    lat: number,
    lon: number,
    radius: number,
    stationsFound: number,
    durationMs: number,
    error?: string
): Promise<void> {
    await logApiCall({
        service: 'tomtom/search',
        request: { lat, lon, radius },
        response: { stationsFound },
        durationMs,
        success: !error,
        error,
    });
}

/**
 * Log Gemini fuel price API call.
 */
export async function logGeminiPriceRequest(
    stationName: string,
    address: string,
    currencyCode: string,
    pricesFound: number,
    durationMs: number,
    grounded: boolean,
    error?: string
): Promise<void> {
    await logApiCall({
        service: 'gemini/fuel-prices',
        request: { stationName, address, currencyCode },
        response: { pricesFound, grounded },
        durationMs,
        success: !error,
        error,
    });
}

/**
 * Save enriched station data (from TomTom + Gemini) for historical analysis.
 */
export async function saveEnrichedStation(
    station: any, // Station type from ../types/station
    priceSource: string,
    priceAttribution?: string
): Promise<void> {
    if (!station.fuelPrices || station.fuelPrices.length === 0) {
        return; // Only save stations with prices
    }

    await saveStationPrices({
        stationId: station.id,
        stationName: station.name,
        brand: station.brand,
        address: station.address,
        coordinates: station.coordinates,
        fuelPrices: station.fuelPrices,
        priceSource: priceSource as any,
        priceAttribution,
    });
}

/* ─────────────────────────────────────────────────────
   Export Firebase instances (for other services if needed)
   ───────────────────────────────────────────────────── */
export { app as firebaseApp, db as firestoreDb, analytics as firebaseAnalytics };