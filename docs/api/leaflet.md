---
title: Leaflet API Reference - Map Gesture Controls
description: API documentation for @map-gesture-controls/leaflet. GestureMapController, configuration types, and full TypeScript reference.
head:
  - - meta
    - property: og:title
      content: '@map-gesture-controls/leaflet API Reference'
  - - meta
    - property: og:description
      content: API documentation for the Leaflet gesture control integration. Full TypeScript reference.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/api/leaflet
---

# @map-gesture-controls/leaflet

This package is the Leaflet integration layer. It re-exports the **full** `@map-gesture-controls/core` API, so you only need to install and import from this package.

---

## GestureMapController

The main entry point for most users. Manages the full lifecycle: webcam, gesture detection, state machine, map interaction, and overlay rendering.

### Constructor

```ts
new GestureMapController(config: GestureMapControllerConfig)
```

### Methods

| Method     | Returns         | Description                                                                                                                                                                                  |
| ---------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`  | `Promise<void>` | Initialises the webcam and MediaPipe model, then begins gesture detection. Must be called from a user-gesture handler (e.g. a click event). Downloads ~10 MB of model weights on first call. |
| `stop()`   | `void`          | Stops gesture detection, releases the webcam stream, and removes the overlay from the DOM.                                                                                                   |
| `pause()`  | `void`          | Pauses gesture detection without releasing the webcam. The overlay remains visible.                                                                                                          |
| `resume()` | `void`          | Resumes gesture detection after a `pause()`.                                                                                                                                                 |

### GestureMapControllerConfig

```ts
interface GestureMapControllerConfig {
  map: L.Map; // Leaflet Map instance (required)
  webcam?: Partial<WebcamConfig>; // optional, see WebcamConfig
  tuning?: Partial<TuningConfig>; // optional, see TuningConfig
  debug?: boolean; // optional, log gesture mode to console
}
```

| Property | Type                    | Required | Description                                                                |
| -------- | ----------------------- | -------- | -------------------------------------------------------------------------- |
| `map`    | `L.Map`                 | Yes      | The Leaflet Map instance to control.                                       |
| `webcam` | `Partial<WebcamConfig>` | No       | Partial webcam overlay configuration. Merged with `DEFAULT_WEBCAM_CONFIG`. |
| `tuning` | `Partial<TuningConfig>` | No       | Partial gesture tuning configuration. Merged with `DEFAULT_TUNING_CONFIG`. |
| `debug`  | `boolean`               | No       | When `true`, logs the active `GestureMode` to the console on every frame.  |

---

## LeafletGestureInteraction

Lower-level class for advanced use cases where you want to manage the gesture pipeline yourself and only use the Leaflet map interaction layer.

### Constructor

```ts
new LeafletGestureInteraction(map: L.Map)
```

Creates a gesture interaction bound to the given Leaflet `Map` instance. Does not start any webcam or detection. You are responsible for providing `StateMachineOutput` frames.

### Methods

| Method                              | Returns  | Description                                                                                                                                                                                                                                                                      |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apply(output: StateMachineOutput)` | `void`   | Applies a single `StateMachineOutput` frame to the map. Call this each time the state machine produces output (typically once per video frame). Internally applies pan and zoom deltas using the Leaflet API. Rotation is applied via CSS transforms on a dedicated rotate pane. |
| `syncFromMap()`                     | `void`   | Syncs the internal zoom state with the map's current value. Call after external changes (reset pose, user scroll) so subsequent deltas start from the correct baseline.                                                                                                          |
| `getBearing()`                      | `number` | Returns the current bearing in degrees (0-360).                                                                                                                                                                                                                                  |
| `setBearing(degrees)`               | `void`   | Sets the bearing directly and applies the CSS transform. Use for programmatic control or reset.                                                                                                                                                                                  |

This class is useful when you want to wire up your own `GestureController` and `GestureStateMachine` from `@map-gesture-controls/core` and connect them to a Leaflet map without using the higher-level `GestureMapController`.

### Rotation

Leaflet core does not include a native rotation API. This adapter implements rotation by creating a dedicated `.leaflet-rotate-pane` inside Leaflet's `.leaflet-map-pane` and applying a CSS `transform: rotate()` to that wrapper. Leaflet's `tilePane` and `overlayPane` are moved into the rotate pane, while `markerPane`, `shadowPane`, `tooltipPane`, and `popupPane` stay outside it and remain axis-aligned. Pan deltas are counter-rotated by the current bearing so that panning direction always matches what the user sees on screen. The `setBearing(degrees)` and `getBearing()` methods allow programmatic control of the rotation angle.

---

## Re-exported core API

Everything exported from `@map-gesture-controls/core` is also exported from this package. See the [core API reference](./core) for the full list of classes, functions, constants, and types.

```ts
// All of these work from the leaflet package:
import {
  GestureController,
  GestureStateMachine,
  WebcamOverlay,
  classifyGesture,
  createHandClassifier,
  getHandSize,
  getTwoHandDistance,
  DEFAULT_WEBCAM_CONFIG,
  DEFAULT_TUNING_CONFIG,
  LANDMARKS,
  COLORS,
} from '@map-gesture-controls/leaflet';
```
