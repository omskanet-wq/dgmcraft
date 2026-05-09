// WebAudio synth-based sound effects. Zero downloads, works offline.
// Each effect is a small ADSR envelope around an oscillator or noise burst.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterVolume = 0.6;
let muted = false;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const Cls = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    ctx = new Cls();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : masterVolume;
    masterGain.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function setMasterVolume(v: number): void {
  masterVolume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = muted ? 0 : masterVolume;
}

export function getMasterVolume(): number {
  return masterVolume;
}

export function setMuted(m: boolean): void {
  muted = m;
  if (masterGain) masterGain.gain.value = muted ? 0 : masterVolume;
}

export function resumeAudio(): void {
  ensureCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function noiseBuffer(c: AudioContext, durationSec: number): AudioBuffer {
  const sr = c.sampleRate;
  const len = Math.floor(sr * durationSec);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function playOsc(opts: {
  type: OscillatorType;
  startFreq: number;
  endFreq?: number;
  durationSec: number;
  volume: number;
  attackSec?: number;
  releaseSec?: number;
}): void {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const osc = c.createOscillator();
  osc.type = opts.type;
  osc.frequency.value = opts.startFreq;
  if (opts.endFreq != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(0.0001, opts.endFreq),
      c.currentTime + opts.durationSec,
    );
  }
  const gain = c.createGain();
  const attack = opts.attackSec ?? 0.005;
  const release = opts.releaseSec ?? Math.max(0.05, opts.durationSec * 0.4);
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(opts.volume, c.currentTime + attack);
  gain.gain.linearRampToValueAtTime(0, c.currentTime + opts.durationSec + release);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(c.currentTime + opts.durationSec + release + 0.05);
}

function playNoise(opts: {
  durationSec: number;
  volume: number;
  filterFreq?: number;
  filterQ?: number;
  attackSec?: number;
}): void {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, opts.durationSec + 0.2);
  const filt = c.createBiquadFilter();
  filt.type = 'bandpass';
  filt.frequency.value = opts.filterFreq ?? 1200;
  filt.Q.value = opts.filterQ ?? 1.0;
  const gain = c.createGain();
  const attack = opts.attackSec ?? 0.002;
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(opts.volume, c.currentTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + opts.durationSec);
  src.connect(filt); filt.connect(gain); gain.connect(masterGain);
  src.start();
  src.stop(c.currentTime + opts.durationSec + 0.05);
}

// Sound library — each function is one named SFX.
let lastFootstepT = 0;
export function sfxFootstep(running = false): void {
  const now = performance.now();
  const minGap = running ? 140 : 220;
  if (now - lastFootstepT < minGap) return;
  lastFootstepT = now;
  const base = running ? 700 : 600;
  playNoise({ durationSec: 0.08, volume: running ? 0.22 : 0.18, filterFreq: base + Math.random() * 200, filterQ: 4 });
}

export function sfxAttack(weapon: 'fists' | 'melee' | 'ranged' = 'melee'): void {
  if (weapon === 'ranged') {
    playOsc({ type: 'square', startFreq: 240, endFreq: 90, durationSec: 0.08, volume: 0.35 });
    playNoise({ durationSec: 0.18, volume: 0.3, filterFreq: 2200, filterQ: 0.6 });
  } else {
    playOsc({ type: 'square', startFreq: 180, endFreq: 70, durationSec: 0.12, volume: 0.25 });
    playNoise({ durationSec: 0.1, volume: 0.18, filterFreq: 1200, filterQ: 0.8 });
  }
}

export function sfxHit(): void {
  playOsc({ type: 'sawtooth', startFreq: 140, endFreq: 50, durationSec: 0.18, volume: 0.3 });
  playNoise({ durationSec: 0.15, volume: 0.22, filterFreq: 600, filterQ: 1.2 });
}

export function sfxZombieGroan(): void {
  // Low growl: detuned saw + filter sweep.
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const osc1 = c.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = 95;
  const osc2 = c.createOscillator(); osc2.type = 'sawtooth'; osc2.frequency.value = 102;
  const filt = c.createBiquadFilter(); filt.type = 'lowpass';
  filt.frequency.setValueAtTime(800, c.currentTime);
  filt.frequency.exponentialRampToValueAtTime(280, c.currentTime + 0.6);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.7);
  osc1.connect(filt); osc2.connect(filt); filt.connect(gain); gain.connect(masterGain);
  osc1.start(); osc2.start();
  osc1.stop(c.currentTime + 0.75); osc2.stop(c.currentTime + 0.75);
}

export function sfxContainerOpen(): void {
  playOsc({ type: 'triangle', startFreq: 320, endFreq: 480, durationSec: 0.1, volume: 0.18 });
  playOsc({ type: 'triangle', startFreq: 480, endFreq: 720, durationSec: 0.12, volume: 0.14 });
}

export function sfxLootPickup(): void {
  playOsc({ type: 'triangle', startFreq: 660, endFreq: 990, durationSec: 0.08, volume: 0.16 });
}

export function sfxLevelUp(): void {
  playOsc({ type: 'triangle', startFreq: 440, durationSec: 0.12, volume: 0.2 });
  setTimeout(() => playOsc({ type: 'triangle', startFreq: 660, durationSec: 0.12, volume: 0.2 }), 120);
  setTimeout(() => playOsc({ type: 'triangle', startFreq: 880, durationSec: 0.18, volume: 0.22 }), 240);
}

export function sfxQuestComplete(): void {
  playOsc({ type: 'sine', startFreq: 520, durationSec: 0.1, volume: 0.18 });
  setTimeout(() => playOsc({ type: 'sine', startFreq: 780, durationSec: 0.18, volume: 0.22 }), 100);
}

export function sfxPlayerHurt(): void {
  playOsc({ type: 'sawtooth', startFreq: 220, endFreq: 70, durationSec: 0.25, volume: 0.28 });
}

// Long-running ambient wind. Started once on scene init.
let windNode: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
export function startAmbientWind(): void {
  const c = ensureCtx();
  if (!c || !masterGain || windNode) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 4);
  src.loop = true;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 320;
  const gain = c.createGain();
  gain.gain.value = 0.05;
  src.connect(filt); filt.connect(gain); gain.connect(masterGain);
  src.start();
  windNode = { src, gain };
}

export function stopAmbientWind(): void {
  if (!windNode) return;
  try { windNode.src.stop(); } catch { /* already stopped */ }
  windNode = null;
}

export function setAmbientNight(intense: boolean | number): void {
  if (!windNode) return;
  const t = typeof intense === 'number' ? intense : intense ? 1 : 0;
  windNode.gain.gain.value = 0.05 + 0.04 * Math.max(0, Math.min(1, t));
}
