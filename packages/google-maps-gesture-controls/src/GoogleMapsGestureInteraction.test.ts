import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleMapsGestureInteraction } from './GoogleMapsGestureInteraction.js';
import type { StateMachineOutput } from '@map-gesture-controls/core';

// --- Minimal google.maps.Map mock ---------------------------------------------------

function makeMapMock(opts: {
  center?: { lat: number; lng: number };
  zoom?: number;
  heading?: number;
  width?: number;
  height?: number;
} = {}) {
  const lat = opts.center?.lat ?? 0;
  const lng = opts.center?.lng ?? 0;
  const zoom = opts.zoom ?? 10;
  const heading = opts.heading ?? 0;
  const width = opts.width ?? 800;
  const height = opts.height ?? 600;

  const moveCamera = vi.fn();

  // Track event listeners so tests can fire them
  const listeners: Record<string, Array<() => void>> = {};

  const map = {
    getCenter: () => ({
      lat: () => lat,
      lng: () => lng,
    }),
    getZoom: () => zoom,
    getHeading: () => heading,
    getDiv: () => ({ clientWidth: width, clientHeight: height }),
    moveCamera,
    addListener: (event: string, handler: () => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
      return { remove: vi.fn() };
    },
  };

  const fire = (event: string) => {
    (listeners[event] ?? []).forEach((h) => h());
  };

  return { map, moveCamera, fire, listeners };
}

// --- Helpers -------------------------------------------------------------------------

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

// --- Tests ---------------------------------------------------------------------------

describe('GoogleMapsGestureInteraction', () => {
  let interaction: GoogleMapsGestureInteraction;
  let mocks: ReturnType<typeof makeMapMock>;

  beforeEach(() => {
    mocks = makeMapMock({ center: { lat: 0, lng: 0 }, zoom: 10, heading: 0, width: 800, height: 600 });
    // @ts-expect-error - we pass a minimal mock, not a full google.maps.Map
    interaction = new GoogleMapsGestureInteraction(mocks.map);
  });

  afterEach(() => {
    interaction.dispose();
  });

  // -- idle output does nothing -------------------------------------------------------

  it('does not call moveCamera for idle output', () => {
    interaction.apply(idle());
    expect(mocks.moveCamera).not.toHaveBeenCalled();
  });

  // -- pan ----------------------------------------------------------------------------

  it('calls moveCamera with center when panDelta is present', () => {
    interaction.apply(panning(0.1, 0.0));
    expect(mocks.moveCamera).toHaveBeenCalledOnce();
    expect(mocks.moveCamera.mock.calls[0][0]).toHaveProperty('center');
  });

  it('negates dx (webcam mirror)', () => {
    // Moving hand right (positive dx) should pan the map left (negative dLng at heading=0)
    interaction.apply(panning(0.1, 0.0));
    const { center } = mocks.moveCamera.mock.calls[0][0] as { center: { lat: number; lng: number } };
    // dx is positive, negated to negative screen pixels, heading=0 means no rotation,
    // so dLng should be negative
    expect(center.lng).toBeLessThan(0);
  });

  it('pans correctly when heading is non-zero', () => {
    // At 180-degree heading, a screen-right pan should become positive dLng (reversed)
    const rotatedMocks = makeMapMock({ center: { lat: 0, lng: 0 }, zoom: 10, heading: 180 });
    // @ts-expect-error
    const rotatedInteraction = new GoogleMapsGestureInteraction(rotatedMocks.map);

    rotatedInteraction.apply(panning(0.1, 0.0));
    const { center } = rotatedMocks.moveCamera.mock.calls[0][0] as { center: { lat: number; lng: number } };
    // With 180-degree heading, the sign of dLng flips relative to heading=0
    expect(center.lng).toBeGreaterThan(0);
    rotatedInteraction.dispose();
  });

  it('does not call moveCamera when panDelta is null', () => {
    interaction.apply(idle());
    expect(mocks.moveCamera).not.toHaveBeenCalled();
  });

  // -- zoom ---------------------------------------------------------------------------

  it('calls moveCamera with zoom when zoomDelta is present', () => {
    interaction.apply(zooming(0.01));
    expect(mocks.moveCamera).toHaveBeenCalledOnce();
    expect(mocks.moveCamera.mock.calls[0][0]).toHaveProperty('zoom');
  });

  it('applies zoomScale to zoomDelta', () => {
    const delta = 0.01;
    const zoomScale = 15.0;
    const initialZoom = 10;

    interaction.apply(zooming(delta));

    const { zoom } = mocks.moveCamera.mock.calls[0][0] as { zoom: number };
    expect(zoom).toBeCloseTo(initialZoom + delta * zoomScale);
  });

  it('zooms in (positive delta) increases zoom level', () => {
    interaction.apply(zooming(0.02));
    const { zoom } = mocks.moveCamera.mock.calls[0][0] as { zoom: number };
    expect(zoom).toBeGreaterThan(10);
  });

  it('zooms out (negative delta) decreases zoom level', () => {
    interaction.apply(zooming(-0.02));
    const { zoom } = mocks.moveCamera.mock.calls[0][0] as { zoom: number };
    expect(zoom).toBeLessThan(10);
  });

  it('clamps zoom to valid range (0-22)', () => {
    // Push zoom way beyond upper bound
    interaction.apply(zooming(100));
    const { zoom: high } = mocks.moveCamera.mock.calls[0][0] as { zoom: number };
    expect(high).toBeLessThanOrEqual(22);

    // Push zoom way below lower bound
    interaction.apply(zooming(-200));
    const { zoom: low } = mocks.moveCamera.mock.calls[1][0] as { zoom: number };
    expect(low).toBeGreaterThanOrEqual(0);
  });

  it('does not call moveCamera when zoomDelta is null', () => {
    interaction.apply(idle());
    expect(mocks.moveCamera).not.toHaveBeenCalled();
  });

  // -- rotate -------------------------------------------------------------------------

  it('calls moveCamera with heading when rotateDelta is present', () => {
    interaction.apply(rotating(0.1));
    expect(mocks.moveCamera).toHaveBeenCalledOnce();
    expect(mocks.moveCamera.mock.calls[0][0]).toHaveProperty('heading');
  });

  it('converts rotateDelta from radians to degrees', () => {
    const delta = Math.PI / 2; // 90 degrees
    interaction.apply(rotating(delta));
    const { heading } = mocks.moveCamera.mock.calls[0][0] as { heading: number };
    expect(heading).toBeCloseTo(90);
  });

  it('accumulates rotation from an existing non-zero heading', () => {
    const rotatedMocks = makeMapMock({ heading: 45 });
    // @ts-expect-error
    const i = new GoogleMapsGestureInteraction(rotatedMocks.map);

    i.apply(rotating(Math.PI / 4)); // +45 degrees

    const { heading } = rotatedMocks.moveCamera.mock.calls[0][0] as { heading: number };
    expect(heading).toBeCloseTo(90);
    i.dispose();
  });

  it('does not call moveCamera when rotateDelta is null', () => {
    interaction.apply(idle());
    expect(mocks.moveCamera).not.toHaveBeenCalled();
  });

  // -- syncFromMap --------------------------------------------------------------------

  it('syncFromMap updates internal zoom and heading from map', () => {
    // Change what getZoom/getHeading return
    mocks.map.getZoom = () => 15;
    mocks.map.getHeading = () => 90;

    interaction.syncFromMap();

    // Next zoom delta should start from 15
    interaction.apply(zooming(0.01));
    const { zoom } = mocks.moveCamera.mock.calls[0][0] as { zoom: number };
    expect(zoom).toBeCloseTo(15 + 0.01 * 15);
  });

  // -- event listeners for external changes -------------------------------------------

  it('registers zoom_changed and heading_changed listeners', () => {
    expect(mocks.listeners['zoom_changed']).toBeDefined();
    expect(mocks.listeners['zoom_changed'].length).toBe(1);
    expect(mocks.listeners['heading_changed']).toBeDefined();
    expect(mocks.listeners['heading_changed'].length).toBe(1);
  });

  it('picks up external zoom changes via zoom_changed event', () => {
    // Simulate external zoom change
    mocks.map.getZoom = () => 5;
    mocks.fire('zoom_changed');

    // Next zoom delta should start from the externally set value (5)
    interaction.apply(zooming(0.01));
    const { zoom } = mocks.moveCamera.mock.calls[0][0] as { zoom: number };
    expect(zoom).toBeCloseTo(5 + 0.01 * 15);
  });

  it('picks up external heading changes via heading_changed event', () => {
    mocks.map.getHeading = () => 180;
    mocks.fire('heading_changed');

    // Next rotation should start from 180
    interaction.apply(rotating(Math.PI / 4)); // +45 degrees
    const { heading } = mocks.moveCamera.mock.calls[0][0] as { heading: number };
    expect(heading).toBeCloseTo(225);
  });

  // -- gracefully handles missing data ------------------------------------------------

  it('does not throw when getCenter returns null', () => {
    mocks.map.getCenter = () => null as unknown as ReturnType<typeof mocks.map.getCenter>;
    expect(() => interaction.apply(panning(0.1, 0.1))).not.toThrow();
  });

  it('does not throw when getZoom returns undefined', () => {
    const nullMocks = makeMapMock();
    nullMocks.map.getZoom = () => undefined as unknown as number;
    // @ts-expect-error
    const i = new GoogleMapsGestureInteraction(nullMocks.map);
    // Falls back to default zoom of 10 in constructor
    expect(() => i.apply(zooming(0.01))).not.toThrow();
    i.dispose();
  });

  // -- dispose ------------------------------------------------------------------------

  it('dispose removes event listeners', () => {
    const removeSpy = vi.fn();
    // Re-create with tracked remove spies
    const m = makeMapMock();
    const removeHandles: Array<{ remove: ReturnType<typeof vi.fn> }> = [];
    m.map.addListener = (_event: string, _handler: () => void) => {
      const handle = { remove: removeSpy };
      removeHandles.push(handle);
      return handle;
    };
    // @ts-expect-error
    const i = new GoogleMapsGestureInteraction(m.map);
    i.dispose();
    expect(removeSpy).toHaveBeenCalledTimes(2);
  });
});
