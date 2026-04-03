import type {
  GestureMode,
  GestureFrame,
  TuningConfig,
  SmoothedPoint,
} from './types.js';
import { getTwoHandDistance } from './gestureClassifier.js';

export interface StateMachineOutput {
  mode: GestureMode;
  panDelta: SmoothedPoint | null;
  zoomDelta: number | null;
}

interface DwellTimer {
  gesture: GestureMode;
  startMs: number;
}

/**
 * Exponential Moving Average smoother for 2D points.
 */
class EMAPoint {
  private value: SmoothedPoint | null = null;
  constructor(private alpha: number) {}

  update(x: number, y: number): SmoothedPoint {
    if (this.value === null) {
      this.value = { x, y };
    } else {
      this.value = {
        x: this.alpha * x + (1 - this.alpha) * this.value.x,
        y: this.alpha * y + (1 - this.alpha) * this.value.y,
      };
    }
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

/**
 * Exponential Moving Average smoother for a scalar value.
 */
class EMAScalar {
  private value: number | null = null;
  constructor(private alpha: number) {}

  update(v: number): number {
    if (this.value === null) {
      this.value = v;
    } else {
      this.value = this.alpha * v + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

/**
 * GestureStateMachine: 3-state FSM
 *
 * Priority rules (evaluated every frame):
 *   both hands visible AND both open palm → desired = 'zooming'
 *   one hand visible AND gesture = 'fist' → desired = 'panning'
 *   otherwise                             → desired = 'idle'
 *
 * Transitions:
 *   idle → panning/zooming : desired stable for actionDwellMs
 *   panning/zooming → idle : desired changes, grace period releaseGraceMs,
 *                            then idle (next frame starts new dwell if needed)
 */
export class GestureStateMachine {
  private mode: GestureMode = 'idle';
  private actionDwell: DwellTimer | null = null;
  private releaseTimer: number | null = null;
  private panSmoother: EMAPoint;
  private prevPanPos: SmoothedPoint | null = null;
  private zoomSmoother: EMAScalar;
  private prevZoomDist: number | null = null;

  constructor(private tuning: TuningConfig) {
    this.panSmoother = new EMAPoint(tuning.smoothingAlpha);
    this.zoomSmoother = new EMAScalar(tuning.smoothingAlpha);
  }

  getMode(): GestureMode {
    return this.mode;
  }

  update(frame: GestureFrame): StateMachineOutput {
    const now = frame.timestamp;
    const { actionDwellMs, releaseGraceMs } = this.tuning;
    const { leftHand, rightHand } = frame;

    // ── Determine desired mode for this frame ─────────────────────────────────
    const bothOpen =
      leftHand !== null &&
      rightHand !== null &&
      leftHand.gesture === 'openPalm' &&
      rightHand.gesture === 'openPalm';
    const oneFist =
      (leftHand !== null && leftHand.gesture === 'fist' && rightHand === null) ||
      (rightHand !== null && rightHand.gesture === 'fist' && leftHand === null);

    const desired: GestureMode = bothOpen ? 'zooming' : oneFist ? 'panning' : 'idle';

    // ── idle ──────────────────────────────────────────────────────────────────
    if (this.mode === 'idle') {
      if (desired !== 'idle') {
        if (this.actionDwell === null || this.actionDwell.gesture !== desired) {
          this.actionDwell = { gesture: desired, startMs: now };
        } else if (now - this.actionDwell.startMs >= actionDwellMs) {
          this.transitionTo(desired);
        }
      } else {
        this.actionDwell = null;
      }
      return this.buildOutput(null, null);
    }

    // ── panning ───────────────────────────────────────────────────────────────
    if (this.mode === 'panning') {
      if (desired !== 'panning') {
        if (this.releaseTimer === null) {
          this.releaseTimer = now;
        } else if (now - this.releaseTimer >= releaseGraceMs) {
          this.transitionTo('idle');
        }
        return this.buildOutput(null, null);
      }
      this.releaseTimer = null;

      const fistHand = leftHand?.gesture === 'fist' ? leftHand : rightHand;
      if (!fistHand) {
        this.transitionTo('idle');
        return this.buildOutput(null, null);
      }

      const wrist = fistHand.landmarks[0];
      const smooth = this.panSmoother.update(wrist.x, wrist.y);

      let panDelta: SmoothedPoint | null = null;
      if (this.prevPanPos !== null) {
        const rawDx = smooth.x - this.prevPanPos.x;
        const rawDy = smooth.y - this.prevPanPos.y;
        const deadzone = this.tuning.panDeadzonePx / 640;
        if (Math.abs(rawDx) > deadzone || Math.abs(rawDy) > deadzone) {
          panDelta = { x: rawDx, y: rawDy };
        }
      }
      this.prevPanPos = smooth;
      return this.buildOutput(panDelta, null);
    }

    // ── zooming ───────────────────────────────────────────────────────────────
    if (this.mode === 'zooming') {
      if (desired !== 'zooming') {
        if (this.releaseTimer === null) {
          this.releaseTimer = now;
        } else if (now - this.releaseTimer >= releaseGraceMs) {
          this.transitionTo('idle');
        }
        return this.buildOutput(null, null);
      }
      this.releaseTimer = null;

      if (!leftHand || !rightHand) {
        this.transitionTo('idle');
        return this.buildOutput(null, null);
      }

      const rawDist = getTwoHandDistance(leftHand.landmarks, rightHand.landmarks);
      const smoothDist = this.zoomSmoother.update(rawDist);

      let zoomDelta: number | null = null;
      if (this.prevZoomDist !== null) {
        const delta = smoothDist - this.prevZoomDist;
        if (Math.abs(delta) > this.tuning.zoomDeadzoneRatio) {
          zoomDelta = delta;
        }
      }
      this.prevZoomDist = smoothDist;
      return this.buildOutput(null, zoomDelta);
    }

    return this.buildOutput(null, null);
  }

  private transitionTo(next: GestureMode): void {
    this.mode = next;
    this.releaseTimer = null;
    this.actionDwell = null;

    if (next !== 'panning') {
      this.panSmoother.reset();
      this.prevPanPos = null;
    }
    if (next !== 'zooming') {
      this.zoomSmoother.reset();
      this.prevZoomDist = null;
    }
  }

  private buildOutput(
    panDelta: SmoothedPoint | null,
    zoomDelta: number | null,
  ): StateMachineOutput {
    return { mode: this.mode, panDelta, zoomDelta };
  }

  reset(): void {
    this.transitionTo('idle');
  }
}
