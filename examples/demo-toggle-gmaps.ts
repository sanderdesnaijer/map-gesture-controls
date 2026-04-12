import './fullscreen-toolbar';
import { Loader } from '@googlemaps/js-api-loader';
import { GestureMapController } from '@map-gesture-controls/google-maps';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? '';

(async () => {
  const loader = new Loader({ apiKey, version: 'weekly' });
  const { Map } = await loader.importLibrary('maps');

  const map = new Map(document.getElementById('map') as HTMLElement, {
    center: { lat: 48.85, lng: 2.35 },
    zoom: 6,
    mapId,
  });

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
      status.textContent = 'Starting\u2026';
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
})();
