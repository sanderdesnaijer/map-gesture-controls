import { describe, it, expect } from 'vitest';
import { classifyGesture, getTwoHandDistance } from './gestureClassifier.js';
import type { HandLandmark } from './types.js';
import { LANDMARKS } from './constants.js';

/**
 * Build a flat array of 21 landmarks, all at (0.5, 0.5, 0).
 * Individual landmarks can be overridden via the `overrides` map.
 */
function makeLandmarks(overrides: Record<number, Partial<HandLandmark>> = {}): HandLandmark[] {
  const lm: HandLandmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  for (const [idx, vals] of Object.entries(overrides)) {
    lm[Number(idx)] = { ...lm[Number(idx)], ...vals };
  }
  return lm;
}

/**
 * Build an open-palm hand.
 *
 * Strategy: place wrist at origin, MCP joints at y=0.3, fingertips at y=0.1
 * (tips are farther from the wrist than MCPs) and spread them horizontally
 * so adjacent-tip distance >> 18% of hand size.
 *
 * Hand size = dist(wrist, middle-MCP) = dist({0,0},{0,0.3}) = 0.3
 * Adjacent tip spread = 0.1 per finger → 0.1 > 0.3 * 0.18 = 0.054 ✓
 */
function makeOpenPalmLandmarks(): HandLandmark[] {
  const lm = makeLandmarks();
  // Wrist at origin
  lm[LANDMARKS.WRIST] = { x: 0.5, y: 0.8, z: 0 };
  // MCP joints
  lm[LANDMARKS.INDEX_MCP]  = { x: 0.3, y: 0.5, z: 0 };
  lm[LANDMARKS.MIDDLE_MCP] = { x: 0.4, y: 0.5, z: 0 };
  lm[LANDMARKS.RING_MCP]   = { x: 0.5, y: 0.5, z: 0 };
  lm[LANDMARKS.PINKY_MCP]  = { x: 0.6, y: 0.5, z: 0 };
  // Fingertips: extended (farther from wrist than MCPs) and spread
  lm[LANDMARKS.INDEX_TIP]  = { x: 0.2, y: 0.1, z: 0 };
  lm[LANDMARKS.MIDDLE_TIP] = { x: 0.35, y: 0.1, z: 0 };
  lm[LANDMARKS.RING_TIP]   = { x: 0.5, y: 0.1, z: 0 };
  lm[LANDMARKS.PINKY_TIP]  = { x: 0.65, y: 0.1, z: 0 };
  return lm;
}

/**
 * Build a fist hand.
 *
 * Strategy: wrist at (0.5, 0.8), MCP joints at (0.5, 0.5),
 * fingertips curled back to (0.5, 0.7), closer to wrist than MCPs.
 *
 * dist(tip, wrist) ≈ 0.1 < dist(mcp, wrist) * 1.1 ≈ 0.33  ✓
 */
function makeFistLandmarks(): HandLandmark[] {
  const lm = makeLandmarks();
  lm[LANDMARKS.WRIST]      = { x: 0.5, y: 0.8, z: 0 };
  lm[LANDMARKS.INDEX_MCP]  = { x: 0.4, y: 0.5, z: 0 };
  lm[LANDMARKS.MIDDLE_MCP] = { x: 0.45, y: 0.5, z: 0 };
  lm[LANDMARKS.RING_MCP]   = { x: 0.5, y: 0.5, z: 0 };
  lm[LANDMARKS.PINKY_MCP]  = { x: 0.55, y: 0.5, z: 0 };
  lm[LANDMARKS.INDEX_TIP]  = { x: 0.4, y: 0.72, z: 0 };
  lm[LANDMARKS.MIDDLE_TIP] = { x: 0.45, y: 0.72, z: 0 };
  lm[LANDMARKS.RING_TIP]   = { x: 0.5, y: 0.72, z: 0 };
  lm[LANDMARKS.PINKY_TIP]  = { x: 0.55, y: 0.72, z: 0 };
  return lm;
}

// ─── classifyGesture ──────────────────────────────────────────────────────────

describe('classifyGesture', () => {
  it('returns "none" when fewer than 21 landmarks are provided', () => {
    expect(classifyGesture([])).toBe('none');
    expect(classifyGesture(makeLandmarks().slice(0, 20))).toBe('none');
  });

  it('classifies an open palm as "openPalm"', () => {
    expect(classifyGesture(makeOpenPalmLandmarks())).toBe('openPalm');
  });

  it('classifies a fist as "fist"', () => {
    expect(classifyGesture(makeFistLandmarks())).toBe('fist');
  });

  it('returns "none" for an ambiguous / neutral hand', () => {
    // All landmarks at the same point, fingers neither extended nor curled
    expect(classifyGesture(makeLandmarks())).toBe('none');
  });

  it('prefers "fist" over "openPalm" when both criteria match', () => {
    // The function checks fist first, so a fist should never become openPalm.
    const fist = makeFistLandmarks();
    expect(classifyGesture(fist)).toBe('fist');
  });
});

// ─── getTwoHandDistance ───────────────────────────────────────────────────────

describe('getTwoHandDistance', () => {
  it('returns the Euclidean distance between the two index fingertips', () => {
    const handA = makeLandmarks({ [LANDMARKS.INDEX_TIP]: { x: 0.0, y: 0.0, z: 0 } });
    const handB = makeLandmarks({ [LANDMARKS.INDEX_TIP]: { x: 0.3, y: 0.4, z: 0 } });
    expect(getTwoHandDistance(handA, handB)).toBeCloseTo(0.5);
  });

  it('returns 0 when the index fingertips are at the same position', () => {
    const hand = makeLandmarks({ [LANDMARKS.INDEX_TIP]: { x: 0.5, y: 0.5, z: 0 } });
    expect(getTwoHandDistance(hand, hand)).toBe(0);
  });

  it('returns 0 when landmarks array is empty (missing tips)', () => {
    expect(getTwoHandDistance([], [])).toBe(0);
  });
});
