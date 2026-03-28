// ─── Types ────────────────────────────────────────────────────────────────────

export interface CaptureResult {
  image: Buffer;
  metadata: {
    width: number;
    height: number;
    timestamp: number;
    monitorIndex: number;
  };
}

export interface IScreenCapture {
  capture(monitorIndex?: number): Promise<CaptureResult>;
  startContinuous(intervalMs: number, callback: (result: CaptureResult) => void): void;
  stopContinuous(): void;
}

export interface IDesktopCapturer {
  getSources(opts: { types: string[]; thumbnailSize: { width: number; height: number } }): Promise<any[]>;
}

// ─── ScreenCapture ────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 1_048_576; // 1 MB
const CAPTURE_TIMEOUT_MS = 500;
const MIN_INTERVAL_MS = 1_000;
const MAX_INTERVAL_MS = 10_000;

export class ScreenCapture implements IScreenCapture {
  private continuousTimer: ReturnType<typeof setInterval> | null = null;
  private capturer: IDesktopCapturer | null = null;

  // Allow injecting a mock capturer for tests
  setCapturer(capturer: IDesktopCapturer): void {
    this.capturer = capturer;
  }

  private getDesktopCapturer(): IDesktopCapturer {
    if (this.capturer) return this.capturer;
    try {
      const electron = require('electron');
      return electron.desktopCapturer;
    } catch {
      throw new Error('Permission denied: Electron desktopCapturer not available.');
    }
  }

  async capture(monitorIndex: number = 0): Promise<CaptureResult> {
    const capturePromise = this._doCapture(monitorIndex);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('CU_CAPTURE_TIMEOUT')), CAPTURE_TIMEOUT_MS)
    );

    try {
      return await Promise.race([capturePromise, timeoutPromise]);
    } catch (err: any) {
      if (err?.message === 'CU_CAPTURE_TIMEOUT') {
        throw { code: 'CU_CAPTURE_TIMEOUT', message: 'Screen capture exceeded 500ms timeout.' };
      }
      if (err?.message?.includes('permission') || err?.message?.includes('Permission')) {
        throw { code: 'CU_CAPTURE_PERMISSION_DENIED', message: 'Screen capture permission denied by OS. Please grant screen recording permission.' };
      }
      throw { code: 'CU_CAPTURE_PERMISSION_DENIED', message: err?.message ?? 'Screen capture failed.' };
    }
  }

  private async _doCapture(monitorIndex: number): Promise<CaptureResult> {
    let desktopCapturer: IDesktopCapturer;
    try {
      desktopCapturer = this.getDesktopCapturer();
    } catch {
      throw new Error('Permission denied: Electron desktopCapturer not available.');
    }

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (!sources || sources.length === 0) {
      throw new Error('Permission denied: No screen sources available.');
    }

    const source = sources[Math.min(monitorIndex, sources.length - 1)];
    const thumbnail = source.thumbnail;

    // Get dimensions
    const size = thumbnail.getSize();
    const width = size.width;
    const height = size.height;

    // Convert to PNG buffer
    let imageBuffer: Buffer = thumbnail.toPNG();

    // Compress if over 1MB by scaling down
    if (imageBuffer.length > MAX_IMAGE_BYTES) {
      imageBuffer = await this._compressToLimit(thumbnail, width, height);
    }

    return {
      image: imageBuffer,
      metadata: {
        width,
        height,
        timestamp: Date.now(),
        monitorIndex: Math.min(monitorIndex, sources.length - 1),
      },
    };
  }

  private async _compressToLimit(thumbnail: any, origWidth: number, origHeight: number): Promise<Buffer> {
    // Scale down progressively until under 1MB
    let scale = 0.8;
    while (scale > 0.1) {
      const newW = Math.floor(origWidth * scale);
      const newH = Math.floor(origHeight * scale);
      const resized = thumbnail.resize({ width: newW, height: newH });
      const buf: Buffer = resized.toPNG();
      if (buf.length <= MAX_IMAGE_BYTES) return buf;
      scale -= 0.1;
    }
    // Last resort: return JPEG at lowest quality via toJPEG
    return thumbnail.toJPEG(30);
  }

  startContinuous(intervalMs: number, callback: (result: CaptureResult) => void): void {
    this.stopContinuous();
    const clampedInterval = Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, intervalMs));
    this.continuousTimer = setInterval(async () => {
      try {
        const result = await this.capture();
        callback(result);
      } catch {
        // Silently skip failed captures in continuous mode
      }
    }, clampedInterval);
  }

  stopContinuous(): void {
    if (this.continuousTimer !== null) {
      clearInterval(this.continuousTimer);
      this.continuousTimer = null;
    }
  }
}
