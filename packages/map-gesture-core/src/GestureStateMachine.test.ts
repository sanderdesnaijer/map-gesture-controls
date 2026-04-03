import { describe, it, expect, beforeEach } from 'vitest';
import { GestureStateMachine } from './GestureStateMachine.js';
import type { GestureFrame, DetectedHand, HandLandmark, TuningConfig } from './types.js';
import { LANDMARKS } from './constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FAST_TUNING: TuningConfig = {
  actionDwellMs: 0,       // dwell=0: transition fires on the SECOND frame (first sets timer)
  releaseGraceMs: 0,      // grace=0: idle on the SECOND frame after release
  panDeadzonePx: 0,
  zoomDeadzoneRatio: 0,
  smoothingAlpha: 1,      // no smoothing — raw values pass through
  minDetectionConfidence: 0.65,
  minTrackingConfidence: 0.65,
  minPresenceConfidence: 0.60,
};

function makeLandmarks(overrides: Record<number, Partial<HandLandmark>> = {}): HandLandmark[] {
  const lm: HandLandmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  for (const [idx, vals] of Object.entries(overrides)) {
    lm[Number(idx)] = { ...lm[Number(idx)], ...vals };
  }
  return lm;
}

function makeHand(gesture: DetectedHand['gesture'], landmarks = makeLandmarks()): DetectedHand {
  return { handedness: 'Right', score: 1, landmarks, gesture };
}

function makeFrame(
  timestamp: number,
  leftHand: DetectedHand | null,
  rightHand: DetectedHand | null,
): GestureFrame {
  const hands = [leftHand, rightHand].filter(Boolean) as DetectedHand[];
  return { timestamp, hands, leftHand, rightHand };
}

/**
 * Drive the FSM into 'panning' with dwell=0 (requires two identical frames).
 */
function enterPanning(fsm: GestureStateMachine, hand = makeHand('fist')): void {
  fsm.update(makeFrame(0, hand, null)); // starts dwell timer
  fsm.update(makeFrame(0, hand, null)); // dwell elapsed → panning
}

/**
 * Drive the FSM into 'zooming' with dwell=0 (requires two identical frames).
 */
function enterZooming(
  fsm: GestureStateMachine,
  left = makeHand('openPalm'),
  right = makeHand('openPalm'),
): void {
  fsm.update(makeFrame(0, left, right));
  fsm.update(makeFrame(0, left, right));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GestureStateMachine', () => {
  let fsm: GestureStateMachine;

  beforeEach(() => {
    fsm = new GestureStateMachine(FAST_TUNING);
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  it('starts in idle mode', () => {
    expect(fsm.getMode()).toBe('idle');
  });

  // ── idle → panning ─────────────────────────────────────────────────────────

  it('transitions to panning after the dwell elapses (two frames, dwell=0)', () => {
    const fistHand = makeHand('fist');
    fsm.update(makeFrame(0, fistHand, null)); // starts dwell
    const out = fsm.update(makeFrame(0, fistHand, null)); // 0 >= 0 → panning
    expect(out.mode).toBe('panning');
  });

  // ── idle → zooming ─────────────────────────────────────────────────────────

  it('transitions to zooming when two open palms are held (two frames, dwell=0)', () => {
    const left  = makeHand('openPalm');
    const right = makeHand('openPalm');
    fsm.update(makeFrame(0, left, right));
    const out = fsm.update(makeFrame(0, left, right));
    expect(out.mode).toBe('zooming');
  });

  // ── panning → idle ─────────────────────────────────────────────────────────

  it('returns to idle when the fist is released (releaseGraceMs=0)', () => {
    enterPanning(fsm);
    expect(fsm.getMode()).toBe('panning');

    fsm.update(makeFrame(1, null, null)); // starts release timer
    const out = fsm.update(makeFrame(1, null, null)); // 0 >= 0 → idle
    expect(out.mode).toBe('idle');
  });

  // ── zooming → idle ─────────────────────────────────────────────────────────

  it('returns to idle when open palms are released (releaseGraceMs=0)', () => {
    enterZooming(fsm);
    expect(fsm.getMode()).toBe('zooming');

    fsm.update(makeFrame(1, null, null)); // starts release timer
    const out = fsm.update(makeFrame(1, null, null)); // 0 >= 0 → idle
    expect(out.mode).toBe('idle');
  });

  // ── panDelta output ────────────────────────────────────────────────────────

  it('emits no panDelta on the first panning frame (no previous position)', () => {
    const fistHand = makeHand('fist');
    fsm.update(makeFrame(0, fistHand, null)); // dwell starts
    const out = fsm.update(makeFrame(0, fistHand, null)); // enters panning, sets prevPos
    expect(out.panDelta).toBeNull();
  });

  it('emits panDelta once a previous position is established', () => {
    const wristPos1 = { x: 0.3, y: 0.4, z: 0 };
    const wristPos2 = { x: 0.35, y: 0.45, z: 0 };

    const lm1 = makeLandmarks({ [LANDMARKS.WRIST]: wristPos1 });
    const lm2 = makeLandmarks({ [LANDMARKS.WRIST]: wristPos2 });

    // Frame 1: start dwell (idle)
    fsm.update(makeFrame(0, makeHand('fist', lm1), null));
    // Frame 2: transition fires → panning, but buildOutput returns from idle branch (panDelta=null)
    fsm.update(makeFrame(0, makeHand('fist', lm1), null));
    // Frame 3: first real panning frame — sets prevPanPos = wristPos1, no delta yet
    fsm.update(makeFrame(1, makeHand('fist', lm1), null));
    // Frame 4: second panning frame — emits delta
    const out = fsm.update(makeFrame(2, makeHand('fist', lm2), null));

    expect(out.mode).toBe('panning');
    expect(out.panDelta).not.toBeNull();
    expect(out.panDelta!.x).toBeCloseTo(wristPos2.x - wristPos1.x);
    expect(out.panDelta!.y).toBeCloseTo(wristPos2.y - wristPos1.y);
  });

  // ── zoomDelta output ───────────────────────────────────────────────────────

  it('emits no zoomDelta on the first zooming frame', () => {
    const left  = makeHand('openPalm');
    const right = makeHand('openPalm');
    fsm.update(makeFrame(0, left, right));
    const out = fsm.update(makeFrame(0, left, right)); // enters zooming, sets prevZoomDist
    expect(out.zoomDelta).toBeNull();
  });

  it('emits zoomDelta once a previous distance is established', () => {
    const lmL1 = makeLandmarks({ [LANDMARKS.INDEX_TIP]: { x: 0.4, y: 0.5, z: 0 } });
    const lmR1 = makeLandmarks({ [LANDMARKS.INDEX_TIP]: { x: 0.6, y: 0.5, z: 0 } });
    const lmL2 = makeLandmarks({ [LANDMARKS.INDEX_TIP]: { x: 0.3, y: 0.5, z: 0 } });
    const lmR2 = makeLandmarks({ [LANDMARKS.INDEX_TIP]: { x: 0.7, y: 0.5, z: 0 } });

    // Frame 1+2: dwell + transition (zooming entered on frame 2, but output comes from idle branch)
    fsm.update(makeFrame(0, makeHand('openPalm', lmL1), makeHand('openPalm', lmR1)));
    fsm.update(makeFrame(0, makeHand('openPalm', lmL1), makeHand('openPalm', lmR1)));
    // Frame 3: first real zooming frame — sets prevZoomDist, no delta yet
    fsm.update(makeFrame(1, makeHand('openPalm', lmL1), makeHand('openPalm', lmR1)));
    // Frame 4: wider spread → positive delta
    const out = fsm.update(makeFrame(2, makeHand('openPalm', lmL2), makeHand('openPalm', lmR2)));

    expect(out.mode).toBe('zooming');
    expect(out.zoomDelta).not.toBeNull();
    expect(out.zoomDelta!).toBeGreaterThan(0);
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  it('reset() returns the FSM to idle', () => {
    enterPanning(fsm);
    expect(fsm.getMode()).toBe('panning');

    fsm.reset();
    expect(fsm.getMode()).toBe('idle');
  });

  // ── dwell timer ────────────────────────────────────────────────────────────

  it('does NOT transition before actionDwellMs elapses', () => {
    const slowFsm = new GestureStateMachine({ ...FAST_TUNING, actionDwellMs: 200 });
    const fistHand = makeHand('fist');

    const out1 = slowFsm.update(makeFrame(0, fistHand, null));
    expect(out1.mode).toBe('idle');

    const out2 = slowFsm.update(makeFrame(100, fistHand, null)); // 100 ms < 200 ms
    expect(out2.mode).toBe('idle');

    const out3 = slowFsm.update(makeFrame(200, fistHand, null)); // 200 ms >= 200 ms
    expect(out3.mode).toBe('panning');
  });

  // ── release grace period ───────────────────────────────────────────────────

  it('stays in panning during release grace period', () => {
    const graceFsm = new GestureStateMachine({ ...FAST_TUNING, releaseGraceMs: 100 });
    enterPanning(graceFsm);
    expect(graceFsm.getMode()).toBe('panning');

    const out1 = graceFsm.update(makeFrame(1, null, null)); // grace starts
    expect(out1.mode).toBe('panning');

    const out2 = graceFsm.update(makeFrame(50, null, null)); // 50 ms < 100 ms
    expect(out2.mode).toBe('panning');

    const out3 = graceFsm.update(makeFrame(101, null, null)); // 101 ms >= 100 ms
    expect(out3.mode).toBe('idle');
  });
});
