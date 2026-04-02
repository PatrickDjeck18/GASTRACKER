/**
 * Mock useInterstitialAd for Web since react-native-google-mobile-ads doesn't support web.
 */
export function useInterstitialAd() {
  return { 
    maybeShowAd: () => {}, 
    showAdNow: () => {} 
  };
}
