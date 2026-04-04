import type {
  GestureMode,
  GestureFrame,
  TuningConfig,
  SmoothedPoint,
} from './types.js';

export interface StateMachineOutput {
  mode: GestureMode;
  panDelta: SmoothedPoint | null;
  zoomDelta: number | null;
  rotateDelta: number | null;
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
 * GestureStateMachine: 4-state FSM
 *
 * Priority rules (evaluated every frame):
 *   both hands fist                            → desired = 'rotating'
 *     angle of the wrist-to-wrist line; delta rotates the map
 *   right hand fist (left absent or not fist)  → desired = 'zooming'
 *     vertical motion of right wrist controls zoom (up = in, down = out)
 *   left hand fist (right absent or not fist)  → desired = 'panning'
 *     horizontal and vertical motion of left wrist pans the map
 *   otherwise                                  → desired = 'idle'
 *
 * Transitions:
 *   idle → any active : desired stable for actionDwellMs
 *   active → idle     : desired changes, grace period releaseGraceMs,
 *                       then idle (next frame starts new dwell if needed)
 */
export class GestureStateMachine {
  private mode: GestureMode = 'idle';
  private actionDwell: DwellTimer | null = null;
  private releaseTimer: number | null = null;
  private panSmoother: EMAPoint;
  private prevPanPos: SmoothedPoint | null = null;
  private zoomSmoother: EMAScalar;
  private prevZoomDist: number | null = null;
  private rotateSmoother: EMAScalar;
  private prevRotateAngle: number | null = null;
  // Tracks how many consecutive frames each hand has been active.
  // Used to require the secondary hand to be stable before escalating
  // the mode (e.g. pan → rotate), preventing a single noisy frame from
  // interrupting an ongoing single-hand gesture.
  private leftActiveFrames = 0;
  private rightActiveFrames = 0;
  private static readonly ESCALATION_FRAMES = 3;

  constructor(private tuning: TuningConfig) {
    this.panSmoother = new EMAPoint(tuning.smoothingAlpha);
    this.zoomSmoother = new EMAScalar(tuning.smoothingAlpha);
    this.rotateSmoother = new EMAScalar(tuning.smoothingAlpha);
  }

  getMode(): GestureMode {
    return this.mode;
  }

  update(frame: GestureFrame): StateMachineOutput {
    const now = frame.timestamp;
    const { actionDwellMs, releaseGraceMs } = this.tuning;
    const { leftHand, rightHand } = frame;

    // ── Determine desired mode for this frame ─────────────────────────────────
    // Both fist and pinch trigger the same modes, users can choose either.
    const isActive = (hand: typeof leftHand) =>
      hand !== null && (hand.gesture === 'fist' || hand.gesture === 'pinch');

    const rightActive = isActive(rightHand);
    const leftActive = isActive(leftHand);

    // Track consecutive active frames per hand. Used to guard against a single
    // noisy frame from the secondary hand escalating (or interrupting) an
    // ongoing single-hand gesture. Counts reset to 0 the moment a hand drops.
    this.leftActiveFrames  = leftActive  ? this.leftActiveFrames  + 1 : 0;
    this.rightActiveFrames = rightActive ? this.rightActiveFrames + 1 : 0;

    // Escalation to 'rotating' requires both hands to have been active for at
    // least ESCALATION_FRAMES consecutive frames. This prevents one brief noisy
    // frame on the secondary hand from interrupting an ongoing pan or zoom.
    const bothStable =
      this.leftActiveFrames  >= GestureStateMachine.ESCALATION_FRAMES &&
      this.rightActiveFrames >= GestureStateMachine.ESCALATION_FRAMES;

    // Both stable → rotate; right only → zoom; left only → pan.
    // When both hands are active but not yet stable, we preserve the current
    // single-hand mode (panning/zooming) so the secondary hand must be held
    // for ESCALATION_FRAMES before rotating kicks in. This prevents a single
    // noisy frame from the secondary hand from interrupting an ongoing gesture.
    const bothActiveButUnstable =
      leftActive && rightActive && !bothStable;
    const desired: GestureMode = bothStable
      ? 'rotating'
      : bothActiveButUnstable && (this.mode === 'panning' || this.mode === 'zooming')
        ? this.mode   // hold current mode until secondary hand is confirmed stable
        : rightActive
          ? 'zooming'
          : leftActive
            ? 'panning'
            : 'idle';

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
      return this.buildOutput(null, null, null);
    }

    // ── panning ───────────────────────────────────────────────────────────────
    if (this.mode === 'panning') {
      // Escalate to rotating once the right hand becomes stably active too.
      if (bothStable) {
        this.transitionTo('rotating');
        return this.buildOutput(null, null, null);
      }
      if (desired !== 'panning') {
        if (this.releaseTimer === null) {
          this.releaseTimer = now;
        } else if (now - this.releaseTimer >= releaseGraceMs) {
          this.transitionTo('idle');
        }
        return this.buildOutput(null, null, null);
      }
      this.releaseTimer = null;

      const fistHand = isActive(leftHand) ? leftHand : null;
      if (!fistHand) {
        this.transitionTo('idle');
        return this.buildOutput(null, null, null);
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
      return this.buildOutput(panDelta, null, null);
    }

    // ── zooming ───────────────────────────────────────────────────────────────
    if (this.mode === 'zooming') {
      // Escalate to rotating once the left hand becomes stably active too.
      if (bothStable) {
        this.transitionTo('rotating');
        return this.buildOutput(null, null, null);
      }
      if (desired !== 'zooming') {
        if (this.releaseTimer === null) {
          this.releaseTimer = now;
        } else if (now - this.releaseTimer >= releaseGraceMs) {
          this.transitionTo('idle');
        }
        return this.buildOutput(null, null, null);
      }
      this.releaseTimer = null;

      if (!rightHand) {
        this.transitionTo('idle');
        return this.buildOutput(null, null, null);
      }

      // Use right wrist vertical position: moving up (lower y) = zoom in, down = zoom out
      const wrist = rightHand.landmarks[0];
      const smoothY = this.zoomSmoother.update(wrist.y);

      let zoomDelta: number | null = null;
      if (this.prevZoomDist !== null) {
        const delta = smoothY - this.prevZoomDist;
        if (Math.abs(delta) > this.tuning.zoomDeadzoneRatio) {
          // Negate: moving hand up (y decreases) → zoom in (positive delta)
          zoomDelta = -delta;
        }
      }
      this.prevZoomDist = smoothY;
      return this.buildOutput(null, zoomDelta, null);
    }

    // ── rotating ─────────────────────────────────────────────────────────────
    if (this.mode === 'rotating') {
      if (desired !== 'rotating') {
        if (this.releaseTimer === null) {
          this.releaseTimer = now;
        } else if (now - this.releaseTimer >= releaseGraceMs) {
          this.transitionTo('idle');
        }
        return this.buildOutput(null, null, null);
      }
      this.releaseTimer = null;

      if (!leftHand || !rightHand) {
        this.transitionTo('idle');
        return this.buildOutput(null, null, null);
      }

      // Angle of the line from left wrist to right wrist (in radians)
      const lw = leftHand.landmarks[0];
      const rw = rightHand.landmarks[0];
      const rawAngle = Math.atan2(rw.y - lw.y, rw.x - lw.x);
      const smoothAngle = this.rotateSmoother.update(rawAngle);

      let rotateDelta: number | null = null;
      if (this.prevRotateAngle !== null) {
        // Wrap the delta to [-π, π] to handle the atan2 discontinuity
        let delta = smoothAngle - this.prevRotateAngle;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        if (Math.abs(delta) > 0.005) {
          rotateDelta = delta;
        }
      }
      this.prevRotateAngle = smoothAngle;
      return this.buildOutput(null, null, rotateDelta);
    }

    return this.buildOutput(null, null, null);
  }

  private transitionTo(next: GestureMode): void {
    this.mode = next;
    this.releaseTimer = null;
    this.actionDwell = null;
    // Reset both counters so escalation requires a fresh stable run in the new mode.
    // Exception: keep the dominant hand's counter when entering a single-hand mode so
    // it does not need to re-accumulate from zero if the hand was already stable.
    if (next !== 'panning' && next !== 'rotating') this.leftActiveFrames = 0;
    if (next !== 'zooming' && next !== 'rotating') this.rightActiveFrames = 0;

    if (next !== 'panning') {
      this.panSmoother.reset();
      this.prevPanPos = null;
    }
    if (next !== 'zooming') {
      this.zoomSmoother.reset();
      this.prevZoomDist = null;
    }
    if (next !== 'rotating') {
      this.rotateSmoother.reset();
      this.prevRotateAngle = null;
    }
  }

  private buildOutput(
    panDelta: SmoothedPoint | null,
    zoomDelta: number | null,
    rotateDelta: number | null,
  ): StateMachineOutput {
    return { mode: this.mode, panDelta, zoomDelta, rotateDelta };
  }

  reset(): void {
    this.transitionTo('idle');
  }
}
