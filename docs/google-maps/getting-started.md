---
title: Getting Started with Google Maps - Map Gesture Controls
description: Install and set up hand gesture controls for Google Maps in minutes. Step-by-step guide for integrating webcam-based gesture navigation.
head:
  - - meta
    - property: og:title
      content: Getting Started with Google Maps - Map Gesture Controls
  - - meta
    - property: og:description
      content: Install and set up hand gesture controls for Google Maps in minutes.
  - - meta
    - property: og:url
      content: https://sanderdesnaijer.github.io/map-gesture-controls/google-maps/getting-started
---

# Getting Started with Google Maps

## Installation

```bash
npm install @map-gesture-controls/google-maps @googlemaps/js-api-loader
```

You also need a Google Maps API key with the **Maps JavaScript API** enabled. See [Google's guide](https://developers.google.com/maps/documentation/javascript/get-api-key) for details.

For TypeScript support, install the type definitions:

```bash
npm install -D @types/google.maps
```

## Loading the Google Maps API

Use `@googlemaps/js-api-loader` to load the Maps JavaScript API before creating a map:

```ts
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: 'YOUR_API_KEY',
  version: 'weekly',
});

const { Map } = await loader.importLibrary('maps');
```

## Minimal working example

```ts
import { Loader } from '@googlemaps/js-api-loader';
import { GestureMapController } from '@map-gesture-controls/google-maps';
import '@map-gesture-controls/google-maps/style.css';

// 1. Load the Google Maps API
const loader = new Loader({ apiKey: 'YOUR_API_KEY', version: 'weekly' });
const { Map } = await loader.importLibrary('maps');

// 2. Create your Google Maps instance (mapId enables vector maps for rotation)
const map = new Map(document.getElementById('map')!, {
  center: { lat: 52.37, lng: 4.9 }, // Amsterdam
  zoom: 10,
  mapId: 'YOUR_MAP_ID',
});

// 3. Create the gesture controller
const controller = new GestureMapController({ map });

// 4. Start from a user gesture (browsers require a user interaction
//    before granting webcam access)
document.getElementById('start-btn')!.addEventListener('click', async () => {
  await controller.start();
});

document.getElementById('stop-btn')!.addEventListener('click', () => {
  controller.stop();
});
```

Your HTML needs a map container and buttons:

```html
<div id="map" style="width: 100%; height: 100vh;"></div>
<button id="start-btn">Start gesture control</button>
<button id="stop-btn">Stop</button>
```

## API key and Map ID setup

You need two things from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis):

1. **API key** -- go to Keys & Credentials, create a key with the Maps JavaScript API enabled
2. **Map ID** -- go to Map Management, create a Map ID with the **Vector** map type (required for rotation support)

### Local development

Create a `.env` file in your project root (already in `.gitignore`):

```
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
VITE_GOOGLE_MAPS_MAP_ID=your_map_id_here
```

Then reference them in your code:

```ts
const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  version: 'weekly',
});

const { Map } = await loader.importLibrary('maps');

const map = new Map(document.getElementById('map')!, {
  center: { lat: 52.37, lng: 4.9 },
  zoom: 10,
  mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
});
```

Restrict the API key to `http://localhost:*` for local use.

### Production

Create a separate API key restricted to your production domain:
- HTTP referrer restriction: `yourdomain.com/*`
- API restriction: Maps JavaScript API only
- Set a daily quota cap

The same Map ID can be used for both local and production.

### Why is a Map ID needed?

The `mapId` enables Google's vector map renderer (WebGL-based). Without it, Google Maps uses raster tiles, which do not support rotation via `heading`. Pan and zoom work without a Map ID, but rotation requires one.

## User-gesture requirement

Browsers enforce a policy that `getUserMedia()` (webcam access) can only be called in response to a user interaction such as a button click. Calling `controller.start()` directly on page load will throw a `NotAllowedError`. Always wire `start()` to a click handler.

## Model loading

`start()` triggers a one-time download of the MediaPipe hand landmarker WASM module and model weights (~10 MB combined). Subsequent calls to `start()` after `stop()` reuse the already-loaded model and are nearly instant.

## Differences from OpenLayers

The gesture controller API is identical between adapters. The only differences are:
- You import from `@map-gesture-controls/google-maps` instead of `@map-gesture-controls/ol`
- The `map` property in `GestureMapControllerConfig` expects a `google.maps.Map` instead of an `ol/Map`
- No coordinate projection needed: Google Maps uses `{ lat, lng }` directly

All configuration (webcam overlay, gesture tuning) is shared. See [Configuration](/configuration) for the full reference.

## Next steps

- [Configuration](/configuration): full reference for `webcam` and `tuning` options
- [Gestures](/gestures): how gestures are classified and tuned
- [Examples](/google-maps/examples): copy-pasteable recipes
- [API Reference](/api/google-maps): full API documentation
