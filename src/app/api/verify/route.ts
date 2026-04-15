import { NextRequest, NextResponse } from 'next/server';
import { runRound } from '@/lib/engine';

/**
 * GET /api/verify?serverSeed=...&clientSeed=...&nonce=...&dropColumn=...
 * Deterministic recomputation for verification.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverSeed = searchParams.get('serverSeed');
    const clientSeed = searchParams.get('clientSeed');
    const nonce = searchParams.get('nonce');
    const dropColumnStr = searchParams.get('dropColumn');

    // Validate inputs
    if (!serverSeed || !clientSeed || !nonce || dropColumnStr === null) {
      return NextResponse.json(
        { error: 'Missing required params: serverSeed, clientSeed, nonce, dropColumn' },
        { status: 400 }
      );
    }

    const dropColumn = parseInt(dropColumnStr, 10);
    if (isNaN(dropColumn) || dropColumn < 0 || dropColumn > 12) {
      return NextResponse.json(
        { error: 'dropColumn must be an integer 0–12' },
        { status: 400 }
      );
    }

    // Run deterministic engine
    const result = runRound(serverSeed, clientSeed, nonce, dropColumn, 12);

    return NextResponse.json({
      commitHex: result.commitHex,
      combinedSeed: result.combinedSeed,
      pegMapHash: result.pegMapHash,
      binIndex: result.binIndex,
      path: result.path,
    });
  } catch (error) {
    console.error('Error in verify:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
