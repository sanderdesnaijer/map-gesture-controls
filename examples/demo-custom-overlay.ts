import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM.js';
import { fromLonLat } from 'ol/proj.js';
import { GestureMapController } from '@map-gesture-controls/ol';

const map = new Map({
  target: 'map',
  layers: [new TileLayer({ source: new OSM() })],
  view: new View({ center: fromLonLat([139.69, 35.69]), zoom: 8 }),
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
      webcam: { position: 'bottom-left', width: 200, height: 150, opacity: 0.6 },
    });
    await ctrl.start();
    btnStop.disabled = false;
    status.textContent = 'Gestures active';
  } catch {
    status.textContent = 'Error – check console';
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
