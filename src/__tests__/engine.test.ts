/**
 * Unit tests for the deterministic Plinko engine.
 *
 * Test vectors from spec:
 *   rows = 12
 *   serverSeed = "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc"
 *   nonce = "42"
 *   clientSeed = "candidate-hello"
 *   dropColumn = 6 (center)
 *
 * Expected:
 *   commitHex = "bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34"
 *   combinedSeed = "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0"
 *   Peg map Row 0: [0.422123]
 *   Peg map Row 1: [0.552503, 0.408786]
 *   Peg map Row 2: [0.491574, 0.468780, 0.436540]
 *   binIndex = 6 for center drop
 */

import { describe, it, expect } from 'vitest';
import { runRound, generatePegMap, simulateDrop, computePegMapHash } from '@/lib/engine';
import { createPRNG } from '@/lib/prng';
import { computeCombinedSeed } from '@/lib/hash';

const SERVER_SEED = 'b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc';
const NONCE = '42';
const CLIENT_SEED = 'candidate-hello';
const DROP_COLUMN = 6;
const ROWS = 12;

describe('Deterministic Engine', () => {
  it('runRound should produce correct commitHex', () => {
    const result = runRound(SERVER_SEED, CLIENT_SEED, NONCE, DROP_COLUMN, ROWS);
    expect(result.commitHex).toBe('bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34');
  });

  it('runRound should produce correct combinedSeed', () => {
    const result = runRound(SERVER_SEED, CLIENT_SEED, NONCE, DROP_COLUMN, ROWS);
    expect(result.combinedSeed).toBe('e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0');
  });

  it('peg map row 0 should match test vector', () => {
    const combinedSeed = computeCombinedSeed(SERVER_SEED, CLIENT_SEED, NONCE);
    const prng = createPRNG(combinedSeed);
    const pegMap = generatePegMap(prng, ROWS);

    expect(pegMap.biases[0]).toHaveLength(1);
    expect(pegMap.biases[0][0]).toBeCloseTo(0.422123, 5);
  });

  it('peg map row 1 should match test vector', () => {
    const combinedSeed = computeCombinedSeed(SERVER_SEED, CLIENT_SEED, NONCE);
    const prng = createPRNG(combinedSeed);
    const pegMap = generatePegMap(prng, ROWS);

    expect(pegMap.biases[1]).toHaveLength(2);
    expect(pegMap.biases[1][0]).toBeCloseTo(0.552503, 5);
    expect(pegMap.biases[1][1]).toBeCloseTo(0.408786, 5);
  });

  it('peg map row 2 should match test vector', () => {
    const combinedSeed = computeCombinedSeed(SERVER_SEED, CLIENT_SEED, NONCE);
    const prng = createPRNG(combinedSeed);
    const pegMap = generatePegMap(prng, ROWS);

    expect(pegMap.biases[2]).toHaveLength(3);
    expect(pegMap.biases[2][0]).toBeCloseTo(0.491574, 5);
    expect(pegMap.biases[2][1]).toBeCloseTo(0.468780, 5);
    expect(pegMap.biases[2][2]).toBeCloseTo(0.436540, 5);
  });

  it('center drop (column 6) should produce binIndex 6', () => {
    const result = runRound(SERVER_SEED, CLIENT_SEED, NONCE, DROP_COLUMN, ROWS);
    expect(result.binIndex).toBe(6);
  });

  it('path should have exactly 12 decisions (one per row)', () => {
    const result = runRound(SERVER_SEED, CLIENT_SEED, NONCE, DROP_COLUMN, ROWS);
    expect(result.path).toHaveLength(12);
    expect(result.path.every(v => typeof v === 'boolean')).toBe(true);
  });

  it('pegMapHash should be stable across runs', () => {
    const r1 = runRound(SERVER_SEED, CLIENT_SEED, NONCE, DROP_COLUMN, ROWS);
    const r2 = runRound(SERVER_SEED, CLIENT_SEED, NONCE, DROP_COLUMN, ROWS);
    expect(r1.pegMapHash).toBe(r2.pegMapHash);
    expect(r1.pegMapHash).toBeTruthy();
  });

  it('runRound should be fully deterministic (replay)', () => {
    const r1 = runRound(SERVER_SEED, CLIENT_SEED, NONCE, DROP_COLUMN, ROWS);
    const r2 = runRound(SERVER_SEED, CLIENT_SEED, NONCE, DROP_COLUMN, ROWS);

    expect(r1.commitHex).toBe(r2.commitHex);
    expect(r1.combinedSeed).toBe(r2.combinedSeed);
    expect(r1.pegMapHash).toBe(r2.pegMapHash);
    expect(r1.binIndex).toBe(r2.binIndex);
    expect(r1.path).toEqual(r2.path);
  });

  it('different drop column should potentially produce different binIndex', () => {
    const r1 = runRound(SERVER_SEED, CLIENT_SEED, NONCE, 0, ROWS);
    const r2 = runRound(SERVER_SEED, CLIENT_SEED, NONCE, 12, ROWS);
    // With extreme column positions, results should differ
    // (not guaranteed but highly likely)
    // At minimum, they should be valid
    expect(r1.binIndex).toBeGreaterThanOrEqual(0);
    expect(r1.binIndex).toBeLessThanOrEqual(12);
    expect(r2.binIndex).toBeGreaterThanOrEqual(0);
    expect(r2.binIndex).toBeLessThanOrEqual(12);
  });

  it('binIndex should always be 0–12', () => {
    for (let col = 0; col <= 12; col++) {
      const result = runRound(SERVER_SEED, CLIENT_SEED, NONCE, col, ROWS);
      expect(result.binIndex).toBeGreaterThanOrEqual(0);
      expect(result.binIndex).toBeLessThanOrEqual(12);
    }
  });

  it('different client seed should produce different results', () => {
    const r1 = runRound(SERVER_SEED, 'seed-a', NONCE, DROP_COLUMN, ROWS);
    const r2 = runRound(SERVER_SEED, 'seed-b', NONCE, DROP_COLUMN, ROWS);
    // Combined seeds must differ
    expect(r1.combinedSeed).not.toBe(r2.combinedSeed);
    // Peg maps differ because PRNG stream differs
    expect(r1.pegMapHash).not.toBe(r2.pegMapHash);
  });
});
