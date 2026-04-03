# Getting Started

## Installation

```bash
npm install @map-gesture-controls/ol ol
```

`ol` (OpenLayers) is a **peer dependency**. You must install it separately alongside the package. This keeps your bundle free of a duplicate copy if you already depend on OpenLayers.

## Minimal working example

The following is a complete, self-contained setup using an OpenLayers map with OSM tiles and the gesture controller:

```ts
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';
import '@map-gesture-controls/ol/style.css';

// 1. Create your OpenLayers map
const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({
    center: fromLonLat([4.9, 52.37]), // Amsterdam
    zoom: 10,
  }),
});

// 2. Create the gesture controller
const controller = new GestureMapController({ map });

// 3. Start from a user gesture (browsers require a user interaction
//    before granting webcam access)
document.getElementById('start-btn')!.addEventListener('click', async () => {
  await controller.start();
});

document.getElementById('stop-btn')!.addEventListener('click', () => {
  controller.stop();
});
```

Your HTML needs a map container and buttons:

```html
<div id="map" style="width: 100%; height: 100vh;"></div>
<button id="start-btn">Start gesture control</button>
<button id="stop-btn">Stop</button>
```

## User-gesture requirement

Browsers enforce a policy that `getUserMedia()` (webcam access) can only be called in response to a user interaction such as a button click. Calling `controller.start()` directly on page load will throw a `NotAllowedError`. Always wire `start()` to a click handler.

## Model loading

`start()` triggers a one-time download of the MediaPipe hand landmarker WASM module and model weights (~10 MB combined). Subsequent calls to `start()` after `stop()` reuse the already-loaded model and are nearly instant.

## TypeScript types

All configuration types are exported from the package:

```ts
import type {
  GestureMapControllerConfig,
  WebcamConfig,
  TuningConfig,
} from '@map-gesture-controls/ol';

const config: GestureMapControllerConfig = {
  map,
  webcam: {
    position: 'top-left',
    width: 280,
  },
  tuning: {
    panScale: 3.0,
  },
};

const controller = new GestureMapController(config);
```

## Next steps

- [Configuration](./configuration): full reference for `webcam` and `tuning` options
- [Gestures](./gestures): how gestures are classified and tuned
- [Examples](./examples): copy-pasteable recipes
- [API Reference](./api/ol): full API documentation
