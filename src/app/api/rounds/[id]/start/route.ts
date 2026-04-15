import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeCombinedSeed } from '@/lib/hash';
import { runRound } from '@/lib/engine';
import { getMultiplier } from '@/lib/payouts';

/**
 * POST /api/rounds/:id/start
 * Body: { clientSeed, betCents, dropColumn }
 * Computes the deterministic outcome without revealing serverSeed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { clientSeed, betCents, dropColumn } = body;

    // Validate inputs
    if (!clientSeed || typeof clientSeed !== 'string') {
      return NextResponse.json(
        { error: 'clientSeed is required and must be a string' },
        { status: 400 }
      );
    }
    if (typeof betCents !== 'number' || betCents <= 0 || !Number.isInteger(betCents)) {
      return NextResponse.json(
        { error: 'betCents must be a positive integer' },
        { status: 400 }
      );
    }
    if (typeof dropColumn !== 'number' || dropColumn < 0 || dropColumn > 12 || !Number.isInteger(dropColumn)) {
      return NextResponse.json(
        { error: 'dropColumn must be an integer 0–12' },
        { status: 400 }
      );
    }

    // Fetch round
    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }
    if (round.status !== 'CREATED') {
      return NextResponse.json(
        { error: 'Round already started or revealed' },
        { status: 400 }
      );
    }

    // Get server seed from internal storage
    const serverSeed = round.serverSeedHash;

    // Run deterministic engine
    const result = runRound(serverSeed, clientSeed, round.nonce, dropColumn, 12);
    const payoutMultiplier = getMultiplier(result.binIndex);

    // Update round in DB
    await prisma.round.update({
      where: { id },
      data: {
        status: 'STARTED',
        clientSeed,
        combinedSeed: result.combinedSeed,
        pegMapHash: result.pegMapHash,
        dropColumn,
        binIndex: result.binIndex,
        payoutMultiplier,
        betCents,
        pathJson: JSON.stringify(result.path),
      },
    });

    return NextResponse.json({
      roundId: id,
      pegMapHash: result.pegMapHash,
      rows: 12,
      binIndex: result.binIndex,
      path: result.path,
      payoutMultiplier,
    });
  } catch (error) {
    console.error('Error starting round:', error);
    return NextResponse.json(
      { error: 'Failed to start round' },
      { status: 500 }
    );
  }
}
