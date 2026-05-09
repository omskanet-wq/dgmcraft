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
    pixelRatioCap: 1.0,
    shadows: false,
    shadowMapSize: 0,
    bloom: false,
    fogDensity: 0.026,
    cityChunkRadius: 36,
    maxZombies: 16,
    aiTickHz: 6,
    windowEmissivePerformance: true,
    hemiIntensityMul: 1.1,
    textureRepeatMul: 0.5,
    trees: false,
    cars: 0.4,
    particles: false,
  },
  medium: {
    preset: 'medium',
    pixelRatioCap: 1.5,
    shadows: true,
    shadowMapSize: 512,
    bloom: true,
    fogDensity: 0.014,
    cityChunkRadius: 60,
    maxZombies: 32,
    aiTickHz: 12,
    windowEmissivePerformance: false,
    hemiIntensityMul: 1.0,
    textureRepeatMul: 0.75,
    trees: true,
    cars: 0.7,
    particles: true,
  },
  high: {
    preset: 'high',
    pixelRatioCap: 2.0,
    shadows: true,
    shadowMapSize: 1024,
    bloom: true,
    fogDensity: 0.01,
    cityChunkRadius: 90,
    maxZombies: 56,
    aiTickHz: 20,
    windowEmissivePerformance: false,
    hemiIntensityMul: 0.95,
    textureRepeatMul: 1,
    trees: true,
    cars: 1,
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
  if (isMobile && (cores <= 4 || memInt <= 2)) return 'low';
  if (isMobile) return 'medium';
  if (cores <= 2 || memInt <= 2) return 'low';
  if (cores >= 8 && memInt >= 8 && dpr >= 1.5 && screenArea > 1920 * 1080) return 'high';
  if (cores >= 6 && memInt >= 4) return 'high';
  return 'medium';
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
