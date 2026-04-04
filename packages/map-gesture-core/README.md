# @map-gesture-controls/core

[![npm version](https://img.shields.io/npm/v/@map-gesture-controls/core?style=flat-square)](https://www.npmjs.com/package/@map-gesture-controls/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@map-gesture-controls/core?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@map-gesture-controls/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**Turn any web map into a hands-free experience.** This is the map-agnostic gesture detection engine behind [map-gesture-controls](https://github.com/sanderdesnaijer/map-gesture-controls). It uses [MediaPipe](https://developers.google.com/mediapipe) hand-tracking WASM to detect hand gestures from a webcam feed, classify them in real time, and expose a clean event-driven API. All processing runs locally in the browser. No video data ever leaves the device.

> Building with OpenLayers? Use [`@map-gesture-controls/ol`](https://www.npmjs.com/package/@map-gesture-controls/ol) instead. It wraps this package and adds map integration out of the box.

<p align="center">
  <img src="https://raw.githubusercontent.com/sanderdesnaijer/map-gesture-controls/main/docs/public/openlayers-gesture-control-demo.gif" alt="Screen recording of the map gesture demo: an OpenLayers map with a small webcam preview; the user pans with the left fist, zooms with the right fist, and rotates with both fists, all in the browser via MediaPipe." width="720" />
</p>

## What it does

- Detects hands and classifies gestures at 30+ fps using MediaPipe Hand Landmarker
- Recognizes **fist** and **pinch** as interchangeable triggers (left = pan, right = zoom, both = rotate)
- Manages gesture transitions with dwell timers and grace periods to avoid flickering
- Provides a configurable webcam overlay with corner/full/hidden display modes
- Ships fully typed TypeScript declarations

## Install

```bash
npm install @map-gesture-controls/core
```

## Quick start

```ts
import {
  GestureController,
  GestureStateMachine,
  DEFAULT_TUNING_CONFIG,
} from '@map-gesture-controls/core';
import '@map-gesture-controls/core/style.css';

const tuning = DEFAULT_TUNING_CONFIG;
const stateMachine = new GestureStateMachine(tuning);

const controller = new GestureController(tuning, (frame) => {
  const output = stateMachine.update(frame);
  // output.mode: 'idle' | 'panning' | 'zooming' | 'rotating'
  // output.panDelta, output.zoomDelta, output.rotateDelta
  console.log(output);
});

// Must be called from a user interaction (button click) for webcam permission
await controller.init();
controller.start();
```

## Exports

| Export | Type | Description |
| --- | --- | --- |
| `GestureController` | Class | Opens the webcam, runs MediaPipe detection, and emits gesture frames |
| `GestureStateMachine` | Class | Manages gesture state transitions with dwell and grace timers |
| `WebcamOverlay` | Class | Renders a configurable camera preview overlay |
| `classifyGesture` | Function | Stateless classifier: returns `fist`, `pinch`, `openPalm`, or `none` for a set of landmarks |
| `createHandClassifier` | Function | Returns a stateful per-hand classifier with pinch hysteresis (use this instead of `classifyGesture` in custom pipelines) |
| `getHandSize` | Function | Computes the bounding size of a hand from its landmarks |
| `getTwoHandDistance` | Function | Measures the distance between two detected hands |
| `DEFAULT_WEBCAM_CONFIG` | Constant | Default webcam overlay settings |
| `DEFAULT_TUNING_CONFIG` | Constant | Default tuning parameters |

Full TypeScript types are exported for `GestureMode`, `GestureFrame`, `DetectedHand`, `WebcamConfig`, `TuningConfig`, and more.

## Gesture recognition

Both **fist** and **pinch** trigger the same map actions, users can use whichever is more comfortable.

| Gesture | Detection rule | Map action |
| --- | --- | --- |
| **Left fist** | Left hand, 3+ fingers curled | Pan / drag |
| **Left pinch** | Left hand, thumb and index tip within 25% of hand size (exits at 35%) | Pan / drag |
| **Right fist** | Right hand, 3+ fingers curled | Zoom (move up = in, down = out) |
| **Right pinch** | Right hand, thumb and index tip within 25% of hand size (exits at 35%) | Zoom (move up = in, down = out) |
| **Both hands active** | Both hands fist or pinch (mixed is fine) | Rotate map |
| **Idle** | Anything else | No action |

> **Reset (OpenLayers only):** `@map-gesture-controls/ol` adds a reset gesture on top of the above. Bring both hands together in a prayer/namaste pose (wrists close, neither hand making a fist or pinch) and hold for 1 second. A progress bar fills in the webcam overlay; when it completes, pan, zoom, and rotation all snap back to their initial values.

Pinch detection uses hysteresis: the gesture is entered at 25% of hand size and held until fingers open beyond 35%. This prevents flickering when fingers hover near the threshold during a held pinch.

Gestures are confirmed after a configurable dwell period (default 80 ms) and held through a grace period (default 150 ms) to prevent flickering when tracking briefly drops.

## Use cases

- **Kiosk and exhibit displays** where touch screens get dirty or break down
- **Accessibility** for users who cannot use a mouse or touchscreen
- **Touchless interfaces** in medical, industrial, or public environments
- **Custom map integrations** beyond OpenLayers (build your own adapter using this core engine)

## Browser support

Requires **WebGL**, **`getUserMedia`** (webcam), and **WASM** support. Works in Chrome 111+, Edge 111+, Firefox 115+, and Safari 17+.

## Documentation

Full docs, live demos, and configuration reference at **[sanderdesnaijer.github.io/map-gesture-controls](https://sanderdesnaijer.github.io/map-gesture-controls/)**

## Privacy

MediaPipe WASM and the hand landmarker model are loaded from public CDNs. No video frames are sent to any server. All gesture processing happens locally in the browser.

Built by [Sander de Snaijer](https://www.sanderdesnaijer.com).

## License

MIT
