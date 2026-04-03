import type Map from 'ol/Map.js';
import { getCenter } from 'ol/extent.js';
import type { StateMachineOutput } from '@map-gesture-controls/core';

/**
 * OpenLayersGestureInteraction
 *
 * Translates GestureStateMachine output into actual OL map movements.
 *
 * Pan:  normalised hand delta → pixel offset → new map center
 * Zoom: two-hand index-finger distance delta → zoom level change (hands apart = zoom in)
 */
export class OpenLayersGestureInteraction {
  private map: Map;
  private panScale = 2.0;
  // Two-hand distance delta is ~0.005–0.02 per frame at natural speed.
  // zoomScale=4.0 ≈ 1.2 zoom levels/sec at 30fps. Adjust to taste.
  private zoomScale = 4.0;

  constructor(map: Map) {
    this.map = map;
  }

  /**
   * Apply a state machine output frame to the map.
   * Safe to call every animation frame.
   */
  apply(output: StateMachineOutput): void {
    if (output.panDelta) {
      this.pan(output.panDelta.x, output.panDelta.y);
    }
    if (output.zoomDelta !== null) {
      this.zoom(output.zoomDelta);
    }
  }

  /**
   * Pan map by a normalised delta (0–1 range from webcam space).
   * dx/dy are hand movement as a fraction of frame width/height.
   */
  private pan(dx: number, dy: number): void {
    const view = this.map.getView();
    const resolution = view.getResolution();
    if (resolution === undefined) return;

    const size = this.map.getSize();
    if (!size) return;

    const [mapW, mapH] = size;
    // Convert normalised webcam delta to map pixels, then to map coords.
    // Webcam is mirrored so negate dx.
    const pixelDx = -dx * mapW * this.panScale;
    const pixelDy = dy * mapH * this.panScale;

    const center = view.getCenter();
    if (!center) return;

    view.setCenter([
      center[0] - pixelDx * resolution,
      center[1] + pixelDy * resolution,
    ]);
  }

  /**
   * Zoom map. delta > 0 = zoom in, delta < 0 = zoom out.
   */
  private zoom(delta: number): void {
    const view = this.map.getView();
    const currentZoom = view.getZoom();
    if (currentZoom === undefined) return;

    const extent = view.calculateExtent(this.map.getSize());
    const zoomCenter = getCenter(extent);

    view.animate({
      zoom: currentZoom + delta * this.zoomScale,
      center: zoomCenter,
      duration: 0,
    });
  }
}
