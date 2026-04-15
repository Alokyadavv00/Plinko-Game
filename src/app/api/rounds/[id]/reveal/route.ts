import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/rounds/:id/reveal
 * Reveals the serverSeed for a completed round.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const round = await prisma.round.findUnique({ where: { id } });
    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 });
    }
    if (round.status !== 'STARTED') {
      return NextResponse.json(
        { error: 'Round must be in STARTED state to reveal' },
        { status: 400 }
      );
    }

    // Reveal server seed and update status
    const serverSeed = round.serverSeedHash;
    await prisma.round.update({
      where: { id },
      data: {
        status: 'REVEALED',
        serverSeed,
        revealedAt: new Date(),
      },
    });

    return NextResponse.json({ serverSeed });
  } catch (error) {
    console.error('Error revealing round:', error);
    return NextResponse.json(
      { error: 'Failed to reveal round' },
      { status: 500 }
    );
  }
}
