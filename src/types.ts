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
  /** Distance in px from the nearest viewport edge(s). Default: 16 */
  margin: number;
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
  /** Multiplier applied to normalised hand delta before converting to map pixels. Default: 2.0 */
  panScale: number;
  /** Multiplier applied to two-hand distance delta before updating zoom level. Default: 4.0 */
  zoomScale: number;
}

export interface GestureMapControllerConfig {
  map: import('ol').Map;
  webcam?: Partial<WebcamConfig>;
  tuning?: Partial<TuningConfig>;
  debug?: boolean;
}

export interface SmoothedPoint {
  x: number;
  y: number;
}
