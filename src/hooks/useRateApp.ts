import { useEffect } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const RATE_APP_TIMESTMP_KEY = '@rate_app_timestamp';
const HAS_RATED_KEY = '@rate_app_has_rated';

const APPLE_ID = '6761396394';
const ANDROID_PACKAGE_NAME = 'com.fuel.price.global'; 

export const useRateApp = () => {
  useEffect(() => {
    const checkRateApp = async () => {
      try {
        const hasRated = await AsyncStorage.getItem(HAS_RATED_KEY);
        if (hasRated === 'true') {
          return;
        }

        const firstOpenTimestamp = await AsyncStorage.getItem(RATE_APP_TIMESTMP_KEY);
        const now = Date.now();

        if (!firstOpenTimestamp) {
          // Store first open time (initialize)
          await AsyncStorage.setItem(RATE_APP_TIMESTMP_KEY, now.toString());
          return;
        }

        const daysSinceFirstOpen = (now - parseInt(firstOpenTimestamp, 10)) / (1000 * 60 * 60 * 24);

        if (daysSinceFirstOpen >= 2) {
          showRateDialog();
        }
      } catch (e) {
        console.warn('Error checking rate app status', e);
      }
    };

    // To prevent it running immediately before UI is ready, slight delay
    const timeoutId = setTimeout(() => {
      checkRateApp();
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, []);

  const showRateDialog = () => {
    // Avoid showing alerts on web
    if (Platform.OS === 'web') return;
    
    Alert.alert(
      'Enjoying FuelFind?',
      'Would you mind taking a moment to rate it? It won\'t take more than a minute. Thanks for your support!',
      [
        {
          text: 'Remind Me Later',
          style: 'cancel',
          onPress: async () => {
             // If we want to restart the 2-day timer
             await AsyncStorage.setItem(RATE_APP_TIMESTMP_KEY, Date.now().toString());
          }
        },
        {
          text: 'Rate Now',
          onPress: async () => {
             await AsyncStorage.setItem(HAS_RATED_KEY, 'true');
             handleRateApp();
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleRateApp = async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
      } else {
        openAppStore();
      }
    } catch (e) {
      openAppStore();
    }
  };

  const openAppStore = () => {
    let url = '';
    if (Platform.OS === 'ios') {
      url = `itms-apps://apps.apple.com/app/id${APPLE_ID}?action=write-review`;
      Linking.canOpenURL(url).then((supported) => {
        if (!supported) {
          url = `https://apps.apple.com/app/id${APPLE_ID}?action=write-review`;
        }
        Linking.openURL(url);
      });
    } else if (Platform.OS === 'android') {
      url = `market://details?id=${ANDROID_PACKAGE_NAME}`;
      Linking.canOpenURL(url).then((supported) => {
         if (!supported) {
           url = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}`;
         }
         Linking.openURL(url);
      });
    }
  };
};
