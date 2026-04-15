import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { TOMTOM_API_KEY } from '../api/apiKey';
import { formatPrice, tierColor } from '../utils/price';
import type { Station } from '../types/station';
import type { PriceTier } from '../utils/price';

/* 
 * We need to load TomTom Maps SDK via CDN on the web.
 * This component will handle script injection and map initialization.
 */

interface Props {
  stations: Station[];
  allPrices: number[];
  fuelFilter: string;
  localCurrency?: string;
  onSelectStation: (id: string) => void;
  selectedStationId?: string | null;
  isDark: boolean;
  userCoords?: { latitude: number; longitude: number } | null;
  autoCenter?: boolean;
}

declare global {
  interface Window {
    tt: any;
  }
}

const TT_MAPS_JS = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps-web.min.js';
const TT_MAPS_CSS = 'https://api.tomtom.com/maps-sdk-for-web/cdn/6.x/6.25.0/maps/maps.css';

export function TomTomMap({
  stations,
  allPrices,
  fuelFilter,
  localCurrency = 'USD',
  onSelectStation,
  selectedStationId,
  isDark,
  userCoords,
  autoCenter = true,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [mapReady, setMapReady] = React.useState(false);

  // Helper to inject scripts
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const loadScript = async () => {
      if (window.tt) return;

      // Add CSS
      if (!document.getElementById('tomtom-css')) {
        const link = document.createElement('link');
        link.id = 'tomtom-css';
        link.rel = 'stylesheet';
        link.href = TT_MAPS_CSS;
        document.head.appendChild(link);
      }

      // Add JS
      if (!document.getElementById('tomtom-js')) {
        const script = document.createElement('script');
        script.id = 'tomtom-js';
        script.src = TT_MAPS_JS;
        script.async = true;
        
        const promise = new Promise((resolve) => {
          script.onload = resolve;
        });
        document.head.appendChild(script);
        await promise;
      }
    };

    loadScript().then(() => {
      if (!mapRef.current && mapContainerRef.current && window.tt) {
        initMap();
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!window.tt || !mapContainerRef.current) return;

    const map = window.tt.map({
      key: TOMTOM_API_KEY,
      container: mapContainerRef.current,
      center: userCoords ? [userCoords.longitude, userCoords.latitude] : [0, 0],
      zoom: 12,
      style: {
        map: isDark ? 'basic_night' : 'basic_main'
      }
    });

    map.addControl(new window.tt.FullscreenControl());
    map.addControl(new window.tt.NavigationControl());

    mapRef.current = map;
    setMapReady(true);
  };

  // Update theme
  useEffect(() => {
    if (mapRef.current && window.tt) {
      // TomTom doesn't have a simple "setTheme" once initialized, 
      // usually you reset the style or use a specific layer set.
      // For simplicity, we can reload or keep it as is.
    }
  }, [isDark]);

  // Handle Markers
  useEffect(() => {
    if (!mapRef.current || !window.tt) return;

    const map = mapRef.current;
    
    // Clear old markers that are no longer in the list
    const currentStationIds = new Set(stations.map(s => s.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentStationIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Add or update markers
    stations.forEach((station) => {
      const best = station.fuelPrices.find(fp => fp.fuelType === fuelFilter) || station.fuelPrices[0];
      const price = best?.price || 0;
      
      // Determine color
      let tier: PriceTier = 'unknown';
      if (allPrices.length > 0 && price > 0) {
        const min = Math.min(...allPrices);
        const max = Math.max(...allPrices);
        const range = max - min;
        if (range === 0) tier = 'cheap';
        else {
          const ratio = (price - min) / range;
          if (ratio < 0.33) tier = 'cheap';
          else if (ratio < 0.66) tier = 'medium';
          else tier = 'expensive';
        }
      }
      const color = tierColor(tier);

      let marker = markersRef.current.get(station.id);

      if (!marker) {
        // Create custom element for marker
        const el = document.createElement('div');
        el.className = 'tt-marker';
        el.style.backgroundColor = color;
        el.style.padding = '4px 8px';
        el.style.borderRadius = '20px';
        el.style.color = 'white';
        el.style.fontWeight = '800';
        el.style.fontSize = '12px';
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.innerText = best ? formatPrice(price, localCurrency) : '⛽';
        
        el.onclick = (e) => {
          e.stopPropagation();
          onSelectStation(station.id);
        };

        marker = new window.tt.Marker({ element: el })
          .setLngLat([station.coordinates.longitude, station.coordinates.latitude])
          .addTo(map);
        
        markersRef.current.set(station.id, marker);
      } else {
        // Update existing marker element price/color if needed
        const el = marker.getElement();
        el.style.backgroundColor = color;
        el.innerText = best ? formatPrice(price, localCurrency) : '⛽';
        if (station.id === selectedStationId) {
          el.style.transform = 'scale(1.2)';
          el.style.zIndex = '1000';
        } else {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '1';
        }
      }
    });

  }, [stations, fuelFilter, allPrices, selectedStationId, mapReady, localCurrency]);

  // Recenter if userCoords change and autoCenter is on
  useEffect(() => {
    if (mapRef.current && userCoords && autoCenter) {
      mapRef.current.panTo([userCoords.longitude, userCoords.latitude]);
    }
  }, [userCoords, autoCenter]);

  return (
    <View style={styles.container}>
      <div 
        ref={mapContainerRef} 
        style={{ width: '100%', height: '100%' }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
