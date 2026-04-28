import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LeafletGestureInteraction } from './LeafletGestureInteraction.js';
import type { StateMachineOutput } from '@map-gesture-controls/core';

// --- Minimal fake DOM element -----------------------------------------------------------
// Supports the subset of DOM operations used by getOrCreateRotatePane:
// insertBefore, appendChild, remove, querySelector, querySelectorAll, contains.

interface FakeEl {
  className: string;
  style: Record<string, string>;
  _children: FakeEl[];
  _parent: FakeEl | null;
  appendChild(child: FakeEl): FakeEl;
  insertBefore(newNode: FakeEl, ref: FakeEl | null): FakeEl;
  remove(): void;
  querySelector(selector: string): FakeEl | null;
  querySelectorAll(selector: string): FakeEl[];
  contains(child: FakeEl): boolean;
}

function makeFakeEl(className = ''): FakeEl {
  const el: FakeEl = {
    className,
    style: {},
    _children: [],
    _parent: null,
    appendChild(child) {
      if (child._parent) {
        const idx = child._parent._children.indexOf(child);
        if (idx !== -1) child._parent._children.splice(idx, 1);
      }
      child._parent = el;
      el._children.push(child);
      return child;
    },
    insertBefore(newNode, ref) {
      if (newNode._parent) {
        const idx = newNode._parent._children.indexOf(newNode);
        if (idx !== -1) newNode._parent._children.splice(idx, 1);
      }
      const refIdx = ref ? el._children.indexOf(ref) : -1;
      if (refIdx === -1) {
        el._children.push(newNode);
      } else {
        el._children.splice(refIdx, 0, newNode);
      }
      newNode._parent = el;
      return newNode;
    },
    remove() {
      if (el._parent) {
        const idx = el._parent._children.indexOf(el);
        if (idx !== -1) el._parent._children.splice(idx, 1);
        el._parent = null;
      }
    },
    querySelector(selector) {
      const cls = selector.startsWith('.') ? selector.slice(1) : null;
      const find = (parent: FakeEl): FakeEl | null => {
        for (const child of parent._children) {
          if (cls && child.className === cls) return child;
          const found = find(child);
          if (found) return found;
        }
        return null;
      };
      return find(el);
    },
    querySelectorAll(selector) {
      const cls = selector.startsWith('.') ? selector.slice(1) : null;
      const results: FakeEl[] = [];
      const findAll = (parent: FakeEl) => {
        for (const child of parent._children) {
          if (cls && child.className === cls) results.push(child);
          findAll(child);
        }
      };
      findAll(el);
      return results;
    },
    contains(child) {
      const check = (parent: FakeEl): boolean =>
        parent._children.some((c) => c === child || check(c));
      return check(el);
    },
  };
  return el;
}

// --- Minimal Leaflet map mock -----------------------------------------------------------

class FakeBounds {
  constructor(
    public min: FakePoint,
    public max: FakePoint,
  ) {}
}

class FakePoint {
  constructor(
    public x: number,
    public y: number,
  ) {}

  floor(): FakePoint {
    return this;
  }

  subtract(point: FakePoint): FakePoint {
    return new FakePoint(this.x - point.x, this.y - point.y);
  }

  add(point: FakePoint): FakePoint {
    return new FakePoint(this.x + point.x, this.y + point.y);
  }

  multiplyBy(value: number): FakePoint {
    return new FakePoint(this.x * value, this.y * value);
  }

  unscaleBy(point: FakePoint): FakePoint {
    return new FakePoint(this.x / point.x, this.y / point.y);
  }
}

function makeMapMock(
  opts: {
    center?: [number, number];
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    size?: { x: number; y: number };
    keepBuffer?: number;
  } = {},
) {
  const zoom = opts.zoom ?? 5;
  const minZoom = opts.minZoom ?? 0;
  const maxZoom = opts.maxZoom ?? 18;
  const size = opts.size ?? { x: 800, y: 600 };

  const panBy = vi.fn();
  const setZoom = vi.fn();
  const _move = vi.fn();
  const setView = vi.fn();
  const redraw = vi.fn();
  const onMoveEnd = vi.fn();
  const tileLayer = {
    options: {
      keepBuffer: opts.keepBuffer ?? 2,
    },
    redraw,
    _tileZoom: zoom,
    _getTiledPixelBounds: vi.fn(
      (_center: { lat: number; lng: number }) =>
        new FakeBounds(new FakePoint(0, 0), new FakePoint(0, 0)),
    ),
    _onMoveEnd: onMoveEnd,
  };

  const mapPaneEl = makeFakeEl('leaflet-map-pane') as FakeEl & {
    _leaflet_pos?: { x: number; y: number };
  };
  const tilePaneEl = makeFakeEl('leaflet-tile-pane');
  const overlayPaneEl = makeFakeEl('leaflet-overlay-pane');
  const containerEl = makeFakeEl('leaflet-container');
  containerEl.appendChild(mapPaneEl);
  mapPaneEl.appendChild(tilePaneEl);
  mapPaneEl.appendChild(overlayPaneEl);

  const moveListeners: (() => void)[] = [];

  const map = {
    getZoom: () => zoom,
    getMinZoom: () => minZoom,
    getMaxZoom: () => maxZoom,
    getCenter: () => ({ lat: 52.37, lng: 4.9 }),
    getContainer: () => containerEl,
    getPane: (name: string) => {
      if (name === 'mapPane') return mapPaneEl;
      if (name === 'tilePane') return tilePaneEl;
      if (name === 'overlayPane') return overlayPaneEl;
      return undefined;
    },
    latLngToContainerPoint: () => ({ x: size.x / 2, y: size.y / 2 }),
    project: () => new FakePoint(1000, 1000),
    getSize: () => new FakePoint(size.x, size.y),
    getZoomScale: () => 1,
    eachLayer: (fn: (layer: typeof tileLayer) => void) => {
      fn(tileLayer);
    },
    panBy,
    setZoom,
    _move,
    setView,
    on: (type: string, fn: () => void) => {
      if (type === 'move') moveListeners.push(fn);
    },
    off: (type: string, fn: () => void) => {
      if (type === 'move') {
        const i = moveListeners.indexOf(fn);
        if (i !== -1) moveListeners.splice(i, 1);
      }
    },
  };

  return {
    map,
    panBy,
    setZoom,
    _move,
    setView,
    size,
    mapPaneEl,
    tilePaneEl,
    overlayPaneEl,
    containerEl,
    tileLayer,
    redraw,
    onMoveEnd,
    _emitMove: () => {
      for (const fn of moveListeners) {
        fn();
      }
    },
  };
}

// --- Helpers ----------------------------------------------------------------------------

function idle(): StateMachineOutput {
  return { mode: 'idle', panDelta: null, zoomDelta: null, rotateDelta: null };
}

function panning(dx: number, dy: number): StateMachineOutput {
  return {
    mode: 'panning',
    panDelta: { x: dx, y: dy },
    zoomDelta: null,
    rotateDelta: null,
  };
}

function zooming(delta: number): StateMachineOutput {
  return {
    mode: 'zooming',
    panDelta: null,
    zoomDelta: delta,
    rotateDelta: null,
  };
}

function rotating(delta: number): StateMachineOutput {
  return {
    mode: 'rotating',
    panDelta: null,
    zoomDelta: null,
    rotateDelta: delta,
  };
}

// --- Tests ------------------------------------------------------------------------------

describe('LeafletGestureInteraction', () => {
  let interaction: LeafletGestureInteraction;
  let mocks: ReturnType<typeof makeMapMock>;

  beforeEach(() => {
    mocks = makeMapMock({
      zoom: 5,
      minZoom: 0,
      maxZoom: 18,
      size: { x: 800, y: 600 },
    });
    // Stub document.createElement so the rotate-pane wrapper can be created in node env.
    vi.stubGlobal('document', {
      createElement: (_tag: string) => makeFakeEl(),
    });
    // @ts-expect-error - we pass a minimal mock, not a full Leaflet Map instance
    interaction = new LeafletGestureInteraction(mocks.map);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -- idle output does nothing ----------------------------------------------------------

  it('does not call panBy, _move, or setZoom for idle output', () => {
    interaction.apply(idle());
    expect(mocks.panBy).not.toHaveBeenCalled();
    expect(mocks._move).not.toHaveBeenCalled();
    expect(mocks.setZoom).not.toHaveBeenCalled();
  });

  // -- pan -------------------------------------------------------------------------------

  it('calls map.panBy when panDelta is present', () => {
    interaction.apply(panning(0.1, 0.0));
    expect(mocks.panBy).toHaveBeenCalledOnce();
  });

  it('negates dx (webcam mirror) and applies panScale', () => {
    const dx = 0.1;
    const panScale = 3.5;
    const mapW = mocks.size.x;

    interaction.apply(panning(dx, 0));

    const [point, options] = mocks.panBy.mock.calls[0] as [
      number[],
      { animate: boolean },
    ];
    // pixelDx = -dx * mapW * panScale = -0.1 * 800 * 3.5 = -280
    expect(point[0]).toBeCloseTo(-dx * mapW * panScale);
    expect(options.animate).toBe(false);
  });

  it('applies positive dy downward (screen-space pan)', () => {
    const dy = 0.05;
    const panScale = 3.5;
    const mapH = mocks.size.y;

    interaction.apply(panning(0, dy));

    const [point] = mocks.panBy.mock.calls[0] as [number[]];
    // pixelDy = dy * mapH * panScale = 0.05 * 600 * 3.5 = 105
    expect(point[1]).toBeCloseTo(dy * mapH * panScale);
  });

  it('does not call panBy when panDelta is null', () => {
    interaction.apply(idle());
    expect(mocks.panBy).not.toHaveBeenCalled();
  });

  // -- zoom ------------------------------------------------------------------------------

  it('calls map._move when zoomDelta is present', () => {
    interaction.apply(zooming(0.01));
    expect(mocks._move).toHaveBeenCalledOnce();
  });

  it('applies zoomScale to zoomDelta and uses pinch-style zoom data', () => {
    const delta = 0.01;
    const zoomScale = 15.0;
    const currentZoom = 5;

    interaction.apply(zooming(delta));

    const [_center, newZoom, options] = mocks._move.mock.calls[0] as [
      object,
      number,
      { pinch: boolean; round: boolean },
    ];
    expect(newZoom).toBeCloseTo(currentZoom + delta * zoomScale);
    expect(options.pinch).toBe(true);
    expect(options.round).toBe(false);
  });

  it('zooms in (positive delta) increases zoom level', () => {
    interaction.apply(zooming(0.02));
    const [_center, newZoom] = mocks._move.mock.calls[0] as [object, number];
    expect(newZoom).toBeGreaterThan(5);
  });

  it('zooms out (negative delta) decreases zoom level', () => {
    interaction.apply(zooming(-0.02));
    const [_center, newZoom] = mocks._move.mock.calls[0] as [object, number];
    expect(newZoom).toBeLessThan(5);
  });

  it('clamps zoom to maxZoom', () => {
    const { map } = makeMapMock({ zoom: 17, maxZoom: 18 });
    // @ts-expect-error
    const i = new LeafletGestureInteraction(map);

    // Delta that would push past 18: 17 + 1.0 * 15 = 32 -> clamped to 18
    i.apply(zooming(1.0));

    const [_center, newZoom] = (map._move as ReturnType<typeof vi.fn>).mock
      .calls[0] as [object, number];
    expect(newZoom).toBe(18);
  });

  it('clamps zoom to minZoom', () => {
    const { map } = makeMapMock({ zoom: 1, minZoom: 0 });
    // @ts-expect-error
    const i = new LeafletGestureInteraction(map);

    // Delta that would push below 0: 1 + (-1.0) * 15 = -14 -> clamped to 0
    i.apply(zooming(-1.0));

    const [_center, newZoom] = (map._move as ReturnType<typeof vi.fn>).mock
      .calls[0] as [object, number];
    expect(newZoom).toBe(0);
  });

  it('does not call _move or setZoom when zoomDelta is null', () => {
    interaction.apply(idle());
    expect(mocks._move).not.toHaveBeenCalled();
    expect(mocks.setZoom).not.toHaveBeenCalled();
  });

  it('falls back to setZoom when continuous zoom is unavailable', () => {
    const { map, setZoom } = makeMapMock({ zoom: 5 });
    delete (map as { _move?: unknown })._move;
    // @ts-expect-error
    const i = new LeafletGestureInteraction(map);

    i.apply(zooming(0.01));

    const [newZoom, options] = setZoom.mock.calls[0] as [
      number,
      { animate: boolean },
    ];
    expect(newZoom).toBeCloseTo(5 + 0.01 * 15);
    expect(options.animate).toBe(false);
  });

  // -- rotate (rotate-pane wrapper) ------------------------------------------------------

  it('creates a leaflet-rotate-pane wrapper on first rotation', () => {
    interaction.apply(rotating(Math.PI / 4));
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane).not.toBeNull();
  });

  it('nests tile and overlay panes inside the rotate pane', () => {
    interaction.apply(rotating(Math.PI / 4));
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane?.contains(mocks.tilePaneEl)).toBe(true);
    expect(rotatePane?.contains(mocks.overlayPaneEl)).toBe(true);
  });

  it('applies CSS transform rotation to the rotate-pane wrapper', () => {
    interaction.apply(rotating(Math.PI / 4)); // 45 degrees
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane?.style.transform).toContain('rotate(');
  });

  it('keeps the rotation pane aligned with the viewport', () => {
    interaction.apply(rotating(Math.PI / 4));
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');

    expect(rotatePane?.style.width).toBe('100%');
    expect(rotatePane?.style.height).toBe('100%');
    expect(rotatePane?.style.left).toBe('0');
    expect(rotatePane?.style.top).toBe('0');
  });

  it('raises tile layer keepBuffer and refreshes tiles before rotating', () => {
    interaction.apply(rotating(Math.PI / 4));
    expect(mocks.tileLayer.options.keepBuffer).toBe(8);
    expect(mocks.onMoveEnd).toHaveBeenCalledOnce();
  });

  it('keeps an existing larger tile buffer unchanged', () => {
    const { map, tileLayer, redraw } = makeMapMock({ keepBuffer: 10 });
    // @ts-expect-error - we pass a minimal mock, not a full Leaflet Map instance
    const i = new LeafletGestureInteraction(map);

    i.apply(rotating(Math.PI / 4));

    expect(tileLayer.options.keepBuffer).toBe(10);
    expect(redraw).not.toHaveBeenCalled();
  });

  it('patches tile bounds only once across multiple rotations', () => {
    interaction.apply(rotating(Math.PI / 4));
    const patchedBounds = mocks.tileLayer._getTiledPixelBounds;
    interaction.apply(rotating(Math.PI / 4));

    expect(mocks.tileLayer.options.keepBuffer).toBe(8);
    expect(mocks.tileLayer._getTiledPixelBounds).toBe(patchedBounds);
  });

  it('uses rotated viewport dimensions for tile bounds', () => {
    interaction.apply(rotating(Math.PI / 4));
    const bounds = mocks.tileLayer._getTiledPixelBounds({
      lat: 52.37,
      lng: 4.9,
    });

    expect(bounds.min.x).toBeCloseTo(1000 - 494.9747);
    expect(bounds.max.x).toBeCloseTo(1000 + 494.9747);
    expect(bounds.min.y).toBeCloseTo(1000 - 494.9747);
    expect(bounds.max.y).toBeCloseTo(1000 + 494.9747);
  });

  it('accumulates bearing across multiple rotate calls', () => {
    interaction.apply(rotating(Math.PI / 4)); // +45 deg
    interaction.apply(rotating(Math.PI / 4)); // +45 deg = 90 total
    expect(interaction.getBearing()).toBeCloseTo(90);
  });

  it('normalises bearing to 0-360 range', () => {
    // Rotate by -45 degrees (negative = counter-clockwise)
    interaction.apply(rotating(-Math.PI / 4));
    expect(interaction.getBearing()).toBeCloseTo(315); // 360 - 45
  });

  it('sets transform-origin to the viewport center on the rotate pane', () => {
    interaction.apply(rotating(0.1));
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane?.style.transformOrigin).toBe('400px 300px');
  });

  it('recomputes transform-origin on map move when the map is rotated (pan changes map pane position)', () => {
    const rafQueue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return 0;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});

    interaction.apply(rotating(0.1));
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane?.style.transformOrigin).toBe('400px 300px');

    mocks.mapPaneEl._leaflet_pos = { x: 200, y: 100 };
    mocks._emitMove();
    expect(rafQueue.length).toBe(1);
    rafQueue.shift()?.(0 as unknown as DOMHighResTimeStamp);

    expect(rotatePane?.style.transformOrigin).toBe('200px 200px');
  });

  it('setBearing updates bearing and applies transform to rotate-pane', () => {
    interaction.setBearing(180);
    expect(interaction.getBearing()).toBe(180);
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane?.style.transform).toContain('rotate(');
  });

  it('setBearing(0) resets rotation on rotate-pane', () => {
    interaction.apply(rotating(Math.PI / 2));
    interaction.setBearing(0);
    expect(interaction.getBearing()).toBe(0);
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane?.style.transform).toBe('rotate(0deg)');
  });

  it('reuses the same rotate-pane wrapper across multiple rotations', () => {
    interaction.apply(rotating(Math.PI / 4));
    interaction.apply(rotating(Math.PI / 4));
    const rotatePanes = mocks.containerEl.querySelectorAll(
      '.leaflet-rotate-pane',
    );
    expect(rotatePanes.length).toBe(1);
  });

  // -- destroy ---------------------------------------------------------------------------

  it('destroy removes rotate-pane and restores mapPane to container', () => {
    interaction.apply(rotating(Math.PI / 4));
    interaction.destroy();
    expect(mocks.containerEl.querySelector('.leaflet-rotate-pane')).toBeNull();
    expect(mocks.containerEl.contains(mocks.mapPaneEl)).toBe(true);
  });

  it('destroy is safe to call when no rotation has occurred', () => {
    expect(() => interaction.destroy()).not.toThrow();
  });

  // -- edge cases ------------------------------------------------------------------------

  it('does not throw when map size returns zero dimensions', () => {
    const { map } = makeMapMock({ size: { x: 0, y: 0 } });
    // @ts-expect-error
    const i = new LeafletGestureInteraction(map);
    expect(() => i.apply(panning(0.1, 0.1))).not.toThrow();
  });

  it('syncFromMap updates internal zoom state', () => {
    // Start at zoom 5, simulate external zoom change
    let externalZoom = 5;
    const { map } = makeMapMock({ zoom: 5 });
    map.getZoom = () => externalZoom;
    // @ts-expect-error
    const i = new LeafletGestureInteraction(map);

    // Change external zoom
    externalZoom = 10;
    i.syncFromMap();

    // Next zoom delta should be relative to 10, not 5
    i.apply(zooming(0.01));
    const [_center, newZoom] = (map._move as ReturnType<typeof vi.fn>).mock
      .calls[0] as [object, number];
    expect(newZoom).toBeCloseTo(10 + 0.01 * 15);
  });
});
