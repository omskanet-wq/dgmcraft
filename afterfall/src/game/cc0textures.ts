// CC0 PBR texture loader. On medium/high quality, real photogrammetry
// textures are used; on low quality the procedural fallbacks in `textures.ts`
// stay in play (no extra download).
import * as THREE from 'three';

export interface PbrSet {
  color: THREE.Texture;
  normal?: THREE.Texture;
  roughness?: THREE.Texture;
  metalness?: THREE.Texture;
}

const loader = new THREE.TextureLoader();
const cache = new Map<string, PbrSet>();

function loadTex(url: string, srgb: boolean): THREE.Texture {
  const t = loader.load(url);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

export type Cc0Slug =
  | 'asphalt' | 'bricks' | 'concrete' | 'metal' | 'ground' | 'grass' | 'rust' | 'wood';

const SLUG_HAS_METALNESS: Record<Cc0Slug, boolean> = {
  asphalt: false, bricks: false, concrete: false, metal: true, ground: false, grass: false, rust: true, wood: false,
};

export function loadCc0(slug: Cc0Slug): PbrSet {
  if (cache.has(slug)) return cache.get(slug)!;
  const base = `cc0/textures/${slug}`;
  const set: PbrSet = {
    color: loadTex(`${base}_color.jpg`, true),
    normal: loadTex(`${base}_normalgl.jpg`, false),
    roughness: loadTex(`${base}_roughness.jpg`, false),
  };
  if (SLUG_HAS_METALNESS[slug]) set.metalness = loadTex(`${base}_metalness.jpg`, false);
  cache.set(slug, set);
  return set;
}

export function pbrMaterial(slug: Cc0Slug, repeat = 1, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const set = loadCc0(slug);
  const mat = new THREE.MeshStandardMaterial({
    map: set.color,
    normalMap: set.normal,
    roughnessMap: set.roughness,
    metalnessMap: set.metalness,
    metalness: set.metalness ? 1.0 : 0.0,
    roughness: 1.0,
    ...opts,
  });
  // Apply repeat by cloning textures so they can each have their own UV repeat.
  if (repeat !== 1) {
    const apply = (t?: THREE.Texture) => {
      if (!t) return;
      // ⚠️ We mutate the cached texture's repeat lazily — Three.js resolves it
      // per-material using the *texture's* repeat, so each unique repeat must
      // own its own texture instance.
      t.repeat.set(repeat, repeat);
    };
    apply(set.color); apply(set.normal); apply(set.roughness); apply(set.metalness);
  }
  return mat;
}
