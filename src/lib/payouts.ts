/**
 * Symmetric paytable for 13 bins (0–12).
 * Edges have higher multipliers; center is lowest.
 *
 * Bin:    0     1    2    3     4    5     6    7     8    9   10    11   12
 * Mult: 16x   9x   5x   3x  1.5x  1x  0.5x  1x  1.5x  3x   5x   9x  16x
 */
export const PAYOUT_TABLE: number[] = [
  16, 9, 5, 3, 1.5, 1, 0.5, 1, 1.5, 3, 5, 9, 16,
];

/** Get the payout multiplier for a given bin index (0–12). */
export function getMultiplier(binIndex: number): number {
  if (binIndex < 0 || binIndex > 12) {
    throw new Error(`Invalid binIndex: ${binIndex}. Must be 0–12.`);
  }
  return PAYOUT_TABLE[binIndex];
}

/** Get payout in cents given bet in cents and bin index. */
export function calculatePayout(betCents: number, binIndex: number): number {
  return Math.round(betCents * getMultiplier(binIndex));
}
