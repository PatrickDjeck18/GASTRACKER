// Web entry point with polyfills
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { registerRootComponent } from 'expo';
import App from './App';

// Register the app
registerRootComponent(App);