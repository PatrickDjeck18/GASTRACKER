/* ── FuelFind Premium Design System — Neon Orange Edition ── */

export const Colors = {
  /* Brand — Fiery Orange */
  primary: '#F97316',
  primaryLight: '#FB923C',
  primaryDark: '#EA580C',
  primaryGlow: 'rgba(249, 115, 22, 0.18)',
  primaryMuted: 'rgba(249, 115, 22, 0.10)',

  /* Accent — Electric Amber */
  accent: '#FBBF24',
  accentLight: '#FCD34D',
  accentGlow: 'rgba(251, 191, 36, 0.18)',

  /* Gradients (as stop arrays for LinearGradient) */
  gradients: {
    primary: ['#F97316', '#EA580C'] as [string, string],
    accent: ['#FBBF24', '#F97316'] as [string, string],
    success: ['#22D3A5', '#10B981'] as [string, string],
    warning: ['#FBBF24', '#F59E0B'] as [string, string],
    danger: ['#F87171', '#EF4444'] as [string, string],
    dark: ['#1A1A28', '#0A0A14'] as [string, string],
    hero: ['#F97316', '#7C2D12'] as [string, string],
  },

  dark: {
    background: '#0A0A0F',
    surface: '#111118',
    surfaceElevated: '#1A1A24',
    surfaceHighlight: '#22222F',
    border: '#2A2A3A',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    text: '#F8F8FC',
    textSecondary: '#9898B0',
    textMuted: '#55556A',
    tabBar: '#0D0D15',
    tabBarBorder: '#1E1E2C',
    overlay: 'rgba(0, 0, 0, 0.82)',
    mapStyle: [] as any[],
    card: '#141420',
    cardBorder: '#20202E',
    shimmer: '#1C1C28',
    glass: 'rgba(17, 17, 24, 0.80)',
    glassElevated: 'rgba(26, 26, 36, 0.90)',
    glassBorder: 'rgba(249, 115, 22, 0.10)',
  },

  light: {
    background: '#FFF8F3',
    surface: '#FFFFFF',
    surfaceElevated: '#FFF4EC',
    surfaceHighlight: '#FFE8D6',
    border: '#F0D8C8',
    borderSubtle: 'rgba(249, 115, 22, 0.08)',
    text: '#1A0A00',
    textSecondary: '#6B4535',
    textMuted: '#BFA090',
    tabBar: '#FFFFFF',
    tabBarBorder: '#F0D8C8',
    overlay: 'rgba(10, 5, 0, 0.50)',
    mapStyle: [] as any[],
    card: '#FFFFFF',
    cardBorder: '#F0D8C8',
    shimmer: '#F5E8DC',
    glass: 'rgba(255, 248, 243, 0.82)',
    glassElevated: 'rgba(255, 244, 236, 0.92)',
    glassBorder: 'rgba(249, 115, 22, 0.12)',
  },

  price: {
    cheap: '#22D3A5',
    cheapBg: 'rgba(34, 211, 165, 0.12)',
    cheapBorder: 'rgba(34, 211, 165, 0.30)',
    medium: '#FBBF24',
    mediumBg: 'rgba(251, 191, 36, 0.12)',
    mediumBorder: 'rgba(251, 191, 36, 0.30)',
    expensive: '#F87171',
    expensiveBg: 'rgba(248, 113, 113, 0.12)',
    expensiveBorder: 'rgba(248, 113, 113, 0.30)',
    unknown: '#6B7280',
    unknownBg: 'rgba(107, 114, 128, 0.12)',
    unknownBorder: 'rgba(107, 114, 128, 0.30)',
  },

  success: '#22D3A5',
  warning: '#FBBF24',
  error: '#F87171',
  white: '#FFFFFF',
  black: '#000000',
};

export type ThemeColors = typeof Colors.dark;

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? Colors.dark : Colors.light;
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const Radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 28,
  full: 999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  float: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  }),
};

export const AnimDurations = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: 600,
} as const;
