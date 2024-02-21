import { PanelPlugin } from '@grafana/data';
import { AISPanelOptions } from './types';
import { AISPanel } from './components/AISPanel';

export const plugin = new PanelPlugin<AISPanelOptions>(AISPanel).setPanelOptions((builder) => {
  let category = ["Map View Settings"];
  builder
    .addNumberInput({
      category,
      path: 'centerLatitude',
      name: 'Center Latitude',
      description: 'the Latitude where to center the map',
      defaultValue: 0,
    })
    .addNumberInput({
      category,
      path: 'centerLongitude',
      name: 'Center Longitude',
      description: 'the Longitude where to center the map',
      defaultValue: 0,
    })
    .addNumberInput({
      category,
      path: 'zoom',
      name: 'Zoom Level',
      description: 'the zoom level of the map',
      defaultValue: 5,
    });

    category = ["Receiver Settings"];
    builder.addNumberInput({
      category,
      path: 'receiverLatitude',
      name: 'Receiver Latitude',
      description: 'the Latitude of the AIS receiver',
      defaultValue: 0,
    })
    .addNumberInput({
      category,
      path: 'receiverLongitude',
      name: 'Receiver Longitude',
      description: 'the Longitude of the AIS receiver',
      defaultValue: 0,
    });

    category = ["Render Settings"];
    builder
    .addNumberInput({
      category,
      path: 'strokeWidth',
      name: 'Stroke Width',
      description: 'Stroke width of the ship trails',
      defaultValue: 3,
    })
    .addNumberInput({
      category,
      path: 'timeUntilSignalStale',
      name: 'Time until Signal Stale',
      description: 'the time in minutes until a ship is marked as signal stale (not pulsating anymore)',
      defaultValue: 8,
    })
    .addNumberInput({
      category,
      path: 'timeUntilSignalLost',
      name: 'Time until Signal Lost',
      description: 'the time in minutes until a ship is marked as signal lost (marker black)',
      defaultValue: 30,
    });

    return builder;
});
