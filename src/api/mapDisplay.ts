import { TOMTOM_API_KEY } from './apiKey';

/**
 * Build a TomTom Static Map image URL for a given location.
 *
 * Map Display API — Static Image endpoint
 * https://api.tomtom.com/map/1/staticimage
 */
export function getStaticMapUrl(
  lat: number,
  lon: number,
  options: {
    zoom?: number;
    width?: number;
    height?: number;
    style?: 'main' | 'night';
    layer?: 'basic' | 'hybrid' | 'labels';
    format?: 'png' | 'jpg';
  } = {},
): string {
  const {
    zoom = 15,
    width = 400,
    height = 200,
    style = 'main',
    layer = 'basic',
    format = 'png',
  } = options;

  return (
    `https://api.tomtom.com/map/1/staticimage?` +
    `key=${TOMTOM_API_KEY}` +
    `&center=${lon},${lat}` +
    `&zoom=${zoom}` +
    `&width=${width}` +
    `&height=${height}` +
    `&layer=${layer}` +
    `&style=${style}` +
    `&format=${format}`
  );
}

/**
 * Build TomTom Map Tile URL for use with tile overlays.
 */
export function getMapTileUrl(
  layer: string = 'basic',
  style: string = 'main',
): string {
  return (
    `https://api.tomtom.com/map/1/tile/${layer}/${style}/` +
    `{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`
  );
}
