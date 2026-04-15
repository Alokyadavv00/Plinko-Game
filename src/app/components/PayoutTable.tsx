'use client';

import { PAYOUT_TABLE } from '@/lib/payouts';

const BIN_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6',
  '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444',
];

interface Props {
  activeBin: number | null;
}

export default function PayoutTable({ activeBin }: Props) {
  return (
    <div className="payout-strip" role="table" aria-label="Payout multipliers for each bin">
      {PAYOUT_TABLE.map((mult, i) => (
        <div
          key={i}
          className={`payout-cell ${activeBin === i ? 'highlight' : ''}`}
          style={{
            backgroundColor: BIN_COLORS[i] + '20',
            color: BIN_COLORS[i],
            borderBottom: `2px solid ${BIN_COLORS[i]}${activeBin === i ? '' : '40'}`,
          }}
          role="cell"
          aria-label={`Bin ${i}: ${mult}x multiplier`}
        >
          {mult}x
        </div>
      ))}
    </div>
  );
}
