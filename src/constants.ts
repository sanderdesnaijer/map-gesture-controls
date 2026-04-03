import type { WebcamConfig, TuningConfig } from './types.js';

export const DEFAULT_WEBCAM_CONFIG: WebcamConfig = {
  enabled: true,
  mode: 'corner',
  opacity: 0.85,
  position: 'bottom-right',
  width: 320,
  height: 240,
  margin: 16,
};

export const DEFAULT_TUNING_CONFIG: TuningConfig = {
  actionDwellMs: 80,
  releaseGraceMs: 150,
  panDeadzonePx: 10,
  zoomDeadzoneRatio: 0.005,
  smoothingAlpha: 0.5,
  minDetectionConfidence: 0.65,
  minTrackingConfidence: 0.65,
  minPresenceConfidence: 0.60,
  panScale: 2.0,
  zoomScale: 4.0,
};

// MediaPipe landmark indices
export const LANDMARKS = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_TIP: 8,
  INDEX_MCP: 5,
  MIDDLE_TIP: 12,
  MIDDLE_MCP: 9,
  RING_TIP: 16,
  RING_MCP: 13,
  PINKY_TIP: 20,
  PINKY_MCP: 17,
} as const;

// Fingertip indices for open-palm detection
export const FINGERTIP_INDICES = [
  LANDMARKS.INDEX_TIP,
  LANDMARKS.MIDDLE_TIP,
  LANDMARKS.RING_TIP,
  LANDMARKS.PINKY_TIP,
] as const;

export const FINGER_BASE_INDICES = [
  LANDMARKS.INDEX_MCP,
  LANDMARKS.MIDDLE_MCP,
  LANDMARKS.RING_MCP,
  LANDMARKS.PINKY_MCP,
] as const;

// Visual colours
export const COLORS = {
  idle: '#888888',
  panning: '#00ccff',
  zooming: '#00ffcc',
  landmark: 'rgba(255,255,255,0.6)',
  connection: 'rgba(255,255,255,0.3)',
  fingertipGlow: '#4488ff',
} as const;

export const MEDIAPIPE_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

/**
 * Deep-merge user-supplied partial config with the library defaults.
 * Each nested section (webcam, tuning) is merged independently so callers
 * only need to provide the keys they want to override.
 */
export function mergeConfig(
  userWebcam: Partial<WebcamConfig> | undefined,
  userTuning: Partial<TuningConfig> | undefined,
): { webcam: WebcamConfig; tuning: TuningConfig } {
  return {
    webcam: { ...DEFAULT_WEBCAM_CONFIG, ...userWebcam },
    tuning: { ...DEFAULT_TUNING_CONFIG, ...userTuning },
  };
}
