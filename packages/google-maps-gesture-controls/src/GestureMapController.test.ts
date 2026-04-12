import { describe, it, expect } from 'vitest';
import type { HandLandmark } from '@map-gesture-controls/core';
import { LANDMARKS } from '@map-gesture-controls/core';

// --- Helpers -----------------------------------------------------------------

/**
 * isPrayPose is private on GestureMapController. We test it by extracting its
 * logic into a standalone helper that mirrors the implementation exactly, so
 * we can cover the geometry without spinning up a full Google Maps + MediaPipe stack.
 */
function makeLandmarks(overrides: Record<number, Partial<HandLandmark>> = {}): HandLandmark[] {
  const lm: HandLandmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  for (const [idx, vals] of Object.entries(overrides)) {
    lm[Number(idx)] = { ...lm[Number(idx)], ...vals };
  }
  return lm;
}

function isPrayPose(left: HandLandmark[], right: HandLandmark[]): boolean {
  const lWrist = left[LANDMARKS.WRIST];
  const rWrist = right[LANDMARKS.WRIST];
  if (!lWrist || !rWrist) return false;
  const dx = lWrist.x - rWrist.x;
  const dy = lWrist.y - rWrist.y;
  return Math.sqrt(dx * dx + dy * dy) < 0.45;
}

// --- isPrayPose --------------------------------------------------------------

describe('isPrayPose (Google Maps)', () => {
  it('returns true when wrists are at the same position', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.6 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.6 } });
    expect(isPrayPose(left, right)).toBe(true);
  });

  it('returns true when wrists are close (distance < 0.45)', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.45, y: 0.6 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.55, y: 0.6 } });
    expect(isPrayPose(left, right)).toBe(true);
  });

  it('returns true when wrists are just inside the threshold', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.5 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5 + 0.44, y: 0.5 } });
    expect(isPrayPose(left, right)).toBe(true);
  });

  it('returns false when wrists are outside the threshold', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.5 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5 + 0.46, y: 0.5 } });
    expect(isPrayPose(left, right)).toBe(false);
  });

  it('returns false when wrists are far apart horizontally', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.2, y: 0.5 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.8, y: 0.5 } });
    expect(isPrayPose(left, right)).toBe(false);
  });

  it('returns false when wrists are far apart vertically', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.1 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.8 } });
    expect(isPrayPose(left, right)).toBe(false);
  });

  it('uses Euclidean distance (diagonal wrists just inside threshold)', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.345, y: 0.345 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.655, y: 0.655 } });
    expect(isPrayPose(left, right)).toBe(true);
  });

  it('uses Euclidean distance (diagonal wrists just outside threshold)', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.335, y: 0.335 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.665, y: 0.665 } });
    expect(isPrayPose(left, right)).toBe(false);
  });
});

// --- Reset dwell timer (integration-style, no Google Maps/DOM required) ------

describe('reset dwell logic (Google Maps)', () => {
  /**
   * Mirrors the dwell logic in GestureMapController.renderLoop so we can
   * test the progress calculation and one-shot trigger in isolation.
   */
  function makeResetTracker(durationMs = 1000, graceMs = 300) {
    let resetPoseStart: number | null = null;
    let resetPoseTriggered = false;
    let resetPoseGraceTimer: number | null = null;
    const resets: number[] = [];

    function update(timestamp: number, poseActive: boolean): number {
      let resetProgress = 0;
      if (poseActive) {
        resetPoseGraceTimer = null;
        if (resetPoseStart === null) {
          resetPoseStart = timestamp;
          resetPoseTriggered = false;
        }
        const elapsed = timestamp - resetPoseStart;
        resetProgress = Math.min(1, elapsed / durationMs);
        if (!resetPoseTriggered && resetProgress >= 1) {
          resetPoseTriggered = true;
          resets.push(timestamp);
        }
      } else if (resetPoseStart !== null) {
        if (resetPoseGraceTimer === null) {
          resetPoseGraceTimer = timestamp;
        } else if (timestamp - resetPoseGraceTimer >= graceMs) {
          resetPoseStart = null;
          resetPoseTriggered = false;
          resetPoseGraceTimer = null;
        }
        if (resetPoseStart !== null) {
          const elapsed = timestamp - resetPoseStart;
          resetProgress = Math.min(1, elapsed / durationMs);
        }
      } else {
        resetPoseGraceTimer = null;
      }
      return resetProgress;
    }

    return { update, resets };
  }

  it('progress is 0 when pose is not active', () => {
    const { update } = makeResetTracker();
    expect(update(0, false)).toBe(0);
    expect(update(500, false)).toBe(0);
  });

  it('progress starts at 0 on first active frame', () => {
    const { update } = makeResetTracker();
    expect(update(1000, true)).toBe(0);
  });

  it('progress increases over time while pose is held', () => {
    const { update } = makeResetTracker(1000);
    update(0, true);
    expect(update(500, true)).toBeCloseTo(0.5);
    expect(update(750, true)).toBeCloseTo(0.75);
  });

  it('progress reaches 1.0 at exactly durationMs', () => {
    const { update } = makeResetTracker(1000);
    update(0, true);
    expect(update(1000, true)).toBe(1);
  });

  it('progress is clamped at 1.0 beyond durationMs', () => {
    const { update } = makeResetTracker(1000);
    update(0, true);
    expect(update(1500, true)).toBe(1);
  });

  it('fires the reset action exactly once when progress hits 1', () => {
    const { update, resets } = makeResetTracker(1000);
    update(0, true);
    update(999, true);
    expect(resets).toHaveLength(0);
    update(1000, true);
    expect(resets).toHaveLength(1);
    update(1100, true);
    expect(resets).toHaveLength(1);
  });

  it('resets the timer when pose is broken and grace period expires', () => {
    const { update, resets } = makeResetTracker(1000, 300);
    update(0, true);
    update(500, true);
    update(600, false);   // pose dropped, grace starts
    update(900, false);   // 300 ms later, grace expires
    update(1000, true);   // restart from zero
    expect(update(1100, true)).toBeCloseTo(0.1);
    expect(resets).toHaveLength(0);
  });

  it('survives a brief dropout within the grace period without resetting', () => {
    const { update, resets } = makeResetTracker(1000, 300);
    update(0, true);
    update(500, true);
    update(550, false);   // brief dropout, grace starts
    update(600, true);    // back within grace window (50 ms gap)
    expect(update(700, true)).toBeCloseTo(0.7);
    expect(resets).toHaveLength(0);
  });

  it('can trigger again after pose is broken and grace period expires', () => {
    const { update, resets } = makeResetTracker(1000, 300);
    update(0, true);
    update(1000, true);   // first trigger
    expect(resets).toHaveLength(1);
    update(1001, false);  // release, grace starts
    update(1400, false);  // grace expires, timer cleared
    update(2000, true);   // new attempt starts from zero
    update(3000, true);   // second trigger
    expect(resets).toHaveLength(2);
  });
});
