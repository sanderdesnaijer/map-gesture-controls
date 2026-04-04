---
title: Gestures - Map Gesture Controls
description: Learn the hand gestures for controlling maps. Right fist or pinch to zoom, left fist or pinch to pan, both hands to rotate, pray to reset. Understand gesture modes, recognition pipeline, and smoothing.
head:
  - - meta
    - property: og:title
      content: Supported Hand Gestures - Map Gesture Controls
  - - meta
    - property: og:description
      content: Learn the hand gestures for controlling OpenLayers maps. Right fist or pinch to zoom, left fist or pinch to pan, both hands to rotate, pray to reset.
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
| **Panning** | Left hand fist or pinch (right hand absent or open) | Left wrist movement pans the map in any direction |
| **Zooming** | Right hand fist or pinch (left hand absent or open) | Moving right wrist up zooms in; moving down zooms out |
| **Rotating** | Both hands fist or pinch simultaneously | Tilting the wrist-to-wrist line clockwise rotates the map clockwise |

## Reset gesture (OpenLayers only)

The reset is a separate action layered on top of the mode state machine, available in the OpenLayers integration. It does not correspond to a state-machine mode.

| Gesture | How to trigger | Map effect |
| --- | --- | --- |
| **Pray / namaste** | Both hands brought together (neither fist nor pinch), held for 1 second | Resets pan, zoom, and rotation back to the initial view |

> **How to reset:** Bring your hands together in a prayer pose, wrists close, palms facing each other. Hold for 1 second while the progress bar fills. The map snaps back to where it started.

---

## Gesture classification

Each video frame is processed by a per-hand classifier, which inspects MediaPipe's 21-landmark hand model to determine what gesture each hand is making. Both **fist** and **pinch** trigger the same map actions, use whichever feels more natural.

### Fist

A fist is detected when **3 or more fingers are curled**. A finger is considered curled when its tip landmark is closer to the wrist than its MCP (knuckle) landmark. The thumb is not counted.

### Pinch

A pinch is detected when the **thumb tip and index tip are within 25% of the hand size** apart. The other fingers do not need to be extended, so a relaxed pinch is fine. Once a pinch is registered, the hand stays classified as `'pinch'` until the fingers open beyond **35% of hand size** (hysteresis). This wider release threshold prevents rapid toggling when fingers hover near the boundary.

Fist takes priority: if all fingers are curled, the gesture is classified as `'fist'` rather than `'pinch'`.

### Mode priority

- **Both hands active** (fist or pinch) → rotating mode (takes priority over single-hand modes)
- **Right hand active only** → zooming mode
- **Left hand active only** → panning mode

### None / idle

Any hand configuration that does not match a fist or pinch (e.g. open palm, pointing, peace sign, partially closed hand) returns `'none'`. If no recognised gesture is held, the system returns to idle after the grace period.

### Reset (pray pose)

The reset gesture is detected purely from landmark geometry, outside the classifier. When both hands are tracked and neither is making a fist or pinch, the system checks whether the two wrists are within 30% of normalised screen space of each other — the natural result of bringing your hands together. If that pose is held continuously for **1 second**, the map view snaps back to its initial centre, zoom level, and rotation. A progress bar in the webcam overlay fills while the pose is held, giving clear visual feedback.

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
