import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { useIsDark } from '../hooks/useIsDark';
import { Colors, Radii } from '../constants/theme';
import { AdBanner } from '../components/AdBanner';
import { navigationRef } from './navigationRef';

import DashboardScreen from '../screens/DashboardScreen';
import StationListScreen from '../screens/StationListScreen';
import GasPricesScreen from '../screens/GasPricesScreen';
import SavingsScreen from '../screens/SavingsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import StationDetailScreen from '../screens/StationDetailScreen';
import InAppNavigationScreen from '../screens/InAppNavigationScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={DashboardScreen} />
      <Stack.Screen name="StationDetail" component={StationDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="InAppNavigation" component={InAppNavigationScreen} options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
    </Stack.Navigator>
  );
}

function ListStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ListHome" component={StationListScreen} />
      <Stack.Screen name="StationDetail" component={StationDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="InAppNavigation" component={InAppNavigationScreen} options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function RootNavigator() {
  const isDark = useIsDark();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const navTheme: Theme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme : DefaultTheme).colors,
        primary: Colors.primary,
        background: isDark ? Colors.dark.background : Colors.light.background,
        card: isDark ? Colors.dark.tabBar : Colors.light.tabBar,
        text: isDark ? Colors.dark.text : Colors.light.text,
        border: isDark ? Colors.dark.tabBarBorder : Colors.light.tabBarBorder,
      },
    }),
    [isDark],
  );

  return (
    <View style={{ flex: 1, backgroundColor: navTheme.colors.background }}>
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
            tabBarStyle: {
              backgroundColor: isDark ? Colors.dark.tabBar : Colors.light.tabBar,
              borderTopColor: isDark ? Colors.dark.tabBarBorder : Colors.light.tabBarBorder,
              borderTopWidth: 1,
              paddingBottom: Platform.OS === 'ios' ? 0 : 10,
              paddingTop: 10,
              height: Platform.OS === 'ios' ? 80 : 66,
              elevation: 20,
              shadowColor: Colors.primary,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
            },
            tabBarLabelStyle: {
              fontSize: 10,
              fontWeight: '700',
              marginTop: 2,
              letterSpacing: 0.2,
              marginBottom: Platform.OS === 'ios' ? 0 : 2,
            },
            tabBarItemStyle: { padding: 2 },
          }}
        >
          <Tab.Screen
            name="HomeTab"
            component={HomeStack}
            options={{
              title: t('tabs.home') || 'Home',
              tabBarIcon: ({ color, size, focused }) => (
                <View style={focused ? styles.activeIconWrap : undefined}>
                  <MaterialCommunityIcons name={focused ? 'home-variant' : 'home-variant-outline'} color={color} size={size + 2} />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="ListTab"
            component={ListStack}
            options={{
              title: t('tabs.list'),
              tabBarIcon: ({ color, size, focused }) => (
                <View style={focused ? styles.activeIconWrap : undefined}>
                  <MaterialCommunityIcons name="format-list-bulleted" color={color} size={size + 2} />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="PricesTab"
            component={GasPricesScreen}
            options={{
              title: t('tabs.prices'),
              tabBarIcon: ({ color, size, focused }) => (
                <View style={focused ? styles.activeIconWrap : undefined}>
                  <MaterialCommunityIcons name={focused ? 'chart-line' : 'chart-line-variant'} color={color} size={size + 2} />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="SavingsTab"
            component={SavingsScreen}
            options={{
              title: t('tabs.savings'),
              tabBarIcon: ({ color, size, focused }) => (
                <View style={focused ? styles.activeIconWrap : undefined}>
                  <MaterialCommunityIcons name={focused ? 'piggy-bank' : 'piggy-bank-outline'} color={color} size={size + 2} />
                </View>
              ),
            }}
          />
          <Tab.Screen
            name="SettingsTab"
            component={SettingsStack}
            options={{
              title: t('tabs.settings'),
              tabBarIcon: ({ color, size, focused }) => (
                <View style={focused ? styles.activeIconWrap : undefined}>
                  <MaterialCommunityIcons name={focused ? 'cog' : 'cog-outline'} color={color} size={size + 2} />
                </View>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <View style={{ paddingBottom: insets.bottom }}>
        <AdBanner
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: isDark ? Colors.dark.tabBarBorder : Colors.light.tabBarBorder,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: Colors.primaryMuted,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
});