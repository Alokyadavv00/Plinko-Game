import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/rounds/:id
 * Returns full round details. serverSeed is only included if REVEALED.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }

    // Build response — hide server seed if not revealed
    const response: Record<string, unknown> = {
      id: round.id,
      createdAt: round.createdAt,
      status: round.status,
      nonce: round.nonce,
      commitHex: round.commitHex,
      clientSeed: round.clientSeed,
      combinedSeed: round.status !== 'CREATED' ? round.combinedSeed : undefined,
      pegMapHash: round.status !== 'CREATED' ? round.pegMapHash : undefined,
      rows: round.rows,
      dropColumn: round.dropColumn,
      binIndex: round.status !== 'CREATED' ? round.binIndex : undefined,
      payoutMultiplier: round.status !== 'CREATED' ? round.payoutMultiplier : undefined,
      betCents: round.betCents,
      path: round.status !== 'CREATED' ? JSON.parse(round.pathJson) : undefined,
      revealedAt: round.revealedAt,
    };

    // Only include serverSeed if revealed
    if (round.status === 'REVEALED') {
      response.serverSeed = round.serverSeed;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching round:', error);
    return NextResponse.json(
      { error: 'Failed to fetch round' },
      { status: 500 }
    );
  }
}
