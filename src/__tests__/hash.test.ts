/**
 * Unit tests for SHA-256 hash utilities.
 *
 * Test vectors from spec:
 *   serverSeed = "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc"
 *   nonce = "42"
 *   clientSeed = "candidate-hello"
 *
 *   commitHex = SHA256("b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc:42")
 *     => "bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34"
 *
 *   combinedSeed = SHA256("b2a5f3...:candidate-hello:42")
 *     => "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0"
 */

import { describe, it, expect } from 'vitest';
import { sha256, computeCommit, computeCombinedSeed } from '@/lib/hash';

const SERVER_SEED = 'b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc';
const NONCE = '42';
const CLIENT_SEED = 'candidate-hello';

describe('SHA-256 Hash Utilities', () => {
  it('sha256 should produce correct hex digest', () => {
    const hash = sha256('hello');
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('computeCommit should match test vector', () => {
    const commitHex = computeCommit(SERVER_SEED, NONCE);
    expect(commitHex).toBe('bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34');
  });

  it('computeCombinedSeed should match test vector', () => {
    const combinedSeed = computeCombinedSeed(SERVER_SEED, CLIENT_SEED, NONCE);
    expect(combinedSeed).toBe('e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0');
  });

  it('should handle empty strings', () => {
    const hash = sha256('');
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('commit format should be serverSeed:nonce', () => {
    // Verify the string format used for hashing
    const expectedInput = `${SERVER_SEED}:${NONCE}`;
    expect(sha256(expectedInput)).toBe(computeCommit(SERVER_SEED, NONCE));
  });

  it('combined seed format should be serverSeed:clientSeed:nonce', () => {
    const expectedInput = `${SERVER_SEED}:${CLIENT_SEED}:${NONCE}`;
    expect(sha256(expectedInput)).toBe(computeCombinedSeed(SERVER_SEED, CLIENT_SEED, NONCE));
  });
});
