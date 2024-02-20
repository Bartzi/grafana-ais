import L from "leaflet";
import GarsICON from "./gars_icon";
import ShipIcon from "./ship_icon";

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


export function createIcon(iconName: 'GARS' | 'SHIP', color='black', className=''): L.DivIcon {
    let options: L.DivIconOptions = {iconUrl: ''};
    switch (iconName) {
        case 'GARS':
            options.html = GarsICON(color);
            options.iconSize = [15, 45];
            break;
        case 'SHIP':
            options.html = ShipIcon(color);
            options.iconSize = [20, 20];
            options.iconAnchor = [10, 10];
            break;
        default:
            break;
    }
    options.className = className;
    return L.divIcon(options);
}

export function createMarker(latitude: number, longitude: number, icon: L.DivIcon, rotationAngle=0, rotationOrigin='center'): L.Marker {
    return L.marker([latitude, longitude], {icon: icon, rotationAngle: rotationAngle, rotationOrigin: rotationOrigin});
}