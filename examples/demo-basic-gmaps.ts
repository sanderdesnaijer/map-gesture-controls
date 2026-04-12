import './fullscreen-toolbar';
import { Loader } from '@googlemaps/js-api-loader';
import { GestureMapController } from '@map-gesture-controls/google-maps';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? '';

(async () => {
  const loader = new Loader({ apiKey, version: 'weekly' });
  const { Map } = await loader.importLibrary('maps');

  const map = new Map(document.getElementById('map') as HTMLElement, {
    center: { lat: 52.37, lng: 4.9 },
    zoom: 6,
    mapId,
  });

  let ctrl: GestureMapController | null = null;
  const btnStart = document.getElementById('btn-start') as HTMLButtonElement;
  const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
  const status = document.getElementById('status') as HTMLSpanElement;

  btnStart.addEventListener('click', async () => {
    btnStart.disabled = true;
    status.textContent = 'Starting\u2026';
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
})();
