export { GestureMapController } from './GestureMapController.js';
export { OpenLayersGestureInteraction } from './OpenLayersGestureInteraction.js';

export type { GestureMapControllerConfig } from './types.js';

// Re-export the full core public API so consumers only need one package
export {
  GestureController,
  GestureStateMachine,
  WebcamOverlay,
  classifyGesture,
  getHandSize,
  getTwoHandDistance,
  DEFAULT_WEBCAM_CONFIG,
  DEFAULT_TUNING_CONFIG,
  LANDMARKS,
  COLORS,
} from '@map-gesture-controls/core';

export type {
  GestureMode,
  GestureType,
  HandednessLabel,
  GestureFrame,
  DetectedHand,
  WebcamConfig,
  TuningConfig,
  StateMachineOutput,
  SmoothedPoint,
  Point2D,
  HandLandmark,
} from '@map-gesture-controls/core';
