---
layout: home
title: Map Gesture Controls - Hand Gesture Navigation for OpenLayers, Google Maps, and Leaflet
description: Control OpenLayers, Google Maps, and Leaflet with hand gestures using your webcam. Browser-native, privacy-first, powered by MediaPipe. No backend required.
head:
  - - meta
    - property: og:title
      content: Map Gesture Controls - Hand Gesture Navigation for OpenLayers, Google Maps, and Leaflet
  - - meta
    - property: og:description
      content: Control OpenLayers, Google Maps, and Leaflet with hand gestures using your webcam. Browser-native, privacy-first, powered by MediaPipe.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/

hero:
  name: 'Map Gesture Controls'
  text: 'Control maps with your hands'
  tagline: 'Browser-native hand gesture controls for OpenLayers, Google Maps, and Leaflet. Powered by MediaPipe. No backend required.'
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
    icon: 🌐
    details: Runs entirely in the browser using MediaPipe WASM. No server, no WebSocket, no data leaves the device. Privacy-first by design.
  - title: Configurable
    icon: ⚙️
    details: Control webcam overlay position, size, and opacity. Tune gesture sensitivity, smoothing, and dead zones to match your use case.
  - title: TypeScript
    icon: 🔷
    details: Fully typed API. GestureMapControllerConfig, WebcamConfig, TuningConfig, and all core types are exported.
---

<div class="map-libraries-section">

## Choose Your Map Library {.map-libraries-heading}

Map Gesture Controls works with three popular mapping libraries. Pick the one you already use and get started in minutes. Same gesture API, same configuration, different map renderer.

<div class="map-library-cards">

<div class="map-library-card">
  <div class="map-library-icon">🗺️</div>
  <h3>OpenLayers</h3>
  <p>Full-featured gesture controller for <strong>OpenLayers</strong> maps. Supports pan, zoom, and rotation with hand tracking. Ideal for GIS applications and advanced mapping workflows.</p>
  <code>npm install @map-gesture-controls/ol</code>
  <div class="map-library-links">
    <a href="/map-gesture-controls/ol/getting-started" class="map-library-link primary">Getting Started</a>
    <a href="/map-gesture-controls/ol/examples" class="map-library-link">Examples</a>
    <a href="/map-gesture-controls/api/ol" class="map-library-link">API Reference</a>
  </div>
</div>

<div class="map-library-card">
  <div class="map-library-icon">📍</div>
  <h3>Google Maps</h3>
  <p>Drop-in gesture controller for the <strong>Google Maps JavaScript API</strong>. Same gestures, same config. Perfect for apps already using Google Maps Platform services.</p>
  <code>npm install @map-gesture-controls/google-maps</code>
  <div class="map-library-links">
    <a href="/map-gesture-controls/google-maps/getting-started" class="map-library-link primary">Getting Started</a>
    <a href="/map-gesture-controls/google-maps/examples" class="map-library-link">Examples</a>
    <a href="/map-gesture-controls/api/google-maps" class="map-library-link">API Reference</a>
  </div>
</div>

<div class="map-library-card">
  <div class="map-library-icon">🍃</div>
  <h3>Leaflet</h3>
  <p>Lightweight gesture controller for <strong>Leaflet</strong> maps. Works with OpenStreetMap tiles out of the box, no API key needed. Great for open-source and community projects.</p>
  <code>npm install @map-gesture-controls/leaflet</code>
  <div class="map-library-links">
    <a href="/map-gesture-controls/leaflet/getting-started" class="map-library-link primary">Getting Started</a>
    <a href="/map-gesture-controls/leaflet/examples" class="map-library-link">Examples</a>
    <a href="/map-gesture-controls/api/leaflet" class="map-library-link">API Reference</a>
  </div>
</div>

</div>
</div>
