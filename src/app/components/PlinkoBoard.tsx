'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { playPegTick, playLanding } from '@/lib/audio';
import { createConfettiParticles, updateParticles, drawParticles } from '@/lib/confetti';
import { PAYOUT_TABLE } from '@/lib/payouts';

const ROWS = 12;
const BINS = 13;

const BIN_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6',
  '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444',
];

interface Props {
  path: boolean[] | null;
  binIndex: number | null;
  isDropping: boolean;
  dropColumn: number;
  onAnimationComplete: () => void;
  goldenBall?: boolean;
  tiltMode?: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; color: string; alpha: number;
  rotation: number; rotationSpeed: number;
}

function getLayout(w: number, h: number) {
  const padX = w * 0.06;
  const padTop = h * 0.05;
  const binH = Math.max(30, h * 0.06);
  const padBot = binH + h * 0.02;
  const boardH = h - padTop - padBot;
  const boardW = w - padX * 2;
  const rowH = boardH / (ROWS + 0.5);
  const pegR = Math.max(4, Math.min(w, h) * 0.008);
  const ballR = Math.max(7, Math.min(w, h) * 0.014);

  const pegPositions: { x: number; y: number }[][] = [];
  const slotWidth = boardW / BINS;

  for (let r = 0; r < ROWS; r++) {
    const rowPegs: { x: number; y: number }[] = [];
    const numPegs = r + 1;
    const totalRowWidth = (numPegs - 1) * slotWidth;
    const startX = padX + (boardW - totalRowWidth) / 2;

    for (let p = 0; p < numPegs; p++) {
      rowPegs.push({
        x: startX + p * slotWidth,
        y: padTop + (r + 0.5) * rowH,
      });
    }
    pegPositions.push(rowPegs);
  }

  const binPositions: { x: number; w: number; y: number }[] = [];
  const binW = boardW / BINS;
  for (let b = 0; b < BINS; b++) {
    binPositions.push({
      x: padX + b * binW,
      w: binW,
      y: h - padBot,
    });
  }

  const dropPositions: number[] = [];
  const dropSlotW = boardW / (BINS - 1);
  for (let d = 0; d < BINS; d++) {
    dropPositions.push(padX + d * dropSlotW);
  }

  return { padX, padTop, pegPositions, binPositions, dropPositions, pegR, ballR, rowH, binH, boardW, boardH };
}

/** Set up canvas for HiDPI and return CSS dimensions */
function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const targetW = rect.width * dpr;
  const targetH = rect.height * dpr;

  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  
  return { w: rect.width, h: rect.height, ctx: canvas.getContext('2d') };
}

/** Draw the static board (pegs + bins + drop indicator) */
function drawStaticBoard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dropColumn: number,
  goldenBall: boolean,
  activeBin: number | null,
  binPulseTime: number
) {
  const isDungeon = document.documentElement.classList.contains('theme-dungeon');
  const pegColor = isDungeon ? '#e67e22' : '#6366f1';
  const layout = getLayout(w, h);

  ctx.clearRect(0, 0, w, h);

  // Draw bins
  layout.binPositions.forEach((bin, i) => {
    const color = BIN_COLORS[i];
    const isActive = activeBin === i;
    const pulse = isActive ? 1 + Math.sin(binPulseTime * 6) * 0.08 : 1;

    ctx.save();
    if (isActive) {
      ctx.translate(bin.x + bin.w / 2, bin.y + layout.binH / 2);
      ctx.scale(pulse, pulse);
      ctx.translate(-(bin.x + bin.w / 2), -(bin.y + layout.binH / 2));
    }

    ctx.fillStyle = color + '20';
    ctx.strokeStyle = color + '60';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bin.x + 2, bin.y, bin.w - 4, layout.binH, 6);
    ctx.fill();
    ctx.stroke();

    if (isActive) {
      ctx.fillStyle = color + '50';
      ctx.beginPath();
      ctx.roundRect(bin.x + 2, bin.y, bin.w - 4, layout.binH, 6);
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
    }

    ctx.fillStyle = isActive ? '#ffffff' : color;
    ctx.font = `700 ${Math.max(9, Math.min(w * 0.018, 14))}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${PAYOUT_TABLE[i]}x`, bin.x + bin.w / 2, bin.y + layout.binH / 2);
    ctx.restore();
  });

  // Draw pegs
  layout.pegPositions.forEach((row) => {
    row.forEach((peg) => {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, layout.pegR + 2, 0, Math.PI * 2);
      ctx.fillStyle = pegColor + '15';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(peg.x, peg.y, layout.pegR, 0, Math.PI * 2);
      ctx.fillStyle = pegColor;
      ctx.shadowColor = pegColor;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(peg.x - layout.pegR * 0.25, peg.y - layout.pegR * 0.25, layout.pegR * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();
    });
  });

  // Drop indicator
  if (activeBin === null) {
    const dropX = layout.dropPositions[dropColumn] ?? layout.dropPositions[6];
    const indicatorY = layout.padTop * 0.35;

    const pulseR = layout.ballR + 3 + Math.sin(Date.now() * 0.004) * 2;
    ctx.beginPath();
    ctx.arc(dropX, indicatorY, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = goldenBall ? '#fbbf2480' : '#fbbf2440';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(dropX, indicatorY, layout.ballR, 0, Math.PI * 2);
    const prevGrad = ctx.createRadialGradient(
      dropX - layout.ballR * 0.3, indicatorY - layout.ballR * 0.3, 0,
      dropX, indicatorY, layout.ballR
    );
    prevGrad.addColorStop(0, goldenBall ? '#fff8dc' : '#fde68a');
    prevGrad.addColorStop(1, goldenBall ? '#ffd700' : '#fbbf24');
    ctx.fillStyle = prevGrad;
    ctx.fill();

    if (goldenBall) {
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(dropX, indicatorY + layout.ballR + 2);
    ctx.lineTo(dropX, layout.pegPositions[0]?.[0]?.y ?? indicatorY + 40);
    ctx.strokeStyle = '#fbbf2430';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  return layout;
}

export default function PlinkoBoard({
  path,
  binIndex,
  isDropping,
  dropColumn,
  onAnimationComplete,
  goldenBall = false,
  tiltMode = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ===== INITIAL DRAW on mount + resize =====
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let idleFrameId = 0;

    const drawIdle = () => {
      const { w, h, ctx } = setupCanvas(canvas);
      if (!ctx || w === 0 || h === 0) return;
      drawStaticBoard(ctx, w, h, dropColumn, goldenBall, null, 0);
      setCanvasReady(true);
    };

    // Draw idle board with a pulsing indicator loop
    const idleLoop = () => {
      if (isDropping) return; // animation useEffect takes over
      const { w, h, ctx } = setupCanvas(canvas);
      if (!ctx || w === 0 || h === 0) {
        idleFrameId = requestAnimationFrame(idleLoop);
        return;
      }
      drawStaticBoard(ctx, w, h, dropColumn, goldenBall, null, 0);
      idleFrameId = requestAnimationFrame(idleLoop);
    };

    // Small delay to ensure CSS layout is computed
    const timeoutId = setTimeout(() => {
      drawIdle();
      if (!isDropping) {
        idleFrameId = requestAnimationFrame(idleLoop);
      }
    }, 50);

    // Resize observer to redraw on size changes
    const observer = new ResizeObserver(() => {
      if (!isDropping) drawIdle();
    });
    observer.observe(canvas.parentElement!);

    return () => {
      clearTimeout(timeoutId);
      if (idleFrameId) cancelAnimationFrame(idleFrameId);
      observer.disconnect();
    };
  }, [dropColumn, goldenBall, isDropping]);

  // ===== ANIMATION when dropping =====
  useEffect(() => {
    if (!isDropping || !path) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (prefersReducedMotion) {
      onAnimationComplete();
      return;
    }

    let animProgress = 0;
    let binPulseTime = 0;
    let lastTime = 0;
    let particles: Particle[] = [];
    let animFrameId = 0;

    const drawFrame = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      const { w, h, ctx } = setupCanvas(canvas);
      if (!ctx || w === 0 || h === 0) {
        animFrameId = requestAnimationFrame(drawFrame);
        return;
      }

      const ANIM_STEP_DURATION = 0.20;
      const currentRow = Math.floor(animProgress);
      const activeBin = currentRow >= ROWS ? binIndex : null;
      const layout = drawStaticBoard(ctx, w, h, dropColumn, goldenBall, activeBin, binPulseTime);

      const isDungeon = document.documentElement.classList.contains('theme-dungeon');

      // Calculate ball position
      const rowFrac = animProgress - currentRow;
      let ballX: number, ballY: number;

      if (currentRow >= ROWS) {
        const bin = layout.binPositions[binIndex!];
        ballX = bin.x + bin.w / 2;
        ballY = bin.y + layout.binH / 2;
        binPulseTime += dt;
      } else {
        let pos = 0;
        for (let r = 0; r < currentRow; r++) {
          if (path[r]) pos++;
        }

        let fromX: number, fromY: number;
        if (currentRow === 0) {
          fromX = layout.dropPositions[dropColumn] ?? layout.dropPositions[6];
          fromY = layout.padTop * 0.35;
        } else {
          const prevPegIdx = Math.min(pos, currentRow - 1);
          if (layout.pegPositions[currentRow - 1]?.[prevPegIdx]) {
            fromX = layout.pegPositions[currentRow - 1][prevPegIdx].x;
            fromY = layout.pegPositions[currentRow - 1][prevPegIdx].y;
          } else {
            fromX = layout.dropPositions[dropColumn] ?? layout.dropPositions[6];
            fromY = layout.padTop;
          }
        }

        const nextPos = path[currentRow] ? pos + 1 : pos;
        const nextPegIdx = Math.min(nextPos, currentRow);
        let toX: number, toY: number;
        if (layout.pegPositions[currentRow]?.[nextPegIdx]) {
          toX = layout.pegPositions[currentRow][nextPegIdx].x;
          toY = layout.pegPositions[currentRow][nextPegIdx].y;
        } else {
          toX = fromX;
          toY = fromY + layout.rowH;
        }

        const t = rowFrac;
        
        // Vertical: Free fall (ease-in quadratic). Starts with zero vertical velocity, accelerates down.
        // This gives a harsh "stop" when it hits the next peg at t=1, creating the requested pause.
        const easeY = t * t;
        
        // Horizontal: Linear-ish with a slight ease-out to settle onto the peg
        const easeX = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        ballX = fromX + (toX - fromX) * easeX;
        ballY = fromY + (toY - fromY) * easeY;

        // Exaggerated outward swing for a visible zig-zag path
        const arc = Math.sin(t * Math.PI) * layout.rowH * 0.15;
        ballX += path[currentRow] ? arc : -arc;
      }

      // Trail
      for (let t = 4; t >= 1; t--) {
        ctx.beginPath();
        ctx.arc(ballX, ballY - t * 3, layout.ballR * (1 - t * 0.12), 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24' + Math.floor(10 + 5 / t).toString(16);
        ctx.fill();
      }

      // Ball
      const ballColor = goldenBall ? '#ffd700' : isDungeon ? '#ff4500' : '#fbbf24';
      ctx.beginPath();
      ctx.arc(ballX, ballY, layout.ballR, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(
        ballX - layout.ballR * 0.3, ballY - layout.ballR * 0.3, 0,
        ballX, ballY, layout.ballR
      );
      grad.addColorStop(0, goldenBall ? '#fff8dc' : isDungeon ? '#ff6347' : '#fde68a');
      grad.addColorStop(1, ballColor);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.shadowColor = ballColor;
      ctx.shadowBlur = goldenBall ? 20 : 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Peg tick sound
      if (currentRow < ROWS && rowFrac > 0.95 && rowFrac - dt * (1 / ANIM_STEP_DURATION) <= 0.95) {
        playPegTick(currentRow);
      }

      // Confetti
      if (particles.length > 0) {
        particles = updateParticles(particles, dt);
        drawParticles(ctx, particles);
      }

      // Advance
      animProgress += dt / ANIM_STEP_DURATION;

      if (animProgress >= ROWS && binPulseTime === 0) {
        const mult = PAYOUT_TABLE[binIndex!] || 1;
        playLanding(mult);
        const bin = layout.binPositions[binIndex!];
        if (bin) {
          particles = createConfettiParticles(bin.x + bin.w / 2, bin.y, mult, Math.floor(30 + mult * 5));
        }
        binPulseTime = 0.001;
      }

      if (animProgress >= ROWS + 2) {
        onAnimationComplete();
        return;
      }

      animFrameId = requestAnimationFrame(drawFrame);
    };

    animFrameId = requestAnimationFrame(drawFrame);
    animFrameRef.current = animFrameId;

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [isDropping, path, binIndex, dropColumn, onAnimationComplete, prefersReducedMotion, goldenBall]);

  return (
    <div className={`canvas-wrapper ${tiltMode ? 'tilt-mode' : ''}`}>
      <canvas
        ref={canvasRef}
        id="plinko-canvas"
        role="img"
        aria-label={`Plinko board with ${ROWS} rows. ${isDropping ? 'Ball is dropping.' : 'Ready for drop.'} ${binIndex !== null ? `Ball landed in bin ${binIndex}.` : ''}`}
      />
    </div>
  );
}
