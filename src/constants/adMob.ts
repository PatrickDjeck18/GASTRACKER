/**
 * Non-personalized ads only — avoids IDFA-based targeting so the app aligns
 * with App Store privacy when you do not declare cross-app tracking.
 */
export const AD_REQUEST_OPTIONS = {
  requestNonPersonalizedAdsOnly: true,
} as const;
