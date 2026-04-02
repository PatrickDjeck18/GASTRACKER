import React from 'react';
import { Image, View, StyleSheet, ActivityIndicator } from 'react-native';
import { getStaticMapUrl } from '../api/mapDisplay';
import { useIsDark } from '../hooks/useIsDark';
import { Radii, Spacing } from '../constants/theme';

interface Props {
  latitude: number;
  longitude: number;
  width?: number;
  height?: number;
  zoom?: number;
}

/**
 * Static map image preview using TomTom Map Display API.
 */
export function StaticMapPreview({
  latitude,
  longitude,
  width = 400,
  height = 180,
  zoom = 15,
}: Props) {
  const isDark = useIsDark();
  const [loaded, setLoaded] = React.useState(false);

  const uri = getStaticMapUrl(latitude, longitude, {
    zoom,
    width: Math.round(width * 2), // 2x for retina
    height: Math.round(height * 2),
    style: isDark ? 'night' : 'main',
    layer: 'basic',
    format: 'png',
  });

  return (
    <View
      style={[
        styles.container,
        { width: '100%', height },
      ]}
    >
      {!loaded && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
      <Image
        source={{ uri }}
        style={[styles.image, { height }]}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
      />
      {/* Pin overlay */}
      <View style={styles.pinOverlay}>
        <View style={styles.pin}>
          <View style={styles.pinHead} />
          <View style={styles.pinPoint} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    backgroundColor: '#1a1a2e',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
  },
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pin: {
    alignItems: 'center',
    marginTop: -12,
  },
  pinHead: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#EF4444',
    marginTop: -1,
  },
});
