# @map-gesture-controls/ol

Hand-gesture control for [OpenLayers](https://openlayers.org/) maps using [MediaPipe](https://developers.google.com/mediapipe) hand tracking in the browser. Pan with a closed fist; zoom by moving both hands apart or together.

## Requirements

- A modern browser with WebGL and `getUserMedia` (webcam permission).
- OpenLayers 10.x (see `package.json`).

## Install

```bash
npm install @map-gesture-controls/ol ol
```

Publish flow: run `npm run build:lib` so the `dist/` folder exists before `npm publish` (this repo does not commit `dist/`).

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

Optional config: `webcam`, `tuning`, and `debug` — see the [Configuration](#configuration) section below.

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
npm run build:lib
```

Produces the library in `dist/` (JS, declarations, bundled CSS).

```bash
npm run type-check
```

## Gestures

| Mode   | Condition              | Action        |
|--------|------------------------|---------------|
| Pan    | One hand, fist gesture | Move hand     |
| Zoom   | Both hands visible     | Spread / pinch |
| Idle   | Otherwise              | —             |

## License

MIT

## Privacy & network

The library loads MediaPipe WASM and the hand landmarker model from public CDNs (see `src/constants.ts` and `src/GestureController.ts`). It does not send your video to a custom backend; processing runs locally in the browser after you grant camera access.
