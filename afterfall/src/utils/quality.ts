// Quality preset detection + storage. Auto-picks based on hardware hints,
// can be overridden by the user via the HUD settings panel.

export type QualityPreset = 'low' | 'medium' | 'high';

export interface QualityProfile {
  preset: QualityPreset;
  pixelRatioCap: number;
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  fogDensity: number;
  cityChunkRadius: number; // squared distance beyond which buildings simplify
  maxZombies: number;
  aiTickHz: number; // AI updates per second
  windowEmissivePerformance: boolean;
  hemiIntensityMul: number;
  textureRepeatMul: number;
  trees: boolean;
  cars: number; // count multiplier 0..1
  particles: boolean;
}

const PROFILES: Record<QualityPreset, QualityProfile> = {
  low: {
    preset: 'low',
    pixelRatioCap: 0.9,
    shadows: false,
    shadowMapSize: 0,
    bloom: false,
    fogDensity: 0.008,
    cityChunkRadius: 22,
    maxZombies: 8,
    aiTickHz: 4,
    windowEmissivePerformance: true,
    hemiIntensityMul: 1.2,
    textureRepeatMul: 0.4,
    trees: false,
    cars: 0.15,
    particles: false,
  },
  medium: {
    preset: 'medium',
    pixelRatioCap: 1.25,
    shadows: false,
    shadowMapSize: 0,
    bloom: false,
    fogDensity: 0.005,
    cityChunkRadius: 36,
    maxZombies: 18,
    aiTickHz: 8,
    windowEmissivePerformance: true,
    hemiIntensityMul: 1.05,
    textureRepeatMul: 0.6,
    trees: true,
    cars: 0.45,
    particles: true,
  },
  high: {
    preset: 'high',
    pixelRatioCap: 1.5,
    shadows: true,
    shadowMapSize: 512,
    bloom: true,
    fogDensity: 0.003,
    cityChunkRadius: 56,
    maxZombies: 32,
    aiTickHz: 14,
    windowEmissivePerformance: false,
    hemiIntensityMul: 0.95,
    textureRepeatMul: 1,
    trees: true,
    cars: 0.8,
    particles: true,
  },
};

const STORAGE_KEY = 'afterfall.quality';

export function detectInitialPreset(): QualityPreset {
  // Manual override wins.
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'low' || stored === 'medium' || stored === 'high') return stored;
  } catch {
    // ignore
  }
  // Heuristics
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua);
  const cores = navigator.hardwareConcurrency ?? 4;
  const memInt = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const dpr = window.devicePixelRatio || 1;
  const screenArea = window.screen.width * window.screen.height;

  // Detect low-end mobile or weak desktop
  // Mobile is conservative by default — Android browsers struggle with our
  // 600x600 streamed world; force LOW unless device is clearly mid-range.
  if (isMobile && (cores <= 6 || memInt <= 3)) return 'low';
  if (isMobile) return 'medium';
  if (cores <= 2 || memInt <= 2) return 'low';
  if (cores >= 8 && memInt >= 8 && dpr >= 1.5 && screenArea > 1920 * 1080) return 'high';
  if (cores >= 6 && memInt >= 4) return 'medium';
  return 'low';
}

export function getProfile(preset: QualityPreset): QualityProfile {
  return PROFILES[preset];
}

export function persistPreset(preset: QualityPreset): void {
  try {
    localStorage.setItem(STORAGE_KEY, preset);
  } catch {
    // ignore
  }
}
