import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { FilesetResolver } from '@mediapipe/tasks-vision';
import type { GestureFrame, TuningConfig } from './types.js';
import { createHandClassifier } from './gestureClassifier.js';
import { MEDIAPIPE_WASM_URL } from './constants.js';

type FrameCallback = (frame: GestureFrame) => void;

/**
 * GestureController
 *
 * Manages the webcam stream and MediaPipe HandLandmarker inference loop.
 * Calls `onFrame` with classified hand data every animation frame.
 */
export class GestureController {
  private landmarker: HandLandmarker | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private rafHandle: number | null = null;
  private running = false;
  private onFrame: FrameCallback;
  private tuning: TuningConfig;
  private lastVideoTime = -1;
  // One stateful classifier per hand label; persists pinch hysteresis across frames.
  private leftClassifier = createHandClassifier();
  private rightClassifier = createHandClassifier();

  constructor(tuning: TuningConfig, onFrame: FrameCallback) {
    this.tuning = tuning;
    this.onFrame = onFrame;
  }

  /**
   * Initialise MediaPipe and request webcam access.
   * Returns the video element so the overlay can render it.
   */
  async init(): Promise<HTMLVideoElement> {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);

    // Dynamic import to avoid bundling issues
    const { HandLandmarker } = await import('@mediapipe/tasks-vision');

    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: this.tuning.minDetectionConfidence,
      minHandPresenceConfidence: this.tuning.minPresenceConfidence,
      minTrackingConfidence: this.tuning.minTrackingConfidence,
    });

    this.videoEl = document.createElement('video');
    this.videoEl.setAttribute('playsinline', '');
    this.videoEl.setAttribute('autoplay', '');
    this.videoEl.muted = true;
    this.videoEl.width = 640;
    this.videoEl.height = 480;

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
    });
    this.videoEl.srcObject = this.stream;

    await new Promise<void>((resolve) => {
      this.videoEl!.addEventListener('loadeddata', () => resolve(), { once: true });
    });

    return this.videoEl;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  destroy(): void {
    this.stop();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.landmarker?.close();
    this.landmarker = null;
    this.videoEl = null;
    this.stream = null;
  }

  private loop(): void {
    if (!this.running) return;
    this.rafHandle = requestAnimationFrame(() => this.loop());
    this.processFrame();
  }

  private processFrame(): void {
    const video = this.videoEl;
    const landmarker = this.landmarker;
    if (!video || !landmarker || video.readyState < 2) return;

    const nowMs = performance.now();
    if (video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;

    let result: HandLandmarkerResult;
    try {
      result = landmarker.detectForVideo(video, nowMs);
    } catch {
      return;
    }

    const frame = this.buildFrame(result, nowMs);
    this.onFrame(frame);
  }

  private buildFrame(result: HandLandmarkerResult, timestamp: number): GestureFrame {
    const hands: import('./types.js').DetectedHand[] = result.landmarks.map((landmarks, i) => {
      const handednessArr = result.handedness[i];
      const rawLabel = handednessArr?.[0]?.categoryName;
      const label: import('./types.js').HandednessLabel =
        rawLabel === 'Left' ? 'Left' : 'Right';
      const score = handednessArr?.[0]?.score ?? 0;
      const classify = label === 'Left' ? this.leftClassifier : this.rightClassifier;
      const gesture = classify(landmarks);
      return { handedness: label, score, landmarks, gesture };
    });

    const leftHand = hands.find((h) => h.handedness === 'Left') ?? null;
    const rightHand = hands.find((h) => h.handedness === 'Right') ?? null;

    return { timestamp, hands, leftHand, rightHand };
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoEl;
  }
}
