---
title: Leaflet Examples - Map Gesture Controls
description: Live demos and code examples for hand gesture map controls with Leaflet. Basic setup, sensitivity tuning, custom overlays, and toggle controls.
head:
  - - meta
    - property: og:title
      content: Leaflet Examples - Map Gesture Controls
  - - meta
    - property: og:description
      content: Live demos and code examples for hand gesture map controls with Leaflet.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/leaflet/examples
---

# Leaflet Examples

All examples are self-contained TypeScript snippets. Each assumes you have an HTML element with the appropriate `id`, and both `leaflet/dist/leaflet.css` and `@map-gesture-controls/leaflet/style.css` imported in your entry file.

::: tip Local preview of embedded demos
The iframes below load from the built demo app under `/map-gesture-controls/demo/`. They work as-is on GitHub Pages. For local `docs:dev`, build the demos first:

```sh
npm run docs:build-demos && npm run docs:dev
```

Use **Open full screen** under each demo to open it in a new tab with the full toolbar (Enable / Disable and Fullscreen).
:::

---

## 1. Basic Leaflet setup

A complete map with gesture controller using OpenStreetMap tiles. No API key needed.

<div class="demo-embed">
  <p class="demo-actions">
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-basic-leaflet.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-basic-leaflet.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Basic Leaflet setup demo"
></iframe>
</div>

```ts
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController } from '@map-gesture-controls/leaflet';
import '@map-gesture-controls/leaflet/style.css';

const map = L.map('map').setView([52.37, 4.9], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

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
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-controls-overview-leaflet.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-controls-overview-leaflet.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Controls overview demo (Leaflet)"
></iframe>
</div>

```ts
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController } from '@map-gesture-controls/leaflet';
import '@map-gesture-controls/leaflet/style.css';

const map = L.map('map').setView([52.37, 4.9], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

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
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-toggle-leaflet.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-toggle-leaflet.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Toggle button demo (Leaflet)"
></iframe>
</div>

```ts
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController } from '@map-gesture-controls/leaflet';
import '@map-gesture-controls/leaflet/style.css';

const map = L.map('map').setView([48.85, 2.35], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

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
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-custom-overlay-leaflet.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-custom-overlay-leaflet.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Custom webcam overlay demo (Leaflet)"
></iframe>
</div>

```ts
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController } from '@map-gesture-controls/leaflet';
import '@map-gesture-controls/leaflet/style.css';

const map = L.map('map').setView([35.69, 139.69], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

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
    <a class="demo-open-btn" href="/map-gesture-controls/demo/demo-sensitivity-leaflet.html" target="_blank" rel="noopener noreferrer">Open full screen</a>
  </p>
<iframe
  src="/map-gesture-controls/demo/demo-sensitivity-leaflet.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  allowfullscreen
  loading="lazy"
  title="Gesture sensitivity demo (Leaflet)"
></iframe>
</div>

```ts
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController } from '@map-gesture-controls/leaflet';
import '@map-gesture-controls/leaflet/style.css';

const map = L.map('map').setView([40.71, -74.0], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const controller = new GestureMapController({
  map,
  tuning: {
    actionDwellMs: 50,        // confirm gestures faster (default 80 ms)
    releaseGraceMs: 100,      // shorter grace period (default 150 ms)
    panDeadzonePx: 0,         // react to slow hand movements directly
    zoomDeadzoneRatio: 0.003, // finer zoom control (default 0.005)
  },
});

document.getElementById('start-btn')!.addEventListener('click', async () => {
  await controller.start();
});
```
