# @map-gesture-controls/core

[![npm version](https://img.shields.io/npm/v/@map-gesture-controls/core?style=flat-square)](https://www.npmjs.com/package/@map-gesture-controls/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/@map-gesture-controls/core?style=flat-square&label=minzipped)](https://bundlephobia.com/package/@map-gesture-controls/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-typed-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**Turn any web map into a hands-free experience.** This is the map-agnostic gesture detection engine behind [map-gesture-controls](https://github.com/sanderdesnaijer/map-gesture-controls). It uses [MediaPipe](https://developers.google.com/mediapipe) hand-tracking WASM to detect hand gestures from a webcam feed, classify them in real time, and expose a clean event-driven API. All processing runs locally in the browser. No video data ever leaves the device.

> Building with OpenLayers? Use [`@map-gesture-controls/ol`](https://www.npmjs.com/package/@map-gesture-controls/ol) instead. It wraps this package and adds map integration out of the box.

<p align="center">
  <img src="https://raw.githubusercontent.com/sanderdesnaijer/map-gesture-controls/main/docs/public/openlayers-gesture-control-demo.gif" alt="Screen recording of the map gesture demo: an OpenLayers map with a small webcam preview; the user pans with a fist and zooms with two open hands, all in the browser via MediaPipe." width="720" />
</p>

## What it does

- Detects hands and classifies gestures at 30+ fps using MediaPipe Hand Landmarker
- Recognizes **fist** (pan), **open palm** (zoom), and **idle** states
- Manages gesture transitions with dwell timers and grace periods to avoid flickering
- Provides a configurable webcam overlay with corner/full/hidden display modes
- Ships fully typed TypeScript declarations

## Install

```bash
npm install @map-gesture-controls/core
```

## Quick start

```ts
import { GestureController } from '@map-gesture-controls/core';
import '@map-gesture-controls/core/style.css';

const controller = new GestureController({
  onGestureFrame(frame) {
    // frame.hands contains detected hands with landmarks and gesture type
    console.log(frame);
  },
});

// Must be called from a user interaction (button click) for webcam permission
await controller.start();
```

## Exports

| Export | Type | Description |
| --- | --- | --- |
| `GestureController` | Class | Opens the webcam, runs MediaPipe detection, and emits gesture frames |
| `GestureStateMachine` | Class | Manages gesture state transitions with dwell and grace timers |
| `WebcamOverlay` | Class | Renders a configurable camera preview overlay |
| `classifyGesture` | Function | Classifies a set of hand landmarks into `fist`, `openPalm`, or `none` |
| `getHandSize` | Function | Computes the bounding size of a hand from its landmarks |
| `getTwoHandDistance` | Function | Measures the distance between two detected hands |
| `DEFAULT_WEBCAM_CONFIG` | Constant | Default webcam overlay settings |
| `DEFAULT_TUNING_CONFIG` | Constant | Default tuning parameters |

Full TypeScript types are exported for `GestureMode`, `GestureFrame`, `DetectedHand`, `WebcamConfig`, `TuningConfig`, and more.

## Gesture recognition

| Gesture | Detection rule | Use case |
| --- | --- | --- |
| **Fist** | One hand, 3+ fingers curled | Pan / drag |
| **Open palm** | Two hands, all fingers extended and spread | Zoom in/out |
| **Idle** | Anything else | No action |

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

## License

MIT
