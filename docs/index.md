---
layout: home
title: Map Gesture Controls - Hand Gesture Navigation for OpenLayers Maps
description: Control OpenLayers maps with hand gestures using your webcam. Browser-native, privacy-first, powered by MediaPipe. No backend required.
head:
  - - meta
    - property: og:title
      content: Map Gesture Controls - Hand Gesture Navigation for OpenLayers Maps
  - - meta
    - property: og:description
      content: Control OpenLayers maps with hand gestures using your webcam. Browser-native, privacy-first, powered by MediaPipe.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/

hero:
  name: "Map Gesture Controls"
  text: "Control maps with your hands"
  tagline: "Browser-native hand gesture controls for OpenLayers. Powered by MediaPipe. No backend required."
  image:
    src: /og-image.png
    alt: Hand gesture controlling an OpenLayers map - pan with a fist, zoom with two open hands, powered by MediaPipe in the browser
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/sanderdesnaijer/map-gesture-controls

features:
  - title: Browser-native
    details: Runs entirely in the browser using MediaPipe WASM. No server, no WebSocket, no data leaves the device.
  - title: OpenLayers integration
    details: Drop-in gesture controller for OpenLayers maps. Pan with a fist, zoom with two open hands.
  - title: Configurable
    details: Control webcam overlay position, size, and opacity. Tune gesture sensitivity, smoothing, and dead zones.
  - title: TypeScript
    details: Fully typed API. GestureMapControllerConfig, WebcamConfig, TuningConfig, and all core types are exported.
---
