import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/rounds?limit=20
 * Returns recent rounds for session log.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const rounds = await prisma.round.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        status: true,
        commitHex: true,
        nonce: true,
        binIndex: true,
        payoutMultiplier: true,
        betCents: true,
        dropColumn: true,
        clientSeed: true,
      },
    });

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error('Error fetching rounds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rounds' },
      { status: 500 }
    );
  }
}
