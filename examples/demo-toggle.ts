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
  view: new View({ center: fromLonLat([2.35, 48.85]), zoom: 6 }),
});
map.updateSize();

const ctrl   = new GestureMapController({ map });
const btn    = document.getElementById('toggle-btn') as HTMLButtonElement;
const status = document.getElementById('status')     as HTMLSpanElement;
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
