/**
 * Web Audio API sound engine for Plinko.
 * All sounds are procedurally generated — no audio files needed.
 */

let audioCtx: AudioContext | null = null;
let muted = false;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

/** Resume audio context (required after user gesture). */
export function resumeAudio() {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

/** Toggle mute state. */
export function setMuted(m: boolean) {
  muted = m;
}

export function isMuted(): boolean {
  return muted;
}

/**
 * Play a peg tick — short sine ping.
 * Frequency varies by row for sonic variety.
 */
export function playPegTick(row: number) {
  if (muted) return;
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Frequency rises as ball descends (300–900 Hz range)
  const freq = 400 + row * 45 + Math.random() * 60;
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.08);
}

/**
 * Play landing celebration — ascending arpeggio chord.
 */
export function playLanding(multiplier: number) {
  if (muted) return;
  const ctx = getContext();

  // Higher multiplier = more dramatic sound
  const intensity = Math.min(multiplier / 16, 1);
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = intensity > 0.5 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const startTime = ctx.currentTime + i * 0.06;
    const volume = 0.08 + intensity * 0.06;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3 + intensity * 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.5);
  });
}

/**
 * Play a quick whoosh for ball drop.
 */
export function playDrop() {
  if (muted) return;
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}
