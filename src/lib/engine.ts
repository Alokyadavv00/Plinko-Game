/**
 * Deterministic Plinko Engine
 *
 * Discrete model: 12 rows, ball makes Left/Right decision at each row.
 * Uses xorshift32 PRNG seeded from combinedSeed.
 *
 * PRNG stream order (critical for reproducibility):
 *   1. Peg map generation (all bias values)
 *   2. Row decisions (one rand() per row)
 *
 * Peg map:
 *   Row r has (r+1) pegs, each with leftBias ∈ [0.4, 0.6].
 *   Formula: leftBias = 0.5 + (rand() - 0.5) * 0.2, rounded to 6 decimals.
 *
 * Drop column influence:
 *   adj = (dropColumn - floor(rows/2)) * 0.01
 *   bias' = clamp(leftBias + adj, 0, 1)
 *
 * Decision at row r:
 *   pegIndex = min(pos, r)
 *   rnd = rand()
 *   if rnd < bias' → Left, else Right (pos += 1)
 *
 * Final binIndex = pos (0..rows)
 */

import { createPRNG, Xorshift32 } from './prng';
import { sha256, computeCommit, computeCombinedSeed } from './hash';

export interface PegMap {
  /** pegMap[row][pegIndex] = leftBias */
  biases: number[][];
}

export interface DropResult {
  binIndex: number;
  /** true = Right, false = Left for each row */
  path: boolean[];
}

export interface RoundResult {
  commitHex: string;
  combinedSeed: string;
  pegMap: PegMap;
  pegMapHash: string;
  binIndex: number;
  /** Array of booleans: true = Right, false = Left */
  path: boolean[];
}

/** Clamp a value between min and max. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Round a number to N decimal places. */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Generate the peg map using the PRNG.
 * Must be called FIRST on the PRNG stream before row decisions.
 */
export function generatePegMap(prng: Xorshift32, rows: number): PegMap {
  const biases: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const rowBiases: number[] = [];
    for (let p = 0; p <= r; p++) {
      const raw = 0.5 + (prng.rand() - 0.5) * 0.2;
      rowBiases.push(roundTo(raw, 6));
    }
    biases.push(rowBiases);
  }
  return { biases };
}

/**
 * Compute a stable hash of the peg map.
 * Uses JSON.stringify on the biases array.
 */
export function computePegMapHash(pegMap: PegMap): string {
  return sha256(JSON.stringify(pegMap.biases));
}

/**
 * Simulate the ball drop through the peg map.
 * Must be called AFTER generatePegMap on the same PRNG stream.
 */
export function simulateDrop(
  prng: Xorshift32,
  pegMap: PegMap,
  dropColumn: number,
  rows: number
): DropResult {
  const adj = (dropColumn - Math.floor(rows / 2)) * 0.01;
  let pos = 0; // number of Right moves so far
  const path: boolean[] = [];

  for (let r = 0; r < rows; r++) {
    const pegIndex = Math.min(pos, r);
    const leftBias = pegMap.biases[r][pegIndex];
    const biasAdj = clamp(leftBias + adj, 0, 1);
    const rnd = prng.rand();

    if (rnd < biasAdj) {
      // Left
      path.push(false);
    } else {
      // Right
      pos += 1;
      path.push(true);
    }
  }

  return { binIndex: pos, path };
}

/**
 * Run a complete round: generate peg map, simulate drop, compute all hashes.
 * This is the main entry point for both the API and the verifier.
 */
export function runRound(
  serverSeed: string,
  clientSeed: string,
  nonce: string,
  dropColumn: number,
  rows: number = 12
): RoundResult {
  // Compute hashes
  const commitHex = computeCommit(serverSeed, nonce);
  const combinedSeed = computeCombinedSeed(serverSeed, clientSeed, nonce);

  // Create PRNG from combinedSeed
  const prng = createPRNG(combinedSeed);

  // Generate peg map (consumes PRNG first)
  const pegMap = generatePegMap(prng, rows);
  const pegMapHash = computePegMapHash(pegMap);

  // Simulate drop (consumes PRNG second)
  const { binIndex, path } = simulateDrop(prng, pegMap, dropColumn, rows);

  return {
    commitHex,
    combinedSeed,
    pegMap,
    pegMapHash,
    binIndex,
    path,
  };
}
