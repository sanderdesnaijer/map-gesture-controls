# @map-gesture-controls/leaflet

[![npm version](https://img.shields.io/npm/v/@map-gesture-controls/leaflet?style=flat-square)](https://www.npmjs.com/package/@map-gesture-controls/leaflet)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@map-gesture-controls/leaflet?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@map-gesture-controls/leaflet)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**Control Leaflet maps with hand gestures.** No mouse, no touch, no backend. Point your webcam and use a fist or pinch to pan, zoom, and rotate. Powered by [MediaPipe](https://developers.google.com/mediapipe) hand-tracking running entirely in the browser. Your camera feed never leaves the device.

## Demo

Try it live at **[sanderdesnaijer.github.io/map-gesture-controls](https://sanderdesnaijer.github.io/map-gesture-controls/)**

<!-- GIF placeholder -->

## Install

```bash
npm install @map-gesture-controls/leaflet leaflet
```

`leaflet` is a **peer dependency**. You must install it separately.

For TypeScript support:

```bash
npm install -D @types/leaflet
```

## Quick start

```ts
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GestureMapController } from "@map-gesture-controls/leaflet";
import "@map-gesture-controls/leaflet/style.css";

const map = L.map("map").setView([52.37, 4.9], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const controller = new GestureMapController({ map });

// Must be called from a user gesture (e.g. button click) for webcam permission
document.getElementById("start-btn")!.addEventListener("click", async () => {
  await controller.start();
});

document.getElementById("stop-btn")!.addEventListener("click", () => {
  controller.stop();
});
```

> **Important:** consumers must import Leaflet's own CSS separately: `leaflet/dist/leaflet.css`.

## How it works

1. **Webcam capture** - `GestureController` opens the camera and feeds each frame to MediaPipe Hand Landmarker, returning 21 3D landmarks per hand.
2. **Gesture classification** - `GestureStateMachine` classifies frames in real time: left fist or pinch = pan, right fist or pinch = zoom (vertical movement), both hands active = rotate, anything else is idle. Dwell timers and grace periods prevent accidental triggers.
3. **Map integration** - `LeafletGestureInteraction` translates hand movement deltas into Leaflet `panBy()` calls for pan, Leaflet's continuous zoom update path for zoom, and a CSS transform on a dedicated rotate pane for rotation. During gesture zoom, the current tile level stays stretched while the next tiles load. Pan direction is counter-rotated by the current bearing so gesture direction always matches what you see on screen.

## Gestures

Both **fist** and **pinch** (thumb and index finger touching) trigger the same actions, use whichever feels more comfortable.

| Gesture | How to perform | Map action |
| --- | --- | --- |
| **Pan** | Left fist or pinch, move hand in any direction | Drags the map |
| **Zoom** | Right fist or pinch, move hand up or down | Zooms in (up) or out (down) |
| **Rotate** | Both hands fist or pinch, tilt wrists clockwise or counter-clockwise | Rotates the map |
| **Reset** | Bring both hands together (pray/namaste), hold 1 second | Resets pan, zoom, and rotation to initial state |
| **Idle** | Any other hand position | Map stays still |

Rotation is implemented via CSS transforms on a dedicated pane inside `.leaflet-map-pane` since Leaflet core has no native rotation API. Only tile and overlay panes rotate; marker, shadow, tooltip, and popup panes remain axis-aligned.

## Configuration

All options are optional. Defaults work well out of the box.

```ts
const controller = new GestureMapController({
  map,
  webcam: {
    position: "bottom-left",
    width: 200,
    height: 150,
    opacity: 0.6,
  },
  tuning: {
    actionDwellMs: 40,
    releaseGraceMs: 80,
    panDeadzonePx: 0,
    smoothingAlpha: 0.35,
  },
  debug: true,
});
```

See the [full configuration reference](https://sanderdesnaijer.github.io/map-gesture-controls/configuration) for all `webcam` and `tuning` options.

## Exports

This package re-exports the entire [`@map-gesture-controls/core`](https://www.npmjs.com/package/@map-gesture-controls/core) API, so you only need one import. On top of core, it adds:

| Export | Type | Description |
| --- | --- | --- |
| `GestureMapController` | Class | High-level controller that wires gesture detection to a Leaflet map |
| `LeafletGestureInteraction` | Class | Low-level Leaflet interaction for custom setups |
| `GestureMapControllerConfig` | Type | Configuration interface |

## Use cases

- **Museum and exhibit kiosks** - visitors explore maps without touching a shared screen
- **Accessibility** - hands-free map navigation for users with limited mobility
- **Live presentations** - control a projected map from across the room
- **Public displays** - touchless interaction in medical, retail, or transit environments

## Requirements

- Leaflet 1.x (`leaflet` as a peer dependency)
- A modern browser with WebGL, `getUserMedia`, and WASM support
- Chrome 111+, Edge 111+, Firefox 115+, Safari 17+

## Related packages

| Package | Description |
| --- | --- |
| [`@map-gesture-controls/core`](https://www.npmjs.com/package/@map-gesture-controls/core) | Map-agnostic gesture detection engine (included in this package) |
| [`@map-gesture-controls/google-maps`](https://www.npmjs.com/package/@map-gesture-controls/google-maps) | Google Maps integration |
| [`@map-gesture-controls/ol`](https://www.npmjs.com/package/@map-gesture-controls/ol) | OpenLayers integration |

## Documentation

Full docs, live demos, and API reference at **[sanderdesnaijer.github.io/map-gesture-controls](https://sanderdesnaijer.github.io/map-gesture-controls/)**

## Privacy

All gesture processing runs locally in the browser. No video data is sent to any server. MediaPipe WASM and model files are loaded from public CDNs.

Built by [Sander de Snaijer](https://www.sanderdesnaijer.com).

## License

MIT
