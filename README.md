# map-gesture-controls

[![npm version](https://img.shields.io/npm/v/@map-gesture-controls/ol?style=flat-square)](https://www.npmjs.com/package/@map-gesture-controls/ol)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@map-gesture-controls/ol?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@map-gesture-controls/ol)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**Control web maps with hand gestures. No mouse, no touch, no backend.**

Using [MediaPipe](https://developers.google.com/mediapipe) hand-tracking WASM running entirely in the browser, users can pan a map with a closed fist and zoom by moving two open hands apart or together. This makes maps accessible in kiosk and exhibit environments, enables hands-free interaction for users with limited mobility, and opens up novel touchless UI experiences. Camera data never leaves the device.

**[Live demo and documentation](https://sanderdesnaijer.github.io/map-gesture-controls/)**

<p align="center">
  <img src="docs/public/openlayers-gesture-control-demo.gif" alt="Screen recording of the map gesture demo: an OpenLayers map with a small webcam preview; the user pans with a fist and zooms with two open hands, all in the browser via MediaPipe." width="720" />
</p>

## How it works

1. **Webcam capture**: `GestureController` opens the user's camera and feeds each frame to MediaPipe Hand Landmarker, which returns 21 3-D landmarks per detected hand.
2. **Gesture classification**: `GestureStateMachine` classifies each frame using `classifyGesture()`: one hand with 3+ fingers curled = `fist` (pan); two hands each with all 4 fingers extended and spread = `openPalm` (zoom); anything else = `none` (idle). A configurable dwell timer (`actionDwellMs`, default 80 ms) prevents flickering, and a grace period (`releaseGraceMs`, default 150 ms) smooths gesture releases.
3. **OL integration**: `OpenLayersGestureInteraction` translates frame-over-frame hand deltas into `ol/Map` pan pixel offsets and zoom-level adjustments, applying dead-zone filtering and exponential smoothing before every update.

## Packages

| Package | Description |
| --- | --- |
| `@map-gesture-controls/core` | Gesture detection engine, map-agnostic. Exports `GestureController`, `GestureStateMachine`, `WebcamOverlay`, `classifyGesture`, all types, constants, and utility functions. |
| `@map-gesture-controls/ol` | OpenLayers integration. Re-exports the full core API and adds `GestureMapController` and `OpenLayersGestureInteraction`. |

> Most users only need the `ol` package. It re-exports everything from core.

## Requirements

- A modern browser with WebGL and `getUserMedia` (webcam permission).
- OpenLayers 10.x (see `package.json`).

## Install

```bash
npm install @map-gesture-controls/ol ol
```

> **Publish flow (maintainers):** run `npm run build:libs` so the `dist/` folder exists before `npm publish` (this repo does not commit `dist/`).

## Usage

You need a container element in your HTML (e.g. `<div id="map"></div>`) and an [OpenLayers](https://openlayers.org/) `Map` instance. Then wire in the gesture controller:

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

// Must be called from a user gesture (e.g. button click) for webcam permission
await controller.start();

controller.stop(); // tear down webcam and overlay
```

Optional config: `webcam`, `tuning`, and `debug`. See the [Configuration](#configuration) section below.

## Configuration

All options are optional. Pass only the keys you want to override; the rest use sensible defaults.

```ts
// `map` is your `ol/Map` instance (see Usage above)
const controller = new GestureMapController({
  map,
  webcam: {
    position: 'top-left',  // move overlay to top-left corner
    width: 240,            // narrower overlay
    height: 180,
    margin: 24,            // 24 px from viewport edges
    opacity: 0.7,
  },
  tuning: {
    panScale: 3.0,   // faster panning
    zoomScale: 2.0,  // slower zooming
  },
  debug: true,       // log gesture mode to console
});
```

### `webcam` options (`WebcamConfig`)

| Key        | Type                                                       | Default          | Description                                   |
| ---------- | ---------------------------------------------------------- | ---------------- | --------------------------------------------- |
| `enabled`  | `boolean`                                                  | `true`           | Show/hide the overlay entirely.               |
| `mode`     | `'corner' \| 'full' \| 'hidden'`                           | `'corner'`       | Display mode.                                 |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Corner when `mode === 'corner'`.              |
| `width`    | `number`                                                   | `320`            | Overlay width in px (corner mode).            |
| `height`   | `number`                                                   | `240`            | Overlay height in px (corner mode).           |
| `margin`   | `number`                                                   | `16`             | Distance in px from the nearest edge(s).      |
| `opacity`  | `number`                                                   | `0.85`           | CSS opacity (0–1).                            |

### `tuning` options (`TuningConfig`)

| Key                      | Type     | Default | Description                                                          |
| ------------------------ | -------- | ------- | -------------------------------------------------------------------- |
| `panScale`               | `number` | `2.0`   | Multiplier on hand delta → map pixels. Higher = faster pan.          |
| `zoomScale`              | `number` | `4.0`   | Multiplier on two-hand distance delta → zoom level. Higher = faster. |
| `actionDwellMs`          | `number` | `80`    | Hold time (ms) before a gesture is confirmed.                        |
| `releaseGraceMs`         | `number` | `150`   | Grace period (ms) before returning to idle after gesture ends.       |
| `panDeadzonePx`          | `number` | `10`    | Minimum pixel movement to register a pan.                            |
| `zoomDeadzoneRatio`      | `number` | `0.005` | Minimum distance-ratio change to register a zoom.                    |
| `smoothingAlpha`         | `number` | `0.5`   | Exponential smoothing factor (0 = max smooth, 1 = raw).              |
| `minDetectionConfidence` | `number` | `0.65`  | MediaPipe minimum detection confidence.                              |
| `minTrackingConfidence`  | `number` | `0.65`  | MediaPipe minimum tracking confidence.                               |
| `minPresenceConfidence`  | `number` | `0.60`  | MediaPipe minimum presence confidence.                               |

## Development

```bash
npm install
npm run dev
```

Runs the demo in `examples/` (Vite, port 5173 by default).

```bash
npm run build:libs
```

Produces the library in `dist/` (JS, declarations, bundled CSS).

```bash
npm run type-check
```

## Gestures

| Mode | Condition | Action | How to perform |
|------|-----------|--------|----------------|
| Pan | One hand, fist gesture | Move hand | Curl all fingers into a fist, then move your hand in any direction to pan the map |
| Zoom | Both hands visible, open palms | Spread / pinch | Show both open hands (all fingers extended and spread), then move them apart to zoom in or together to zoom out |
| Idle | Any other hand position | None | Let your hands rest or hold any non-recognised pose; the map does nothing |

Gestures are confirmed after a short dwell period (default 80 ms) to avoid accidental triggers, and released after a grace period (default 150 ms) to prevent flickering when hands briefly lose tracking.

## Browser support

| Browser | Support |
|---------|---------|
| Chrome 111+ | Full support |
| Edge 111+ | Full support |
| Firefox 115+ | Full support |
| Safari 17+ | Full support |
| Mobile browsers | Untested |

Requirements: **WebGL** (for OpenLayers rendering), **`getUserMedia`** (webcam access), and **WASM** (MediaPipe hand landmarker model, ~10 MB, loaded on first `start()` call).

## Roadmap & Contributing

**Planned features:**
- `@map-gesture-controls/gmaps`: Google Maps adapter
- Additional gesture types: tilt, rotate
- Framework wrappers for React and Vue

**Contributing:**
- This project uses [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.)
- PRs are welcome. Please open an [issue](https://github.com/sanderdesnaijer/map-gesture-controls/issues) first for significant changes
- Run `npm run type-check` and ensure no TS errors before submitting

## Documentation

Full docs, live demos, and API reference at **[sanderdesnaijer.github.io/map-gesture-controls](https://sanderdesnaijer.github.io/map-gesture-controls/)**

To build and preview the docs locally:

```bash
npm run docs:build
npm run docs:preview
```

Built by [Sander de Snaijer](https://www.sanderdesnaijer.com).

## License

MIT

## Privacy & network

The library loads MediaPipe WASM and the hand landmarker model from public CDNs (see `src/constants.ts` and `src/GestureController.ts`). It does not send your video to a custom backend; processing runs locally in the browser after you grant camera access.
