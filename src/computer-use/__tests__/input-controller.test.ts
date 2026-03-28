import { describe, test, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { InputController } from '../input-controller';

// Mock nut-js so tests run without native binaries
vi.mock('@nut-tree-fork/nut-js', () => ({
  mouse: { setPosition: vi.fn(), click: vi.fn(), doubleClick: vi.fn() },
  keyboard: { type: vi.fn(), pressKey: vi.fn(), releaseKey: vi.fn() },
  screen: { width: vi.fn().mockResolvedValue(1920), height: vi.fn().mockResolvedValue(1080) },
  Key: {},
  Button: { LEFT: 0, RIGHT: 1 },
  scrollDown: vi.fn(),
  scrollUp: vi.fn(),
}));

const SCREEN_W = 1920;
const SCREEN_H = 1080;

let controller: InputController;

beforeEach(() => {
  controller = new InputController();
  vi.clearAllMocks();
});

// ─── Property 1: Coordenadas fora dos limites são rejeitadas ─────────────────
// Feature: computer-use, Property 1: Out-of-bounds rejection
// Validates: Requirements 1.6
describe('Property 1: Out-of-bounds coordinates rejected', () => {
  test('negative or oversized coordinates return CU_INPUT_OUT_OF_BOUNDS', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // x negative
          fc.record({ x: fc.integer({ max: -1 }), y: fc.integer({ min: 0, max: SCREEN_H }) }),
          // y negative
          fc.record({ x: fc.integer({ min: 0, max: SCREEN_W }), y: fc.integer({ max: -1 }) }),
          // x too large
          fc.record({ x: fc.integer({ min: SCREEN_W + 1 }), y: fc.integer({ min: 0, max: SCREEN_H }) }),
          // y too large
          fc.record({ x: fc.integer({ min: 0, max: SCREEN_W }), y: fc.integer({ min: SCREEN_H + 1 }) }),
        ),
        async ({ x, y }) => {
          const result = await controller.executeAction({ type: 'move', x, y });
          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('CU_INPUT_OUT_OF_BOUNDS');
        }
      ),
      { numRuns: 200 }
    );
  });

  test('valid coordinates within bounds succeed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: SCREEN_W }),
        fc.integer({ min: 0, max: SCREEN_H }),
        async (x, y) => {
          const result = await controller.executeAction({ type: 'move', x, y });
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 4: Sistema desativado rejeita todas as Actions ─────────────────
// Feature: computer-use, Property 4: Disabled system rejects all actions
// Validates: Requirements 5.4
describe('Property 4: Disabled system rejects all actions', () => {
  test('all action types return CU_DISABLED when system is off', async () => {
    controller.setEnabled(false);

    const actionArb = fc.oneof(
      fc.record({ type: fc.constant('move' as const), x: fc.integer({ min: 0, max: 100 }), y: fc.integer({ min: 0, max: 100 }) }),
      fc.record({ type: fc.constant('click' as const), button: fc.constantFrom('left' as const, 'right' as const) }),
      fc.record({ type: fc.constant('type' as const), text: fc.string({ minLength: 1 }) }),
      fc.record({ type: fc.constant('key' as const), key: fc.string({ minLength: 1 }) }),
      fc.record({ type: fc.constant('scroll' as const), direction: fc.constantFrom('up' as const, 'down' as const), amount: fc.integer({ min: 1, max: 10 }) }),
    );

    await fc.assert(
      fc.asyncProperty(actionArb, async (action) => {
        const result = await controller.executeAction(action as any);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('CU_DISABLED');
      }),
      { numRuns: 100 }
    );
  });
});
