# @map-gesture-controls/google-maps

[![npm version](https://img.shields.io/npm/v/@map-gesture-controls/google-maps?style=flat-square)](https://www.npmjs.com/package/@map-gesture-controls/google-maps)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@map-gesture-controls/google-maps?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@map-gesture-controls/google-maps)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**Control Google Maps with hand gestures.** No mouse, no touch, no backend. Point your webcam and use a fist or pinch to pan, zoom, and rotate. Powered by [MediaPipe](https://developers.google.com/mediapipe) hand-tracking running entirely in the browser. Your camera feed never leaves the device.

## Demo

Try it live at **[sanderdesnaijer.github.io/map-gesture-controls](https://sanderdesnaijer.github.io/map-gesture-controls/)**

<p align="center">
  <img src="https://raw.githubusercontent.com/sanderdesnaijer/map-gesture-controls/main/docs/public/google-maps-gesture-controls-mediapipe.gif" alt="Screen recording of the Google Maps gesture demo: a Google Maps instance with a small webcam preview; the user pans with the left fist, zooms with the right fist, and rotates with both fists, all in the browser via MediaPipe." width="720" />
</p>

## Install

```bash
npm install @map-gesture-controls/google-maps @googlemaps/js-api-loader
npm install -D @types/google.maps
```

## Quick start

```ts
import { Loader } from '@googlemaps/js-api-loader';
import { GestureMapController } from '@map-gesture-controls/google-maps';
import '@map-gesture-controls/google-maps/style.css';

const loader = new Loader({ apiKey: 'YOUR_API_KEY', version: 'weekly' });
const { Map } = await loader.importLibrary('maps');

const map = new Map(document.getElementById('map')!, {
  center: { lat: 0, lng: 0 },
  zoom: 2,
  mapId: 'YOUR_MAP_ID', // enables vector maps (required for rotation)
});

const controller = new GestureMapController({ map });

// Must be called from a user interaction (e.g. button click) for webcam permission
await controller.start();

// Later, to tear down:
controller.stop();
```

You need a Google Maps API key and a Map ID from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis). Create the Map ID with the **Vector** map type to enable rotation support.

## How it works

1. **Webcam capture** - `GestureController` opens the camera and feeds each frame to MediaPipe Hand Landmarker, returning 21 3D landmarks per hand.
2. **Gesture classification** - `GestureStateMachine` classifies frames in real time: left fist or pinch = pan, right fist or pinch = zoom (vertical movement), both hands active = rotate, anything else is idle. Dwell timers and grace periods prevent accidental triggers.
3. **Map integration** - `GoogleMapsGestureInteraction` translates hand movement deltas into Google Maps `moveCamera()` calls for pan, zoom, and heading changes. Pan deltas are rotated by the current heading so gesture direction always matches what you see on screen, even on rotated vector maps.

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
    actionDwellMs: 40,      // ms before confirming a gesture
    releaseGraceMs: 80,     // ms grace period after gesture ends
    panDeadzonePx: 5,       // react to smaller movements
    smoothingAlpha: 0.4,    // smoother but still responsive
  },
  debug: true,              // log gesture state to console
});
```

See the full configuration reference in the [documentation](https://sanderdesnaijer.github.io/map-gesture-controls/).

## Exports

This package re-exports the entire [`@map-gesture-controls/core`](https://www.npmjs.com/package/@map-gesture-controls/core) API, so you only need one import. On top of core, it adds:

| Export | Type | Description |
| --- | --- | --- |
| `GestureMapController` | Class | High-level controller that wires gesture detection to a Google Maps instance |
| `GoogleMapsGestureInteraction` | Class | Low-level Google Maps interaction for custom setups |
| `GestureMapControllerConfig` | Type | Configuration interface |

## Use cases

- **Museum and exhibit kiosks** - visitors explore maps without touching a shared screen
- **Accessibility** - hands-free map navigation for users with limited mobility
- **Live presentations** - control a projected map from across the room
- **Public displays** - touchless interaction in medical, retail, or transit environments

## Requirements

- Google Maps JavaScript API (via `@googlemaps/js-api-loader` or a script tag)
- A Map ID with **Vector** map type for rotation support
- `@types/google.maps` as a peer dependency
- A modern browser with WebGL, `getUserMedia`, and WASM support
- Chrome 111+, Edge 111+, Firefox 115+, Safari 17+

## Related packages

| Package | Description |
| --- | --- |
| [`@map-gesture-controls/core`](https://www.npmjs.com/package/@map-gesture-controls/core) | Map-agnostic gesture detection engine (included in this package) |
| [`@map-gesture-controls/ol`](https://www.npmjs.com/package/@map-gesture-controls/ol) | OpenLayers integration |

## Documentation

Full docs, live demos, and API reference at **[sanderdesnaijer.github.io/map-gesture-controls](https://sanderdesnaijer.github.io/map-gesture-controls/)**

## Privacy

All gesture processing runs locally in the browser. No video data is sent to any server. MediaPipe WASM and model files are loaded from public CDNs.

Built by [Sander de Snaijer](https://www.sanderdesnaijer.com).

## License

MIT
