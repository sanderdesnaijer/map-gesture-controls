import Map from "ol/Map.js";
import View from "ol/View.js";
import TileLayer from "ol/layer/Tile.js";
import OSM from "ol/source/OSM.js";
import { fromLonLat } from "ol/proj.js";

import { GestureMapController } from "@map-gesture-controls/ol";

// ── Map setup ─────────────────────────────────────────────────────────────────

const map = new Map({
  target: "map",
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: fromLonLat([4.9, 52.37]), // Amsterdam
    zoom: 12,
  }),
});
console.log("welcome back commander");
// ── Gesture controller ────────────────────────────────────────────────────────

let gestureCtrl: GestureMapController | null = null;

const btnStart = document.getElementById("btn-start") as HTMLButtonElement;
const btnStop = document.getElementById("btn-stop") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLSpanElement;

function setStatus(msg: string): void {
  statusEl.textContent = msg;
}

btnStart.addEventListener("click", async () => {
  btnStart.disabled = true;
  setStatus("Requesting webcam…");

  try {
    gestureCtrl = new GestureMapController({
      map,
      webcam: {
        mode: "corner",
        position: "bottom-right",
        width: 320,
        height: 240,
        opacity: 0.9,
      },
      debug: false,
    });

    await gestureCtrl.start();

    btnStop.disabled = false;
    setStatus("Gestures active");
  } catch (err) {
    console.error(err);
    setStatus("Error – check console");
    btnStart.disabled = false;
  }
});

btnStop.addEventListener("click", () => {
  gestureCtrl?.stop();
  gestureCtrl = null;
  btnStop.disabled = true;
  btnStart.disabled = false;
  setStatus("Gestures disabled");
});
