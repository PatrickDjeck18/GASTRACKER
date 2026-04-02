import React from 'react';
import { View } from 'react-native';

/**
 * Mock AdBanner for Web since react-native-google-mobile-ads doesn't support web.
 */
export function AdBanner({ style }: any) {
  return <View style={style} />;
}
