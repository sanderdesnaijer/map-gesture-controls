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
  insertBefore(newNode: FakeEl, ref: FakeEl): FakeEl;
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
      const refIdx = el._children.indexOf(ref);
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

function makeMapMock(opts: {
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  size?: { x: number; y: number };
  keepBuffer?: number;
} = {}) {
  const zoom = opts.zoom ?? 5;
  const minZoom = opts.minZoom ?? 0;
  const maxZoom = opts.maxZoom ?? 18;
  const size = opts.size ?? { x: 800, y: 600 };

  const panBy = vi.fn();
  const setZoom = vi.fn();
  const setView = vi.fn();
  const redraw = vi.fn();
  const tileLayer = {
    options: {
      keepBuffer: opts.keepBuffer ?? 2,
    },
    redraw,
  };

  const mapPaneEl = makeFakeEl('leaflet-map-pane');
  const containerEl = makeFakeEl('leaflet-container');
  containerEl.appendChild(mapPaneEl);

  const map = {
    getZoom: () => zoom,
    getMinZoom: () => minZoom,
    getMaxZoom: () => maxZoom,
    getSize: () => size,
    getCenter: () => ({ lat: 52.37, lng: 4.9 }),
    getContainer: () => containerEl,
    getPane: (_name: string) => mapPaneEl,
    latLngToContainerPoint: () => ({ x: size.x / 2, y: size.y / 2 }),
    eachLayer: (fn: (layer: typeof tileLayer) => void) => {
      fn(tileLayer);
    },
    panBy,
    setZoom,
    setView,
  };

  return { map, panBy, setZoom, setView, size, mapPaneEl, containerEl, tileLayer, redraw };
}

// --- Helpers ----------------------------------------------------------------------------

function idle(): StateMachineOutput {
  return { mode: 'idle', panDelta: null, zoomDelta: null, rotateDelta: null };
}

function panning(dx: number, dy: number): StateMachineOutput {
  return { mode: 'panning', panDelta: { x: dx, y: dy }, zoomDelta: null, rotateDelta: null };
}

function zooming(delta: number): StateMachineOutput {
  return { mode: 'zooming', panDelta: null, zoomDelta: delta, rotateDelta: null };
}

function rotating(delta: number): StateMachineOutput {
  return { mode: 'rotating', panDelta: null, zoomDelta: null, rotateDelta: delta };
}

// --- Tests ------------------------------------------------------------------------------

describe('LeafletGestureInteraction', () => {
  let interaction: LeafletGestureInteraction;
  let mocks: ReturnType<typeof makeMapMock>;

  beforeEach(() => {
    mocks = makeMapMock({ zoom: 5, minZoom: 0, maxZoom: 18, size: { x: 800, y: 600 } });
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

  it('does not call panBy or setZoom for idle output', () => {
    interaction.apply(idle());
    expect(mocks.panBy).not.toHaveBeenCalled();
    expect(mocks.setZoom).not.toHaveBeenCalled();
  });

  // -- pan -------------------------------------------------------------------------------

  it('calls map.panBy when panDelta is present', () => {
    interaction.apply(panning(0.1, 0.0));
    expect(mocks.panBy).toHaveBeenCalledOnce();
  });

  it('negates dx (webcam mirror) and applies panScale', () => {
    const dx = 0.1;
    const panScale = 2.0;
    const mapW = mocks.size.x;

    interaction.apply(panning(dx, 0));

    const [point, options] = mocks.panBy.mock.calls[0] as [number[], { animate: boolean }];
    // pixelDx = -dx * mapW * panScale = -0.1 * 800 * 2 = -160
    expect(point[0]).toBeCloseTo(-dx * mapW * panScale);
    expect(options.animate).toBe(false);
  });

  it('applies positive dy downward (screen-space pan)', () => {
    const dy = 0.05;
    const panScale = 2.0;
    const mapH = mocks.size.y;

    interaction.apply(panning(0, dy));

    const [point] = mocks.panBy.mock.calls[0] as [number[]];
    // pixelDy = dy * mapH * panScale = 0.05 * 600 * 2 = 60
    expect(point[1]).toBeCloseTo(dy * mapH * panScale);
  });

  it('does not call panBy when panDelta is null', () => {
    interaction.apply(idle());
    expect(mocks.panBy).not.toHaveBeenCalled();
  });

  // -- zoom ------------------------------------------------------------------------------

  it('calls map.setZoom when zoomDelta is present', () => {
    interaction.apply(zooming(0.01));
    expect(mocks.setZoom).toHaveBeenCalledOnce();
  });

  it('applies zoomScale to zoomDelta', () => {
    const delta = 0.01;
    const zoomScale = 15.0;
    const currentZoom = 5;

    interaction.apply(zooming(delta));

    const [newZoom, options] = mocks.setZoom.mock.calls[0] as [number, { animate: boolean }];
    expect(newZoom).toBeCloseTo(currentZoom + delta * zoomScale);
    expect(options.animate).toBe(false);
  });

  it('zooms in (positive delta) increases zoom level', () => {
    interaction.apply(zooming(0.02));
    const [newZoom] = mocks.setZoom.mock.calls[0] as [number];
    expect(newZoom).toBeGreaterThan(5);
  });

  it('zooms out (negative delta) decreases zoom level', () => {
    interaction.apply(zooming(-0.02));
    const [newZoom] = mocks.setZoom.mock.calls[0] as [number];
    expect(newZoom).toBeLessThan(5);
  });

  it('clamps zoom to maxZoom', () => {
    const { map } = makeMapMock({ zoom: 17, maxZoom: 18 });
    // @ts-expect-error
    const i = new LeafletGestureInteraction(map);

    // Delta that would push past 18: 17 + 1.0 * 15 = 32 -> clamped to 18
    i.apply(zooming(1.0));

    const [newZoom] = (map.setZoom as ReturnType<typeof vi.fn>).mock.calls[0] as [number];
    expect(newZoom).toBe(18);
  });

  it('clamps zoom to minZoom', () => {
    const { map } = makeMapMock({ zoom: 1, minZoom: 0 });
    // @ts-expect-error
    const i = new LeafletGestureInteraction(map);

    // Delta that would push below 0: 1 + (-1.0) * 15 = -14 -> clamped to 0
    i.apply(zooming(-1.0));

    const [newZoom] = (map.setZoom as ReturnType<typeof vi.fn>).mock.calls[0] as [number];
    expect(newZoom).toBe(0);
  });

  it('does not call setZoom when zoomDelta is null', () => {
    interaction.apply(idle());
    expect(mocks.setZoom).not.toHaveBeenCalled();
  });

  // -- rotate (rotate-pane wrapper) ------------------------------------------------------

  it('creates a leaflet-rotate-pane wrapper on first rotation', () => {
    interaction.apply(rotating(Math.PI / 4));
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane).not.toBeNull();
  });

  it('nests mapPane inside the rotate-pane wrapper', () => {
    interaction.apply(rotating(Math.PI / 4));
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane?.contains(mocks.mapPaneEl)).toBe(true);
  });

  it('applies CSS transform rotation to the rotate-pane wrapper', () => {
    interaction.apply(rotating(Math.PI / 4)); // 45 degrees
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane?.style.transform).toContain('rotate(');
  });

  it('raises tile layer keepBuffer before rotating', () => {
    interaction.apply(rotating(Math.PI / 4));
    expect(mocks.tileLayer.options.keepBuffer).toBe(8);
    expect(mocks.redraw).toHaveBeenCalledOnce();
  });

  it('keeps an existing larger tile buffer unchanged', () => {
    const { map, tileLayer, redraw } = makeMapMock({ keepBuffer: 10 });
    // @ts-expect-error - we pass a minimal mock, not a full Leaflet Map instance
    const i = new LeafletGestureInteraction(map);

    i.apply(rotating(Math.PI / 4));

    expect(tileLayer.options.keepBuffer).toBe(10);
    expect(redraw).not.toHaveBeenCalled();
  });

  it('prepares the tile buffer only once across multiple rotations', () => {
    interaction.apply(rotating(Math.PI / 4));
    interaction.apply(rotating(Math.PI / 4));

    expect(mocks.tileLayer.options.keepBuffer).toBe(8);
    expect(mocks.redraw).toHaveBeenCalledOnce();
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

  it('sets transform-origin to 50% 50% on the rotate-pane wrapper', () => {
    interaction.apply(rotating(0.1));
    const rotatePane = mocks.containerEl.querySelector('.leaflet-rotate-pane');
    expect(rotatePane?.style.transformOrigin).toBe('50% 50%');
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
    const rotatePanes = mocks.containerEl.querySelectorAll('.leaflet-rotate-pane');
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
    const [newZoom] = (map.setZoom as ReturnType<typeof vi.fn>).mock.calls[0] as [number];
    expect(newZoom).toBeCloseTo(10 + 0.01 * 15);
  });
});
