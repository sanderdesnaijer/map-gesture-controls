import type { HandLandmark, GestureType } from './types.js';
import { LANDMARKS, FINGERTIP_INDICES, FINGER_BASE_INDICES } from './constants.js';

/**
 * Euclidean distance between two landmarks (ignoring Z).
 */
function dist(a: HandLandmark, b: HandLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Returns true if all four fingers (index–pinky) are extended.
 * A finger is "extended" when its tip is farther from the wrist than its MCP joint.
 */
function areAllFingersExtended(landmarks: HandLandmark[]): boolean {
  const wrist = landmarks[LANDMARKS.WRIST];
  for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
    const tip = landmarks[FINGERTIP_INDICES[i]];
    const mcp = landmarks[FINGER_BASE_INDICES[i]];
    if (dist(tip, wrist) < dist(mcp, wrist) * 0.9) {
      return false;
    }
  }
  return true;
}

/**
 * Returns true if all four fingers (index–pinky) are curled.
 * A finger is "curled" when its tip is closer to the wrist than its MCP joint.
 */
function areAllFingersCurled(landmarks: HandLandmark[]): boolean {
  const wrist = landmarks[LANDMARKS.WRIST];
  let curledCount = 0;
  for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
    const tip = landmarks[FINGERTIP_INDICES[i]];
    const mcp = landmarks[FINGER_BASE_INDICES[i]];
    if (dist(tip, wrist) < dist(mcp, wrist) * 1.1) {
      curledCount++;
    }
  }
  // At least 3 of 4 fingers must be curled to count as fist
  return curledCount >= 3;
}

/**
 * Returns the apparent 2D size of the hand: wrist-to-middle-MCP distance
 * in normalised screen space (0–1). Used as a depth proxy — hand grows
 * larger as it moves toward the camera.
 */
export function getHandSize(landmarks: HandLandmark[]): number {
  const wrist = landmarks[LANDMARKS.WRIST];
  const middleMcp = landmarks[LANDMARKS.MIDDLE_MCP];
  if (!wrist || !middleMcp) return 0;
  return dist(wrist, middleMcp);
}

/**
 * Returns the Euclidean distance between the index fingertips of two hands
 * in normalised screen space (0–1). Used as the two-hand zoom metric —
 * hands moving apart = positive delta = zoom in.
 */
export function getTwoHandDistance(
  landmarksA: HandLandmark[],
  landmarksB: HandLandmark[],
): number {
  const tipA = landmarksA[LANDMARKS.INDEX_TIP];
  const tipB = landmarksB[LANDMARKS.INDEX_TIP];
  if (!tipA || !tipB) return 0;
  return dist(tipA, tipB);
}

/**
 * Classify the gesture for a single hand from its landmarks.
 *
 * Priority: fist > openPalm > none
 *
 * Fist: most fingers curled
 * Open palm: all fingers extended
 */
export function classifyGesture(landmarks: HandLandmark[]): GestureType {
  if (landmarks.length < 21) return 'none';

  if (areAllFingersCurled(landmarks)) {
    return 'fist';
  }

  if (areAllFingersExtended(landmarks)) {
    return 'openPalm';
  }

  return 'none';
}
