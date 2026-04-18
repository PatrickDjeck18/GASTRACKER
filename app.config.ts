import 'dotenv/config';
import type { ExpoConfig, ConfigContext } from 'expo/config';
import { withStringsXml } from 'expo/config-plugins';

const withDefaultCFBundleDisplayName = (config: ExpoConfig) => {
    return withStringsXml(config, (config) => {
        config.modResults.resources.string = config.modResults.resources.string || [];
        config.modResults.resources.string.push({
            $: { name: 'CFBundleDisplayName' },
            _: config.name || 'Cheap Fuel',
        });
        return config;
    });
};

const defineConfig = ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: config.name || 'Cheap Fuel Price Global',
    owner: 'goodtech18',
    slug: config.slug || 'cheap-fuel-global',

    version: config.version || '1.0.10',
    orientation: config.orientation || 'portrait',
    icon: config.icon || './assets/icon.png',
    userInterfaceStyle: config.userInterfaceStyle || 'automatic',
    scheme: 'fuelpricenew',
    splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#0d47a1',
    },
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'cheap.fuel.price.global',
        buildNumber: config.ios?.buildNumber || '12',
        infoPlist: {
            ITSAppUsesNonExemptEncryption: false,
            NSLocationWhenInUseUsageDescription:
                'Fuel Price New uses your location to show nearby fuel stations and find the lowest prices. Location is not stored on our servers.',
            LSApplicationQueriesSchemes: ['tomtomgo', 'com.tomtom.app', 'waze', 'comgooglemaps', 'maps', 'map'],
            SKAdNetworkItems: [
                { SKAdNetworkIdentifier: 'cstr6suwn9.skadnetwork' }, // Google
                { SKAdNetworkIdentifier: 'v9wttpbfk9.skadnetwork' },
                { SKAdNetworkIdentifier: 'n38lu8286q.skadnetwork' },
                { SKAdNetworkIdentifier: 'p78adc93ut.skadnetwork' },
                { SKAdNetworkIdentifier: '4fzdc2evr5.skadnetwork' },
                { SKAdNetworkIdentifier: '4pfyvq9l8r.skadnetwork' },
                { SKAdNetworkIdentifier: 'yclnxrl5pm.skadnetwork' },
                { SKAdNetworkIdentifier: 'tl55sbb4fm.skadnetwork' },
                { SKAdNetworkIdentifier: 'mlmmfzh3r3.skadnetwork' },
                { SKAdNetworkIdentifier: 'klf5c3l5u5.skadnetwork' },
                { SKAdNetworkIdentifier: 'hs6bdukanm.skadnetwork' },
                { SKAdNetworkIdentifier: '9rd848q77k.skadnetwork' },
            ],
        },
    },
    android: {
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#0d47a1',
        },
        package: 'com.fuel.price.global',
        versionCode: config.android?.versionCode || 13,
        permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'POST_NOTIFICATIONS'],
    },
    web: {
        favicon: './assets/favicon.png',
        bundler: 'metro',
    },
    locales: {
        en: './app-locales/en.json',
        es: './app-locales/es.json',
        fr: './app-locales/fr.json',
        de: './app-locales/de.json',
    },
    plugins: [
        ...(config.plugins || []),
        [
            'react-native-google-mobile-ads',
            {
                androidAppId: process.env.ANDROID_ADMOB_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713',
                iosAppId: process.env.IOS_ADMOB_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511',
            },
        ],
        [
            'expo-notifications',
            {
                color: '#0d47a1',
            },
        ],
    ],
    extra: {
        ...(config.extra || {}),
        // TomTom map SDK/static tiles still require a client key for map rendering.
        tomtomApiKey: process.env.TOMTOM_MAPS_PUBLIC_KEY ?? config.extra?.tomtomApiKey ?? '',
        firebaseApiKey: process.env.FIREBASE_API_KEY ?? config.extra?.firebaseApiKey ?? '',
        firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN ?? config.extra?.firebaseAuthDomain ?? '',
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? config.extra?.firebaseProjectId ?? '',
        firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? config.extra?.firebaseStorageBucket ?? '',
        firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? config.extra?.firebaseMessagingSenderId ?? '',
        firebaseAppId: process.env.FIREBASE_APP_ID ?? config.extra?.firebaseAppId ?? '',
        firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID ?? config.extra?.firebaseMeasurementId ?? '',
        firebaseFunctionsBaseUrl: process.env.FIREBASE_FUNCTIONS_BASE_URL ?? config.extra?.firebaseFunctionsBaseUrl ?? '',
        firebaseFunctionsRequireAuth: process.env.FIREBASE_FUNCTIONS_REQUIRE_AUTH ?? config.extra?.firebaseFunctionsRequireAuth ?? 'false',
    },
});

export default (context: ConfigContext) => {
    const config = defineConfig(context);
    return withDefaultCFBundleDisplayName(config);
};