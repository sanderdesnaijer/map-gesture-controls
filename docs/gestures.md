---
title: Gestures - Map Gesture Controls
description: Learn the hand gestures for controlling maps. Right fist to zoom, left fist to pan, both fists to rotate. Understand gesture modes, recognition pipeline, and smoothing.
head:
  - - meta
    - property: og:title
      content: Supported Hand Gestures - Map Gesture Controls
  - - meta
    - property: og:description
      content: Learn the hand gestures for controlling OpenLayers maps. Right fist to zoom, left fist to pan, both fists to rotate.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/gestures
---

# Gestures

## Gesture modes

The system operates in one of four modes at any time:

| Mode | Trigger | Map effect |
| --- | --- | --- |
| **Idle** | No recognised gesture | None (map stays still) |
| **Panning** | Left hand in a fist (right hand absent or open) | Left wrist movement pans the map in any direction |
| **Zooming** | Right hand in a fist (left hand absent or open) | Moving right wrist up zooms in; moving down zooms out |
| **Rotating** | Both hands in fists simultaneously | Tilting the wrist-to-wrist line clockwise rotates the map clockwise |

---

## Gesture classification

Each video frame is processed by `classifyGesture()`, which inspects MediaPipe's 21-landmark hand model to determine what gesture each hand is making.

### Fist

A fist is detected when **3 or more fingers are curled**. A finger is considered curled when its tip landmark is closer to the wrist than its MCP (knuckle) landmark, meaning the hand is closed inward. The thumb is not counted.

- **Left fist only** → panning mode
- **Right fist only** → zooming mode
- **Both fists** → rotating mode (takes priority over single-hand modes)

### None / idle

Any hand configuration that doesn't match a fist (e.g. open palm, pointing, peace sign, partially closed hand) returns `'none'`. If no recognised gesture is held, the system returns to idle after the grace period.

---

## State machine flow

The state machine sits between raw gesture classification and map interaction. It prevents accidental triggers using a dwell timer and prevents flickering using a grace period.

```
                  gesture classified
                        |
           ┌────────────▼────────────┐
           │          IDLE           │
           └────────────┬────────────┘
                        │ same gesture for actionDwellMs (default 80 ms)
           ┌────────────▼────────────┐
           │          ACTIVE         │  ← map interaction happens here
           │  (panning / zooming /   │
           │       rotating)         │
           └────────────┬────────────┘
                        │ gesture stops / changes
           ┌────────────▼────────────┐
           │       GRACE PERIOD      │  (releaseGraceMs, default 150 ms)
           └────────────┬────────────┘
                        │ grace period expires
           ┌────────────▼────────────┐
           │          IDLE           │
           └─────────────────────────┘
```

If the same gesture resumes during the grace period, the state machine returns to ACTIVE immediately without re-triggering the dwell timer.

---

## Tuning parameters

| Parameter | Default | Effect on gestures |
| --- | --- | --- |
| `actionDwellMs` | `80` | Lower = gestures activate faster; higher = more stable but slower |
| `releaseGraceMs` | `150` | Lower = returns to idle faster; higher = more forgiving when hand tracking briefly drops |
| `panDeadzonePx` | `10` | Lower = reacts to smaller hand movements; higher = filters more tremor |
| `zoomDeadzoneRatio` | `0.005` | Lower = reacts to smaller wrist movements; higher = requires more deliberate zoom gesture |
| `smoothingAlpha` | `0.5` | Lower = smoother but more latency; higher = snappier but more jitter |
| `minDetectionConfidence` | `0.65` | Lower = detects more hands in difficult conditions; higher = fewer false detections |
| `minTrackingConfidence` | `0.65` | Lower = maintains tracking in poor conditions; higher = drops tracking sooner |
| `minPresenceConfidence` | `0.60` | Lower = keeps hands in frame longer; higher = drops sooner when partially occluded |

See [Configuration](./configuration) for the full reference and code examples.
