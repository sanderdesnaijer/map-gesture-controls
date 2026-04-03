import type { GestureMapControllerConfig, GestureFrame, WebcamConfig, TuningConfig } from './types.js';
import { mergeConfig } from './constants.js';
import { GestureController } from './GestureController.js';
import { GestureStateMachine } from './GestureStateMachine.js';
import { WebcamOverlay } from './WebcamOverlay.js';
import { OpenLayersGestureInteraction } from './OpenLayersGestureInteraction.js';

/**
 * GestureMapController
 *
 * Top-level public API. Wires together all subsystems:
 *   GestureController → GestureStateMachine → OpenLayersGestureInteraction
 *                                           ↘ WebcamOverlay
 *
 * Usage:
 *   const ctrl = new GestureMapController({ map });
 *   await ctrl.start();
 *   // …
 *   ctrl.stop();
 */
export class GestureMapController {
  private config: { map: GestureMapControllerConfig['map']; webcam: WebcamConfig; tuning: TuningConfig; debug: boolean };
  private gestureController: GestureController;
  private stateMachine: GestureStateMachine;
  private overlay: WebcamOverlay;
  private interaction: OpenLayersGestureInteraction;
  private lastFrame: GestureFrame | null = null;
  private rafHandle: number | null = null;
  private started = false;
  private paused = false;

  constructor(userConfig: GestureMapControllerConfig) {
    const { webcam: webcamConfig, tuning: tuningConfig } = mergeConfig(userConfig.webcam, userConfig.tuning);

    this.config = {
      map: userConfig.map,
      webcam: webcamConfig,
      tuning: tuningConfig,
      debug: userConfig.debug ?? false,
    };

    this.gestureController = new GestureController(tuningConfig, (frame) => {
      this.lastFrame = frame;
    });

    this.stateMachine = new GestureStateMachine(tuningConfig);
    this.overlay = new WebcamOverlay(webcamConfig);
    this.interaction = new OpenLayersGestureInteraction(userConfig.map, tuningConfig.panScale, tuningConfig.zoomScale);
  }

  /**
   * Initialise webcam + MediaPipe, mount overlay, begin detection loop.
   * Must be called from a user-gesture event (e.g. button click) to allow
   * webcam permission prompt.
   */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const videoEl = await this.gestureController.init();
    this.overlay.attachVideo(videoEl);

    const mapTarget = this.config.map.getTargetElement() as HTMLElement;
    this.overlay.mount(mapTarget ?? document.body);

    this.gestureController.start();
    this.renderLoop();

    // Pause when tab is hidden to save resources
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /** Stop detection and remove overlay. */
  stop(): void {
    this.gestureController.destroy();
    this.overlay.unmount();
    this.stateMachine.reset();
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
    this.overlay.render(frame, output.mode);

    if (this.config.debug) {
      this.logDebug(output.mode, frame);
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  };

  private logDebug(mode: string, frame: GestureFrame): void {
    const hands = frame.hands
      .map((h) => `${h.handedness}:${h.gesture}(${h.score.toFixed(2)})`)
      .join(' ');
    console.debug(`[ol-gestures] mode=${mode} ${hands}`);
  }
}
