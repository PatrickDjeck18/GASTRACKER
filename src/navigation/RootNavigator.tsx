import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { useIsDark } from '../hooks/useIsDark';
import { Colors, Radii } from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import StationListScreen from '../screens/StationListScreen';
import SavingsScreen from '../screens/SavingsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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

  const bottomPadding = Math.max(insets.bottom, 8); // Minimum padding for aesthetics

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerTitle: t('app.title'),
          headerTitleStyle: styles.headerTitle,
          headerStyle: {
            backgroundColor: isDark ? Colors.dark.surfaceElevated : Colors.light.surfaceElevated,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? Colors.dark.border : Colors.light.border,
          },
          headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: isDark ? Colors.dark.textMuted : Colors.light.textMuted,
          tabBarStyle: {
            backgroundColor: isDark ? Colors.dark.tabBar : Colors.light.tabBar,
            borderTopColor: isDark ? Colors.dark.tabBarBorder : Colors.light.tabBarBorder,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : insets.bottom + 10,
            paddingTop: 10,
            height: 65 + insets.bottom,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
            marginBottom: Platform.OS === 'ios' ? 0 : 4,
          },
          tabBarItemStyle: {
            padding: 4,
          },
        }}
      >
        <Tab.Screen
          name="MapTab"
          component={HomeScreen}
          options={{
            title: t('tabs.map'),
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="map-marker-radius" color={color} size={size + 2} />
            ),
          }}
        />
        <Tab.Screen
          name="ListTab"
          component={StationListScreen}
          options={{
            title: t('tabs.list'),
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="format-list-bulleted" color={color} size={size + 2} />
            ),
          }}
        />
        <Tab.Screen
          name="SavingsTab"
          component={SavingsScreen}
          options={{
            title: t('tabs.savings'),
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="piggy-bank-outline" color={color} size={size + 2} />
            ),
          }}
        />
        <Tab.Screen
          name="SettingsTab"
          component={SettingsStack}
          options={{
            title: t('tabs.settings'),
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog-outline" color={color} size={size + 2} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.3,
  },
});