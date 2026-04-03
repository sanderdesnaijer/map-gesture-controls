# @map-gesture-controls/ol

This package is the OpenLayers integration layer. It re-exports the **full** `@map-gesture-controls/core` API, so you only need to install and import from this package.

---

## GestureMapController

The main entry point for most users. Manages the full lifecycle: webcam, gesture detection, state machine, map interaction, and overlay rendering.

### Constructor

```ts
new GestureMapController(config: GestureMapControllerConfig)
```

### Methods

| Method | Returns | Description |
| --- | --- | --- |
| `start()` | `Promise<void>` | Initialises the webcam and MediaPipe model, then begins gesture detection. Must be called from a user-gesture handler (e.g. a click event). Downloads ~10 MB of model weights on first call. |
| `stop()` | `void` | Stops gesture detection, releases the webcam stream, and removes the overlay from the DOM. |
| `pause()` | `void` | Pauses gesture detection without releasing the webcam. The overlay remains visible. |
| `resume()` | `void` | Resumes gesture detection after a `pause()`. |

### GestureMapControllerConfig

```ts
interface GestureMapControllerConfig {
  map: Map;                        // ol/Map instance (required)
  webcam?: Partial<WebcamConfig>;  // optional, see WebcamConfig
  tuning?: Partial<TuningConfig>;  // optional, see TuningConfig
  debug?: boolean;                 // optional, log gesture mode to console
}
```

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `map` | `ol/Map` | Yes | The OpenLayers Map instance to control. |
| `webcam` | `Partial<WebcamConfig>` | No | Partial webcam overlay configuration. Merged with `DEFAULT_WEBCAM_CONFIG`. |
| `tuning` | `Partial<TuningConfig>` | No | Partial gesture tuning configuration. Merged with `DEFAULT_TUNING_CONFIG`. |
| `debug` | `boolean` | No | When `true`, logs the active `GestureMode` to the console on every frame. |

---

## OpenLayersGestureInteraction

Lower-level class for advanced use cases where you want to manage the gesture pipeline yourself and only use the OL map interaction layer.

### Constructor

```ts
new OpenLayersGestureInteraction(map: Map)
```

Creates a gesture interaction bound to the given OpenLayers `Map` instance. Does not start any webcam or detection. You are responsible for providing `StateMachineOutput` frames.

### Methods

| Method | Returns | Description |
| --- | --- | --- |
| `apply(output: StateMachineOutput)` | `void` | Applies a single `StateMachineOutput` frame to the map. Call this each time the state machine produces output (typically once per video frame). Internally applies pan and zoom deltas using the OL view API. |

This class is useful when you want to wire up your own `GestureController` and `GestureStateMachine` from `@map-gesture-controls/core` and connect them to an OL map without using the higher-level `GestureMapController`.

---

## Re-exported core API

Everything exported from `@map-gesture-controls/core` is also exported from this package. See the [core API reference](./core) for the full list of classes, functions, constants, and types.

```ts
// All of these work from the ol package:
import {
  GestureController,
  GestureStateMachine,
  WebcamOverlay,
  classifyGesture,
  getHandSize,
  getTwoHandDistance,
  DEFAULT_WEBCAM_CONFIG,
  DEFAULT_TUNING_CONFIG,
  LANDMARKS,
  COLORS,
} from '@map-gesture-controls/ol';
```
