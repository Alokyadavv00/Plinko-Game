'use client';

interface RoundData {
  roundId: string;
  commitHex: string;
  nonce: string;
  serverSeed?: string;
  clientSeed?: string;
  binIndex?: number;
  path?: boolean[];
  payoutMultiplier?: number;
  pegMapHash?: string;
  combinedSeed?: string;
}

interface Props {
  roundData: RoundData;
  gameState: string;
}

export default function FairnessInfo({ roundData, gameState }: Props) {
  const verifyUrl = roundData.serverSeed
    ? `/verify?serverSeed=${roundData.serverSeed}&clientSeed=${encodeURIComponent(roundData.clientSeed || '')}&nonce=${roundData.nonce}&dropColumn=${6}`
    : null;

  return (
    <div className="glass-card fairness-info fade-in" style={{ width: '100%', maxWidth: 700 }}>
      <div className="card-title">⛓ Fairness Proof</div>

      <div className="hash-label">Round ID</div>
      <div className="hash-display">{roundData.roundId}</div>

      <div className="hash-label">Commit Hash (before round)</div>
      <div className="hash-display">{roundData.commitHex}</div>

      <div className="hash-label">Nonce</div>
      <div className="hash-display">{roundData.nonce}</div>

      {roundData.clientSeed && (
        <>
          <div className="hash-label">Client Seed</div>
          <div className="hash-display">{roundData.clientSeed}</div>
        </>
      )}

      {roundData.pegMapHash && (
        <>
          <div className="hash-label">Peg Map Hash</div>
          <div className="hash-display">{roundData.pegMapHash}</div>
        </>
      )}

      {roundData.serverSeed && (
        <>
          <div className="hash-label" style={{ color: '#10b981' }}>
            ✓ Server Seed (revealed)
          </div>
          <div className="hash-display" style={{ borderLeft: '2px solid #10b981' }}>
            {roundData.serverSeed}
          </div>
        </>
      )}

      {roundData.combinedSeed && (
        <>
          <div className="hash-label">Combined Seed</div>
          <div className="hash-display">{roundData.combinedSeed}</div>
        </>
      )}

      {verifyUrl && (
        <a href={verifyUrl} className="verify-link" target="_blank" rel="noopener noreferrer">
          🔍 Verify This Round
        </a>
      )}
    </div>
  );
}
