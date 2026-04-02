import axios from 'axios';
import { TOMTOM_API_KEY, assertApiKey } from './apiKey';
import type {
  RouteInfo,
  TomTomRouteResponse,
} from '../types/routing';

const BASE_ROUTING = 'https://api.tomtom.com/routing/1';

/**
 * Calculate a driving route between origin and destination.
 * Uses the TomTom Routing API v1.
 */
export async function calculateRoute(
  originLat: number,
  originLon: number,
  destLat: number,
  destLon: number,
): Promise<RouteInfo | null> {
  if (!assertApiKey()) return null;

  try {
    const locations = `${originLat},${originLon}:${destLat},${destLon}`;
    const url = `${BASE_ROUTING}/calculateRoute/${locations}/json`;

    const { data } = await axios.get<TomTomRouteResponse>(url, {
      params: {
        key: TOMTOM_API_KEY,
        travelMode: 'car',
        traffic: 'true',
        routeType: 'fastest',
        language: 'en-US',
      },
    });

    const route = data.routes?.[0];
    if (!route) return null;

    const { summary } = route;
    const points = route.legs?.flatMap((leg) =>
      leg.points.map((p) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    ) ?? [];

    return {
      distanceMeters: summary.lengthInMeters,
      travelTimeSeconds: summary.travelTimeInSeconds,
      trafficDelaySeconds: summary.trafficDelayInSeconds,
      departureTime: summary.departureTime,
      arrivalTime: summary.arrivalTime,
      points,
    };
  } catch (e) {
    console.warn('[TomTom Routing]', e);
    return null;
  }
}

/**
 * Format travel time from seconds into a human-readable string.
 */
export function formatTravelTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

/**
 * Format distance from meters into a human-readable string.
 */
export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
