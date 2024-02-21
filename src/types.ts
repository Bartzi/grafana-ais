import L from "leaflet";

export interface AISPanelOptions {
  centerLatitude: number;
  centerLongitude: number;
  receiverLatitude: number;
  receiverLongitude: number;
  zoom: number;
  strokeWidth: number;
  timeUntilSignalStale: number;
  timeUntilSignalLost: number;
}

export interface ShipLocation {
  shipName: string;
  mmsi: string;
  latlngs: L.LatLngExpression[][];
}

export interface ShipInfo {
  name: string;
  mmsi: string;
  time: number;
  course: number;
  heading: number;
  lat?: number;
  lon?: number;
}

export interface SignalMarkTimes {
  timeUntilStale: number;
  timeUntilLost: number;
}