import type { Map as LeafletMap } from 'leaflet';
import type { StateMachineOutput } from '@map-gesture-controls/core';

type BufferedGridLayer = {
  options?: {
    keepBuffer?: number;
  };
  redraw?: () => void;
};

/**
 * LeafletGestureInteraction
 *
 * Translates GestureStateMachine output into Leaflet map movements.
 *
 * Pan:    left fist wrist delta -> screen-space pixel offset via map.panBy().
 *         Webcam is mirrored so dx is negated.
 * Zoom:   right fist wrist vertical delta -> zoom level change (up = in, down = out).
 *         Respects map min/max zoom. Uses setZoom() with { animate: false } to avoid
 *         competing animations when called every frame.
 * Rotate: CSS transform on a dedicated rotate-pane wrapper div that wraps .leaflet-map-pane.
 *         We cannot rotate .leaflet-map-pane directly because Leaflet's panBy overwrites its
 *         transform with translate3d on every update. The wrapper div is invisible to Leaflet
 *         so our rotation persists independently. Pan deltas are counter-rotated by the current
 *         bearing so screen direction always matches the user's hand movement.
 */
export class LeafletGestureInteraction {
  private static readonly minRotationTileBuffer = 8;

  private map: LeafletMap;
  private panScale = 2.0;
  // Wrist vertical delta is ~0.005-0.02 per frame at natural speed (same as pan).
  // zoomScale=15 ~ 1 zoom level/sec at 30fps with moderate hand movement.
  private zoomScale = 15.0;

  // Track zoom internally so fractional per-frame deltas accumulate
  // instead of being lost to Leaflet's integer-snap on getZoom().
  private currentZoom: number;

  // Track bearing (degrees, clockwise from north) for CSS rotation.
  private currentBearing = 0;

  // Wrapper div that holds the rotation transform. Sits between the map container
  // and .leaflet-map-pane so Leaflet's own transforms don't overwrite ours.
  private rotatePaneEl: HTMLElement | null = null;
  private tileBufferPrepared = false;

  constructor(map: LeafletMap) {
    this.map = map;
    this.currentZoom = map.getZoom();
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
   * Uses map.panBy() with { animate: false } so per-frame calls don't
   * queue up competing animations. Webcam is mirrored so dx is negated.
   * When the map is rotated, pixel deltas are counter-rotated so panning
   * direction matches the on-screen visual direction.
   */
  private pan(dx: number, dy: number): void {
    const size = this.map.getSize();
    if (!size) return;

    // Convert normalised webcam delta to screen pixels.
    // Negate dx because webcam is mirrored.
    const screenDx = -dx * size.x * this.panScale;
    const screenDy = dy * size.y * this.panScale;

    // Counter-rotate pixel deltas by the current bearing so that panning
    // direction matches the rotated on-screen view.
    const bearingRad = (this.currentBearing * Math.PI) / 180;
    const cosB = Math.cos(bearingRad);
    const sinB = Math.sin(bearingRad);
    const pixelDx = screenDx * cosB + screenDy * sinB;
    const pixelDy = -screenDx * sinB + screenDy * cosB;

    this.map.panBy([pixelDx, pixelDy], { animate: false });
  }

  /**
   * Rotate map via CSS transform on the rotate-pane wrapper.
   * delta is in radians: positive = clockwise.
   * Converts to degrees and accumulates in currentBearing.
   */
  private rotate(delta: number): void {
    this.prepareTileBufferForRotation();

    this.currentBearing += (delta * 180) / Math.PI;
    // Normalise to 0-360 range
    this.currentBearing = ((this.currentBearing % 360) + 360) % 360;

    this.applyRotationTransform();
  }

  /**
   * Leaflet's tile range is based on the unrotated viewport. Rotation can expose
   * diagonal side areas, so keep extra surrounding tiles loaded before rotating.
   */
  private prepareTileBufferForRotation(): void {
    if (this.tileBufferPrepared) return;

    this.map.eachLayer((layer) => {
      const gridLayer = layer as BufferedGridLayer;
      const currentBuffer = gridLayer.options?.keepBuffer;
      if (currentBuffer === undefined) return;
      if (currentBuffer >= LeafletGestureInteraction.minRotationTileBuffer) return;

      gridLayer.options!.keepBuffer = LeafletGestureInteraction.minRotationTileBuffer;
      gridLayer.redraw?.();
    });

    this.tileBufferPrepared = true;
  }

  /**
   * Apply the current bearing as a CSS transform on the rotate-pane wrapper.
   * Transform-origin is 50% 50% (set on wrapper creation) so rotation always
   * pivots around the visible viewport center regardless of pan position.
   */
  private applyRotationTransform(): void {
    const pane = this.getOrCreateRotatePane();
    if (!pane) return;
    pane.style.transform = `rotate(${-this.currentBearing}deg)`;
  }

  /**
   * Lazily creates a wrapper div around .leaflet-map-pane that holds the rotation
   * transform. We cannot rotate the map pane directly because Leaflet's panBy
   * overwrites its transform with translate3d on every frame.
   */
  private getOrCreateRotatePane(): HTMLElement | null {
    if (this.rotatePaneEl) return this.rotatePaneEl;

    const container = this.map.getContainer() as HTMLElement;
    const mapPane = this.map.getPane('mapPane') as HTMLElement | undefined;
    if (!container || !mapPane) return null;

    const rotatePane = document.createElement('div');
    rotatePane.className = 'leaflet-rotate-pane';
    rotatePane.style.position = 'absolute';
    rotatePane.style.top = '0';
    rotatePane.style.left = '0';
    rotatePane.style.width = '100%';
    rotatePane.style.height = '100%';
    rotatePane.style.transformOrigin = '50% 50%';

    container.insertBefore(rotatePane, mapPane);
    rotatePane.appendChild(mapPane);

    this.rotatePaneEl = rotatePane;
    return rotatePane;
  }

  /**
   * Zoom map. delta > 0 = zoom in, delta < 0 = zoom out.
   * Clamps to map's min/max zoom levels.
   * Uses setZoom with { animate: false } to prevent per-frame animation stacking.
   */
  private zoom(delta: number): void {
    this.currentZoom += delta * this.zoomScale;

    const minZoom = this.map.getMinZoom();
    const maxZoom = this.map.getMaxZoom();
    this.currentZoom = Math.max(minZoom, Math.min(maxZoom, this.currentZoom));

    this.map.setZoom(this.currentZoom, { animate: false });
  }

  /**
   * Get the current bearing in degrees (0-360).
   */
  getBearing(): number {
    return this.currentBearing;
  }

  /**
   * Set the bearing directly (e.g. for reset). Applies the CSS transform immediately.
   */
  setBearing(degrees: number): void {
    this.currentBearing = ((degrees % 360) + 360) % 360;
    this.applyRotationTransform();
  }

  /**
   * Sync internal state with the map's current values.
   * Call after external changes (e.g. reset pose, user scroll)
   * so subsequent gesture deltas start from the correct baseline.
   */
  syncFromMap(): void {
    this.currentZoom = this.map.getZoom();
  }

  /**
   * Remove the rotate-pane wrapper and restore .leaflet-map-pane to the container.
   * Call when gesture control stops so the DOM is left in a clean state.
   */
  destroy(): void {
    if (!this.rotatePaneEl) return;

    const container = this.map.getContainer() as HTMLElement;
    const mapPane = this.map.getPane('mapPane') as HTMLElement | undefined;

    if (mapPane && container) {
      // insertBefore automatically detaches mapPane from rotatePaneEl first
      container.insertBefore(mapPane, this.rotatePaneEl);
    }
    this.rotatePaneEl.remove();
    this.rotatePaneEl = null;
    this.currentBearing = 0;
  }
}
