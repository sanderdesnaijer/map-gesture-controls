export type GestureMode = 'idle' | 'panning' | 'zooming';

export type HandednessLabel = 'Left' | 'Right';

export type GestureType = 'openPalm' | 'fist' | 'none';

export interface Point2D {
  x: number;
  y: number;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface DetectedHand {
  handedness: HandednessLabel;
  score: number;
  landmarks: HandLandmark[];
  gesture: GestureType;
}

export interface GestureFrame {
  timestamp: number;
  hands: DetectedHand[];
  leftHand: DetectedHand | null;
  rightHand: DetectedHand | null;
}

export interface WebcamConfig {
  enabled: boolean;
  /** 'full' | 'corner' | 'hidden' */
  mode: 'full' | 'corner' | 'hidden';
  opacity: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  width: number;
  height: number;
}

export interface TuningConfig {
  actionDwellMs: number;
  releaseGraceMs: number;
  panDeadzonePx: number;
  zoomDeadzoneRatio: number;
  smoothingAlpha: number;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  minPresenceConfidence: number;
}

export interface SmoothedPoint {
  x: number;
  y: number;
}
