# @map-gesture-controls/leaflet

[![npm version](https://img.shields.io/npm/v/@map-gesture-controls/leaflet?style=flat-square)](https://www.npmjs.com/package/@map-gesture-controls/leaflet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Leaflet hand gesture controls powered by MediaPipe. Pan, zoom, and navigate Leaflet maps using webcam-based hand tracking. Touchless map navigation for kiosks, exhibits, and accessibility.**

Control [Leaflet](https://leafletjs.com/) maps with hand gestures using your webcam. Uses [MediaPipe](https://developers.google.com/mediapipe) hand-tracking WASM running entirely in the browser. Camera data never leaves the device.

## Install

```bash
npm install @map-gesture-controls/leaflet leaflet
```

`leaflet` is a **peer dependency**. You must install it separately.

For TypeScript support:

```bash
npm install -D @types/leaflet
```

## Usage

```ts
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController } from '@map-gesture-controls/leaflet';
import '@map-gesture-controls/leaflet/style.css';

const map = L.map('map').setView([52.37, 4.9], 10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const controller = new GestureMapController({ map });

// Must be called from a user gesture (e.g. button click) for webcam permission
document.getElementById('start-btn')!.addEventListener('click', async () => {
  await controller.start();
});

document.getElementById('stop-btn')!.addEventListener('click', () => {
  controller.stop();
});
```

> **Important:** consumers must import Leaflet's own CSS separately: `leaflet/dist/leaflet.css`.

## Configuration

```ts
const controller = new GestureMapController({
  map,
  webcam: {
    position: 'bottom-left',
    width: 200,
    height: 150,
    opacity: 0.6,
  },
  tuning: {
    actionDwellMs: 50,
    releaseGraceMs: 100,
    panDeadzonePx: 5,
    zoomDeadzoneRatio: 0.003,
  },
  debug: true,
});
```

See the [full configuration reference](https://sanderdesnaijer.github.io/map-gesture-controls/configuration) for all `webcam` and `tuning` options.

## Gestures

| Gesture | Action |
| --- | --- |
| Left hand fist or pinch, move hand | Pan the map |
| Right hand fist or pinch, move up/down | Zoom in/out |
| Both hands fist or pinch, tilt wrists | Rotate the map |
| Both hands together (pray), hold 1s | Reset view |

Rotation is implemented via CSS transforms on the map pane since Leaflet core has no native rotation API. Pan direction is automatically adjusted to match the rotated view.

## Browser support

| Browser | Support |
| --- | --- |
| Chrome 111+ | Full support |
| Edge 111+ | Full support |
| Firefox 115+ | Full support |
| Safari 17+ | Full support |

Requirements: **WebGL**, **getUserMedia** (webcam access), and **WASM** (MediaPipe hand landmarker model, ~10 MB, loaded on first `start()` call).

## Privacy

Camera data never leaves the device. All processing runs locally in the browser via MediaPipe WASM.

## Examples

See the [live examples](https://sanderdesnaijer.github.io/map-gesture-controls/leaflet/examples) and [full documentation](https://sanderdesnaijer.github.io/map-gesture-controls/).

## License

MIT
