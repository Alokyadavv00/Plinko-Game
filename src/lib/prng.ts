/**
 * xorshift32 PRNG — Deterministic pseudo-random number generator.
 *
 * Algorithm: Marsaglia's xorshift32
 * Shift constants: a=13, b=17, c=5 (standard triple)
 *
 * Seed: 32-bit unsigned integer extracted from the first 4 bytes
 * of the combinedSeed (big-endian). If seed is 0, defaults to 1
 * (xorshift cannot have zero state).
 *
 * .rand() returns a float in [0, 1) via state / 2^32.
 */
export class Xorshift32 {
  private state: number;

  constructor(seed: number) {
    // Ensure 32-bit unsigned, never zero
    this.state = (seed >>> 0) || 1;
  }

  /** Advance state and return next 32-bit unsigned integer. */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  /** Return a float in [0, 1). */
  rand(): number {
    return this.next() / 0x100000000;
  }
}

/**
 * Create an xorshift32 PRNG seeded from the first 4 bytes (big-endian)
 * of a hex string (e.g., the combinedSeed).
 */
export function createPRNG(hexSeed: string): Xorshift32 {
  const seed =
    (parseInt(hexSeed.substring(0, 2), 16) << 24) |
    (parseInt(hexSeed.substring(2, 4), 16) << 16) |
    (parseInt(hexSeed.substring(4, 6), 16) << 8) |
    parseInt(hexSeed.substring(6, 8), 16);
  return new Xorshift32(seed);
}
