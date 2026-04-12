import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  signInAnonymously,
  type Auth,
} from 'firebase/auth';
import { firebaseApp } from './firebase';

type BackendPayload = Record<string, unknown>;

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
  const flag = (Constants.expoConfig?.extra?.firebaseFunctionsRequireAuth as string | boolean | undefined);
  if (typeof flag === 'boolean') return flag;
  return String(flag).toLowerCase() === 'true';
}

let cachedAuth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!firebaseApp) {
    throw new Error('[Firebase Functions] Firebase app is not initialized');
  }
  if (cachedAuth) return cachedAuth;

  if (Platform.OS === 'web') {
    cachedAuth = getAuth(firebaseApp);
    return cachedAuth;
  }

  try {
    cachedAuth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    cachedAuth = getAuth(firebaseApp);
  }
  return cachedAuth;
}

export async function callFirebaseFunction<T>(name: string, payload: BackendPayload): Promise<T> {
  const baseUrl = getFunctionsBaseUrl();
  let token: string | null = null;

  if (shouldUseFunctionAuth()) {
    try {
      const auth = getFirebaseAuth();
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      token = (await auth.currentUser?.getIdToken(true)) ?? null;
    } catch (error) {
      // If auth setup fails, retry request without auth header.
      console.warn('[Firebase Functions] Auth bootstrap failed, trying unauthenticated call:', error);
    }
  }

  let response = await fetch(`${baseUrl}/${name}`, {
    method: 'POST',
    headers: token
      ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
      : { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Fallback for backends that do not require auth or when token is rejected.
  if ((response.status === 401 || response.status === 403) && token) {
    response = await fetch(`${baseUrl}/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[Firebase Functions] ${name} failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}
