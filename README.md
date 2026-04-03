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

```ts
import Map from 'ol/Map.js';
import { GestureMapController } from '@map-gesture-controls/ol';
import '@map-gesture-controls/ol/style.css';

const controller = new GestureMapController({ map });

// Must be called from a user gesture (e.g. button click) for webcam permission
await controller.start();

controller.stop(); // tear down webcam and overlay
```

Optional config: `webcam`, `tuning`, and `debug` — see exported types in `src/types.ts`.

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
