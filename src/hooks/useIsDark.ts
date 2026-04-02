import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';

/**
 * Resolved boolean indicating whether dark mode is active,
 * taking into account the user preference stored in Zustand.
 */
export function useIsDark(): boolean {
  const scheme = useColorScheme();
  const mode = useAppStore((s) => s.darkMode);
  return mode === 'dark' || (mode === 'system' && scheme === 'dark');
}
