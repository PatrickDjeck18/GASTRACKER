import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useIsDark } from '../hooks/useIsDark';

// Ad unit IDs
const AD_UNIT_ID = Platform.select({
    android: 'ca-app-pub-4253750298784159/3527300162',
    ios: 'ca-app-pub-4253750298784159/1112889817',
});

interface AdBannerProps {
    style?: any;
}

export function AdBanner({ style }: AdBannerProps) {
    const isDark = useIsDark();
    const [adError, setAdError] = useState(false);

    // Don't show ads on web
    if (Platform.OS === 'web') {
        return <View style={style} />;
    }

    return (
        <View style={[styles.container, style]}>
            {!adError && (
                <BannerAd
                    unitId={AD_UNIT_ID!}
                    size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                    onAdFailedToLoad={(error) => {
                        console.warn('[AdBanner] Failed to load ad:', error);
                        setAdError(true);
                    }}
                    onAdLoaded={() => {
                        console.debug('[AdBanner] Ad loaded successfully');
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        minHeight: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
});