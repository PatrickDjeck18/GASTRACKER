import Constants from 'expo-constants';
import axios from 'axios';
import { Platform } from 'react-native';
import {
  getAuth,
  initializeAuth,
  signInAnonymously,
  type Auth,
} from 'firebase/auth';
import { firebaseApp } from './firebase';

type BackendPayload = Record<string, unknown>;
interface FirebaseFunctionOptions {
  timeoutMs?: number;
}

function getFunctionsBaseUrl(): string {
  const explicitBase = (Constants.expoConfig?.extra?.firebaseFunctionsBaseUrl as string) ?? '';
  if (explicitBase) return explicitBase.replace(/\/+$/, '');

  const projectId = (Constants.expoConfig?.extra?.firebaseProjectId as string) ?? 'fuelprice-d64ae';
  if (!projectId) {
    throw new Error('[Firebase Functions] Missing firebaseProjectId/firebaseFunctionsBaseUrl in app config');
  }
  return `https://us-central1-${projectId}.cloudfunctions.net`;
}

function shouldUseFunctionAuth(): boolean {
  // Temporarily disable auth for Firebase functions to fix loading issues
  // Firebase functions don't require authentication
  return false;
  // const flag = (Constants.expoConfig?.extra?.firebaseFunctionsRequireAuth as string | boolean | undefined);
  // if (typeof flag === 'boolean') return flag;
  // return String(flag).toLowerCase() === 'true';
}

let cachedAuth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!firebaseApp) {
    throw new Error('[Firebase Functions] Firebase app is not initialized');
  }
  if (cachedAuth) return cachedAuth;

  // Simplified: just get default auth (persistence not needed since auth is disabled)
  cachedAuth = getAuth(firebaseApp);
  return cachedAuth;
}

// ... 

export async function callFirebaseFunction<T>(
  name: string,
  payload: BackendPayload,
  options: FirebaseFunctionOptions = {},
): Promise<T> {
  const baseUrl = getFunctionsBaseUrl();
  let token: string | null = null;
  const timeoutMs = options.timeoutMs ?? 15000;

  if (shouldUseFunctionAuth()) {
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      token = (await auth.currentUser?.getIdToken(true)) ?? null;
    } catch (error) {
      console.warn('[Firebase Functions] Auth bootstrap failed, trying unauthenticated call:', error);
    }
  }

  // Default timeout keeps UI snappy; callers can opt in to longer waits for heavier functions.
  const api = axios.create({
    timeout: timeoutMs,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  try {
    const response = await api.post(`${baseUrl}/${name}`, payload);
    return response.data as T;
  } catch (error: any) {
    // Fallback for backends that do not require auth or when token is rejected
    if (error.response && (error.response.status === 401 || error.response.status === 403) && token) {
      const fallbackApi = axios.create({ timeout: timeoutMs });
      try {
        const fallbackResponse = await fallbackApi.post(`${baseUrl}/${name}`, payload);
        return fallbackResponse.data as T;
      } catch (fallbackError: any) {
        const data = fallbackError.response?.data ? JSON.stringify(fallbackError.response.data) : fallbackError.message;
        throw new Error(`[Firebase Functions] ${name} fallback failed: ${data}`);
      }
    }

    // Handle timeout specifically
    if (error.code === 'ECONNABORTED') {
      throw new Error(`[Firebase Functions] ${name} timeout after ${Math.round(timeoutMs / 1000)}s`);
    }

    const data = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`[Firebase Functions] ${name} failed: ${data}`);
  }
}
