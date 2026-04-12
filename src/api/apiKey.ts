import Constants from 'expo-constants';

/**
 * Shared TomTom API key extracted from app.config.ts extra.tomtomApiKey
 */
export const TOMTOM_API_KEY: string =
  (Constants.expoConfig?.extra?.tomtomApiKey as string) || 
  process.env.EXPO_PUBLIC_TOMTOM_API_KEY || 
  'cOcOyqExivMW88thxXdsJUUkvoJqK40q';

let warnedMissingTomTomKey = false;
export function assertApiKey(): boolean {
  if (TOMTOM_API_KEY) return true;
  if (!warnedMissingTomTomKey) {
    console.warn('[TomTom] Missing TOMTOM_MAPS_PUBLIC_KEY / extra.tomtomApiKey');
    warnedMissingTomTomKey = true;
  }
  return false;
}
