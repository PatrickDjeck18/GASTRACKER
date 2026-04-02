import Constants from 'expo-constants';

/**
 * Shared TomTom API key extracted from app.config.ts extra.tomtomApiKey
 */
export const TOMTOM_API_KEY: string =
  (Constants.expoConfig?.extra?.tomtomApiKey as string) ?? '';

/** Check that the key is present and warn once */
let _warned = false;
export function assertApiKey(): boolean {
  if (!TOMTOM_API_KEY) {
    if (!_warned) {
      console.warn('[TomTom] No API key set – check extra.tomtomApiKey in app.config.ts');
      _warned = true;
    }
    return false;
  }
  return true;
}
