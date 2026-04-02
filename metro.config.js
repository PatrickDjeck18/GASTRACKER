const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add web support with proper resolution
config.resolver.sourceExts = process.env.RN_SRC_EXT
    ? process.env.RN_SRC_EXT.split(',').concat(config.resolver.sourceExts)
    : config.resolver.sourceExts;

// Enable .web.js and .web.tsx extensions for web
if (process.env.RN_PLATFORM === 'web') {
    config.resolver.sourceExts = ['web.js', 'web.ts', 'web.tsx', ...config.resolver.sourceExts];
}

const path = require('node:path');

// Add module alias for vector icons
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-vector-icons': path.resolve(__dirname, 'node_modules/@expo/vector-icons'),
};

module.exports = withNativeWind(config, { input: "./global.css" });