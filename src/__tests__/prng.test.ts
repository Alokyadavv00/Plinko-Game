/**
 * Unit tests for the xorshift32 PRNG.
 * Tests against the provided test vectors from the spec.
 *
 * Test vector:
 *   combinedSeed = "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0"
 *   PRNG seeded from first 4 bytes (big-endian): 0xe1dddf77
 *   First 5 rand() values:
 *     0.1106166649, 0.7625129214, 0.0439292176, 0.4578678815, 0.3438999297
 */

import { describe, it, expect } from 'vitest';
import { Xorshift32, createPRNG } from '@/lib/prng';

describe('Xorshift32 PRNG', () => {
  it('should never produce zero state', () => {
    const rng = new Xorshift32(0);
    expect(rng.next()).not.toBe(0);
  });

  it('should produce deterministic sequences from the same seed', () => {
    const rng1 = new Xorshift32(12345);
    const rng2 = new Xorshift32(12345);
    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('should produce different sequences from different seeds', () => {
    const rng1 = new Xorshift32(12345);
    const rng2 = new Xorshift32(54321);
    const vals1 = Array.from({ length: 5 }, () => rng1.next());
    const vals2 = Array.from({ length: 5 }, () => rng2.next());
    expect(vals1).not.toEqual(vals2);
  });

  it('should match test vector — first 5 rand() values', () => {
    const combinedSeed = 'e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0';
    const rng = createPRNG(combinedSeed);

    const expectedValues = [
      0.1106166649,
      0.7625129214,
      0.0439292176,
      0.4578678815,
      0.3438999297,
    ];

    for (let i = 0; i < 5; i++) {
      const val = rng.rand();
      // Round to 10 decimal places for comparison
      const rounded = Math.round(val * 10000000000) / 10000000000;
      expect(rounded).toBeCloseTo(expectedValues[i], 8);
    }
  });

  it('should correctly extract seed from hex string (big-endian)', () => {
    const combinedSeed = 'e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0';
    // First 4 bytes: e1 dd df 77 => 0xe1dddf77
    const expectedSeed = 0xe1dddf77;

    const seed =
      (parseInt(combinedSeed.substring(0, 2), 16) << 24) |
      (parseInt(combinedSeed.substring(2, 4), 16) << 16) |
      (parseInt(combinedSeed.substring(4, 6), 16) << 8) |
      parseInt(combinedSeed.substring(6, 8), 16);

    expect(seed >>> 0).toBe(expectedSeed >>> 0);
  });

  it('rand() should always return values in [0, 1)', () => {
    const rng = new Xorshift32(42);
    for (let i = 0; i < 10000; i++) {
      const val = rng.rand();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});
