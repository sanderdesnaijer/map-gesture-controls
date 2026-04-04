---
title: Configuration - Map Gesture Controls
description: Configure webcam overlay, gesture sensitivity, smoothing, dead zones, and debug mode for Map Gesture Controls. Full reference of all available options.
head:
  - - meta
    - property: og:title
      content: Configuration Reference - Map Gesture Controls
  - - meta
    - property: og:description
      content: Configure webcam overlay, gesture sensitivity, smoothing, and debug mode for Map Gesture Controls.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/configuration
---

# Configuration

All configuration is passed to `GestureMapController` at construction time. Every key is optional; unspecified keys use the defaults shown below.

```ts
const controller = new GestureMapController({
  map,          // required: your ol/Map instance
  webcam: { ... },   // optional: WebcamConfig
  tuning: { ... },   // optional: TuningConfig
  debug: false,      // optional: boolean
});
```

---

## WebcamConfig

Controls the webcam video overlay rendered on top of the map.

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Show or hide the overlay entirely. Set to `false` to run gesture detection without showing the camera feed. |
| `mode` | `'corner' \| 'full' \| 'hidden'` | `'corner'` | `'corner'` renders a small picture-in-picture overlay. `'full'` fills the map container. `'hidden'` hides the video but keeps the canvas skeleton visible. |
| `position` | `'bottom-right' \| 'bottom-left' \| 'top-right' \| 'top-left'` | `'bottom-right'` | Which corner to anchor the overlay when `mode === 'corner'`. |
| `width` | `number` | `320` | Overlay width in pixels (corner mode). |
| `height` | `number` | `240` | Overlay height in pixels (corner mode). |
| `margin` | `number` | `16` | Distance in pixels from the nearest viewport edges. |
| `opacity` | `number` | `0.85` | CSS opacity of the overlay (0 = transparent, 1 = fully opaque). |

### Example: move overlay to top-left

```ts
const controller = new GestureMapController({
  map,
  webcam: {
    position: 'top-left',
    margin: 12,
    opacity: 0.75,
  },
});
```

---

## TuningConfig

Controls gesture detection sensitivity, smoothing, and timing.

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `panScale` | `number` | `2.0` | Multiplier applied to hand-movement delta before translating to map pixels. Higher values make panning faster. |
| `zoomScale` | `number` | `15.0` | Multiplier applied to the right wrist vertical delta before adjusting zoom level. Higher values make zooming faster. |
| `actionDwellMs` | `number` | `80` | Time in milliseconds a gesture must be held before it is confirmed as active. Prevents accidental triggers. |
| `releaseGraceMs` | `number` | `150` | Time in milliseconds the state machine waits before returning to idle after a gesture ends. Prevents flickering. |
| `panDeadzonePx` | `number` | `10` | Minimum hand movement in normalised-coordinate pixels required to register a pan. Filters out hand tremor. |
| `zoomDeadzoneRatio` | `number` | `0.005` | Minimum fractional change in right wrist vertical position required to register a zoom step. |
| `smoothingAlpha` | `number` | `0.5` | Exponential moving average factor for landmark positions. `0` = maximum smoothing (very slow response), `1` = raw unsmoothed input. |
| `minDetectionConfidence` | `number` | `0.65` | MediaPipe hand detection confidence threshold (0 to 1). Lower values detect more hands but with more false positives. |
| `minTrackingConfidence` | `number` | `0.65` | MediaPipe hand tracking confidence threshold (0 to 1). |
| `minPresenceConfidence` | `number` | `0.60` | MediaPipe hand presence confidence threshold (0 to 1). |

### Example: tuning for responsiveness

Lower dwell time and dead zone for faster, more immediate response:

```ts
const controller = new GestureMapController({
  map,
  tuning: {
    actionDwellMs: 40,      // confirm gestures faster
    releaseGraceMs: 80,     // return to idle faster
    panDeadzonePx: 5,       // react to smaller movements
    panScale: 3.0,          // amplify pan speed
  },
});
```

### Example: tuning for precision

Higher smoothing and dead zones for slow, deliberate control:

```ts
const controller = new GestureMapController({
  map,
  tuning: {
    smoothingAlpha: 0.2,     // heavy smoothing, slow but stable
    panDeadzonePx: 20,       // require larger movements
    zoomDeadzoneRatio: 0.01, // require larger zoom gesture
    actionDwellMs: 120,      // require longer hold before confirming
  },
});
```

### Example: debug mode

Logs the active gesture mode to the browser console on every frame:

```ts
const controller = new GestureMapController({
  map,
  debug: true,
});
```
