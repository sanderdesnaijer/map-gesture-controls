import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandLandmark } from '@map-gesture-controls/core';
import { LANDMARKS } from '@map-gesture-controls/core';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * isPrayPose is private on GestureMapController. We test it by extracting its
 * logic into a standalone helper that mirrors the implementation exactly, so
 * we can cover the geometry without spinning up a full OL map + MediaPipe stack.
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
  return Math.sqrt(dx * dx + dy * dy) < 0.30;
}

// ─── isPrayPose ───────────────────────────────────────────────────────────────

describe('isPrayPose', () => {
  it('returns true when wrists are at the same position', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.6 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.6 } });
    expect(isPrayPose(left, right)).toBe(true);
  });

  it('returns true when wrists are close (distance < 0.30)', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.45, y: 0.6 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.55, y: 0.6 } });
    // distance = 0.10, well within threshold
    expect(isPrayPose(left, right)).toBe(true);
  });

  it('returns true when wrists are just inside the threshold', () => {
    // distance = 0.29, just below 0.30
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.5 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5 + 0.29, y: 0.5 } });
    expect(isPrayPose(left, right)).toBe(true);
  });

  it('returns false when wrists are exactly at the threshold', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.5 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5 + 0.30, y: 0.5 } });
    expect(isPrayPose(left, right)).toBe(false);
  });

  it('returns false when wrists are far apart horizontally (one-handed pan/zoom position)', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.2, y: 0.5 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.8, y: 0.5 } });
    // distance = 0.60, well outside threshold
    expect(isPrayPose(left, right)).toBe(false);
  });

  it('returns false when wrists are far apart vertically', () => {
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.1 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.5, y: 0.8 } });
    // distance = 0.70
    expect(isPrayPose(left, right)).toBe(false);
  });

  it('uses Euclidean distance (diagonal wrists just inside threshold)', () => {
    // diagonal: dx=0.2, dy=0.2 → distance ≈ 0.283, inside 0.30
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.4, y: 0.4 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.6, y: 0.6 } });
    expect(isPrayPose(left, right)).toBe(true);
  });

  it('uses Euclidean distance (diagonal wrists just outside threshold)', () => {
    // diagonal: dx=0.22, dy=0.22 → distance ≈ 0.311, outside 0.30
    const left  = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.39, y: 0.39 } });
    const right = makeLandmarks({ [LANDMARKS.WRIST]: { x: 0.61, y: 0.61 } });
    expect(isPrayPose(left, right)).toBe(false);
  });
});

// ─── Reset dwell timer (integration-style, no OL/DOM required) ───────────────

describe('reset dwell logic', () => {
  /**
   * Mirrors the dwell logic in GestureMapController.renderLoop so we can
   * test the progress calculation and one-shot trigger in isolation.
   */
  function makeResetTracker(durationMs = 1000) {
    let resetPoseStart: number | null = null;
    let resetPoseTriggered = false;
    const resets: number[] = [];

    function update(timestamp: number, poseActive: boolean): number {
      let resetProgress = 0;
      if (poseActive) {
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
      } else {
        resetPoseStart = null;
        resetPoseTriggered = false;
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
    update(0, true);       // start
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
    update(1100, true);   // still held, must not fire again
    expect(resets).toHaveLength(1);
  });

  it('resets the timer when pose is broken before completion', () => {
    const { update, resets } = makeResetTracker(1000);
    update(0, true);
    update(500, true);
    update(600, false);   // pose dropped
    update(700, true);    // restart
    expect(update(800, true)).toBeCloseTo(0.1); // 100 ms into new attempt
    expect(resets).toHaveLength(0);
  });

  it('can trigger again after pose is broken and re-held', () => {
    const { update, resets } = makeResetTracker(1000);
    update(0, true);
    update(1000, true);   // first trigger
    expect(resets).toHaveLength(1);
    update(1001, false);  // release
    update(2000, true);   // new attempt starts
    update(3000, true);   // second trigger
    expect(resets).toHaveLength(2);
  });
});
