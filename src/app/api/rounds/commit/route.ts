import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { computeCommit } from '@/lib/hash';

/**
 * POST /api/rounds/commit
 * Creates a new round with a random serverSeed and nonce.
 * Returns the commitHex (SHA256 of serverSeed:nonce) and nonce.
 * The serverSeed is stored internally but NOT revealed to the client.
 */
export async function POST() {
  try {
    // Generate random secrets
    const serverSeed = randomBytes(32).toString('hex');
    const nonce = randomBytes(4).toString('hex'); // 8 hex chars

    // Compute commit hash
    const commitHex = computeCommit(serverSeed, nonce);

    // Create round in DB
    const round = await prisma.round.create({
      data: {
        status: 'CREATED',
        nonce,
        commitHex,
        serverSeedHash: serverSeed, // stored internally, NOT exposed
        clientSeed: '',
        combinedSeed: '',
        pegMapHash: '',
      },
    });

    return NextResponse.json({
      roundId: round.id,
      commitHex: round.commitHex,
      nonce: round.nonce,
    });
  } catch (error) {
    console.error('Error creating round:', error);
    return NextResponse.json(
      { error: 'Failed to create round' },
      { status: 500 }
    );
  }
}
