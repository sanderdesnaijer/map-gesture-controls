import type { StateMachineOutput } from '@map-gesture-controls/core';

/**
 * GoogleMapsGestureInteraction
 *
 * Translates GestureStateMachine output into Google Maps API calls.
 * Uses moveCamera() for all operations to avoid Google Maps' built-in
 * smooth animations, which cause lag when applied every frame.
 *
 * Tracks zoom and heading internally so that small per-frame deltas
 * accumulate correctly. Google Maps quantizes values returned by
 * getZoom()/getHeading(), which would swallow fractional increments
 * if we read them back each frame.
 *
 * Listens for zoom_changed / heading_changed so that external changes
 * (built-in controls, wheel zoom, other app code) are picked up
 * before the next gesture delta is applied.
 *
 * Pan:  left fist wrist delta -> pixel offset converted to lat/lng delta,
 *       rotated by current heading so screen direction always matches.
 *       Webcam is mirrored so dx is negated.
 * Zoom: right fist wrist vertical delta -> zoom level change (up = in, down = out).
 */
export class GoogleMapsGestureInteraction {
  private map: google.maps.Map;
  private panScale = 2.0;
  // Wrist vertical delta is ~0.005-0.02 per frame at natural speed.
  // zoomScale=15 ~ 1 zoom level/sec at 30fps with moderate hand movement.
  private zoomScale = 15.0;

  // Internal state to avoid Google Maps quantization eating small deltas.
  private currentZoom: number;
  private currentHeading: number;

  // Track whether we caused the last change so we can skip our own events.
  private applyingChange = false;

  // Store listener handles so we can clean up.
  private zoomListener: google.maps.MapsEventListener | null = null;
  private headingListener: google.maps.MapsEventListener | null = null;

  constructor(map: google.maps.Map) {
    this.map = map;
    this.currentZoom = map.getZoom() ?? 10;
    this.currentHeading = map.getHeading() ?? 0;

    this.zoomListener = map.addListener('zoom_changed', () => {
      if (!this.applyingChange) {
        this.currentZoom = map.getZoom() ?? this.currentZoom;
      }
    });
    this.headingListener = map.addListener('heading_changed', () => {
      if (!this.applyingChange) {
        this.currentHeading = map.getHeading() ?? this.currentHeading;
      }
    });
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
   * Pan map by a normalised delta (0-1 range from webcam space).
   * dx/dy are hand movement as a fraction of frame width/height.
   *
   * Converts pixel offsets to lat/lng deltas using the current zoom level,
   * then rotates by the current heading so that pan direction always
   * matches what the user sees on screen (even on rotated vector maps).
   * Applies via moveCamera() for instant, animation-free updates.
   * Webcam is mirrored so dx is negated.
   */
  private pan(dx: number, dy: number): void {
    const center = this.map.getCenter();
    if (!center) return;

    const div = this.map.getDiv();
    const mapW = div.clientWidth;
    const mapH = div.clientHeight;

    // Convert normalised webcam delta to screen pixels.
    // Negate dx because webcam is mirrored.
    const screenDx = -dx * mapW * this.panScale;
    const screenDy = dy * mapH * this.panScale;

    // Rotate pixel deltas by heading so pan matches screen direction
    // on rotated maps. Heading is in degrees, clockwise from north.
    const headingRad = (this.currentHeading * Math.PI) / 180;
    const cosH = Math.cos(headingRad);
    const sinH = Math.sin(headingRad);
    const pixelDx = screenDx * cosH - screenDy * sinH;
    const pixelDy = screenDx * sinH + screenDy * cosH;

    // Convert pixel offset to lat/lng offset.
    // At zoom level z, each pixel covers 360 / (256 * 2^z) degrees of longitude.
    const degreesPerPixel = 360 / (256 * Math.pow(2, this.currentZoom));
    const dLng = pixelDx * degreesPerPixel;
    // Latitude degrees per pixel varies by latitude (Mercator),
    // but for small deltas the cosine correction is sufficient.
    const latRad = (center.lat() * Math.PI) / 180;
    const dLat = -pixelDy * degreesPerPixel / Math.cos(latRad);

    this.map.moveCamera({
      center: { lat: center.lat() + dLat, lng: center.lng() + dLng },
    });
  }

  /**
   * Rotate map heading. delta in radians: positive = clockwise.
   * Google Maps uses heading in degrees (0-360).
   */
  private rotate(delta: number): void {
    this.currentHeading += (delta * 180) / Math.PI;
    this.applyingChange = true;
    this.map.moveCamera({
      heading: this.currentHeading,
    });
    this.applyingChange = false;
  }

  /**
   * Sync internal state with the map's current values.
   * Call after external changes (e.g. reset pose) so that
   * subsequent gesture deltas start from the correct baseline.
   */
  syncFromMap(): void {
    this.currentZoom = this.map.getZoom() ?? this.currentZoom;
    this.currentHeading = this.map.getHeading() ?? this.currentHeading;
  }

  /**
   * Remove map event listeners. Call when disposing the interaction
   * to avoid leaking listeners on the map instance.
   */
  dispose(): void {
    this.zoomListener?.remove();
    this.headingListener?.remove();
    this.zoomListener = null;
    this.headingListener = null;
  }

  /**
   * Zoom map. delta > 0 = zoom in, delta < 0 = zoom out.
   * Tracks zoom internally so fractional per-frame deltas accumulate
   * instead of being lost to Google Maps' integer-snap on getZoom().
   */
  private zoom(delta: number): void {
    this.currentZoom += delta * this.zoomScale;
    // Clamp to Google Maps' valid range (0-22)
    this.currentZoom = Math.max(0, Math.min(22, this.currentZoom));

    this.applyingChange = true;
    this.map.moveCamera({
      zoom: this.currentZoom,
    });
    this.applyingChange = false;
  }
}
