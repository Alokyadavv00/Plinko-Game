'use client';

const BIN_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6',
  '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444',
];

interface RoundSummary {
  id?: string;
  roundId?: string;
  binIndex?: number;
  payoutMultiplier?: number;
  betCents?: number;
  dropColumn?: number;
  status?: string;
  clientSeed?: string;
  nonce?: string;
}

interface Props {
  rounds: RoundSummary[];
}

export default function SessionLog({ rounds }: Props) {
  if (rounds.length === 0) {
    return (
      <div className="glass-card">
        <div className="card-title">📋 Session Log</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem 0' }}>
          No rounds yet. Drop a ball to start!
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="card-title">📋 Session Log ({rounds.length})</div>
      <div className="session-log">
        {rounds.map((round) => {
          const id = round.id || round.roundId || '';
          const bin = round.binIndex ?? 0;
          const mult = round.payoutMultiplier ?? 0;
          const bet = round.betCents ?? 0;
          const payout = Math.round(bet * mult);
          const color = BIN_COLORS[bin] || '#6366f1';

          return (
            <div key={id} className="log-entry">
              <div className="log-bin" style={{ backgroundColor: color + '30', color }}>
                {bin}
              </div>
              <div className="log-details">
                <div className="log-mult">{mult}x</div>
                <div className="log-bet">
                  {bet}¢ → {payout}¢
                </div>
              </div>
              <div className="log-actions">
                <a
                  href={`/api/rounds/${id}`}
                  className="log-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View round details"
                >
                  📄
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
