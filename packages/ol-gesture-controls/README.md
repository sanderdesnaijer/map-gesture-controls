# @map-gesture-controls/ol

[![npm version](https://img.shields.io/npm/v/@map-gesture-controls/ol?style=flat-square)](https://www.npmjs.com/package/@map-gesture-controls/ol)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@map-gesture-controls/ol?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@map-gesture-controls/ol)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**Control OpenLayers maps with hand gestures.** No mouse, no touch, no backend. Point your webcam and use a fist or pinch to pan, zoom, and rotate. Powered by [MediaPipe](https://developers.google.com/mediapipe) hand-tracking running entirely in the browser. Your camera feed never leaves the device.

## Demo

Try it live at **[sanderdesnaijer.github.io/map-gesture-controls](https://sanderdesnaijer.github.io/map-gesture-controls/)**

<p align="center">
  <img src="https://raw.githubusercontent.com/sanderdesnaijer/map-gesture-controls/main/docs/public/openlayers-gesture-control-demo.gif" alt="Screen recording of the map gesture demo: an OpenLayers map with a small webcam preview; the user pans with the left fist, zooms with the right fist, and rotates with both fists, all in the browser via MediaPipe." width="720" />
</p>

## Install

```bash
npm install @map-gesture-controls/ol ol
```

## Quick start

```ts
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';
import '@map-gesture-controls/ol/style.css';

const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({ center: fromLonLat([0, 0]), zoom: 2 }),
});

const controller = new GestureMapController({ map });

// Must be called from a user interaction (e.g. button click) for webcam permission
await controller.start();

// Later, to tear down:
controller.stop();
```

## How it works

1. **Webcam capture** - `GestureController` opens the camera and feeds each frame to MediaPipe Hand Landmarker, returning 21 3D landmarks per hand.
2. **Gesture classification** - `GestureStateMachine` classifies frames in real time: left fist or pinch = pan, right fist or pinch = zoom (vertical movement), both hands active = rotate, anything else is idle. Dwell timers and grace periods prevent accidental triggers.
3. **Map integration** - `OpenLayersGestureInteraction` translates hand movement deltas into `ol/Map` pan offsets, zoom adjustments, and view rotation. Pan operates in screen space (using `getPixelFromCoordinate`/`getCoordinateFromPixel`), so moving your hand left always moves the map left on screen regardless of the current map rotation.

## Gestures

Both **fist** and **pinch** (thumb and index finger touching) trigger the same actions, use whichever feels more comfortable.

| Gesture | How to perform | Map action |
| --- | --- | --- |
| **Pan** | Left fist or pinch, move hand in any direction | Drags the map |
| **Zoom** | Right fist or pinch, move hand up or down | Zooms in (up) or out (down) |
| **Rotate** | Both hands fist or pinch, tilt wrists clockwise or counter-clockwise | Rotates the map |
| **Reset** | Bring both hands together (pray/namaste), hold 1 second | Resets pan, zoom, and rotation to initial state |
| **Idle** | Any other hand position | Map stays still |

## Configuration

All options are optional. Defaults work well out of the box.

```ts
const controller = new GestureMapController({
  map,
  webcam: {
    position: 'top-left',   // overlay corner position
    width: 240,
    height: 180,
    opacity: 0.7,
  },
  tuning: {
    panScale: 3.0,          // higher = faster panning
    zoomScale: 15.0,        // higher = faster zooming
    actionDwellMs: 80,      // ms before confirming a gesture
    releaseGraceMs: 150,    // ms grace period after gesture ends
  },
  debug: true,              // log gesture state to console
});
```

See the full configuration reference in the [documentation](https://sanderdesnaijer.github.io/map-gesture-controls/).

## Exports

This package re-exports the entire [`@map-gesture-controls/core`](https://www.npmjs.com/package/@map-gesture-controls/core) API, so you only need one import. On top of core, it adds:

| Export | Type | Description |
| --- | --- | --- |
| `GestureMapController` | Class | High-level controller that wires gesture detection to an OpenLayers map |
| `OpenLayersGestureInteraction` | Class | Low-level OL interaction for custom setups |
| `GestureMapControllerConfig` | Type | Configuration interface |

## Use cases

- **Museum and exhibit kiosks** - visitors explore maps without touching a shared screen
- **Accessibility** - hands-free map navigation for users with limited mobility
- **Live presentations** - control a projected map from across the room
- **Public displays** - touchless interaction in medical, retail, or transit environments

## Requirements

- OpenLayers 10.x (`ol` as a peer dependency)
- A modern browser with WebGL, `getUserMedia`, and WASM support
- Chrome 111+, Edge 111+, Firefox 115+, Safari 17+

## Related packages

| Package | Description |
| --- | --- |
| [`@map-gesture-controls/core`](https://www.npmjs.com/package/@map-gesture-controls/core) | Map-agnostic gesture detection engine (included in this package) |

## Documentation

Full docs, live demos, and API reference at **[sanderdesnaijer.github.io/map-gesture-controls](https://sanderdesnaijer.github.io/map-gesture-controls/)**

## Privacy

All gesture processing runs locally in the browser. No video data is sent to any server. MediaPipe WASM and model files are loaded from public CDNs.

Built by [Sander de Snaijer](https://www.sanderdesnaijer.com).

## License

MIT
