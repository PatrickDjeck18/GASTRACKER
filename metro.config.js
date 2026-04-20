const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// ─── ESM / import.meta fix ────────────────────────────────────────────────────
// Firebase v12 and @google/generative-ai use import.meta (ESM-only syntax).
// Enabling package exports + preferring CJS-compatible conditions makes Metro
// pick the CommonJS/browser build instead of the raw ESM entry point.
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  'require',      // prefer CJS builds
  'default',
  'react-native', // RN-specific overrides first
  'browser',      // Firebase's browser build avoids Node-only code
];

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