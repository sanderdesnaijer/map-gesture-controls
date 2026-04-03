import type { WebcamConfig, TuningConfig } from '@map-gesture-controls/core';

export interface GestureMapControllerConfig {
  map: import('ol').Map;
  webcam?: Partial<WebcamConfig>;
  tuning?: Partial<TuningConfig>;
  debug?: boolean;
}
