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
      path: 'strokeWidth',
      name: 'Stroke Width',
      description: 'Stroke width of the ship trails',
      defaultValue: 3,
    });

    return builder;
});
