import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from '../navigation/navigationRef';
import { useAppStore } from '../store/useAppStore';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useNotifications = () => {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const setupNotifications = async () => {
      try {
        const hasPermission = await requestPermissions();
        if (hasPermission) {
          await scheduleDailyNotification();
        }
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    setupNotifications();

    const handleNotificationTap = (response: Notifications.NotificationResponse) => {
      const data = (response.notification.request.content.data || {}) as Record<string, unknown>;
      const type = String(data.type || '');
      const screen = String(data.screen || '');

      if (type === 'weekly_savings') {
        navigate('SavingsTab');
        return;
      }

      if (type === 'cheap_fuel') {
        const stationName = String(data.stationName || '').trim().toLowerCase();
        if (stationName) {
          const { stations, setSelectedStation } = useAppStore.getState();
          const match = stations.find((s) => {
            const a = (s.brand ?? '').trim().toLowerCase();
            const b = s.name.trim().toLowerCase();
            return a === stationName || b === stationName;
          });
          if (match) setSelectedStation(match.id);
        }
        navigate('HomeTab');
        return;
      }

      if (screen === 'Map') {
        navigate('HomeTab');
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationTap);
    Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (last) handleNotificationTap(last);
      })
      .catch(() => {});

    return () => {
      subscription.remove();
    };
  }, []);
};

async function requestPermissions() {

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return true;
}

const NOTIFICATIONS_SCHEDULED_KEY = '@notifications_scheduled';

async function scheduleDailyNotification() {
  // Cancel all previously scheduled notifications to prevent duplicates or immediate fires
  // from old configurations when the app opens.
  await Notifications.cancelAllScheduledNotificationsAsync();

  try {
    // Morning notification at 8:00 AM
    await Notifications.scheduleNotificationAsync({
      identifier: 'morning-fuel-check',
      content: {
        title: 'Time for a Fuel Check? ⛽',
        body: 'Good morning! Check the latest fuel prices near you and save on your next trip.',
        data: { screen: 'Map' },
        sound: true,
      },
      trigger: {
        channelId: 'default',
        hour: 8,
        minute: 0,
        repeats: true,
      } as any,
    });
  } catch (error) {
    console.warn('[Notifications] Failed to schedule morning notification:', error);
  }

  try {
    // Evening notification at 8:00 PM (20:00)
    await Notifications.scheduleNotificationAsync({
      identifier: 'evening-fuel-check',
      content: {
        title: 'Evening Fuel Price Update ⛽',
        body: 'Check fuel prices before your evening commute or plans tomorrow.',
        data: { screen: 'Map' },
        sound: true,
      },
      trigger: {
        channelId: 'default',
        hour: 20,
        minute: 0,
        repeats: true,
      } as any,
    });
  } catch (error) {
    console.warn('[Notifications] Failed to schedule evening notification:', error);
  }

  // Mark as scheduled in persistent storage
  await AsyncStorage.setItem(NOTIFICATIONS_SCHEDULED_KEY, 'true');
}

