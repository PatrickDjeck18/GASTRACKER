import axios from 'axios';
import { TOMTOM_API_KEY } from './apiKey';
import { executeFirebaseBackedApi } from './firebaseBackend';
import type {
  TrafficFlowInfo,
  TrafficLevel,
  TomTomFlowSegmentResponse,
  TrafficIncident,
  IncidentSeverity,
} from '../types/traffic';

/* ─────────────────────────────────────────────────────
   1. Traffic Flow — real-time speed for a road segment
   ───────────────────────────────────────────────────── */

export async function getTrafficFlow(
  lat: number,
  lon: number,
  zoom: number = 15,
): Promise<TrafficFlowInfo | null> {
  try {
    return await executeFirebaseBackedApi<TrafficFlowInfo | null>({
      service: 'tomtom/traffic-flow',
      request: { lat, lon, zoom },
      cacheTtlMs: 60 * 1000,
      execute: async () => {
        const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/${zoom}/json`;
        const { data } = await axios.get<TomTomFlowSegmentResponse>(url, {
          params: {
            key: TOMTOM_API_KEY,
            point: `${lat},${lon}`,
            unit: 'KMPH',
          },
        });

        const s = data.flowSegmentData;
        const ratio = s.freeFlowSpeed > 0 ? s.currentSpeed / s.freeFlowSpeed : 1;

        let level: TrafficLevel = 'unknown';
        if (ratio >= 0.85) level = 'freeFlow';
        else if (ratio >= 0.55) level = 'moderate';
        else if (ratio >= 0.25) level = 'heavy';
        else level = 'standstill';

        return {
          currentSpeed: s.currentSpeed,
          freeFlowSpeed: s.freeFlowSpeed,
          currentTravelTime: s.currentTravelTime,
          freeFlowTravelTime: s.freeFlowTravelTime,
          confidence: s.confidence,
          level,
        };
      },
    });
  } catch {
    return null;
  }
}

/** Colour for traffic level */
export function trafficColor(level: TrafficLevel): string {
  switch (level) {
    case 'freeFlow':
      return '#10B981';
    case 'moderate':
      return '#F59E0B';
    case 'heavy':
      return '#EF4444';
    case 'standstill':
      return '#7C2D12';
    default:
      return '#6B7280';
  }
}

/** Human-readable traffic label */
export function trafficLabel(level: TrafficLevel): string {
  switch (level) {
    case 'freeFlow':
      return 'Free Flow';
    case 'moderate':
      return 'Moderate';
    case 'heavy':
      return 'Heavy';
    case 'standstill':
      return 'Standstill';
    default:
      return 'Unknown';
  }
}

/* ─────────────────────────────────────────────────────
   2. Traffic Incidents — nearby incidents
   ───────────────────────────────────────────────────── */

export async function getTrafficIncidents(
  lat: number,
  lon: number,
  radiusKm: number = 5,
): Promise<TrafficIncident[]> {
  try {
    return await executeFirebaseBackedApi<TrafficIncident[]>({
      service: 'tomtom/traffic-incidents',
      request: { lat, lon, radiusKm },
      cacheTtlMs: 2 * 60 * 1000,
      execute: async () => {
        const delta = radiusKm / 111;
        const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
        const url = `https://api.tomtom.com/traffic/services/5/incidentDetails`;
        const { data } = await axios.get<any>(url, {
          params: {
            key: TOMTOM_API_KEY,
            bbox,
            language: 'en-US',
            categoryFilter: '0,1,2,3,4,5,6,7,8,9,10,11,14',
            timeValidityFilter: 'present',
            fields:
              '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,delay,roadNumbers}}}',
          },
        });

        const raw = data?.incidents ?? [];

        return raw.slice(0, 10).map((inc: any): TrafficIncident => {
          const props = inc.properties ?? {};
          const coords = inc.geometry?.coordinates?.[0] ?? [0, 0];
          const magn = props.magnitudeOfDelay ?? 0;

          let severity: IncidentSeverity = 'unknown';
          if (magn >= 3) severity = 'major';
          else if (magn >= 2) severity = 'moderate';
          else if (magn >= 1) severity = 'minor';

          return {
            id: inc.id ?? String(Math.random()),
            type: inc.type ?? 'UNKNOWN',
            severity,
            description:
              props.events?.[0]?.description ?? 'Traffic incident',
            from: props.from ?? '',
            to: props.to ?? '',
            delay: props.delay ?? 0,
            coordinates: {
              latitude: coords[1] ?? lat,
              longitude: coords[0] ?? lon,
            },
            startTime: props.startTime,
            endTime: props.endTime,
            roadNumber: props.roadNumbers?.[0],
          };
        });
      },
    });
  } catch {
    return [];
  }
}
