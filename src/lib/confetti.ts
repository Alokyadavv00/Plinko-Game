/**
 * Canvas-based confetti particle system.
 * Triggered when ball lands in a bin.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS_HIGH = ['#FFD700', '#FFA500', '#FF6347', '#FFD700', '#FFDAB9'];
const COLORS_MED = ['#C0C0C0', '#87CEEB', '#DDA0DD', '#98FB98', '#B0C4DE'];
const COLORS_LOW = ['#87CEEB', '#B0C4DE', '#98FB98'];

export function createConfettiParticles(
  x: number,
  y: number,
  multiplier: number,
  count: number = 50
): Particle[] {
  const colors = multiplier >= 5 ? COLORS_HIGH : multiplier >= 1.5 ? COLORS_MED : COLORS_LOW;
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 2 + Math.random() * 4 * (multiplier >= 5 ? 1.5 : 1);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
    });
  }

  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt * 60,
      y: p.y + p.vy * dt * 60,
      vy: p.vy + 0.15 * dt * 60, // gravity
      alpha: p.alpha - 0.015 * dt * 60,
      rotation: p.rotation + p.rotationSpeed * dt * 60,
    }))
    .filter((p) => p.alpha > 0);
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
) {
  particles.forEach((p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();
  });
}
