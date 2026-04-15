/**
 * SHA-256 hashing utilities for provably-fair protocol.
 *
 * Server-side: uses Node.js crypto module.
 * Client-side (verifier): uses SubtleCrypto API.
 *
 * Protocol:
 *   commitHex     = SHA256(serverSeed + ":" + nonce)
 *   combinedSeed  = SHA256(serverSeed + ":" + clientSeed + ":" + nonce)
 */

import { createHash } from 'crypto';

/** Compute SHA-256 hex digest of a string (Node.js). */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Compute commitHex = SHA256(serverSeed:nonce) */
export function computeCommit(serverSeed: string, nonce: string): string {
  return sha256(`${serverSeed}:${nonce}`);
}

/** Compute combinedSeed = SHA256(serverSeed:clientSeed:nonce) */
export function computeCombinedSeed(
  serverSeed: string,
  clientSeed: string,
  nonce: string
): string {
  return sha256(`${serverSeed}:${clientSeed}:${nonce}`);
}

/**
 * Browser-compatible SHA-256 using SubtleCrypto.
 * Used by the verifier page (client-side).
 */
export async function sha256Browser(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
