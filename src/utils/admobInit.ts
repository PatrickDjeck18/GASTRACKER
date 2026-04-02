import mobileAds from 'react-native-google-mobile-ads';

export const initAdMob = async () => {
    try {
        await mobileAds().initialize();
    } catch (e) {
        if (__DEV__) console.warn('AdMob init failed', e);
    }
};
