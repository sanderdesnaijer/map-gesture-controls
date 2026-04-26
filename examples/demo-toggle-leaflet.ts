import './fullscreen-toolbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GestureMapController } from '@map-gesture-controls/leaflet';

const map = L.map('map').setView([48.85, 2.35], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  keepBuffer: 4,
  updateWhenZooming: false,
  updateWhenIdle: true,
}).addTo(map);

const ctrl = new GestureMapController({ map });
const btn = document.getElementById('toggle-btn') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLSpanElement;
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
