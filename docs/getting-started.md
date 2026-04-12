---
title: Getting Started - Map Gesture Controls
description: Choose your mapping library and set up hand gesture controls in minutes. Supports OpenLayers and Google Maps.
head:
  - - meta
    - property: og:title
      content: Getting Started with Map Gesture Controls
  - - meta
    - property: og:description
      content: Choose your mapping library and set up hand gesture controls in minutes.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/getting-started
---

# Getting Started

Map Gesture Controls works with multiple mapping libraries. Pick yours to get started:

- [OpenLayers](./ol/getting-started) -- the original adapter, using OpenStreetMap tiles
- [Google Maps](./google-maps/getting-started) -- the Google Maps JavaScript API adapter

All configuration (webcam overlay, gesture tuning) is shared across adapters. See [Configuration](./configuration) after setup.

## How it works

1. **Webcam capture**: opens the user's camera and feeds each frame to MediaPipe Hand Landmarker, which returns 21 3-D landmarks per detected hand.
2. **Gesture classification**: classifies each frame -- left fist or pinch = pan, right fist or pinch = zoom, both hands = rotate, otherwise idle.
3. **Map integration**: translates hand deltas into map API calls (pan, zoom, rotate/heading).

Camera data never leaves the device. Everything runs in the browser via MediaPipe WASM.

## Requirements

- A modern browser with WebGL and `getUserMedia` (webcam permission)
- One of the supported mapping libraries (OpenLayers 10.x or Google Maps JavaScript API)
