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
  smoothingAlpha: 1,      // no smoothing, raw values pass through
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
 * Pan = left fist only.
 */
function enterPanning(fsm: GestureStateMachine, hand = makeHand('fist')): void {
  fsm.update(makeFrame(0, hand, null)); // starts dwell timer
  fsm.update(makeFrame(0, hand, null)); // dwell elapsed → panning
}

/**
 * Drive the FSM into 'zooming' with dwell=0 (requires two identical frames).
 * Zoom = right fist only.
 */
function enterZooming(fsm: GestureStateMachine, right = makeHand('fist')): void {
  fsm.update(makeFrame(0, null, right));
  fsm.update(makeFrame(0, null, right));
}

/**
 * Drive the FSM into 'rotating' with dwell=0.
 * Requires ESCALATION_FRAMES (3) consecutive both-active frames, then one
 * more for the dwell to fire (dwell=0 means it fires on the frame that meets
 * the threshold, so 3 stable frames + 1 dwell frame = 4 total).
 * Rotate = both fists.
 */
function enterRotating(
  fsm: GestureStateMachine,
  left = makeHand('fist'),
  right = makeHand('fist'),
): void {
  // Frame 1: both active, dwell timer starts (idle branch, no transition yet).
  // Frame 2: dwell fires → transitionTo('zooming'), resets leftActiveFrames to 0.
  // Frames 3-5: leftActiveFrames counts 1 → 2 → 3 (= ESCALATION_FRAMES).
  // Frame 5: bothStable=true → zooming branch escalates to rotating.
  fsm.update(makeFrame(0, left, right));
  fsm.update(makeFrame(0, left, right));
  fsm.update(makeFrame(0, left, right));
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

  it('transitions to panning when left fist is held (two frames, dwell=0)', () => {
    const fistHand = makeHand('fist');
    fsm.update(makeFrame(0, fistHand, null)); // starts dwell
    const out = fsm.update(makeFrame(0, fistHand, null)); // 0 >= 0 → panning
    expect(out.mode).toBe('panning');
  });

  // ── idle → zooming ─────────────────────────────────────────────────────────

  it('transitions to zooming when right fist is held (two frames, dwell=0)', () => {
    const right = makeHand('fist');
    fsm.update(makeFrame(0, null, right));
    const out = fsm.update(makeFrame(0, null, right));
    expect(out.mode).toBe('zooming');
  });

  // ── idle → rotating ────────────────────────────────────────────────────────

  it('transitions to rotating when both fists are held stably (5 frames: dwell + 3 escalation)', () => {
    const left  = makeHand('fist');
    const right = makeHand('fist');
    fsm.update(makeFrame(0, left, right));
    fsm.update(makeFrame(0, left, right));
    fsm.update(makeFrame(0, left, right));
    fsm.update(makeFrame(0, left, right));
    const out = fsm.update(makeFrame(0, left, right));
    expect(out.mode).toBe('rotating');
  });

  it('prefers rotating over zooming once both fists are held stably', () => {
    const left  = makeHand('fist');
    const right = makeHand('fist');
    fsm.update(makeFrame(0, left, right));
    fsm.update(makeFrame(0, left, right));
    fsm.update(makeFrame(0, left, right));
    fsm.update(makeFrame(0, left, right));
    const out = fsm.update(makeFrame(0, left, right));
    // both fists stable for ESCALATION_FRAMES = rotating, not zooming
    expect(out.mode).toBe('rotating');
  });

  it('does NOT transition to rotating if second hand only appears for 1-2 frames (noise guard)', () => {
    const left  = makeHand('fist');
    const right = makeHand('fist');
    // Only 2 frames with both hands — below ESCALATION_FRAMES threshold
    fsm.update(makeFrame(0, left, null));  // establish left pan
    fsm.update(makeFrame(0, left, null));  // → panning
    fsm.update(makeFrame(1, left, right)); // right appears — 1 frame, not stable yet
    const out = fsm.update(makeFrame(1, left, right)); // 2 frames — still below threshold
    expect(out.mode).toBe('panning');
  });

  // ── panning → idle ─────────────────────────────────────────────────────────

  it('returns to idle when the left fist is released (releaseGraceMs=0)', () => {
    enterPanning(fsm);
    expect(fsm.getMode()).toBe('panning');

    fsm.update(makeFrame(1, null, null)); // starts release timer
    const out = fsm.update(makeFrame(1, null, null)); // 0 >= 0 → idle
    expect(out.mode).toBe('idle');
  });

  // ── zooming → idle ─────────────────────────────────────────────────────────

  it('returns to idle when right fist is released (releaseGraceMs=0)', () => {
    enterZooming(fsm);
    expect(fsm.getMode()).toBe('zooming');

    fsm.update(makeFrame(1, null, null)); // starts release timer
    const out = fsm.update(makeFrame(1, null, null)); // 0 >= 0 → idle
    expect(out.mode).toBe('idle');
  });

  // ── rotating → idle ────────────────────────────────────────────────────────

  it('returns to idle when both fists are released (releaseGraceMs=0)', () => {
    enterRotating(fsm);
    expect(fsm.getMode()).toBe('rotating');

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
    // Frame 3: first real panning frame, sets prevPanPos = wristPos1, no delta yet
    fsm.update(makeFrame(1, makeHand('fist', lm1), null));
    // Frame 4: second panning frame, emits delta
    const out = fsm.update(makeFrame(2, makeHand('fist', lm2), null));

    expect(out.mode).toBe('panning');
    expect(out.panDelta).not.toBeNull();
    expect(out.panDelta!.x).toBeCloseTo(wristPos2.x - wristPos1.x);
    expect(out.panDelta!.y).toBeCloseTo(wristPos2.y - wristPos1.y);
  });

  // ── zoomDelta output ───────────────────────────────────────────────────────

  it('emits no zoomDelta on the first zooming frame', () => {
    const right = makeHand('fist');
    fsm.update(makeFrame(0, null, right));
    const out = fsm.update(makeFrame(0, null, right)); // enters zooming, sets prevZoomDist
    expect(out.zoomDelta).toBeNull();
  });

  it('emits zoomDelta once a previous position is established', () => {
    // Right wrist starts lower (y=0.6), then moves up (y=0.4) → zoom in (positive delta)
    const lmR1 = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.6, z: 0 } });
    const lmR2 = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.4, z: 0 } });

    // Frame 1+2: dwell + transition (zooming entered on frame 2, but output comes from idle branch)
    fsm.update(makeFrame(0, null, makeHand('fist', lmR1)));
    fsm.update(makeFrame(0, null, makeHand('fist', lmR1)));
    // Frame 3: first real zooming frame, sets prevZoomDist, no delta yet
    fsm.update(makeFrame(1, null, makeHand('fist', lmR1)));
    // Frame 4: hand moved up → zoom in (positive delta)
    const out = fsm.update(makeFrame(2, null, makeHand('fist', lmR2)));

    expect(out.mode).toBe('zooming');
    expect(out.zoomDelta).not.toBeNull();
    expect(out.zoomDelta!).toBeGreaterThan(0); // hand moved up = zoom in
  });

  it('emits negative zoomDelta when hand moves down (zoom out)', () => {
    const lmR1 = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.4, z: 0 } });
    const lmR2 = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.6, z: 0 } });

    fsm.update(makeFrame(0, null, makeHand('fist', lmR1)));
    fsm.update(makeFrame(0, null, makeHand('fist', lmR1)));
    fsm.update(makeFrame(1, null, makeHand('fist', lmR1)));
    const out = fsm.update(makeFrame(2, null, makeHand('fist', lmR2)));

    expect(out.zoomDelta).not.toBeNull();
    expect(out.zoomDelta!).toBeLessThan(0); // hand moved down = zoom out
  });

  // ── rotateDelta output ─────────────────────────────────────────────────────

  it('emits no rotateDelta on the first rotating frame', () => {
    // enterRotating drives into rotating mode (5 frames); the escalation frame
    // itself returns null (no prevAngle yet). The *next* frame sets prevAngle,
    // still no delta. Only the frame after that can emit a delta.
    enterRotating(fsm);
    // First full frame inside rotating — sets prevRotateAngle, no delta yet
    const out = fsm.update(makeFrame(1, makeHand('fist'), makeHand('fist')));
    expect(out.rotateDelta).toBeNull();
  });

  it('emits rotateDelta once a previous angle is established', () => {
    // Left wrist at (0.2, 0.5), right wrist at (0.8, 0.5) → angle = 0 (horizontal)
    const lmL1 = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.2, y: 0.5, z: 0 } });
    const lmR1 = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.8, y: 0.5, z: 0 } });
    // Tilt clockwise: right wrist drops, left wrist rises → angle increases
    const lmL2 = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.2, y: 0.4, z: 0 } });
    const lmR2 = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.8, y: 0.6, z: 0 } });

    // Get into rotating mode (5 frames with lmL1/lmR1)
    for (let i = 0; i < 5; i++) {
      fsm.update(makeFrame(0, makeHand('fist', lmL1), makeHand('fist', lmR1)));
    }
    // First frame inside rotating: sets prevRotateAngle, no delta
    fsm.update(makeFrame(1, makeHand('fist', lmL1), makeHand('fist', lmR1)));
    // Second frame: emits delta
    const out = fsm.update(makeFrame(2, makeHand('fist', lmL2), makeHand('fist', lmR2)));

    expect(out.mode).toBe('rotating');
    expect(out.rotateDelta).not.toBeNull();
  });

  // ── reset ──────────────────────────────────────────────────────────────────

  it('reset() returns the FSM to idle', () => {
    enterPanning(fsm);
    expect(fsm.getMode()).toBe('panning');

    fsm.reset();
    expect(fsm.getMode()).toBe('idle');
  });

  it('reset() returns the FSM to idle from rotating', () => {
    enterRotating(fsm);
    expect(fsm.getMode()).toBe('rotating');

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
