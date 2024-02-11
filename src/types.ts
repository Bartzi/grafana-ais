import L from "leaflet";

export interface AISPanelOptions {
  centerLatitude: number;
  centerLongitude: number;
  receiverLatitude: number;
  receiverLongitude: number;
  zoom: number;
  strokeWidth: number;
}

export interface ShipLocation {
  shipName: string;
  latlngs: L.LatLngExpression[][];
}

export interface ShipInfo {
  name: string;
  time: number;
  course: number;
  heading: number;
  lat?: number;
  lon?: number;
}