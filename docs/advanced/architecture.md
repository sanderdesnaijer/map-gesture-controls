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
│  ├─ createHandClassifier() (per hand, with hysteresis)         │
│  ├─ dwell + grace timers                         │              │
│  └─ update(frame) → StateMachineOutput ──────────┤              │
│                                                  │              │
│  ┌───────────────────────────────────────────────┤              │
│  │                                               │              │
│  ▼                                               ▼              │
│  Map Adapter                     WebcamOverlay                  │
│  ├─ OpenLayersGestureInteraction (packages/ol-gesture-controls) │
│  │  └─ apply(output) → ol/Map                                  │
│  └─ GoogleMapsGestureInteraction (packages/google-maps-...)     │
│     └─ apply(output) → google.maps.Map                         │
│                                  (packages/map-gesture-core)    │
│                                  └─ render(frame, mode)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Module roles

### GestureController (`core`)

Owns the webcam stream and the MediaPipe hand landmarker session. On every animation frame it runs detection and calls `onFrame(GestureFrame)` with the raw landmark data for all detected hands. It does not interpret gestures. It only delivers raw data.

### GestureStateMachine (`core`)

Interprets raw `GestureFrame` data. It calls `classifyGesture()` for each hand, applies dwell timing (to confirm gestures) and grace periods (to smooth releases), and emits a `StateMachineOutput` containing the current `GestureMode` and computed `panDelta`, `zoomDelta`, and `rotateDelta` values. It is entirely map-agnostic.

Priority rules evaluated each frame (fist and pinch are treated identically):
- **Both hands active** (fist or pinch) → `'rotating'` (wrist-to-wrist angle delta rotates the map)
- **Right hand active only** → `'zooming'` (right wrist vertical movement controls zoom)
- **Left hand active only** → `'panning'` (left wrist movement pans the map)
- **Otherwise** → `'idle'`

### Map Adapters (`ol`, `google-maps`)

Each adapter consumes `StateMachineOutput` and translates it into the target map library's API calls. They contain no gesture logic, they only translate state machine output into map API calls.

**OpenLayersGestureInteraction** (`@map-gesture-controls/ol`): calls `view.setCenter()` for panning, `view.animate()` for zooming, and `view.setRotation()` for rotation.

**GoogleMapsGestureInteraction** (`@map-gesture-controls/google-maps`): calls `map.panBy()` for panning (works directly in screen pixels), `map.setZoom()` for zooming, and `map.setHeading()` for rotation.

### WebcamOverlay (`core`)

Renders the visual feedback layer. It draws the webcam video feed to a canvas, overlays the hand skeleton (connection lines + landmark dots), applies colour coding per `GestureMode`, and positions the canvas element within the map container. It is also map-agnostic and only needs an `HTMLElement` to mount into.

## Why the core / ol split?

The split follows the **adapter pattern**: `core` is a pure gesture-detection library with no dependency on any mapping framework. `ol` is a thin adapter that translates `core` output into OpenLayers API calls.

This means:

- The `core` package can be used independently to build gesture controls for any framework (Leaflet, MapLibre, or a completely custom canvas).
- Each adapter package stays small and focused. It only contains map-specific code.
- Adding a new map adapter requires only implementing `apply(output: StateMachineOutput)` against the target map API, without touching gesture detection logic.

Currently there are two adapters: `@map-gesture-controls/ol` (OpenLayers) and `@map-gesture-controls/google-maps` (Google Maps).
