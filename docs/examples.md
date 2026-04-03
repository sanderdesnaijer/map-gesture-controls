# Examples

All examples are self-contained TypeScript snippets. Each assumes you have an HTML element with the appropriate `id` and `@map-gesture-controls/ol/style.css` imported in your entry file.

::: tip Local preview of embedded demos
The iframes below load from the built demo app under `/map-gesture-controls/demo/`. They work as-is on GitHub Pages. For local `docs:dev`, build the demos first:

```sh
npm run docs:build-demos && npm run docs:dev
```
:::

---

## 1. Basic OSM setup

A complete map with gesture controller using OpenStreetMap tiles.

<iframe
  src="/map-gesture-controls/demo/demo-basic.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  loading="lazy"
  title="Basic OSM setup demo"
></iframe>

```ts
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';
import '@map-gesture-controls/ol/style.css';

const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({
    center: fromLonLat([0, 0]),
    zoom: 2,
  }),
});

const controller = new GestureMapController({ map });

document.getElementById('start-btn')!.addEventListener('click', () => {
  controller.start();
});
```

HTML:

```html
<div id="map" style="width: 100%; height: 100vh;"></div>
<button id="start-btn">Start</button>
```

---

## 2. Toggle button with disabled state

Start and stop gesture control from a single toggle button. Disable the button while the controller is loading.

<iframe
  src="/map-gesture-controls/demo/demo-toggle.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  loading="lazy"
  title="Toggle button with disabled state demo"
></iframe>

```ts
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';
import '@map-gesture-controls/ol/style.css';

const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({ center: fromLonLat([4.9, 52.37]), zoom: 10 }),
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

HTML:

```html
<div id="map" style="width: 100%; height: 100vh;"></div>
<button id="toggle-btn">Start gesture control</button>
```

---

## 3. Custom webcam overlay position

Move the webcam overlay to the bottom-left corner, make it smaller, and reduce opacity.

<iframe
  src="/map-gesture-controls/demo/demo-custom-overlay.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  loading="lazy"
  title="Custom webcam overlay position demo"
></iframe>

```ts
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';
import '@map-gesture-controls/ol/style.css';

const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({ center: fromLonLat([0, 0]), zoom: 2 }),
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

document.getElementById('start-btn')!.addEventListener('click', () => {
  controller.start();
});
```

---

## 4. Adjusting gesture sensitivity

Lower the dwell time for faster gesture confirmation, and tighten the dead zones for more responsive pan and zoom.

<iframe
  src="/map-gesture-controls/demo/demo-sensitivity.html"
  style="width:100%;min-height:420px;border:1px solid var(--vp-c-divider);border-radius:8px;"
  allow="camera; microphone"
  loading="lazy"
  title="Adjusting gesture sensitivity demo"
></iframe>

```ts
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';
import '@map-gesture-controls/ol/style.css';

const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({ center: fromLonLat([0, 0]), zoom: 2 }),
});

const controller = new GestureMapController({
  map,
  tuning: {
    actionDwellMs: 50,        // confirm gestures faster (default 80 ms)
    releaseGraceMs: 100,      // shorter grace period (default 150 ms)
    panDeadzonePx: 5,         // react to smaller hand movements (default 10)
    zoomDeadzoneRatio: 0.003, // finer zoom control (default 0.005)
  },
});

document.getElementById('start-btn')!.addEventListener('click', () => {
  controller.start();
});
```
