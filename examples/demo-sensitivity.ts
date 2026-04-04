import './fullscreen-toolbar';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';

const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({ center: fromLonLat([-74.0, 40.71]), zoom: 6 }),
});
map.updateSize();

let ctrl: GestureMapController | null = null;
const btnStart = document.getElementById('btn-start') as HTMLButtonElement;
const btnStop  = document.getElementById('btn-stop')  as HTMLButtonElement;
const status   = document.getElementById('status')    as HTMLSpanElement;

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
