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
    src: /openlayers-gesture-control-demo-v2.gif
    alt: Screen recording of the map gesture demo. An OpenLayers map with a small webcam preview; the user pans with the left fist or pinch, zooms with the right fist or pinch, and rotates with both hands, all in the browser via MediaPipe
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
    details: Drop-in gesture controller for OpenLayers maps. Pan with the left hand, zoom with the right hand, rotate with both.
  - title: Configurable
    details: Control webcam overlay position, size, and opacity. Tune gesture sensitivity, smoothing, and dead zones.
  - title: TypeScript
    details: Fully typed API. GestureMapControllerConfig, WebcamConfig, TuningConfig, and all core types are exported.
---
