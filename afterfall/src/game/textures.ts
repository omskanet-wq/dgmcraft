// Procedural canvas-generated textures. No third-party assets — every pixel
// is drawn at runtime so the bundle stays small and the licensing is clean.
import * as THREE from 'three';
import { loadCc0, type Cc0Slug } from './cc0textures';
import { useGameStore } from '../state/useGameStore';

interface Rng { (): number }
function mulberry32(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size = 256): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D context unavailable');
  return { c, ctx };
}

function fillNoise(ctx: CanvasRenderingContext2D, base: [number, number, number], variance: number, seed: number) {
  const rng = mulberry32(seed);
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rng() - 0.5) * variance;
    img.data[i] = Math.max(0, Math.min(255, base[0] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, base[1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, base[2] + n));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function texFromCanvas(c: HTMLCanvasElement, repeat = 1): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Asphalt: dark gray base, fine grit, occasional crack lines, faint white road-paint streak. */
export function makeAsphaltTexture(seed = 1, withPaint = false): THREE.Texture {
  const { c, ctx } = makeCanvas(256);
  fillNoise(ctx, [38, 38, 42], 22, seed);
  const rng = mulberry32(seed + 1);
  // grit
  for (let i = 0; i < 1200; i++) {
    const x = rng() * 256, y = rng() * 256, r = rng() * 1.4;
    const v = 30 + rng() * 60;
    ctx.fillStyle = `rgb(${v},${v},${v + 4})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // cracks
  ctx.strokeStyle = 'rgba(15,15,18,0.7)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = rng() * 256, y = rng() * 256;
    ctx.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      x += (rng() - 0.5) * 50;
      y += (rng() - 0.5) * 50;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  if (withPaint) {
    ctx.fillStyle = 'rgba(220,210,90,0.55)';
    for (let y = 4; y < 256; y += 32) ctx.fillRect(118, y, 20, 14);
  }
  return texFromCanvas(c, 1);
}

/** Concrete sidewalk with seams. */
export function makeConcreteTexture(seed = 2): THREE.Texture {
  const { c, ctx } = makeCanvas(256);
  fillNoise(ctx, [140, 140, 138], 24, seed);
  const rng = mulberry32(seed + 5);
  for (let i = 0; i < 800; i++) {
    const x = rng() * 256, y = rng() * 256;
    ctx.fillStyle = `rgba(80,80,80,${rng() * 0.25})`;
    ctx.fillRect(x, y, 1, 1);
  }
  // seams
  ctx.strokeStyle = 'rgba(60,60,60,0.85)';
  ctx.lineWidth = 2;
  for (let i = 64; i < 256; i += 64) {
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
  }
  return texFromCanvas(c, 1);
}

/** Brick pattern. */
export function makeBrickTexture(seed = 3): THREE.Texture {
  const { c, ctx } = makeCanvas(256);
  ctx.fillStyle = '#6a3220';
  ctx.fillRect(0, 0, 256, 256);
  const rng = mulberry32(seed);
  const bw = 64, bh = 24, gap = 3;
  for (let row = 0; row * bh < 256; row++) {
    const offset = (row % 2) * (bw / 2);
    for (let col = -1; col * bw < 256 + bw; col++) {
      const x = col * bw + offset;
      const y = row * bh;
      const r = 90 + rng() * 60;
      const g = 40 + rng() * 30;
      const b = 30 + rng() * 25;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x + gap / 2, y + gap / 2, bw - gap, bh - gap);
      ctx.fillStyle = `rgba(0,0,0,${0.05 + rng() * 0.2})`;
      ctx.fillRect(x + gap / 2 + rng() * 8, y + gap / 2 + rng() * 4, 4 + rng() * 12, 1 + rng() * 4);
    }
  }
  ctx.fillStyle = 'rgba(40,30,25,0.5)';
  for (let i = 0; i < 200; i++) {
    const x = rng() * 256, y = rng() * 256;
    ctx.fillRect(x, y, 1, 1);
  }
  return texFromCanvas(c, 1);
}

/** Grass / overgrown weeds. */
export function makeGrassTexture(seed = 4): THREE.Texture {
  const { c, ctx } = makeCanvas(256);
  fillNoise(ctx, [38, 60, 30], 28, seed);
  const rng = mulberry32(seed + 9);
  for (let i = 0; i < 1500; i++) {
    const x = rng() * 256, y = rng() * 256;
    const g = 40 + rng() * 80;
    ctx.fillStyle = `rgb(${g - 20},${g + 20},${g - 30})`;
    ctx.fillRect(x, y, 1, 2);
  }
  // dry tufts
  for (let i = 0; i < 60; i++) {
    const x = rng() * 256, y = rng() * 256;
    ctx.fillStyle = `rgba(140,110,40,${0.3 + rng() * 0.4})`;
    ctx.fillRect(x, y, 2, 4);
  }
  return texFromCanvas(c, 1);
}

/** Wood planks — darker pine. */
export function makeWoodTexture(seed = 5): THREE.Texture {
  const { c, ctx } = makeCanvas(256);
  ctx.fillStyle = '#5a3a22';
  ctx.fillRect(0, 0, 256, 256);
  const rng = mulberry32(seed);
  for (let i = 0; i < 256; i += 32) {
    const r = 60 + rng() * 40;
    const g = 38 + rng() * 25;
    const b = 22 + rng() * 18;
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    ctx.fillRect(0, i, 256, 32);
    // grain lines
    for (let j = 0; j < 6; j++) {
      ctx.strokeStyle = `rgba(20,12,8,${0.1 + rng() * 0.3})`;
      ctx.lineWidth = 1 + rng();
      ctx.beginPath();
      const y = i + 4 + rng() * 24;
      ctx.moveTo(0, y);
      for (let x = 0; x < 256; x += 10) ctx.lineTo(x, y + Math.sin((x + i * 0.7) * 0.05) * 1.5);
      ctx.stroke();
    }
    // plank seam
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
  }
  return texFromCanvas(c, 1);
}

/** Rusted metal panel. */
export function makeRustTexture(seed = 6): THREE.Texture {
  const { c, ctx } = makeCanvas(256);
  fillNoise(ctx, [110, 110, 115], 30, seed);
  const rng = mulberry32(seed + 12);
  // rust patches
  for (let i = 0; i < 50; i++) {
    const x = rng() * 256, y = rng() * 256;
    const r = 8 + rng() * 24;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(150,${50 + rng() * 30},${20 + rng() * 20},0.8)`);
    grd.addColorStop(1, 'rgba(80,40,20,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  // rivets
  for (let y = 16; y < 256; y += 64) {
    for (let x = 16; x < 256; x += 64) {
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  return texFromCanvas(c, 1);
}

/** Bloodstain — half-transparent splatter (used as decal). */
export function makeBloodTexture(seed = 7): THREE.Texture {
  const { c, ctx } = makeCanvas(256);
  ctx.clearRect(0, 0, 256, 256);
  const rng = mulberry32(seed);
  // central pool
  const grd = ctx.createRadialGradient(128, 128, 8, 128, 128, 80);
  grd.addColorStop(0, 'rgba(140,15,15,0.85)');
  grd.addColorStop(1, 'rgba(60,5,5,0)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(128, 128, 80, 0, Math.PI * 2); ctx.fill();
  // splatters
  for (let i = 0; i < 60; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 30 + rng() * 90;
    const r = 1 + rng() * 8;
    const x = 128 + Math.cos(angle) * dist;
    const y = 128 + Math.sin(angle) * dist;
    ctx.fillStyle = `rgba(${100 + rng() * 60},${10 + rng() * 15},${10 + rng() * 10},${0.5 + rng() * 0.4})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Tile-y wall paneling — drywall with cracks and water stains. */
export function makeWallTexture(seed = 8): THREE.Texture {
  const { c, ctx } = makeCanvas(256);
  fillNoise(ctx, [205, 195, 170], 18, seed);
  const rng = mulberry32(seed + 4);
  // water stains
  for (let i = 0; i < 6; i++) {
    const x = rng() * 256, y = rng() * 256;
    const grd = ctx.createRadialGradient(x, y, 4, x, y, 50);
    grd.addColorStop(0, 'rgba(100,80,40,0.5)');
    grd.addColorStop(1, 'rgba(120,90,50,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, 50, 0, Math.PI * 2); ctx.fill();
  }
  // cracks
  ctx.strokeStyle = 'rgba(30,25,20,0.6)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    let x = rng() * 256, y = rng() * 256;
    ctx.moveTo(x, y);
    for (let j = 0; j < 8; j++) {
      x += (rng() - 0.5) * 40;
      y += (rng() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return texFromCanvas(c, 1);
}

/** Roof shingles. */
export function makeRoofTexture(seed = 9): THREE.Texture {
  const { c, ctx } = makeCanvas(256);
  ctx.fillStyle = '#2a2226';
  ctx.fillRect(0, 0, 256, 256);
  const rng = mulberry32(seed);
  const sw = 32, sh = 16;
  for (let row = 0; row * sh < 256; row++) {
    const offset = (row % 2) * (sw / 2);
    for (let col = -1; col * sw < 256 + sw; col++) {
      const x = col * sw + offset;
      const y = row * sh;
      const v = 30 + rng() * 30;
      ctx.fillStyle = `rgb(${v},${v - 4},${v + 2})`;
      ctx.beginPath();
      ctx.moveTo(x, y + sh);
      ctx.lineTo(x + sw / 2, y);
      ctx.lineTo(x + sw, y + sh);
      ctx.fill();
    }
  }
  return texFromCanvas(c, 1);
}

const cache = new Map<string, THREE.Texture>();
export function getTexture(name:
  | 'asphalt' | 'asphalt_paint' | 'concrete' | 'brick' | 'grass'
  | 'wood' | 'rust' | 'blood' | 'wall' | 'roof'): THREE.Texture {
  if (cache.has(name)) return cache.get(name)!;
  let t: THREE.Texture;
  switch (name) {
    case 'asphalt': t = makeAsphaltTexture(101, false); break;
    case 'asphalt_paint': t = makeAsphaltTexture(102, true); break;
    case 'concrete': t = makeConcreteTexture(); break;
    case 'brick': t = makeBrickTexture(); break;
    case 'grass': t = makeGrassTexture(); break;
    case 'wood': t = makeWoodTexture(); break;
    case 'rust': t = makeRustTexture(); break;
    case 'blood': t = makeBloodTexture(); break;
    case 'wall': t = makeWallTexture(); break;
    case 'roof': t = makeRoofTexture(); break;
  }
  cache.set(name, t);
  return t;
}

/**
 * Quality-aware PBR material factory. On `low` quality returns a procedural
 * single-map material (cheap, no extra download). On `medium`/`high` returns
 * a full PBR material backed by CC0 1K JPGs (downscaled to 512×512).
 */
const SLUG_TO_PROC: Record<string, 'asphalt' | 'concrete' | 'brick' | 'grass' | 'wood' | 'rust' | 'wall' | 'roof'> = {
  asphalt: 'asphalt', concrete: 'concrete', bricks: 'brick', grass: 'grass',
  wood: 'wood', rust: 'rust', metal: 'rust', ground: 'concrete',
};

export function getPbrMaterial(
  slug: Cc0Slug,
  repeat: number = 1,
  opts: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  const quality = useGameStore.getState().quality;
  if (quality === 'low') {
    const proc = SLUG_TO_PROC[slug] ?? 'concrete';
    const t = getTexture(proc).clone();
    t.repeat.set(repeat, repeat);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, metalness: 0, ...opts });
  }
  // medium / high: CC0 PBR maps.
  const set = loadCc0(slug);
  // Each material owns its own clone of every map so the repeat doesn't
  // collide with neighbouring materials that need a different tile count.
  const cloneRep = (src?: THREE.Texture) => {
    if (!src) return undefined;
    const c = src.clone();
    c.needsUpdate = true;
    c.repeat.set(repeat, repeat);
    c.wrapS = THREE.RepeatWrapping;
    c.wrapT = THREE.RepeatWrapping;
    return c;
  };
  const color = cloneRep(set.color)!;
  return new THREE.MeshStandardMaterial({
    map: color,
    normalMap: cloneRep(set.normal),
    roughnessMap: cloneRep(set.roughness),
    metalnessMap: cloneRep(set.metalness),
    metalness: set.metalness ? 1.0 : 0.0,
    roughness: 1.0,
    ...opts,
  });
}
