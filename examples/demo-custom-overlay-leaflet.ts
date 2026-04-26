import './fullscreen-toolbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController } from '@map-gesture-controls/leaflet';

const map = L.map('map').setView([35.69, 139.69], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  keepBuffer: 4,
  updateWhenZooming: false,
  updateWhenIdle: true,
}).addTo(map);

let ctrl: GestureMapController | null = null;
const btnStart = document.getElementById('btn-start') as HTMLButtonElement;
const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLSpanElement;

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
