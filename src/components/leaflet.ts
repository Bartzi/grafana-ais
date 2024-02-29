import L, { LatLng } from "leaflet";
import GarsICON from "./gars_icon";
import ShipIcon from "./ship_icon";
import { GeodesicCircleClass } from "leaflet.geodesic/dist/leaflet.geodesic";
import { createPulsatingIcon } from "./utils";

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

export const MAP_TILE = L.tileLayer(
    `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`,
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }
  );


export function createIcon(iconName: 'GARS' | 'SHIP', color='black', pulsate=false): L.DivIcon {
    let options: L.DivIconOptions = {iconUrl: '', className: ''};
    let icon = '';
    switch (iconName) {
        case 'GARS':
            icon = GarsICON(color);
            options.iconSize = [15, 20];
            break;
        case 'SHIP':
            icon = ShipIcon(color);
            options.iconSize = [20, 20];
            options.iconAnchor = [10, 10];
            break;
        default:
            throw `${iconName} is not know. Can not create icon!`;
    }
    if (pulsate) {
      options.html = createPulsatingIcon(icon, color);
    } else {
      options.html = icon;
    }
    return L.divIcon(options);
}

export function createMarker(latitude: number, longitude: number, icon: L.DivIcon, interactive=true, rotationAngle=0, rotationOrigin='center'): L.Marker {
  return L.marker([latitude, longitude], {icon: icon, rotationAngle: rotationAngle, rotationOrigin: rotationOrigin, interactive: interactive});
}

const NAUTICAL_MILE_FACTOR = 1.852;

export function drawDistanceCircles(center: LatLng, layer: L.LayerGroup) {
  for (const distance of [10, 20, 30, 40]) {  // nautical miles
    const circle = new GeodesicCircleClass(center, {
      radius: distance * NAUTICAL_MILE_FACTOR * 1000,  // radius in meters
      fill: false,
      color: "rgba(0, 0, 0, 0.1)",
      weight: 2,
      steps: 50
    })
    circle.addTo(layer);
  }
}

export function createCircleControl(layer: L.LayerGroup): L.Control {
  const circleControl = L.Control.extend({
    options: {
      position: 'topleft',
    },
    onAdd: function(map: L.Map): HTMLElement {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const button = L.DomUtil.create('a', 'ais-panel-circle-control');
      button.setAttribute('role', 'button');
      const image = L.DomUtil.create('img', 'ais-panel-circle-control-image');
      image.setAttribute('src', '/public/plugins/dlr-ais-panel/img/double-circle.svg');
      image.setAttribute('style', 'width: 70%; height: 70%;');
      button.append(image);
      L.DomEvent.on(button, 'click', () => {
        const layerAdded = map.hasLayer(layer);
        if (layerAdded) {
          map.removeLayer(layer);
        } else {
          map.addLayer(layer);
        }
      }, this);
      this.button = button;
      container.append(this.button);
      return container;
    },

    onRemove(map: L.Map) {
      map.removeLayer(layer);
      L.DomEvent.off(this.button);
    }
  });
  return new circleControl();
}