import type { GestureFrame, GestureMode, WebcamConfig } from './types.js';
import { COLORS, LANDMARKS } from './constants.js';

// MediaPipe hand connection pairs (landmark index pairs)
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16], // ring
  [0, 17], [17, 18], [18, 19], [19, 20], // pinky
  [5, 9], [9, 13], [13, 17],            // palm cross
];

const FINGERTIP_LANDMARKS = [
  LANDMARKS.THUMB_TIP,
  LANDMARKS.INDEX_TIP,
  LANDMARKS.MIDDLE_TIP,
  LANDMARKS.RING_TIP,
  LANDMARKS.PINKY_TIP,
];

/**
 * WebcamOverlay
 *
 * Manages a DOM container with:
 *   - <video> element (webcam feed)
 *   - <canvas> for landmark drawing
 *   - mode badge
 *
 * Supports 'corner', 'full', and 'hidden' modes.
 */
export class WebcamOverlay {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private badge: HTMLDivElement;
  private config: WebcamConfig;

  constructor(config: WebcamConfig) {
    this.config = config;

    this.container = document.createElement('div');
    this.container.className = 'ol-gesture-overlay';
    this.applyContainerStyles();

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ol-gesture-canvas';
    this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';

    this.badge = document.createElement('div');
    this.badge.className = 'ol-gesture-badge ol-gesture-badge--idle';
    this.badge.textContent = 'Idle';

    this.container.appendChild(this.canvas);
    this.container.appendChild(this.badge);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D canvas context');
    this.ctx = ctx;
  }

  /** Attach video element produced by GestureController */
  attachVideo(video: HTMLVideoElement): void {
    video.className = 'ol-gesture-video';
    video.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);';
    this.container.insertBefore(video, this.canvas);
  }

  /** Mount the overlay into the given parent (usually document.body or map container) */
  mount(parent: HTMLElement): void {
    parent.appendChild(this.container);
  }

  unmount(): void {
    this.container.parentElement?.removeChild(this.container);
  }

  /** Called each frame with the latest gesture frame and mode. */
  render(frame: GestureFrame | null, mode: GestureMode): void {
    this.updateBadge(mode);

    const w = this.config.width;
    const h = this.config.height;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.clearRect(0, 0, w, h);

    if (frame === null) return;

    for (const hand of frame.hands) {
      this.drawSkeleton(hand.landmarks, mode, hand.gesture === 'fist');
    }
  }

  private drawSkeleton(
    landmarks: { x: number; y: number; z: number }[],
    mode: GestureMode,
    isActionHand: boolean,
  ): void {
    const { ctx } = this;
    const w = this.config.width;
    const h = this.config.height;

    // Mirror x because video is mirrored
    const px = (lm: { x: number }) => (1 - lm.x) * w;
    const py = (lm: { y: number }) => lm.y * h;

    // Draw connections
    ctx.strokeStyle = COLORS.connection;
    ctx.lineWidth = 1.5;
    for (const [a, b] of HAND_CONNECTIONS) {
      if (!landmarks[a] || !landmarks[b]) continue;
      ctx.beginPath();
      ctx.moveTo(px(landmarks[a]), py(landmarks[a]));
      ctx.lineTo(px(landmarks[b]), py(landmarks[b]));
      ctx.stroke();
    }

    // Draw landmark dots
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const isTip = (FINGERTIP_LANDMARKS as readonly number[]).includes(i);
      const color =
        mode !== 'idle' && isTip
          ? COLORS.fingertipGlow
          : COLORS.landmark;

      ctx.beginPath();
      ctx.arc(px(lm), py(lm), isTip ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Glow effect on fingertips when active
      if (mode !== 'idle' && isTip) {
        ctx.shadowBlur = isActionHand ? 12 : 6;
        ctx.shadowColor = COLORS.fingertipGlow;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  private updateBadge(mode: GestureMode): void {
    const labels: Record<GestureMode, string> = {
      idle: 'Idle',
      panning: 'Pan',
      zooming: 'Zoom',
    };
    this.badge.textContent = labels[mode];
    this.badge.className = `ol-gesture-badge ol-gesture-badge--${mode}`;
  }

  private applyContainerStyles(): void {
    const { mode, position, width, height, opacity } = this.config;

    this.container.style.cssText = '';
    this.container.style.position = 'fixed';
    this.container.style.zIndex = '9999';
    this.container.style.overflow = 'hidden';
    this.container.style.borderRadius = '8px';
    this.container.style.opacity = String(opacity);
    this.container.style.display = mode === 'hidden' ? 'none' : 'block';

    if (mode === 'corner') {
      this.container.style.width = `${width}px`;
      this.container.style.height = `${height}px`;
      const margin = '16px';
      if (position === 'bottom-right') {
        this.container.style.bottom = margin;
        this.container.style.right = margin;
      } else if (position === 'bottom-left') {
        this.container.style.bottom = margin;
        this.container.style.left = margin;
      } else if (position === 'top-right') {
        this.container.style.top = margin;
        this.container.style.right = margin;
      } else {
        this.container.style.top = margin;
        this.container.style.left = margin;
      }
    } else if (mode === 'full') {
      this.container.style.top = '0';
      this.container.style.left = '0';
      this.container.style.width = '100vw';
      this.container.style.height = '100vh';
      this.container.style.borderRadius = '0';
    }
  }

  updateConfig(config: Partial<WebcamConfig>): void {
    Object.assign(this.config, config);
    this.applyContainerStyles();
  }
}
