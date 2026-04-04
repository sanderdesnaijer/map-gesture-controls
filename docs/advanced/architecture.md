---
title: Architecture - Map Gesture Controls
description: Understand the internal architecture of Map Gesture Controls. Data flow from webcam frames through MediaPipe to OpenLayers map interactions.
head:
  - - meta
    - property: og:title
      content: Architecture Overview - Map Gesture Controls
  - - meta
    - property: og:description
      content: Internal architecture and data flow of the gesture control pipeline.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/advanced/architecture
---

# Architecture

## Data flow

Each video frame flows through four layers before reaching the map:

```
┌─────────────────────────────────────────────────────────────────┐
│                          Browser                                │
│                                                                 │
│  Webcam (getUserMedia)                                          │
│       │                                                         │
│       ▼                                                         │
│  GestureController          (packages/map-gesture-core)         │
│  ├─ MediaPipe WASM                                              │
│  └─ onFrame(GestureFrame) ──────────────────────┐              │
│                                                  │              │
│  GestureStateMachine        (packages/map-gesture-core)         │
│  ├─ classifyGesture()                            │              │
│  ├─ dwell + grace timers                         │              │
│  └─ update(frame) → StateMachineOutput ──────────┤              │
│                                                  │              │
│  ┌───────────────────────────────────────────────┤              │
│  │                                               │              │
│  ▼                                               ▼              │
│  OpenLayersGestureInteraction    WebcamOverlay                  │
│  (packages/ol-gesture-controls)  (packages/map-gesture-core)    │
│  └─ apply(output) → ol/Map       └─ render(frame, mode)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Module roles

### GestureController (`core`)

Owns the webcam stream and the MediaPipe hand landmarker session. On every animation frame it runs detection and calls `onFrame(GestureFrame)` with the raw landmark data for all detected hands. It does not interpret gestures. It only delivers raw data.

### GestureStateMachine (`core`)

Interprets raw `GestureFrame` data. It calls `classifyGesture()` for each hand, applies dwell timing (to confirm gestures) and grace periods (to smooth releases), and emits a `StateMachineOutput` containing the current `GestureMode` and computed `panDelta`, `zoomDelta`, and `rotateDelta` values. It is entirely map-agnostic.

Priority rules evaluated each frame:
- **Both hands fist** → `'rotating'` (wrist-to-wrist angle delta rotates the map)
- **Right fist only** → `'zooming'` (right wrist vertical movement controls zoom)
- **Left fist only** → `'panning'` (left wrist movement pans the map)
- **Otherwise** → `'idle'`

### OpenLayersGestureInteraction (`ol`)

Consumes `StateMachineOutput` and calls OpenLayers view APIs. For panning it calls `view.setCenter()` with pixel-space deltas; for zooming it calls `view.animate()` with the computed zoom delta; for rotating it calls `view.setRotation()` with the radian delta. It contains no gesture logic, it only translates state machine output into OL API calls.

### WebcamOverlay (`core`)

Renders the visual feedback layer. It draws the webcam video feed to a canvas, overlays the hand skeleton (connection lines + landmark dots), applies colour coding per `GestureMode`, and positions the canvas element within the map container. It is also map-agnostic and only needs an `HTMLElement` to mount into.

## Why the core / ol split?

The split follows the **adapter pattern**: `core` is a pure gesture-detection library with no dependency on any mapping framework. `ol` is a thin adapter that translates `core` output into OpenLayers API calls.

This means:

- The `core` package can be used independently to build gesture controls for any framework (Leaflet, MapLibre, Google Maps, or a completely custom canvas).
- The `ol` package stays small and focused. It only contains OL-specific code.
- Adding a new map adapter (e.g. `@map-gesture-controls/gmaps`) requires only implementing `apply(output: StateMachineOutput)` against the target map API, without touching gesture detection logic.
