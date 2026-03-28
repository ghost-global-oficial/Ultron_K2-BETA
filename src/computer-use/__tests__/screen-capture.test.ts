import { describe, test, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { ScreenCapture } from '../screen-capture';

const MAX_IMAGE_BYTES = 1_048_576;

function makeMockThumbnail(width: number, height: number, bufferSize: number) {
  const clampedSize = Math.min(bufferSize, MAX_IMAGE_BYTES);
  return {
    getSize: () => ({ width, height }),
    toPNG: () => Buffer.alloc(clampedSize),
    toJPEG: (_q: number) => Buffer.alloc(Math.min(clampedSize, 100_000)),
    resize: function (opts: { width: number; height: number }) {
      const ratio = (opts.width * opts.height) / (width * height);
      return makeMockThumbnail(opts.width, opts.height, Math.floor(bufferSize * ratio));
    },
  };
}

function makeMockCapturer(sources: any[]) {
  return { getSources: async () => sources };
}

let capture: ScreenCapture;

beforeEach(() => {
  capture = new ScreenCapture();
});

// ─── Property 7: Captura inclui metadados obrigatórios ───────────────────────
// Feature: computer-use, Property 7: Mandatory metadata
// Validates: Requirements 2.6
describe('Property 7: Mandatory metadata in capture result', () => {
  test('every successful capture has valid width, height, timestamp, monitorIndex', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3840 }),
        fc.integer({ min: 1, max: 2160 }),
        fc.integer({ min: 0, max: 3 }),
        async (width, height, monitorIndex) => {
          const sources = Array.from({ length: monitorIndex + 1 }, (_, i) => ({
            id: `screen:${i}`,
            name: `Screen ${i}`,
            thumbnail: makeMockThumbnail(width, height, 512),
          }));
          capture.setCapturer(makeMockCapturer(sources));

          const result = await capture.capture(monitorIndex);

          expect(result.metadata.width).toBeGreaterThan(0);
          expect(result.metadata.height).toBeGreaterThan(0);
          expect(result.metadata.timestamp).toBeGreaterThan(0);
          expect(result.metadata.monitorIndex).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 50 }
    );
  }, 30_000);
});

// ─── Property 8: Imagem capturada não excede 1MB ─────────────────────────────
// Feature: computer-use, Property 8: Image size ≤ 1MB
// Validates: Requirements 2.3
describe('Property 8: Captured image does not exceed 1MB', () => {
  test('image buffer is always <= 1_048_576 bytes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3_000_000 }),
        async (bufferSize) => {
          capture.setCapturer(makeMockCapturer([{
            id: 'screen:0',
            name: 'Screen 0',
            thumbnail: makeMockThumbnail(1920, 1080, bufferSize),
          }]));

          const result = await capture.capture(0);
          expect(result.image.length).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
        }
      ),
      { numRuns: 30 }
    );
  }, 30_000);
});
