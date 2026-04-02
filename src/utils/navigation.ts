import { Platform, Linking } from 'react-native';

export type NavApp = 'default' | 'waze' | 'tomtom';

export async function openNavigation(
  lat: number,
  lon: number,
  label: string,
  app: NavApp = 'default',
): Promise<void> {
  const encoded = encodeURIComponent(label);

  // Define URL schemes for each app
  const urls: Record<NavApp, string[]> = {
    default: Platform.OS === 'ios'
      ? [
        `maps://?daddr=${lat},${lon}&dirflg=d&q=${encoded}`, // Apple Maps app
        `https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d&q=${encoded}`, // Apple Maps web
      ]
      : [
        `google.navigation:q=${lat},${lon}`, // Google Maps app (navigation intent)
        `comgooglemaps://?api=1&destination=${lat},${lon}`, // Google Maps app (deep link)
        `https://maps.google.com/maps?daddr=${lat},${lon}`, // Google Maps web
      ],
    waze: [`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`],
    tomtom: [`tomtomgo://x-callback-url/navigate?destination=${lat},${lon}`],
  };

  const urlList = urls[app];

  // Try each URL in order until one works
  for (const url of urlList) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return; // Success, exit function
      }
    } catch (error) {
      console.warn(`Failed to open URL ${url}:`, error);
      // Continue to next URL
    }
  }

  // If we get here, none of the URLs worked
  // Last resort: open Google Maps in browser
  const browserUrl = `https://maps.google.com/maps?daddr=${lat},${lon}`;
  try {
    await Linking.openURL(browserUrl);
  } catch (error) {
    console.error('Failed to open any navigation app:', error);
    throw new Error('Could not open any navigation application');
  }
}

export function openPhone(phone: string): void {
  void Linking.openURL(`tel:${phone}`);
}
