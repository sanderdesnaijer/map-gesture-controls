---
title: Custom Gestures - Map Gesture Controls
description: Extend Map Gesture Controls with custom hand gestures. Hook into the classification and application pipeline to add your own gesture behaviors.
head:
  - - meta
    - property: og:title
      content: Custom Gestures - Map Gesture Controls
  - - meta
    - property: og:description
      content: Extend the gesture pipeline with custom hand gestures and behaviors.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/advanced/custom-gestures
---

# Custom Gestures

::: warning Placeholder
This page is a placeholder for future documentation. The API described here reflects the current internal structure and may change as custom gesture support is formalised in an upcoming release.
:::

## Overview

The gesture pipeline has two well-defined extension points: gesture **classification** and gesture **application**. You can hook into either layer depending on how much of the built-in behaviour you want to keep.

---

## Extension point 1: classifyGesture

`classifyGesture(landmarks: HandLandmark[]): GestureType` is the function that maps 21 MediaPipe landmarks to a gesture label. The current implementation returns `'fist'`, `'pinch'`, `'openPalm'`, or `'none'`.

To support additional gesture types, you can:

1. Define a new `GestureType` union that extends the existing one.
2. Write your own classification function with the same signature.
3. Pass it to a custom `GestureStateMachine` subclass that calls your function instead of (or in addition to) the built-in one.

```ts
// Example: recognise a pointing gesture
function classifyExtended(landmarks: HandLandmark[]): ExtendedGestureType {
  const base = classifyGesture(landmarks);
  if (base !== 'none') return base;

  // Custom: index finger extended, others curled
  const indexExtended = isExtended(landmarks, LANDMARKS.INDEX_TIP, LANDMARKS.INDEX_MCP);
  const othersDown = isCurled(landmarks, LANDMARKS.MIDDLE_TIP, LANDMARKS.MIDDLE_MCP)
    && isCurled(landmarks, LANDMARKS.RING_TIP, LANDMARKS.RING_MCP);

  if (indexExtended && othersDown) return 'pointing';
  return 'none';
}
```

---

## Extension point 2: OpenLayersGestureInteraction.apply()

`OpenLayersGestureInteraction.apply(output: StateMachineOutput)` is called on every frame with the state machine's output. You can subclass `OpenLayersGestureInteraction` and override `apply()` to intercept output before it reaches the map:

```ts
class MyCustomInteraction extends OpenLayersGestureInteraction {
  apply(output: StateMachineOutput): void {
    if (output.mode === 'rotating') {
      // Custom rotate behaviour, e.g. snap to 45-degree increments
      console.log('Rotate delta (radians):', output.rotateDelta);
    }
    // Call super to continue with default behaviour
    super.apply(output);
  }
}
```

---

## Extension point 3: replacing GestureStateMachine

For full control, bypass `GestureMapController` entirely and wire up the pipeline manually using `GestureController` from core:

```ts
import {
  GestureController,
  GestureStateMachine,
  DEFAULT_TUNING_CONFIG,
} from '@map-gesture-controls/core';
import { OpenLayersGestureInteraction } from '@map-gesture-controls/ol';

const tuning = { ...DEFAULT_TUNING_CONFIG, actionDwellMs: 50 };
const stateMachine = new GestureStateMachine(tuning);
const interaction = new OpenLayersGestureInteraction(map);

const controller = new GestureController(tuning, (frame) => {
  const output = stateMachine.update(frame);
  interaction.apply(output);
});

await controller.init();
controller.start();
```

This gives you full control over every step. You can replace `GestureStateMachine` with your own implementation, add logging, or fan out to multiple interactions.
