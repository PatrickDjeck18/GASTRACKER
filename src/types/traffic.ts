/* ── TomTom Traffic API types ─────────────────────── */

export type TrafficLevel = 'freeFlow' | 'moderate' | 'heavy' | 'standstill' | 'unknown';

export interface TrafficFlowInfo {
  currentSpeed: number;       // km/h
  freeFlowSpeed: number;      // km/h
  currentTravelTime: number;  // seconds
  freeFlowTravelTime: number; // seconds
  confidence: number;         // 0–1
  level: TrafficLevel;
  roadName?: string;
}

export interface TomTomFlowSegmentResponse {
  flowSegmentData: {
    frc: string;
    currentSpeed: number;
    freeFlowSpeed: number;
    currentTravelTime: number;
    freeFlowTravelTime: number;
    confidence: number;
    coordinates: {
      coordinate: Array<{ latitude: number; longitude: number }>;
    };
    '@version': string;
  };
}

/* ── Traffic Incidents ───────────────────────────── */

export type IncidentSeverity = 'unknown' | 'minor' | 'moderate' | 'major' | 'undefined';

export interface TrafficIncident {
  id: string;
  type: string;               // ACCIDENT, ROAD_WORK, etc.
  severity: IncidentSeverity;
  description: string;
  from: string;
  to: string;
  delay: number;               // seconds of delay
  coordinates: { latitude: number; longitude: number };
  startTime?: string;
  endTime?: string;
  roadNumber?: string;
}

export interface TomTomIncidentResult {
  id: string;
  type: string;
  properties: {
    iconCategory: number;
    magnitudeOfDelay: number;
    events: Array<{
      description: string;
      code: number;
    }>;
    startTime: string;
    endTime: string;
    from: string;
    to: string;
    delay: number;
    roadNumbers?: string[];
  };
  geometry: {
    type: string;
    coordinates: number[][];
  };
}

export interface TomTomIncidentResponse {
  incidents: TomTomIncidentResult[];
}
