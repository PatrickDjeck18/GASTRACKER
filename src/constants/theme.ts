/* ── FuelFind Premium Design System ────────────────── */

export const Colors = {
  /* Brand */
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  primaryDark: '#1D4ED8',
  primaryGlow: 'rgba(59, 130, 246, 0.15)',
  primaryMuted: 'rgba(59, 130, 246, 0.08)',

  /* Accent */
  accent: '#8B5CF6',
  accentLight: '#A78BFA',
  accentGlow: 'rgba(139, 92, 246, 0.15)',

  /* Gradients (as stop arrays for LinearGradient) */
  gradients: {
    primary: ['#3B82F6', '#1D4ED8'] as [string, string],
    accent: ['#8B5CF6', '#3B82F6'] as [string, string],
    success: ['#10B981', '#059669'] as [string, string],
    warning: ['#F59E0B', '#D97706'] as [string, string],
    danger: ['#EF4444', '#DC2626'] as [string, string],
    dark: ['#1F2937', '#111827'] as [string, string],
  },

  dark: {
    background: '#070B14',
    surface: '#0F1521',
    surfaceElevated: '#192236',
    surfaceHighlight: '#1E2B42',
    border: '#253047',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#475569',
    tabBar: '#0D1220',
    tabBarBorder: '#192236',
    overlay: 'rgba(0, 0, 0, 0.75)',
    mapStyle: [] as any[],
    card: '#131C2E',
    cardBorder: '#1E2D44',
    shimmer: '#1A2540',
  },

  light: {
    background: '#F0F4FF',
    surface: '#FFFFFF',
    surfaceElevated: '#F8FAFF',
    surfaceHighlight: '#EEF2FF',
    border: '#E2E8F0',
    borderSubtle: 'rgba(0, 0, 0, 0.05)',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    overlay: 'rgba(0, 0, 0, 0.45)',
    mapStyle: [] as any[],
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    shimmer: '#E8EDF5',
  },

  price: {
    cheap: '#10B981',
    cheapBg: 'rgba(16, 185, 129, 0.12)',
    cheapBorder: 'rgba(16, 185, 129, 0.3)',
    medium: '#F59E0B',
    mediumBg: 'rgba(245, 158, 11, 0.12)',
    mediumBorder: 'rgba(245, 158, 11, 0.3)',
    expensive: '#EF4444',
    expensiveBg: 'rgba(239, 68, 68, 0.12)',
    expensiveBorder: 'rgba(239, 68, 68, 0.3)',
    unknown: '#64748B',
    unknownBg: 'rgba(100, 116, 139, 0.12)',
    unknownBorder: 'rgba(100, 116, 139, 0.3)',
  },

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
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
