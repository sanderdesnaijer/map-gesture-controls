import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenLayersGestureInteraction } from './OpenLayersGestureInteraction.js';
import type { StateMachineOutput } from '@map-gesture-controls/core';

// ─── Minimal OL map mock ──────────────────────────────────────────────────────

function makeMapMock(opts: {
  center?: [number, number];
  zoom?: number;
  resolution?: number;
  size?: [number, number];
} = {}) {
  const center: [number, number] = opts.center ?? [0, 0];
  const zoom = opts.zoom ?? 5;
  const resolution = opts.resolution ?? 100;
  const size: [number, number] = opts.size ?? [800, 600];

  const setCenter = vi.fn();
  const animate   = vi.fn();

  const view = {
    getResolution: () => resolution,
    getZoom:       () => zoom,
    getCenter:     () => [...center],
    setCenter,
    animate,
    calculateExtent: (_size: unknown) => [
      center[0] - 400 * resolution,
      center[1] - 300 * resolution,
      center[0] + 400 * resolution,
      center[1] + 300 * resolution,
    ],
  };

  const map = {
    getView: () => view,
    getSize: () => size,
  };

  return { map, view, setCenter, animate };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idle(): StateMachineOutput {
  return { mode: 'idle', panDelta: null, zoomDelta: null };
}

function panning(dx: number, dy: number): StateMachineOutput {
  return { mode: 'panning', panDelta: { x: dx, y: dy }, zoomDelta: null };
}

function zooming(delta: number): StateMachineOutput {
  return { mode: 'zooming', panDelta: null, zoomDelta: delta };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OpenLayersGestureInteraction', () => {
  let interaction: OpenLayersGestureInteraction;
  let mocks: ReturnType<typeof makeMapMock>;

  beforeEach(() => {
    mocks = makeMapMock({ center: [0, 0], zoom: 5, resolution: 100, size: [800, 600] });
    // @ts-expect-error - we pass a minimal mock, not a full ol/Map instance
    interaction = new OpenLayersGestureInteraction(mocks.map);
  });

  // ── idle output does nothing ───────────────────────────────────────────────

  it('does not call setCenter or animate for idle output', () => {
    interaction.apply(idle());
    expect(mocks.setCenter).not.toHaveBeenCalled();
    expect(mocks.animate).not.toHaveBeenCalled();
  });

  // ── pan ───────────────────────────────────────────────────────────────────

  it('calls view.setCenter when panDelta is present', () => {
    interaction.apply(panning(0.1, 0.0));
    expect(mocks.setCenter).toHaveBeenCalledOnce();
  });

  it('negates dx (webcam mirror) and applies panScale', () => {
    const dx = 0.1;
    const dy = 0.0;
    const resolution = 100;
    const mapW = 800;
    const panScale = 2.0;

    interaction.apply(panning(dx, dy));

    const [newCenter] = mocks.setCenter.mock.calls[0] as [[number, number]];
    // pixelDx = -dx * mapW * panScale = -0.1 * 800 * 2 = -160
    // newCenter[0] = 0 - (-160) * 100 = 16000
    expect(newCenter[0]).toBeCloseTo(-(-dx * mapW * panScale) * resolution);
  });

  it('applies positive dy upward (map y increases with view y)', () => {
    const dy = 0.05;
    const resolution = 100;
    const mapH = 600;
    const panScale = 2.0;

    interaction.apply(panning(0, dy));

    const [newCenter] = mocks.setCenter.mock.calls[0] as [[number, number]];
    // pixelDy = dy * mapH * panScale = 0.05 * 600 * 2 = 60
    // newCenter[1] = 0 + 60 * 100 = 6000
    expect(newCenter[1]).toBeCloseTo(dy * mapH * panScale * resolution);
  });

  it('does not call setCenter when panDelta is null', () => {
    interaction.apply(idle());
    expect(mocks.setCenter).not.toHaveBeenCalled();
  });

  // ── zoom ──────────────────────────────────────────────────────────────────

  it('calls view.animate when zoomDelta is present', () => {
    interaction.apply(zooming(0.01));
    expect(mocks.animate).toHaveBeenCalledOnce();
  });

  it('applies zoomScale to zoomDelta', () => {
    const delta = 0.01;
    const zoomScale = 4.0;
    const currentZoom = 5;

    interaction.apply(zooming(delta));

    const args = mocks.animate.mock.calls[0][0] as { zoom: number; duration: number };
    expect(args.zoom).toBeCloseTo(currentZoom + delta * zoomScale);
    expect(args.duration).toBe(0);
  });

  it('zooms in (positive delta) increases zoom level', () => {
    interaction.apply(zooming(0.02));
    const args = mocks.animate.mock.calls[0][0] as { zoom: number };
    expect(args.zoom).toBeGreaterThan(5);
  });

  it('zooms out (negative delta) decreases zoom level', () => {
    interaction.apply(zooming(-0.02));
    const args = mocks.animate.mock.calls[0][0] as { zoom: number };
    expect(args.zoom).toBeLessThan(5);
  });

  it('does not call animate when zoomDelta is null', () => {
    interaction.apply(idle());
    expect(mocks.animate).not.toHaveBeenCalled();
  });

  // ── gracefully handles missing view data ──────────────────────────────────

  it('does not throw when resolution is undefined', () => {
    const { map } = makeMapMock();
    map.getView().getResolution = () => undefined as unknown as number;
    // @ts-expect-error
    const i = new OpenLayersGestureInteraction(map);
    expect(() => i.apply(panning(0.1, 0.1))).not.toThrow();
  });

  it('does not throw when map size is undefined', () => {
    const { map } = makeMapMock();
    map.getSize = () => undefined as unknown as [number, number];
    // @ts-expect-error
    const i = new OpenLayersGestureInteraction(map);
    expect(() => i.apply(panning(0.1, 0.1))).not.toThrow();
  });

  it('does not throw when zoom is undefined', () => {
    const { map } = makeMapMock();
    map.getView().getZoom = () => undefined as unknown as number;
    // @ts-expect-error
    const i = new OpenLayersGestureInteraction(map);
    expect(() => i.apply(zooming(0.01))).not.toThrow();
  });
});
