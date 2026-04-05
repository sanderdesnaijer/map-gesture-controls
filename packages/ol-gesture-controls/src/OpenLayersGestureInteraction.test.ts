import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenLayersGestureInteraction } from './OpenLayersGestureInteraction.js';
import type { StateMachineOutput } from '@map-gesture-controls/core';

// ─── Minimal OL map mock ──────────────────────────────────────────────────────

function makeMapMock(opts: {
  center?: [number, number];
  zoom?: number;
  rotation?: number;
  resolution?: number;
  size?: [number, number];
} = {}) {
  const center: [number, number] = opts.center ?? [0, 0];
  const zoom = opts.zoom ?? 5;
  const rotation = opts.rotation ?? 0;
  const resolution = opts.resolution ?? 100;
  const size: [number, number] = opts.size ?? [800, 600];

  const setCenter   = vi.fn();
  const animate     = vi.fn();
  const setRotation = vi.fn();

  const view = {
    getResolution:   () => resolution,
    getZoom:         () => zoom,
    getRotation:     () => rotation,
    getCenter:       () => [...center] as [number, number],
    setCenter,
    animate,
    setRotation,
    calculateExtent: (_size: unknown) => [
      center[0] - 400 * resolution,
      center[1] - 300 * resolution,
      center[0] + 400 * resolution,
      center[1] + 300 * resolution,
    ],
  };

  // Screen-space pixel for the center coordinate.
  // For a rotation=0 map this is just the map midpoint [mapW/2, mapH/2].
  // getCoordinateFromPixel inverts: coord = center + (pixel - centerPixel) * resolution,
  // with y-axis flipped (screen y down, map y up).
  const centerPixel: [number, number] = [size[0] / 2, size[1] / 2];

  const map = {
    getView: () => view,
    getSize: () => size,
    getPixelFromCoordinate: (coord: [number, number]) => {
      // Simple identity: pixel offset from center pixel, y flipped
      return [
        centerPixel[0] + (coord[0] - center[0]) / resolution,
        centerPixel[1] - (coord[1] - center[1]) / resolution,
      ] as [number, number];
    },
    getCoordinateFromPixel: (pixel: [number, number]) => {
      // Inverse of getPixelFromCoordinate
      return [
        center[0] + (pixel[0] - centerPixel[0]) * resolution,
        center[1] - (pixel[1] - centerPixel[1]) * resolution,
      ] as [number, number];
    },
  };

  return { map, view, setCenter, animate, setRotation, centerPixel, resolution, size };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OpenLayersGestureInteraction', () => {
  let interaction: OpenLayersGestureInteraction;
  let mocks: ReturnType<typeof makeMapMock>;

  beforeEach(() => {
    mocks = makeMapMock({ center: [0, 0], zoom: 5, rotation: 0, resolution: 100, size: [800, 600] });
    // @ts-expect-error - we pass a minimal mock, not a full ol/Map instance
    interaction = new OpenLayersGestureInteraction(mocks.map);
  });

  // ── idle output does nothing ───────────────────────────────────────────────

  it('does not call setCenter, animate, or setRotation for idle output', () => {
    interaction.apply(idle());
    expect(mocks.setCenter).not.toHaveBeenCalled();
    expect(mocks.animate).not.toHaveBeenCalled();
    expect(mocks.setRotation).not.toHaveBeenCalled();
  });

  // ── pan ───────────────────────────────────────────────────────────────────

  it('calls view.setCenter when panDelta is present', () => {
    interaction.apply(panning(0.1, 0.0));
    expect(mocks.setCenter).toHaveBeenCalledOnce();
  });

  it('negates dx (webcam mirror) and applies panScale', () => {
    const dx = 0.1;
    const dy = 0.0;
    const { resolution, size: [mapW] } = mocks;
    const panScale = 2.0;

    interaction.apply(panning(dx, dy));

    const [newCenter] = mocks.setCenter.mock.calls[0] as [[number, number]];
    // pixelDx = -dx * mapW * panScale = -0.1 * 800 * 2 = -160
    // centerPixel shifts by -pixelDx in screen space → coord shifts by pixelDx * resolution
    // newCenter[0] = 0 + (-(-dx * mapW * panScale)) * resolution = 16000
    expect(newCenter[0]).toBeCloseTo(-(-dx * mapW * panScale) * resolution);
  });

  it('applies positive dy upward (screen-space pan, y axis inverted)', () => {
    const dy = 0.05;
    const { resolution, size: [, mapH] } = mocks;
    const panScale = 2.0;

    interaction.apply(panning(0, dy));

    const [newCenter] = mocks.setCenter.mock.calls[0] as [[number, number]];
    // pixelDy = dy * mapH * panScale = 0.05 * 600 * 2 = 60
    // centerPixel[1] shifts by -pixelDy → map coord y increases (screen y down, map y up)
    // newCenter[1] = 0 + pixelDy * resolution = 6000
    expect(newCenter[1]).toBeCloseTo(dy * mapH * panScale * resolution);
  });

  it('pans correctly at non-zero map rotation (screen-space pan)', () => {
    // At 90-degree rotation, a right-hand move (dx > 0) should still pan
    // the center left on screen (negated dx), not in rotated map coordinates.
    const { map } = makeMapMock({ center: [0, 0], rotation: Math.PI / 2, resolution: 100, size: [800, 600] });
    // @ts-expect-error
    const i = new OpenLayersGestureInteraction(map);
    const setRotatedCenter = vi.spyOn(map.getView(), 'setCenter');

    i.apply(panning(0.1, 0));

    expect(setRotatedCenter).toHaveBeenCalledOnce();
    // With pixel-space pan the x-delta is always applied along the screen x axis,
    // so newCenter[0] should be non-zero (moved in world x) even at 90-deg rotation.
    const [newCenter] = setRotatedCenter.mock.calls[0] as [[number, number]];
    expect(newCenter[0]).not.toBeCloseTo(0);
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
    const zoomScale = 15.0;
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

  // ── rotate ────────────────────────────────────────────────────────────────

  it('calls view.setRotation when rotateDelta is present', () => {
    interaction.apply(rotating(0.1));
    expect(mocks.setRotation).toHaveBeenCalledOnce();
  });

  it('adds rotateDelta to the current rotation', () => {
    const delta = 0.2;
    const currentRotation = 0;

    interaction.apply(rotating(delta));

    const [newRotation] = mocks.setRotation.mock.calls[0] as [number];
    expect(newRotation).toBeCloseTo(currentRotation + delta);
  });

  it('rotates clockwise for positive delta', () => {
    interaction.apply(rotating(0.5));
    const [newRotation] = mocks.setRotation.mock.calls[0] as [number];
    expect(newRotation).toBeGreaterThan(0);
  });

  it('rotates counter-clockwise for negative delta', () => {
    interaction.apply(rotating(-0.5));
    const [newRotation] = mocks.setRotation.mock.calls[0] as [number];
    expect(newRotation).toBeLessThan(0);
  });

  it('does not call setRotation when rotateDelta is null', () => {
    interaction.apply(idle());
    expect(mocks.setRotation).not.toHaveBeenCalled();
  });

  it('accumulates rotation from an existing non-zero rotation', () => {
    const { map } = makeMapMock({ rotation: 1.0 });
    // @ts-expect-error
    const i = new OpenLayersGestureInteraction(map);
    const setRotationSpy = vi.spyOn(map.getView(), 'setRotation');

    i.apply(rotating(0.5));

    expect(setRotationSpy).toHaveBeenCalledWith(expect.closeTo(1.5, 5));
  });

  // ── gracefully handles missing view data ──────────────────────────────────

  it('does not throw when getPixelFromCoordinate returns null', () => {
    const { map } = makeMapMock();
    // @ts-expect-error
    map.getPixelFromCoordinate = () => null;
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
