---
title: Google Maps Examples - Map Gesture Controls
description: Live demos and code examples for hand gesture map controls with Google Maps. Basic setup, sensitivity tuning, custom overlays, and toggle controls.
head:
  - - meta
    - property: og:title
      content: Google Maps Examples - Map Gesture Controls
  - - meta
    - property: og:description
      content: Live demos and code examples for hand gesture map controls with Google Maps.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/google-maps/examples
---

# Google Maps Examples

All examples are self-contained TypeScript snippets. Each assumes you have an HTML element with the appropriate `id`, a valid Google Maps API key, and `@map-gesture-controls/google-maps/style.css` imported in your entry file.

::: tip Local preview of embedded demos
The iframes below load from the built demo app under `/map-gesture-controls/demo/`. They work as-is on GitHub Pages. For local `docs:dev`, build the demos first:

```sh
npm run docs:build-demos && npm run docs:dev
```

Use **Open full screen** under each demo to open it in a new tab with the full toolbar.
:::

::: warning API key required
The Google Maps demos require a valid API key. If the map shows a "For development purposes only" watermark or fails to load, the key may be missing or invalid.
:::

---

## 1. Basic Google Maps setup

A complete map with gesture controller using Google Maps.

<div class="demo-embed">
  <p class="demo-actions">
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-basic-gmaps.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-basic-gmaps.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Basic Google Maps setup demo"
></iframe>
</div>

```ts
import { Loader } from '@googlemaps/js-api-loader';
import { GestureMapController } from '@map-gesture-controls/google-maps';
import '@map-gesture-controls/google-maps/style.css';

const loader = new Loader({ apiKey: 'YOUR_API_KEY', version: 'weekly' });
const { Map } = await loader.importLibrary('maps');

const map = new Map(document.getElementById('map')!, {
  center: { lat: 52.37, lng: 4.9 },
  zoom: 6,
  mapId: 'YOUR_MAP_ID', // vector map, required for rotation
});

const controller = new GestureMapController({ map });

document.getElementById('start-btn')!.addEventListener('click', async () => {
  await controller.start();
});
```

HTML:

```html
<div id="map" style="width: 100%; height: 100vh;"></div>
<button id="start-btn">Start</button>
```

---

## 2. Controls overview

A map with a built-in gesture legend so users can see all available gestures at a glance. Useful as a starting point for any real-world integration.

<div class="demo-embed">
  <p class="demo-actions">
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-controls-overview-gmaps.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-controls-overview-gmaps.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Controls overview demo (Google Maps)"
></iframe>
</div>

```ts
import { Loader } from '@googlemaps/js-api-loader';
import { GestureMapController } from '@map-gesture-controls/google-maps';
import '@map-gesture-controls/google-maps/style.css';

const loader = new Loader({ apiKey: 'YOUR_API_KEY', version: 'weekly' });
const { Map } = await loader.importLibrary('maps');

const map = new Map(document.getElementById('map')!, {
  center: { lat: 52.37, lng: 4.9 },
  zoom: 6,
  mapId: 'YOUR_MAP_ID', // vector map, required for rotation
});

const controller = new GestureMapController({
  map,
  webcam: {
    mode: 'corner',
    position: 'bottom-right',
    width: 240,
    height: 180,
    opacity: 0.8,
  },
});

document.getElementById('btn-start')!.addEventListener('click', async () => {
  await controller.start();
});
document.getElementById('btn-stop')!.addEventListener('click', () => {
  controller.stop();
});
```

---

## 3. Toggle button with disabled state

Start and stop gesture control from a single toggle button.

<div class="demo-embed">
  <p class="demo-actions">
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-toggle-gmaps.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-toggle-gmaps.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Toggle button demo (Google Maps)"
></iframe>
</div>

```ts
import { Loader } from '@googlemaps/js-api-loader';
import { GestureMapController } from '@map-gesture-controls/google-maps';
import '@map-gesture-controls/google-maps/style.css';

const loader = new Loader({ apiKey: 'YOUR_API_KEY', version: 'weekly' });
const { Map } = await loader.importLibrary('maps');

const map = new Map(document.getElementById('map')!, {
  center: { lat: 48.85, lng: 2.35 },
  zoom: 6,
  mapId: 'YOUR_MAP_ID', // vector map, required for rotation
});

const controller = new GestureMapController({ map });
const btn = document.getElementById('toggle-btn') as HTMLButtonElement;
let active = false;

btn.addEventListener('click', async () => {
  btn.disabled = true;

  if (active) {
    controller.stop();
    active = false;
    btn.textContent = 'Start gesture control';
  } else {
    await controller.start();
    active = true;
    btn.textContent = 'Stop gesture control';
  }

  btn.disabled = false;
});
```

---

## 4. Custom webcam overlay position

Move the webcam overlay to the bottom-left corner, make it smaller, and reduce opacity.

<div class="demo-embed">
  <p class="demo-actions">
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-custom-overlay-gmaps.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-custom-overlay-gmaps.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Custom webcam overlay demo (Google Maps)"
></iframe>
</div>

```ts
import { Loader } from '@googlemaps/js-api-loader';
import { GestureMapController } from '@map-gesture-controls/google-maps';
import '@map-gesture-controls/google-maps/style.css';

const loader = new Loader({ apiKey: 'YOUR_API_KEY', version: 'weekly' });
const { Map } = await loader.importLibrary('maps');

const map = new Map(document.getElementById('map')!, {
  center: { lat: 35.69, lng: 139.69 },
  zoom: 8,
  mapId: 'YOUR_MAP_ID', // vector map, required for rotation
});

const controller = new GestureMapController({
  map,
  webcam: {
    position: 'bottom-left',
    width: 200,
    height: 150,
    opacity: 0.6,
  },
});

document.getElementById('start-btn')!.addEventListener('click', async () => {
  await controller.start();
});
```

---

## 5. Adjusting gesture sensitivity

Lower the dwell time for faster gesture confirmation, and tighten the dead zones for more responsive pan and zoom.

<div class="demo-embed">
  <p class="demo-actions">
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-sensitivity-gmaps.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-sensitivity-gmaps.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Gesture sensitivity demo (Google Maps)"
></iframe>
</div>

```ts
import { Loader } from '@googlemaps/js-api-loader';
import { GestureMapController } from '@map-gesture-controls/google-maps';
import '@map-gesture-controls/google-maps/style.css';

const loader = new Loader({ apiKey: 'YOUR_API_KEY', version: 'weekly' });
const { Map } = await loader.importLibrary('maps');

const map = new Map(document.getElementById('map')!, {
  center: { lat: 40.71, lng: -74.0 },
  zoom: 6,
  mapId: 'YOUR_MAP_ID', // vector map, required for rotation
});

const controller = new GestureMapController({
  map,
  tuning: {
    actionDwellMs: 50,        // confirm gestures faster (default 80 ms)
    releaseGraceMs: 100,      // shorter grace period (default 150 ms)
    panDeadzonePx: 5,         // add a small tremor filter (default 0)
    zoomDeadzoneRatio: 0.003, // finer zoom control (default 0.005)
  },
});

document.getElementById('start-btn')!.addEventListener('click', async () => {
  await controller.start();
});
```
