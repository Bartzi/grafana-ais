import React from 'react';
import L from "leaflet";
import { DataFrame, Field, GrafanaTheme2, PanelProps } from '@grafana/data';
import { AISPanelOptions, ShipInfo, ShipLocation } from 'types';
import { LegendDisplayMode, VizLegend, VizLegendItem, useTheme2 } from '@grafana/ui';

import 'leaflet/dist/leaflet.css';
import { randomNumber } from 'utils/random';

import './AISPanel.css';

interface Props extends PanelProps<AISPanelOptions> {}

const MAP_TILE = L.tileLayer(
  `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`,
  {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
);


const GARS_ICON = L.icon({
  iconUrl: '/public/plugins/dlr-ais-panel/img/gars.svg',
  iconSize: [15, 45],
});

const SHIP_ICON = L.icon({
  iconUrl: '/public/plugins/dlr-ais-panel/img/triangle.svg',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const proto_initIcon = L.Marker.prototype._initIcon;
const proto_setPos = L.Marker.prototype._setPos;

L.Marker.addInitHook(function (this: L.Marker) {
  let anchor = this.options.icon && this.options.icon.options && this.options.icon.options.iconAnchor;
  let iconAnchor = null;
  if (anchor) {
      iconAnchor = `${anchor[0]}px ${anchor[1]}px`;
  }
  this.options.rotationOrigin = this.options.rotationOrigin || iconAnchor || 'center bottom' ;
  this.options.rotationAngle = this.options.rotationAngle || 0;

  // Ensure marker keeps rotated during dragging
  this.on('drag', (e: L.LeafletEvent) => { e.target._applyRotation(); });
});

L.Marker.include({
  _initIcon: function() {
      proto_initIcon.call(this);
  },

  _setPos: function (pos: number) {
      proto_setPos.call(this, pos);
      this._applyRotation();
  },

  _applyRotation: function () {
      if(this.options.rotationAngle) {
          this._icon.style[L.DomUtil.TRANSFORM+'Origin'] = this.options.rotationOrigin;
          // for modern browsers, prefer the 3D accelerated version
          this._icon.style[L.DomUtil.TRANSFORM] += ' rotateZ(' + this.options.rotationAngle + 'deg)';
      }
  },

  setRotationAngle: function(angle: number) {
    this.options.rotationAngle = angle;
    this.update();
    return this;
  },

  setRotationOrigin: function(origin: string) {
    this.options.rotationOrigin = origin;
    this.update();
    return this;
  }
});

const mapStyles: React.CSSProperties = {
  overflow: 'hidden',
  // width: '100%',
  // height: '97%',
};


function zip(arrays: number[][]): L.LatLngExpression[][] {
  return arrays[0].map(function(_,i){
      return arrays.map(function(array){return array[i]})
  });
}

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
    locations.push({
      'shipName': name,
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


function shipNameToColor(shipName: string, theme: GrafanaTheme2): string {
  const colorIndex = Math.floor(randomNumber(shipName) * theme.visualization.palette.length);
  const color = theme.visualization.palette[colorIndex];
  return theme.visualization.getColorByName(color);
}

function createPolylines(locations: ShipLocation[], options: AISPanelOptions, theme: GrafanaTheme2, map: L.Map): L.Polyline[] {
  let polylines: L.Polyline[] = [];

  for (const location of locations) {  
    const line = L.polyline(
      location.latlngs, {
        weight: options.strokeWidth,
        color: shipNameToColor(location.shipName, theme)
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
  const marker = L.marker([latitude, longitude], {icon: GARS_ICON});
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
      heading: parseFloat(lastValue(shipData.fields, 'heading'))
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

function createShips(ships: ShipInfo[], shipLayer: L.LayerGroup, map: L.Map) {
  shipLayer.clearLayers();
  for (const ship of ships) {
    const marker = L.marker([ship.lat, ship.lon], {icon: SHIP_ICON, rotationAngle: ship.course, rotationOrigin: 'center'});
    shipLayer.addLayer(marker);
    showShipName(marker, ship.name, map);
  }
}

function createLegendItems(ships: ShipLocation[], theme: GrafanaTheme2): VizLegendItem[] {
  let legendItems: VizLegendItem[] = [];
  for (const [index, ship] of ships.entries()) {
    const color = shipNameToColor(ship.shipName, theme);
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
    createShips(lastValues, shipLayer, map);
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
    }
  }, [map, lineLayer, receiverLayer, options]);

  return (
    <div className="parent">
      <div id="map" style={mapStyles}/>
      <div className="legend">
        <VizLegend displayMode={LegendDisplayMode.List} placement='bottom' items={legendItems}></VizLegend>
      </div>
    </div>
  );
};
