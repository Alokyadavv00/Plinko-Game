'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PAYOUT_TABLE } from '@/lib/payouts';

const BIN_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6',
  '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444',
];

interface VerifyResult {
  commitHex: string;
  combinedSeed: string;
  pegMapHash: string;
  binIndex: number;
  path: boolean[];
}

function VerifierForm() {
  const searchParams = useSearchParams();
  const [serverSeed, setServerSeed] = useState(searchParams.get('serverSeed') || '');
  const [clientSeed, setClientSeed] = useState(searchParams.get('clientSeed') || '');
  const [nonce, setNonce] = useState(searchParams.get('nonce') || '');
  const [dropColumn, setDropColumn] = useState(searchParams.get('dropColumn') || '6');
  const [roundId, setRoundId] = useState(searchParams.get('roundId') || '');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [storedRound, setStoredRound] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setStoredRound(null);

    try {
      // Verify computation
      const params = new URLSearchParams({
        serverSeed,
        clientSeed,
        nonce,
        dropColumn,
      });
      const res = await fetch(`/api/verify?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Verification failed');
      }
      const data: VerifyResult = await res.json();
      setResult(data);

      // If roundId provided, fetch stored round for comparison
      if (roundId) {
        try {
          const roundRes = await fetch(`/api/rounds/${roundId}`);
          if (roundRes.ok) {
            const roundData = await roundRes.json();
            setStoredRound(roundData);
          }
        } catch {
          // Optional comparison, don't fail on this
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Draw mini replay when result is available
  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    const ROWS = 12;
    const padX = w * 0.1;
    const padTop = h * 0.08;
    const padBot = h * 0.1;
    const boardH = h - padTop - padBot;
    const rowH = boardH / (ROWS + 1);
    const pegR = 3;
    const ballR = 5;

    // Draw pegs with path highlights
    const path = result.path;
    let pos = 0;

    // Calculate path positions for drawing
    const pathPoints: { x: number; y: number }[] = [];
    const dc = parseInt(dropColumn);
    const startX = padX + (dc / 12) * (w - 2 * padX);
    pathPoints.push({ x: startX, y: padTop * 0.6 });

    for (let r = 0; r < ROWS; r++) {
      const numPegs = r + 1;
      const rowWidth = (numPegs / 13) * (w - 2 * padX);
      const rStartX = padX + ((w - 2 * padX) - rowWidth) / 2;

      // Draw row pegs
      for (let p = 0; p < numPegs; p++) {
        const px = rStartX + (numPegs > 1 ? (p / (numPegs - 1)) * rowWidth : rowWidth / 2);
        const py = padTop + (r + 1) * rowH;

        const pegIdx = Math.min(pos, r);
        const isOnPath = p === pegIdx || p === pegIdx + 1;

        ctx.beginPath();
        ctx.arc(px, py, pegR, 0, Math.PI * 2);
        ctx.fillStyle = isOnPath ? '#6366f1' : '#334155';
        ctx.fill();
      }

      // Compute path position
      const pegIdx = Math.min(pos, r);
      const nextPos = path[r] ? pos + 1 : pos;
      const nextPegIdx = Math.min(nextPos, r);
      const numPegsR = r + 1;
      const rwR = (numPegsR / 13) * (w - 2 * padX);
      const sXR = padX + ((w - 2 * padX) - rwR) / 2;
      const px = sXR + (numPegsR > 1 ? (nextPegIdx / (numPegsR - 1)) * rwR : rwR / 2);
      const py = padTop + (r + 1) * rowH;
      pathPoints.push({ x: px, y: py });

      if (path[r]) pos++;
    }

    // Draw path line
    ctx.beginPath();
    ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
      ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    ctx.strokeStyle = '#fbbf2480';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw path dots
    pathPoints.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, i === pathPoints.length - 1 ? ballR : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === pathPoints.length - 1 ? '#fbbf24' : '#fbbf2480';
      ctx.fill();
    });

    // Draw bin indicator
    const binW = (w - 2 * padX) / 13;
    const binX = padX + result.binIndex * binW;
    const binY = h - padBot;
    ctx.fillStyle = BIN_COLORS[result.binIndex] + '30';
    ctx.fillRect(binX, binY, binW, padBot * 0.7);
    ctx.fillStyle = BIN_COLORS[result.binIndex];
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Bin ${result.binIndex} (${PAYOUT_TABLE[result.binIndex]}x)`,
      binX + binW / 2,
      binY + padBot * 0.45
    );
  }, [result, dropColumn]);

  const isMatch = storedRound && result
    ? (storedRound.binIndex === result.binIndex &&
       storedRound.commitHex === result.commitHex &&
       storedRound.pegMapHash === result.pegMapHash)
    : null;

  return (
    <div className="verify-container">
      <header className="app-header">
        <h1 className="app-title" style={{ fontSize: '2rem' }}>🔍 Verifier</h1>
        <p className="app-subtitle">Verify any round&apos;s fairness</p>
      </header>

      <nav className="nav-bar">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href="/" className="nav-link">← Game</a>
          <a href="/verify" className="nav-link active">Verifier</a>
        </div>
      </nav>

      <form className="verify-form glass-card" onSubmit={handleVerify}>
        <div className="control-group full-width">
          <label className="control-label" htmlFor="verify-server-seed">Server Seed</label>
          <input
            id="verify-server-seed"
            type="text"
            className="control-input"
            value={serverSeed}
            onChange={e => setServerSeed(e.target.value)}
            placeholder="64-char hex string"
            required
          />
        </div>

        <div className="control-group">
          <label className="control-label" htmlFor="verify-client-seed">Client Seed</label>
          <input
            id="verify-client-seed"
            type="text"
            className="control-input"
            value={clientSeed}
            onChange={e => setClientSeed(e.target.value)}
            placeholder="Your seed"
            required
          />
        </div>

        <div className="control-group">
          <label className="control-label" htmlFor="verify-nonce">Nonce</label>
          <input
            id="verify-nonce"
            type="text"
            className="control-input"
            value={nonce}
            onChange={e => setNonce(e.target.value)}
            placeholder="Nonce"
            required
          />
        </div>

        <div className="control-group">
          <label className="control-label" htmlFor="verify-drop-column">Drop Column</label>
          <input
            id="verify-drop-column"
            type="number"
            className="control-input control-input-sm"
            value={dropColumn}
            onChange={e => setDropColumn(e.target.value)}
            min={0}
            max={12}
            required
          />
        </div>

        <div className="control-group">
          <label className="control-label" htmlFor="verify-round-id">Round ID (optional)</label>
          <input
            id="verify-round-id"
            type="text"
            className="control-input"
            value={roundId}
            onChange={e => setRoundId(e.target.value)}
            placeholder="Compare against stored round"
          />
        </div>

        <div className="full-width" style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn-verify" disabled={loading}>
            {loading ? '⏳ Verifying...' : '✓ Verify'}
          </button>
        </div>
      </form>

      {error && (
        <div className="glass-card result-card fade-in" style={{ borderLeft: '3px solid #ef4444' }}>
          <p style={{ color: '#ef4444' }}>❌ {error}</p>
        </div>
      )}

      {result && (
        <div className="glass-card result-card fade-in">
          {isMatch !== null && (
            <div className={`result-match ${isMatch ? 'success' : 'failure'}`}>
              {isMatch ? '✅ Round verified — all values match!' : '❌ Mismatch detected!'}
            </div>
          )}

          <div className="hash-label">Commit Hash</div>
          <div className="hash-display">{result.commitHex}</div>

          <div className="hash-label">Combined Seed</div>
          <div className="hash-display">{result.combinedSeed}</div>

          <div className="hash-label">Peg Map Hash</div>
          <div className="hash-display">{result.pegMapHash}</div>

          <div className="hash-label">Result</div>
          <div className="hash-display" style={{
            borderLeft: `3px solid ${BIN_COLORS[result.binIndex]}`,
            fontSize: '0.8rem',
            color: BIN_COLORS[result.binIndex],
          }}>
            Bin {result.binIndex} → {PAYOUT_TABLE[result.binIndex]}x multiplier
          </div>

          <div className="hash-label">Path (L/R per row)</div>
          <div className="hash-display">
            {result.path.map((r, i) => (
              <span key={i} style={{ color: r ? '#10b981' : '#6366f1' }}>
                {r ? 'R' : 'L'}{i < result.path.length - 1 ? ' → ' : ''}
              </span>
            ))}
          </div>

          {/* Mini replay canvas */}
          <div className="hash-label" style={{ marginTop: '1rem' }}>Path Replay</div>
          <canvas
            ref={canvasRef}
            className="mini-replay"
            aria-label="Visual replay of ball path through pegs"
          />
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="verify-container">
        <div className="app-header">
          <h1 className="app-title" style={{ fontSize: '2rem' }}>🔍 Verifier</h1>
          <p className="app-subtitle">Loading...</p>
        </div>
      </div>
    }>
      <VerifierForm />
    </Suspense>
  );
}
