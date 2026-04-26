import type { Bounds, LatLng, Map as LeafletMap, Point } from 'leaflet';
import type { StateMachineOutput } from '@map-gesture-controls/core';

type PositionedPane = HTMLElement & {
  _leaflet_pos?: {
    x: number;
    y: number;
  };
};

type ContinuousZoomLeafletMap = LeafletMap & {
  _move?: (center: LatLng, zoom: number, data?: { pinch: boolean; round: boolean }) => void;
  _moveStart?: (zoomChanged: boolean, noMoveStart: boolean) => void;
  _moveEnd?: (zoomChanged: boolean) => void;
};

type RotatableGridLayer = {
  options?: {
    keepBuffer?: number;
  };
  redraw?: () => void;
  _tileZoom?: number;
  _getTiledPixelBounds?: (center: LatLng) => Bounds;
  _mgcOriginalGetTiledPixelBounds?: (center: LatLng) => Bounds;
  _onMoveEnd?: () => void;
};

/**
 * LeafletGestureInteraction
 *
 * Translates GestureStateMachine output into Leaflet map movements.
 *
 * Pan:    left fist wrist delta -> screen-space pixel offset via map.panBy().
 *         Webcam is mirrored so dx is negated.
 * Zoom:   right fist wrist vertical delta -> zoom level change (up = in, down = out).
 *         Respects map min/max zoom. Uses Leaflet's continuous zoom path when
 *         available so the previous tile level stays stretched while loading.
 * Rotate: CSS transform on a dedicated rotate-pane inside .leaflet-map-pane.
 *         We cannot rotate .leaflet-map-pane directly because Leaflet's panBy
 *         overwrites its transform with translate3d on every update. Tile
 *         bounds are expanded from the rotated viewport corners so side tiles
 *         are loaded before they enter view.
 */
export class LeafletGestureInteraction {
  private static readonly minRotationTileBuffer = 8;
  private static readonly tileRefreshBearingStep = 5;

  private map: LeafletMap;
  private panScale = 3.5;
  // Wrist vertical delta is ~0.005-0.02 per frame at natural speed (same as pan).
  // zoomScale=15 ~ 1 zoom level/sec at 30fps with moderate hand movement.
  private zoomScale = 15.0;

  // Track zoom internally so fractional per-frame deltas accumulate
  // instead of being lost to Leaflet's integer-snap on getZoom().
  private currentZoom: number;

  // Zoom gesture lifecycle: _moveStart sets _animatingZoom=true so GridLayer
  // skips _onMoveEnd tile reloads during continuous zoom. settleZoom fires
  // _animateZoom when the gesture pauses, mirroring leaflet-rotate _onTouchEnd.
  private isZooming = false;
  private zoomSettleTimer: ReturnType<typeof setTimeout> | null = null;

  // Track bearing (degrees, clockwise from north) for CSS rotation.
  private currentBearing = 0;

  // Pane that holds the rotation transform. It sits inside .leaflet-map-pane
  // so Leaflet's pan transform remains independent from our rotation.
  private rotatePaneEl: HTMLElement | null = null;
  private rotatedPanes: HTMLElement[] = [];
  private patchedGridLayers = new Set<RotatableGridLayer>();
  private tileBufferPrepared = false;
  private lastTileRefreshBearing: number | null = null;

  /** rAF id so we coalesce many Leaflet "move" events to one pivot update per frame. */
  private refreshPivotRaf: number | null = null;

  /** Leaflet "move" fires whenever the view changes (pan, zoom, program moves). The rotation transform-origin
   * depends on the map panes position, so it must be updated after pan, not only when the bearing changes. */
  private readonly onMapMove = (): void => {
    if (!this.rotatePaneEl) return;
    if (this.refreshPivotRaf !== null) return;
    this.refreshPivotRaf = requestAnimationFrame(() => {
      this.refreshPivotRaf = null;
      this.applyRotationTransform();
    });
  };

  private readonly onZoomEnd = (): void => {
    this.currentZoom = this.map.getZoom();
  };

  constructor(map: LeafletMap) {
    this.map = map;
    this.currentZoom = map.getZoom();
    map.on('move', this.onMapMove);
    map.on('zoomend', this.onZoomEnd);
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
    this.currentBearing += (delta * 180) / Math.PI;
    // Normalise to 0-360 range
    this.currentBearing = ((this.currentBearing % 360) + 360) % 360;

    this.prepareGridLayersForRotation();
    this.applyRotationTransform();
    this.refreshGridLayersForRotation();
  }

  /**
   * Leaflet's tile range is based on the unrotated viewport. Rotation can expose
   * diagonal side areas, so grid layers need bounds based on the rotated corners.
   */
  private prepareGridLayersForRotation(): void {
    if (this.tileBufferPrepared) return;

    this.map.eachLayer((layer) => {
      const gridLayer = layer as RotatableGridLayer;
      const currentBuffer = gridLayer.options?.keepBuffer;
      if (currentBuffer !== undefined && currentBuffer < LeafletGestureInteraction.minRotationTileBuffer) {
        gridLayer.options!.keepBuffer = LeafletGestureInteraction.minRotationTileBuffer;
      }

      if (!gridLayer._getTiledPixelBounds || gridLayer._mgcOriginalGetTiledPixelBounds) return;

      gridLayer._mgcOriginalGetTiledPixelBounds = gridLayer._getTiledPixelBounds;
      gridLayer._getTiledPixelBounds = (center) => this.getRotatedTiledPixelBounds(gridLayer, center);
      this.patchedGridLayers.add(gridLayer);
    });

    this.tileBufferPrepared = true;
  }

  private getRotatedTiledPixelBounds(layer: RotatableGridLayer, center: LatLng): Bounds {
    const originalBounds = layer._mgcOriginalGetTiledPixelBounds!.call(layer, center);
    if (!this.currentBearing) return originalBounds;

    const tileZoom = layer._tileZoom ?? this.map.getZoom();
    const mapState = this.map as LeafletMap & {
      _animatingZoom?: boolean;
      _animateToZoom?: number;
    };
    const mapZoom = mapState._animatingZoom
      ? Math.max(mapState._animateToZoom ?? this.map.getZoom(), this.map.getZoom())
      : this.map.getZoom();
    const scale = this.map.getZoomScale(mapZoom, tileZoom);
    const pixelCenter = this.map.project(center, tileZoom).floor();
    const size = this.map.getSize();
    const bearingRad = (this.currentBearing * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(bearingRad));
    const absSin = Math.abs(Math.sin(bearingRad));
    const rotatedWidth = absCos * size.x + absSin * size.y;
    const rotatedHeight = absSin * size.x + absCos * size.y;
    const halfSize = size.multiplyBy(0);
    halfSize.x = rotatedWidth / (scale * 2);
    halfSize.y = rotatedHeight / (scale * 2);
    const rotatedBounds = Object.create(Object.getPrototypeOf(originalBounds)) as Bounds & {
      min: Point;
      max: Point;
    };

    rotatedBounds.min = pixelCenter.subtract(halfSize);
    rotatedBounds.max = pixelCenter.add(halfSize);
    return rotatedBounds;
  }

  private refreshGridLayersForRotation(): void {
    if (
      this.lastTileRefreshBearing !== null &&
      this.getBearingDelta(this.currentBearing, this.lastTileRefreshBearing) <
        LeafletGestureInteraction.tileRefreshBearingStep
    ) {
      return;
    }

    this.patchedGridLayers.forEach((layer) => {
      if (layer._onMoveEnd) {
        layer._onMoveEnd();
      } else {
        layer.redraw?.();
      }
    });
    this.lastTileRefreshBearing = this.currentBearing;
  }

  private getBearingDelta(a: number, b: number): number {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
  }

  /**
   * Apply the current bearing as a CSS transform on the rotate-pane wrapper.
   * The pivot is recomputed each frame via updateRotatePanePivot() to account
   * for Leaflet's map-pane offset, keeping rotation centred on the viewport.
   */
  private applyRotationTransform(): void {
    const pane = this.getOrCreateRotatePane();
    if (!pane) return;
    this.updateRotatePanePivot(pane);
    pane.style.transform = `rotate(${-this.currentBearing}deg)`;
  }

  private updateRotatePanePivot(rotatePane: HTMLElement): void {
    const mapPane = this.map.getPane('mapPane') as PositionedPane | undefined;
    if (!mapPane) return;

    const mapPanePos = mapPane._leaflet_pos ?? { x: 0, y: 0 };
    const size = this.map.getSize();
    rotatePane.style.transformOrigin = `${size.x / 2 - mapPanePos.x}px ${size.y / 2 - mapPanePos.y}px`;
  }

  /**
   * Lazily creates a rotate pane inside .leaflet-map-pane. Leaflet continues to
   * translate the map pane for panning while the tile and overlay panes keep a
   * separate rotation transform.
   */
  private getOrCreateRotatePane(): HTMLElement | null {
    if (this.rotatePaneEl) return this.rotatePaneEl;

    const mapPane = this.map.getPane('mapPane') as HTMLElement | undefined;
    const tilePane = this.map.getPane('tilePane') as HTMLElement | undefined;
    const overlayPane = this.map.getPane('overlayPane') as HTMLElement | undefined;
    if (!mapPane) return null;

    const rotatePane = document.createElement('div');

    rotatePane.className = 'leaflet-rotate-pane';
    rotatePane.style.position = 'absolute';
    rotatePane.style.top = '0';
    rotatePane.style.left = '0';
    rotatePane.style.width = '100%';
    rotatePane.style.height = '100%';

    mapPane.insertBefore(rotatePane, tilePane ?? overlayPane ?? null);
    this.rotatedPanes = [tilePane, overlayPane].filter((pane): pane is HTMLElement => !!pane);
    this.rotatedPanes.forEach((pane) => rotatePane.appendChild(pane));

    this.rotatePaneEl = rotatePane;
    return rotatePane;
  }

  /**
   * Zoom map. delta > 0 = zoom in, delta < 0 = zoom out.
   * Clamps to map's min/max zoom levels.
   *
   * Mirrors the leaflet-rotate pinch-zoom lifecycle:
   *   1. _moveStart(true, false) once -- sets _animatingZoom=true so GridLayer's
   *      _onMoveEnd exits early and doesn't reload tiles on every frame.
   *   2. _move(..., { pinch, round:false }) each frame -- CSS-scales existing tiles.
   *   3. _animateZoom / _resetView after a short idle -- loads new-zoom tiles with
   *      parent/child retention so grey boxes never appear.
   *
   * Falls back to the public setZoom() API if Leaflet removes these internal hooks.
   */
  private zoom(delta: number): void {
    this.currentZoom += delta * this.zoomScale;

    const minZoom = this.map.getMinZoom();
    const maxZoom = this.map.getMaxZoom();
    this.currentZoom = Math.max(minZoom, Math.min(maxZoom, this.currentZoom));

    const continuousZoomMap = this.map as ContinuousZoomLeafletMap;
    if (typeof continuousZoomMap._move === 'function') {
      if (!this.isZooming) {
        continuousZoomMap._moveStart?.(true, false);
        this.isZooming = true;
      }

      continuousZoomMap._move(this.map.getCenter(), this.currentZoom, { pinch: true, round: false });

      if (this.zoomSettleTimer !== null) clearTimeout(this.zoomSettleTimer);
      this.zoomSettleTimer = setTimeout(() => {
        this.zoomSettleTimer = null;
        this.isZooming = false;
        this.settleZoom(continuousZoomMap);
      }, 150);
      return;
    }

    this.map.setZoom(this.currentZoom, { animate: false });
  }

  private settleZoom(continuousZoomMap: ContinuousZoomLeafletMap): void {
    const center = this.map.getCenter();
    const intZoom = Math.round(this.currentZoom);

    if (continuousZoomMap._move && continuousZoomMap._moveEnd) {
      // Snap to integer zoom via _move, which fires 'zoom' → GridLayer event handler
      // _resetView → _setView with noPrune=false so _retainParent keeps parent-zoom
      // tiles visible while new ones load. Crucially this does NOT fire 'viewprereset'
      // (only map._resetView does that), so _invalidateAll is never called and no
      // grey boxes appear. Then _moveEnd fires 'zoomend'/'moveend' to close the gesture.
      continuousZoomMap._move(center, intZoom);
      continuousZoomMap._moveEnd(true);
    } else {
      this.map.setZoom(intZoom, { animate: false });
    }
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
    this.prepareGridLayersForRotation();
    this.applyRotationTransform();
    this.refreshGridLayersForRotation();
  }

  /**
   * Sync internal state with the map's current values.
   * Call after external changes (e.g. reset pose, user scroll)
   * so subsequent gesture deltas start from the correct baseline.
   */
  syncFromMap(): void {
    if (this.zoomSettleTimer !== null) {
      clearTimeout(this.zoomSettleTimer);
      this.zoomSettleTimer = null;
      this.isZooming = false;
    }
    this.currentZoom = this.map.getZoom();
  }

  /**
   * Remove the rotate-pane wrapper and restore .leaflet-map-pane to the container.
   * Call when gesture control stops so the DOM is left in a clean state.
   */
  destroy(): void {
    this.map.off('move', this.onMapMove);
    this.map.off('zoomend', this.onZoomEnd);
    if (this.refreshPivotRaf !== null) {
      cancelAnimationFrame(this.refreshPivotRaf);
      this.refreshPivotRaf = null;
    }
    if (this.zoomSettleTimer !== null) {
      clearTimeout(this.zoomSettleTimer);
      this.zoomSettleTimer = null;
      this.isZooming = false;
    }
    if (!this.rotatePaneEl) return;

    const mapPane = this.map.getPane('mapPane') as HTMLElement | undefined;

    if (mapPane) {
      this.rotatedPanes.forEach((pane) => mapPane.insertBefore(pane, this.rotatePaneEl));
    }
    this.rotatePaneEl.remove();
    this.rotatePaneEl = null;
    this.rotatedPanes = [];
    this.patchedGridLayers.forEach((layer) => {
      if (layer._mgcOriginalGetTiledPixelBounds) {
        layer._getTiledPixelBounds = layer._mgcOriginalGetTiledPixelBounds;
        delete layer._mgcOriginalGetTiledPixelBounds;
      }
    });
    this.patchedGridLayers.clear();
    this.tileBufferPrepared = false;
    this.lastTileRefreshBearing = null;
    this.currentBearing = 0;
  }
}
