import type Map from 'ol/Map.js';
import { getCenter } from 'ol/extent.js';
import type { StateMachineOutput } from '@map-gesture-controls/core';

/**
 * OpenLayersGestureInteraction
 *
 * Translates GestureStateMachine output into actual OL map movements.
 *
 * Pan:  left fist wrist delta → screen-space pixel offset → new map center.
 *       Uses getPixelFromCoordinate/getCoordinateFromPixel so pan direction
 *       always matches what the user sees on screen, regardless of map rotation.
 * Zoom: right fist wrist vertical delta → zoom level change (up = in, down = out)
 */
export class OpenLayersGestureInteraction {
  private map: Map;
  private panScale = 2.0;
  // Wrist vertical delta is ~0.005–0.02 per frame at natural speed (same as pan).
  // zoomScale=15 ≈ 1 zoom level/sec at 30fps with moderate hand movement.
  private zoomScale = 15.0;

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
    if (output.rotateDelta !== null) {
      this.rotate(output.rotateDelta);
    }
  }

  /**
   * Pan map by a normalised delta (0–1 range from webcam space).
   * dx/dy are hand movement as a fraction of frame width/height.
   *
   * Translates the current map center by the pixel offset in screen space,
   * then converts back to map coordinates. This keeps pan direction consistent
   * with what the user sees on screen regardless of map rotation.
   */
  private pan(dx: number, dy: number): void {
    const view = this.map.getView();

    const size = this.map.getSize();
    if (!size) return;

    const center = view.getCenter();
    if (!center) return;

    const centerPixel = this.map.getPixelFromCoordinate(center);
    if (!centerPixel) return;

    const [mapW, mapH] = size;
    // Convert normalised webcam delta to screen pixels.
    // Webcam is mirrored so negate dx.
    const pixelDx = -dx * mapW * this.panScale;
    const pixelDy = dy * mapH * this.panScale;

    const newCoord = this.map.getCoordinateFromPixel([
      centerPixel[0] - pixelDx,
      centerPixel[1] - pixelDy,
    ]);
    if (!newCoord) return;

    view.setCenter(newCoord);
  }

  /**
   * Rotate map. delta in radians: positive = clockwise, negative = counter-clockwise.
   */
  private rotate(delta: number): void {
    const view = this.map.getView();
    const currentRotation = view.getRotation() ?? 0;
    view.setRotation(currentRotation + delta);
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
