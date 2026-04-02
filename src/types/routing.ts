/* ── TomTom Routing API types ────────────────────── */

export interface RouteInfo {
  distanceMeters: number;
  travelTimeSeconds: number;
  trafficDelaySeconds: number;
  departureTime: string;
  arrivalTime: string;
  points: LatLng[];
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface TomTomRouteSummary {
  lengthInMeters: number;
  travelTimeInSeconds: number;
  trafficDelayInSeconds: number;
  trafficLengthInMeters: number;
  departureTime: string;
  arrivalTime: string;
}

export interface TomTomRouteLeg {
  summary: TomTomRouteSummary;
  points: Array<{ latitude: number; longitude: number }>;
}

export interface TomTomRouteResult {
  summary: TomTomRouteSummary;
  legs: TomTomRouteLeg[];
}

export interface TomTomRouteResponse {
  formatVersion: string;
  routes: TomTomRouteResult[];
}
