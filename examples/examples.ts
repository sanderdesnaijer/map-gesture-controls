import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController as LeafletGestureMapController } from '@map-gesture-controls/leaflet';

function makeMap(targetId: string, center: [number, number], zoom: number): Map {
  return new Map({
    target: targetId,
    layers: [new TileLayer({ source: new OSM() })],
    view: new View({ center: fromLonLat(center), zoom }),
  });
}

// ── 1. Basic ──────────────────────────────────────────────────────────────────

{
  const map = makeMap('map-basic', [4.9, 52.37], 6);
  let ctrl: GestureMapController | null = null;

  const btnStart = document.getElementById('basic-start') as HTMLButtonElement;
  const btnStop  = document.getElementById('basic-stop')  as HTMLButtonElement;
  const status   = document.getElementById('basic-status') as HTMLSpanElement;

  btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    status.textContent = 'Starting…';
    try {
      ctrl = new GestureMapController({ map });
      await ctrl.start();
      btnStop.disabled = false;
      status.textContent = 'Gestures active';
    } catch {
      status.textContent = 'Error: check console';
      btnStart.disabled = false;
    }
  });

  btnStop.addEventListener('click', () => {
    ctrl?.stop();
    ctrl = null;
    btnStop.disabled = true;
    btnStart.disabled = false;
    status.textContent = 'Gestures off';
  });
}

// ── 2. Toggle ─────────────────────────────────────────────────────────────────

{
  const map = makeMap('map-toggle', [2.35, 48.85], 6);
  const ctrl   = new GestureMapController({ map });
  const btn    = document.getElementById('toggle-btn')    as HTMLButtonElement;
  const status = document.getElementById('toggle-status') as HTMLSpanElement;
  let active = false;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    if (active) {
      ctrl.stop();
      active = false;
      btn.textContent = 'Start gesture control';
      status.textContent = 'Gestures off';
    } else {
      status.textContent = 'Starting…';
      try {
        await ctrl.start();
        active = true;
        btn.textContent = 'Stop gesture control';
        status.textContent = 'Gestures active';
      } catch {
        status.textContent = 'Error: check console';
      }
    }
    btn.disabled = false;
  });
}

// ── 3. Custom overlay ─────────────────────────────────────────────────────────

{
  const map = makeMap('map-overlay', [139.69, 35.69], 8);
  let ctrl: GestureMapController | null = null;

  const btnStart = document.getElementById('overlay-start') as HTMLButtonElement;
  const btnStop  = document.getElementById('overlay-stop')  as HTMLButtonElement;
  const status   = document.getElementById('overlay-status') as HTMLSpanElement;

  btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    status.textContent = 'Starting…';
    try {
      ctrl = new GestureMapController({
        map,
        webcam: { position: 'bottom-left', width: 200, height: 150, opacity: 0.6 },
      });
      await ctrl.start();
      btnStop.disabled = false;
      status.textContent = 'Gestures active';
    } catch {
      status.textContent = 'Error: check console';
      btnStart.disabled = false;
    }
  });

  btnStop.addEventListener('click', () => {
    ctrl?.stop();
    ctrl = null;
    btnStop.disabled = true;
    btnStart.disabled = false;
    status.textContent = 'Gestures off';
  });
}

// ── 4. Sensitivity ────────────────────────────────────────────────────────────

{
  const map = makeMap('map-sensitivity', [-74.0, 40.71], 6);
  let ctrl: GestureMapController | null = null;

  const btnStart = document.getElementById('sensitivity-start') as HTMLButtonElement;
  const btnStop  = document.getElementById('sensitivity-stop')  as HTMLButtonElement;
  const status   = document.getElementById('sensitivity-status') as HTMLSpanElement;

  btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    status.textContent = 'Starting…';
    try {
      ctrl = new GestureMapController({
        map,
        tuning: { actionDwellMs: 50, releaseGraceMs: 100, panDeadzonePx: 5, zoomDeadzoneRatio: 0.003 },
      });
      await ctrl.start();
      btnStop.disabled = false;
      status.textContent = 'Gestures active';
    } catch {
      status.textContent = 'Error: check console';
      btnStart.disabled = false;
    }
  });

  btnStop.addEventListener('click', () => {
    ctrl?.stop();
    ctrl = null;
    btnStop.disabled = true;
    btnStart.disabled = false;
    status.textContent = 'Gestures off';
  });
}

// ── Leaflet helper ───────────────────────────────────────────────────────────

function makeLeafletMap(targetId: string, center: [number, number], zoom: number): L.Map {
  const map = L.map(targetId).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    keepBuffer: 4,
    updateWhenZooming: false,
    updateWhenIdle: true,
  }).addTo(map);
  return map;
}

// ── 5. Leaflet Basic ─────────────────────────────────────────────────────────

{
  const map = makeLeafletMap('map-leaflet-basic', [52.37, 4.9], 6);
  let ctrl: LeafletGestureMapController | null = null;

  const btnStart = document.getElementById('leaflet-basic-start') as HTMLButtonElement;
  const btnStop  = document.getElementById('leaflet-basic-stop')  as HTMLButtonElement;
  const status   = document.getElementById('leaflet-basic-status') as HTMLSpanElement;

  btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    status.textContent = 'Starting…';
    try {
      ctrl = new LeafletGestureMapController({ map });
      await ctrl.start();
      btnStop.disabled = false;
      status.textContent = 'Gestures active';
    } catch {
      status.textContent = 'Error: check console';
      btnStart.disabled = false;
    }
  });

  btnStop.addEventListener('click', () => {
    ctrl?.stop();
    ctrl = null;
    btnStop.disabled = true;
    btnStart.disabled = false;
    status.textContent = 'Gestures off';
  });
}

// ── 6. Leaflet Toggle ────────────────────────────────────────────────────────

{
  const map = makeLeafletMap('map-leaflet-toggle', [48.85, 2.35], 6);
  const ctrl   = new LeafletGestureMapController({ map });
  const btn    = document.getElementById('leaflet-toggle-btn')    as HTMLButtonElement;
  const status = document.getElementById('leaflet-toggle-status') as HTMLSpanElement;
  let active = false;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    if (active) {
      ctrl.stop();
      active = false;
      btn.textContent = 'Start gesture control';
      status.textContent = 'Gestures off';
    } else {
      status.textContent = 'Starting…';
      try {
        await ctrl.start();
        active = true;
        btn.textContent = 'Stop gesture control';
        status.textContent = 'Gestures active';
      } catch {
        status.textContent = 'Error: check console';
      }
    }
    btn.disabled = false;
  });
}

// ── 7. Leaflet Custom overlay ────────────────────────────────────────────────

{
  const map = makeLeafletMap('map-leaflet-overlay', [35.69, 139.69], 8);
  let ctrl: LeafletGestureMapController | null = null;

  const btnStart = document.getElementById('leaflet-overlay-start') as HTMLButtonElement;
  const btnStop  = document.getElementById('leaflet-overlay-stop')  as HTMLButtonElement;
  const status   = document.getElementById('leaflet-overlay-status') as HTMLSpanElement;

  btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    status.textContent = 'Starting…';
    try {
      ctrl = new LeafletGestureMapController({
        map,
        webcam: { position: 'bottom-left', width: 200, height: 150, opacity: 0.6 },
      });
      await ctrl.start();
      btnStop.disabled = false;
      status.textContent = 'Gestures active';
    } catch {
      status.textContent = 'Error: check console';
      btnStart.disabled = false;
    }
  });

  btnStop.addEventListener('click', () => {
    ctrl?.stop();
    ctrl = null;
    btnStop.disabled = true;
    btnStart.disabled = false;
    status.textContent = 'Gestures off';
  });
}

// ── 8. Leaflet Sensitivity ───────────────────────────────────────────────────

{
  const map = makeLeafletMap('map-leaflet-sensitivity', [40.71, -74.0], 6);
  let ctrl: LeafletGestureMapController | null = null;

  const btnStart = document.getElementById('leaflet-sensitivity-start') as HTMLButtonElement;
  const btnStop  = document.getElementById('leaflet-sensitivity-stop')  as HTMLButtonElement;
  const status   = document.getElementById('leaflet-sensitivity-status') as HTMLSpanElement;

  btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    status.textContent = 'Starting…';
    try {
      ctrl = new LeafletGestureMapController({
        map,
        tuning: { actionDwellMs: 50, releaseGraceMs: 100, panDeadzonePx: 5, zoomDeadzoneRatio: 0.003 },
      });
      await ctrl.start();
      btnStop.disabled = false;
      status.textContent = 'Gestures active';
    } catch {
      status.textContent = 'Error: check console';
      btnStart.disabled = false;
    }
  });

  btnStop.addEventListener('click', () => {
    ctrl?.stop();
    ctrl = null;
    btnStop.disabled = true;
    btnStart.disabled = false;
    status.textContent = 'Gestures off';
  });
}
