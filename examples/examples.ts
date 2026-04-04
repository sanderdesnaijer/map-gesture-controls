import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';

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
