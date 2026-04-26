---
title: Getting Started with Leaflet - Map Gesture Controls
description: Install and set up hand gesture controls for Leaflet maps in minutes. Step-by-step guide for integrating webcam-based gesture navigation.
head:
  - - meta
    - property: og:title
      content: Getting Started with Leaflet - Map Gesture Controls
  - - meta
    - property: og:description
      content: Install and set up hand gesture controls for Leaflet maps in minutes.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/leaflet/getting-started
---

# Getting Started with Leaflet

## Installation

```bash
npm install @map-gesture-controls/leaflet leaflet
```

`leaflet` is a **peer dependency**. You must install it separately alongside the package.

For TypeScript support:

```bash
npm install -D @types/leaflet
```

## Minimal working example

The following is a complete, self-contained setup using a Leaflet map with OpenStreetMap tiles and the gesture controller:

```ts
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController } from '@map-gesture-controls/leaflet';
import '@map-gesture-controls/leaflet/style.css';

// 1. Create your Leaflet map
const map = L.map('map').setView([52.37, 4.9], 10); // Amsterdam
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

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

::: warning CSS imports
Leaflet requires its own CSS file (`leaflet/dist/leaflet.css`) in addition to the gesture controls stylesheet. Make sure both are imported.
:::

## Tile layer

Leaflet does not include a default tile source. The examples use OpenStreetMap tiles, which are free and require no API key. For production use with higher traffic, consider a commercial tile provider like Mapbox, MapTiler, or Stadia Maps.

## Rotation

Leaflet core does not include a native rotation API, but this adapter implements rotation using CSS transforms on the `.leaflet-map-pane` element. When you rotate with both hands, the map visually rotates around its center. Pan direction is automatically adjusted to match the rotated view, and the reset gesture (pray/namaste pose) returns the rotation to 0 along with pan and zoom.

## User-gesture requirement

Browsers enforce a policy that `getUserMedia()` (webcam access) can only be called in response to a user interaction such as a button click. Calling `controller.start()` directly on page load will throw a `NotAllowedError`. Always wire `start()` to a click handler.

## Model loading

`start()` triggers a one-time download of the MediaPipe hand landmarker WASM module and model weights (~10 MB combined). Subsequent calls to `start()` after `stop()` reuse the already-loaded model and are nearly instant.

## Differences from OpenLayers and Google Maps

The gesture controller API is identical across all adapters. The only differences are:

- You import from `@map-gesture-controls/leaflet` instead of `@map-gesture-controls/ol` or `@map-gesture-controls/google-maps`
- The `map` property in `GestureMapControllerConfig` expects a Leaflet `L.Map` instance
- No coordinate projection needed: Leaflet uses `[lat, lng]` directly
- Rotation is implemented via CSS transforms (Leaflet core has no native bearing API)

All configuration (webcam overlay, gesture tuning) is shared. See [Configuration](/configuration) for the full reference.

## TypeScript types

All configuration types are exported from the package:

```ts
import type {
  GestureMapControllerConfig,
  WebcamConfig,
  TuningConfig,
} from '@map-gesture-controls/leaflet';

const config: GestureMapControllerConfig = {
  map,
  webcam: {
    position: 'top-left',
    width: 280,
  },
  tuning: {
    smoothingAlpha: 0.3,
  },
};

const controller = new GestureMapController(config);
```

## Next steps

- [Configuration](/configuration): full reference for `webcam` and `tuning` options
- [Gestures](/gestures): how gestures are classified and tuned
- [Examples](/leaflet/examples): copy-pasteable recipes
- [API Reference](/api/leaflet): full API documentation
