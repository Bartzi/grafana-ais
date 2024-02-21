import React from 'react';
import L from "leaflet";
import { DataFrame, Field, GrafanaTheme2, PanelProps } from '@grafana/data';
import { AISPanelOptions, ShipInfo, ShipLocation, SignalMarkTimes } from 'types';
import { LegendDisplayMode, VizLegend, VizLegendItem, useTheme2 } from '@grafana/ui';

import 'leaflet/dist/leaflet.css';
import { randomNumber } from 'utils/random';

import './AISPanel.css';
import { zip } from './utils';
import { MAP_TILE, createIcon, createMarker, drawDistanceCircles } from './leaflet';

interface Props extends PanelProps<AISPanelOptions> {}

const mapStyles: React.CSSProperties = {
  overflow: 'hidden',
  // width: '100%',
  // height: '97%',
};


function formatLocations(data: DataFrame[]): ShipLocation[] {
  let locations: ShipLocation[] = [];
  for (const shipData of data) {
    const latitudes = shipData.fields.find((field) => field.name === "lat")?.values.map((value) => parseFloat(value));
    const longitudes = shipData.fields.find((field) => field.name === "lon")?.values.map((value) => parseFloat(value));
    if (!latitudes || !longitudes) {
      return [];
    }
    const latLons = zip([latitudes, longitudes]);
    const name = shipData.fields.find((field) => field.name === "shipname")?.values.find((value) => value !== 'Unknown') || 'Unknown';
    const mmsiData = shipData.fields.find((field) => field.name === "mmsi")?.values;
    let mmsi = '';
    if (mmsiData && mmsiData.length > 0) {
      mmsi = mmsiData[0];
    }
    locations.push({
      'shipName': name,
      'mmsi': mmsi,
      'latlngs': latLons
    })
  }
  return locations;
}

function showShipName(layer: L.Layer, text: string, map: L.Map) {
  const basePopup = L.popup();
  basePopup.setContent(text);
  layer.bindPopup(basePopup);

  layer.on('mouseover', (e: L.LeafletMouseEvent) => {
    const popup = e.target.getPopup();
    popup.setLatLng(e.latlng).openOn(map);
  });

  layer.on('mouseout', (e: L.LeafletMouseEvent) => {
    e.target.closePopup();
  });

  layer.on('mousemove', (e: L.LeafletMouseEvent) => {
    e.target.closePopup();
    const popup = e.target.getPopup();
    popup.setLatLng(e.latlng).openOn(map);
  });
}


function shipToColor(identifier: string, theme: GrafanaTheme2): string {
  const colorIndex = Math.floor(randomNumber(identifier) * theme.visualization.palette.length);
  const color = theme.visualization.palette[colorIndex];
  return theme.visualization.getColorByName(color);
}

function createPolylines(locations: ShipLocation[], options: AISPanelOptions, theme: GrafanaTheme2, map: L.Map): L.Polyline[] {
  let polylines: L.Polyline[] = [];

  for (const location of locations) {  
    const line = L.polyline(
      location.latlngs, {
        weight: options.strokeWidth,
        color: shipToColor(location.mmsi, theme)
      }
    );
    showShipName(line, location.shipName, map);
    polylines.push(line);
  }
  return polylines;
}

function renderAISReceiverLocation(layer: L.LayerGroup, latitude: number, longitude: number) {
  console.log("render receiver location");
  layer.clearLayers();
  const icon = createIcon('GARS');
  const marker = createMarker(latitude, longitude, icon);
  layer.addLayer(marker);
}

function getLastValues(data: DataFrame[]): ShipInfo[] {
  function lastValue(fields: Field[], fieldName: string): any {
    const field = fields.find((field) => field.name === fieldName);
    return field?.values[field.values.length -1];
  }

  let valuesPerShip = [];
  for (const shipData of data) {
    let lastValues: ShipInfo = {
      time: lastValue(shipData.fields, '_time'),
      name: lastValue(shipData.fields, 'shipname'),
      course: parseFloat(lastValue(shipData.fields, 'course')),
      heading: parseFloat(lastValue(shipData.fields, 'heading')),
      mmsi: lastValue(shipData.fields, 'mmsi')
    };
    const lat = parseFloat(lastValue(shipData.fields, 'lat')) || null;
    const lon = parseFloat(lastValue(shipData.fields, 'lon')) || null;
    if (!lat || !lon) {
      continue;
    } else {
      lastValues.lat = lat;
      lastValues.lon = lon;
    }
    valuesPerShip.push(lastValues);
  }
  return valuesPerShip;
}

function createShips(ships: ShipInfo[], shipLayer: L.LayerGroup, map: L.Map, theme: GrafanaTheme2, staleTimes: SignalMarkTimes) {
  shipLayer.clearLayers();
  const now = Date.now();
  for (const ship of ships) {
    const lastSeenInMS = now - ship.time;
    const lastSeenInMinutes = lastSeenInMS / 1000 / 60;
    const shipColor = lastSeenInMinutes <= staleTimes.timeUntilLost ? shipToColor(ship.mmsi, theme) : 'black';
    const icon = createIcon('SHIP', shipColor, lastSeenInMinutes <= staleTimes.timeUntilStale);
    if (!ship.lat || !ship.lon) {
      continue;
    }
    const marker = createMarker(ship.lat, ship.lon, icon, ship.course);
    shipLayer.addLayer(marker);
    showShipName(marker, ship.name, map);
  }
}

function createLegendItems(ships: ShipLocation[], theme: GrafanaTheme2): VizLegendItem[] {
  let legendItems: VizLegendItem[] = [];
  for (const [index, ship] of ships.entries()) {
    const color = shipToColor(ship.shipName, theme);
    legendItems.push({
      label: ship.shipName,
      color: color,
      yAxis: index
    })
  }
  return legendItems
}

export const AISPanel: React.FC<Props> = ({ options, data, width, height }) => {
  const [map, setMap] = React.useState<L.Map>(null);
  const [lineLayer] = React.useState(L.layerGroup());
  const [receiverLayer] = React.useState(L.layerGroup());
  const [shipLayer] = React.useState(L.layerGroup());
  const [circleLayer] = React.useState(L.layerGroup());
  const theme = useTheme2();
  let legendItems: VizLegendItem[] = [];
  
  function renderData() {
    const shipLocations = formatLocations(data.series);
    const polyLines = createPolylines(shipLocations, options, theme, map);
    lineLayer.clearLayers();  
    for (const polyLine of polyLines) {
      lineLayer.addLayer(polyLine);
    }

    const lastValues = getLastValues(data.series);
    createShips(lastValues, shipLayer, map, theme, {timeUntilStale: options.timeUntilSignalStale, timeUntilLost: options.timeUntilSignalLost});
  }  

  const renderMap = React.useCallback(renderData, [data, options, lineLayer, theme, map, legendItems]);
  const renderReceiverMarker = React.useCallback(renderAISReceiverLocation, [options.receiverLatitude, options.receiverLongitude]);

  if (map !== null) {
    renderMap();
    renderReceiverMarker(receiverLayer, options.receiverLatitude, options.receiverLongitude);
    legendItems = createLegendItems(formatLocations(data.series), theme);
  }

  // This useEffect hook runs when the component is first mounted:
  React.useEffect(() => {
    if (map === null) {
      const mapParams: L.MapOptions = {
        center: L.latLng(options.centerLatitude, options.centerLongitude),
        zoom: options.zoom,
        zoomControl: true,
        maxBounds: L.latLngBounds(L.latLng(-150, -240), L.latLng(150, 240)),
        layers: [MAP_TILE],
      };

      const newMap = L.map('map', mapParams);
      setMap(newMap);
      lineLayer.addTo(newMap);
      receiverLayer.addTo(newMap);
      shipLayer.addTo(newMap);
      circleLayer.addTo(newMap);
      drawDistanceCircles(L.latLng(options.receiverLatitude, options.receiverLongitude), circleLayer);
    }
  }, [map, lineLayer, receiverLayer, shipLayer, circleLayer, options]);

  return (
    <div className="parent">
      <div id="map" style={mapStyles}/>
      <div className="legend">
        <VizLegend displayMode={LegendDisplayMode.List} placement='bottom' items={legendItems}></VizLegend>
      </div>
    </div>
  );
};
