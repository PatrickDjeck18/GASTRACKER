import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  // Check if we've already scheduled notifications (persistent flag)
  const alreadyScheduledFlag = await AsyncStorage.getItem(NOTIFICATIONS_SCHEDULED_KEY);
  if (alreadyScheduledFlag === 'true') {
    return; // Notifications already scheduled, don't schedule again
  }

  // Check if already scheduled to avoid duplicates
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  // Morning notification at 8:00 AM
  const morningScheduled = scheduled.some(
    (notification) => notification.identifier === 'morning-fuel-check'
  );

  if (!morningScheduled) {
    try {
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
      // Don't re-throw - this is expected when app is in background/closed
    }
  }

  // Evening notification at 6:00 PM (18:00)
  const eveningScheduled = scheduled.some(
    (notification) => notification.identifier === 'evening-fuel-check'
  );

  if (!eveningScheduled) {
    try {
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
          hour: 18,
          minute: 0,
          repeats: true,
        } as any,
      });
    } catch (error) {
      console.warn('[Notifications] Failed to schedule evening notification:', error);
      // Don't re-throw - this is expected when app is in background/closed
    }
  }

  // Mark as scheduled in persistent storage
  await AsyncStorage.setItem(NOTIFICATIONS_SCHEDULED_KEY, 'true');
}

