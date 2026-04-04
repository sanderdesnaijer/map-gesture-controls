---
title: Core API Reference - Map Gesture Controls
description: API documentation for @map-gesture-controls/core. GestureController, GestureStateMachine, gesture classifier, and all core types.
head:
  - - meta
    - property: og:title
      content: "@map-gesture-controls/core API Reference"
  - - meta
    - property: og:description
      content: API reference for the map-agnostic gesture detection engine. GestureController, state machine, and classifier.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/api/core
---

# @map-gesture-controls/core

The map-agnostic gesture detection engine. All exports are also available from `@map-gesture-controls/ol`.

---

## Classes

### GestureController

Manages webcam capture and MediaPipe hand landmark detection. Produces a `GestureFrame` on every video frame.

```ts
new GestureController(
  tuning: TuningConfig,
  onFrame: (frame: GestureFrame) => void
)
```

| Method | Returns | Description |
| --- | --- | --- |
| `init()` | `Promise<HTMLVideoElement>` | Opens the webcam, initialises MediaPipe WASM, and returns the video element. Must be awaited before calling `start()`. |
| `start()` | `void` | Begins the per-frame detection loop. Call after `init()` resolves. |
| `stop()` | `void` | Stops the detection loop and pauses the video stream. |
| `destroy()` | `void` | Stops detection, closes the webcam stream, and releases all MediaPipe resources. |

---

### GestureStateMachine

Classifies raw `GestureFrame` data into stable gesture modes, applying dwell and grace-period timing.

```ts
new GestureStateMachine(tuning: TuningConfig)
```

| Method | Returns | Description |
| --- | --- | --- |
| `update(frame: GestureFrame)` | `StateMachineOutput` | Process one frame and return the current state machine output including mode, deltas, and metadata. |
| `getMode()` | `GestureMode` | Return the current active mode without processing a new frame. |
| `reset()` | `void` | Reset the state machine to idle, clearing all timers and buffered state. |

---

### WebcamOverlay

Renders the webcam video feed and hand skeleton landmarks on a canvas overlay positioned over the map container.

```ts
new WebcamOverlay(config: WebcamConfig)
```

| Method | Returns | Description |
| --- | --- | --- |
| `mount(el: HTMLElement)` | `void` | Insert the overlay DOM into the given container element. |
| `unmount()` | `void` | Remove the overlay DOM from the container. |
| `attachVideo(videoEl: HTMLVideoElement)` | `void` | Connect a video element (from `GestureController.init()`) to the overlay for rendering. |
| `render(frame: GestureFrame \| null, mode: GestureMode)` | `void` | Draw one frame: video feed, hand skeleton, and colour-coded mode indicator. Pass `null` for `frame` to clear the canvas. |

---

## Functions

### classifyGesture

```ts
function classifyGesture(landmarks: HandLandmark[]): GestureType
```

Classify a single hand from its 21 MediaPipe landmarks. Returns `'fist'` when 3+ fingers are curled (tip closer to wrist than MCP), or `'none'` for any other configuration.

---

### getHandSize

```ts
function getHandSize(landmarks: HandLandmark[]): number
```

Returns the Euclidean distance between the wrist landmark and the middle-finger MCP (knuckle) landmark. Used as a normalisation factor to make gesture thresholds scale-invariant with distance from the camera.

---

### getTwoHandDistance

```ts
function getTwoHandDistance(
  landmarksA: HandLandmark[],
  landmarksB: HandLandmark[]
): number
```

Returns the Euclidean distance between the index fingertips of two detected hands.

---

## Constants

### DEFAULT_WEBCAM_CONFIG

```ts
const DEFAULT_WEBCAM_CONFIG: WebcamConfig
```

Default values for all `WebcamConfig` keys. Merged with any user-provided partial config.

### DEFAULT_TUNING_CONFIG

```ts
const DEFAULT_TUNING_CONFIG: TuningConfig
```

Default values for all `TuningConfig` keys. See [Configuration](../configuration) for the full table.

### LANDMARKS

```ts
const LANDMARKS: {
  WRIST: number;
  THUMB_TIP: number;
  INDEX_TIP: number;
  INDEX_MCP: number;
  MIDDLE_TIP: number;
  MIDDLE_MCP: number;
  RING_TIP: number;
  RING_MCP: number;
  PINKY_TIP: number;
  PINKY_MCP: number;
}
```

Named indices into MediaPipe's 21-landmark hand array. Use these instead of magic numbers when working with landmarks directly.

### COLORS

```ts
const COLORS: {
  idle: string;
  panning: string;
  zooming: string;
  rotating: string;
  landmark: string;
  connection: string;
  fingertipGlow: string;
}
```

CSS colour strings used by `WebcamOverlay` to render the hand skeleton in each gesture mode.

---

## Types

### GestureMode

```ts
type GestureMode = 'idle' | 'panning' | 'zooming' | 'rotating'
```

The active state of the gesture state machine.

### GestureType

```ts
type GestureType = 'fist' | 'openPalm' | 'none'
```

The raw classification result for a single hand from `classifyGesture()`.

### HandednessLabel

```ts
type HandednessLabel = 'Left' | 'Right'
```

Which hand MediaPipe detected.

### GestureFrame

```ts
interface GestureFrame {
  hands: DetectedHand[];
  timestamp: number;
}
```

A single processed video frame containing all detected hands and a high-resolution timestamp.

### DetectedHand

```ts
interface DetectedHand {
  landmarks: HandLandmark[];
  handedness: HandednessLabel;
  score: number;
}
```

A single detected hand within a `GestureFrame`.

### WebcamConfig

Full type for webcam overlay configuration. See [Configuration](../configuration#webcamconfig) for field descriptions.

### TuningConfig

Full type for gesture tuning configuration. See [Configuration](../configuration#tuningconfig) for field descriptions.

### StateMachineOutput

```ts
interface StateMachineOutput {
  mode: GestureMode;
  panDelta: SmoothedPoint | null;
  zoomDelta: number | null;
  rotateDelta: number | null;
}
```

The output of `GestureStateMachine.update()`. Contains the current mode plus computed deltas for map interaction.

- `panDelta` — normalised wrist movement (0–1 range) when `mode === 'panning'`, otherwise `null`
- `zoomDelta` — signed scalar from right wrist vertical movement when `mode === 'zooming'`, otherwise `null`
- `rotateDelta` — signed angle in radians from wrist-to-wrist line rotation when `mode === 'rotating'`, otherwise `null`

### SmoothedPoint

```ts
interface SmoothedPoint {
  x: number;
  y: number;
}
```

A 2-D point that has been run through the exponential moving average smoother.

### Point2D

```ts
interface Point2D {
  x: number;
  y: number;
}
```

A generic 2-D coordinate.

### HandLandmark

```ts
interface HandLandmark {
  x: number;  // 0–1 normalised
  y: number;  // 0–1 normalised
  z: number;  // depth (relative to wrist)
}
```

A single MediaPipe hand landmark in normalised image coordinates.
