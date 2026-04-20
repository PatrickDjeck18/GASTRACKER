import './global.css';
import React, { useEffect, useMemo } from 'react';
import { useColorScheme, View, StyleSheet, StatusBar, Platform, LogBox } from 'react-native';

// Suppress benign Expo background errors in development
LogBox.ignoreLogs([
  "Call to function 'ExpoKeepAwake.activate' has been rejected",
  "The current activity is no longer available",
]);

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { initAdMob } from './src/utils/admobInit';
import { RootNavigator } from './src/navigation/RootNavigator';
import './src/i18n/index';
import { useAppStore } from './src/store/useAppStore';
import { useRateApp } from './src/hooks/useRateApp';
import { useNotifications } from './src/hooks/useNotifications';
import { useInterstitialAd } from './src/hooks/useInterstitialAd';
import { Colors } from './src/constants/theme';

// Enable gesture handler web support
if (Platform.OS === 'web') {
  // @ts-ignore
  window.__gestureHandlerWebEnabled = true;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 2 * 60 * 1000,
    },
  },
});

function PaperWithTheme({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const mode = useAppStore((s) => s.darkMode);
  const dark = mode === 'dark' || (mode === 'system' && scheme === 'dark');

  const theme = useMemo(
    () => ({
      ...(dark ? MD3DarkTheme : MD3LightTheme),
      colors: {
        ...(dark ? MD3DarkTheme : MD3LightTheme).colors,
        primary: Colors.primary,
        primaryContainer: Colors.primaryGlow,
        secondary: Colors.primaryLight,
      },
    }),
    [dark],
  );

  const settings = useMemo(
    () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      icon: (props: any) => <MaterialCommunityIcons {...props} />,
    }),
    [],
  );

  return (
    <PaperProvider theme={theme} settings={settings}>
      <StatusBar
        barStyle={dark ? 'light-content' : 'dark-content'}
        backgroundColor={dark ? Colors.dark.background : Colors.light.background}
        translucent={Platform.OS === 'android'}
      />
      {children}
    </PaperProvider>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  useRateApp();
  useNotifications();
  useInterstitialAd();
  
  useEffect(() => {
    void initAdMob();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.flex}>
        <QueryClientProvider client={queryClient}>
          <PaperWithTheme>
            <View style={styles.flex}>
              <RootNavigator />
            </View>
          </PaperWithTheme>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
