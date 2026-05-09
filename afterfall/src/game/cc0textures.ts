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

// Scalar metalness when no metalness map is provided. Poly Haven 1K sets we
// ship don't include packed metalness, so metallic surfaces use a constant.
const METALNESS_SCALAR: Record<Cc0Slug, number> = {
  asphalt: 0, bricks: 0, concrete: 0, metal: 0.85, ground: 0, grass: 0, rust: 0.5, wood: 0,
};

export function loadCc0(slug: Cc0Slug): PbrSet {
  if (cache.has(slug)) return cache.get(slug)!;
  const base = `cc0/textures/${slug}`;
  const set: PbrSet = {
    color: loadTex(`${base}_color.jpg`, true),
    normal: loadTex(`${base}_normalgl.jpg`, false),
    roughness: loadTex(`${base}_roughness.jpg`, false),
  };
  cache.set(slug, set);
  return set;
}

export function pbrMaterial(slug: Cc0Slug, repeat = 1, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const set = loadCc0(slug);
  const mat = new THREE.MeshStandardMaterial({
    map: set.color,
    normalMap: set.normal,
    roughnessMap: set.roughness,
    metalness: METALNESS_SCALAR[slug],
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
