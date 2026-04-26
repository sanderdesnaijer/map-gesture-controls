import type { GestureFrame, HandLandmark, WebcamConfig, TuningConfig } from '@map-gesture-controls/core';
import {
  DEFAULT_WEBCAM_CONFIG,
  DEFAULT_TUNING_CONFIG,
  LANDMARKS,
  GestureController,
  GestureStateMachine,
  WebcamOverlay,
} from '@map-gesture-controls/core';
import type { GestureMapControllerConfig } from './types.js';
import { LeafletGestureInteraction } from './LeafletGestureInteraction.js';

/**
 * GestureMapController
 *
 * Top-level public API for Leaflet. Wires together all subsystems:
 *   GestureController -> GestureStateMachine -> LeafletGestureInteraction
 *                                            -> WebcamOverlay
 *
 * Usage:
 *   const ctrl = new GestureMapController({ map });
 *   await ctrl.start();
 *   // ...
 *   ctrl.stop();
 */
export class GestureMapController {
  private config: { map: GestureMapControllerConfig['map']; webcam: WebcamConfig; tuning: TuningConfig; debug: boolean };
  private gestureController: GestureController;
  private stateMachine: GestureStateMachine;
  private overlay: WebcamOverlay;
  private interaction: LeafletGestureInteraction;
  private lastFrame: GestureFrame | null = null;
  private rafHandle: number | null = null;
  private started = false;
  private paused = false;

  private resetPoseStart: number | null = null;
  private resetPoseTriggered = false;
  private resetPoseGraceTimer: number | null = null;
  private readonly resetPoseDurationMs = 1000;
  private readonly resetPoseGraceMs = 300;
  private readonly initialZoom: number;
  private readonly initialCenter: [number, number];
  private readonly initialBearing = 0;

  constructor(userConfig: GestureMapControllerConfig) {
    const webcamConfig = { ...DEFAULT_WEBCAM_CONFIG, ...userConfig.webcam };
    const tuningConfig = { ...DEFAULT_TUNING_CONFIG, ...userConfig.tuning };

    this.config = {
      map: userConfig.map,
      webcam: webcamConfig,
      tuning: tuningConfig,
      debug: userConfig.debug ?? false,
    };

    const center = userConfig.map.getCenter();
    this.initialZoom = userConfig.map.getZoom();
    this.initialCenter = [center.lat, center.lng];

    this.gestureController = new GestureController(tuningConfig, (frame) => {
      this.lastFrame = frame;
    });

    this.stateMachine = new GestureStateMachine(tuningConfig);
    this.overlay = new WebcamOverlay(webcamConfig);
    this.interaction = new LeafletGestureInteraction(userConfig.map);
  }

  /**
   * Initialise webcam + MediaPipe, mount overlay, begin detection loop.
   * Must be called from a user-gesture event (e.g. button click) to allow
   * webcam permission prompt.
   */
  async start(): Promise<void> {
    if (this.started) return;
    try {
      const videoEl = await this.gestureController.init();
      this.overlay.attachVideo(videoEl);

      const mapContainer = this.config.map.getContainer() as HTMLElement;
      this.overlay.mount(mapContainer ?? document.body);

      this.resetTransientState();
      this.started = true;
      this.paused = false;
      this.interaction.syncFromMap();
      this.gestureController.start();
      this.renderLoop();

      // Pause when tab is hidden to save resources
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    } catch (error) {
      this.overlay.unmount();
      this.gestureController.destroy();
      this.resetTransientState();
      this.started = false;
      this.paused = false;
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      throw error;
    }
  }

  /** Stop detection and remove overlay. Safe to call start() again afterwards. */
  stop(): void {
    this.gestureController.destroy();
    this.overlay.unmount();
    this.stateMachine.reset();
    this.resetTransientState();
    this.interaction.destroy();
    // Recreate the interaction so a subsequent start() has fresh state.
    this.interaction = new LeafletGestureInteraction(this.config.map);
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.started = false;
    this.paused = false;
  }

  /** Pause detection (overlay stays visible but inactive). */
  pause(): void {
    this.paused = true;
    this.gestureController.stop();
    this.stateMachine.reset();
  }

  /** Resume after pause. */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.interaction.syncFromMap();
    this.gestureController.start();
  }

  private renderLoop(): void {
    this.rafHandle = requestAnimationFrame(() => this.renderLoop());

    if (this.paused) {
      this.overlay.render(null, 'idle');
      return;
    }

    const frame = this.lastFrame;
    if (frame === null) {
      this.overlay.render(null, 'idle');
      return;
    }

    const output = this.stateMachine.update(frame);
    this.interaction.apply(output);

    let resetProgress = 0;
    const { leftHand, rightHand, timestamp } = frame;
    const resetPoseActive =
      !!leftHand &&
      !!rightHand &&
      leftHand.gesture !== 'fist' &&
      leftHand.gesture !== 'pinch' &&
      rightHand.gesture !== 'fist' &&
      rightHand.gesture !== 'pinch' &&
      this.isPrayPose(leftHand.landmarks, rightHand.landmarks);

    if (resetPoseActive) {
      // Pose is active: clear any grace timer and start/continue dwell
      this.resetPoseGraceTimer = null;
      if (this.resetPoseStart === null) {
        this.resetPoseStart = timestamp;
        this.resetPoseTriggered = false;
      }
      const elapsed = timestamp - this.resetPoseStart;
      resetProgress = Math.min(1, elapsed / this.resetPoseDurationMs);
      if (!this.resetPoseTriggered && resetProgress >= 1) {
        this.resetPoseTriggered = true;
        this.config.map.setView(this.initialCenter, this.initialZoom, { animate: false });
        this.interaction.setBearing(this.initialBearing);
        this.interaction.syncFromMap();
      }
    } else if (this.resetPoseStart !== null) {
      // Pose dropped -- start grace period before resetting the timer
      if (this.resetPoseGraceTimer === null) {
        this.resetPoseGraceTimer = timestamp;
      } else if (timestamp - this.resetPoseGraceTimer >= this.resetPoseGraceMs) {
        this.resetPoseStart = null;
        this.resetPoseTriggered = false;
        this.resetPoseGraceTimer = null;
      }
      // While in grace period, keep showing the last progress value
      if (this.resetPoseStart !== null) {
        const elapsed = timestamp - this.resetPoseStart;
        resetProgress = Math.min(1, elapsed / this.resetPoseDurationMs);
      }
    } else {
      this.resetPoseGraceTimer = null;
    }

    this.overlay.render(frame, output.mode, resetProgress);

    if (this.config.debug) {
      this.logDebug(output.mode, frame);
    }
  }

  /**
   * Returns true when both hands are held close together based on wrist proximity.
   * Uses Euclidean distance between the two wrists in normalised screen-space
   * coordinates (0 to 1). Threshold is 0.45.
   */
  private isPrayPose(left: HandLandmark[], right: HandLandmark[]): boolean {
    const lWrist = left[LANDMARKS.WRIST];
    const rWrist = right[LANDMARKS.WRIST];
    if (!lWrist || !rWrist) return false;

    // Hands are together when wrists are close in both X and Y
    const dx = lWrist.x - rWrist.x;
    const dy = lWrist.y - rWrist.y;
    return Math.sqrt(dx * dx + dy * dy) < 0.45;
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  };

  private resetTransientState(): void {
    this.lastFrame = null;
    this.resetPoseStart = null;
    this.resetPoseTriggered = false;
    this.resetPoseGraceTimer = null;
  }

  private logDebug(mode: string, frame: GestureFrame): void {
    const hands = frame.hands
      .map((h) => `${h.handedness}:${h.gesture}(${h.score.toFixed(2)})`)
      .join(' ');
    console.debug(`[leaflet-gestures] mode=${mode} ${hands}`);
  }
}
