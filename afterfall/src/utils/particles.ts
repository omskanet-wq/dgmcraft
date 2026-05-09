// Tiny pooled particle system for blood/impact bursts. Keeps a fixed-size
// THREE.Points buffer per scene so we never allocate during play.
import * as THREE from 'three';

const POOL = 200;

interface ParticleSystem {
  points: THREE.Points;
  positions: Float32Array;
  velocities: Float32Array;
  ages: Float32Array;
  sizes: Float32Array;
  colors: Float32Array;
  cursor: number;
}

const BY_SCENE = new WeakMap<THREE.Scene, ParticleSystem>();

function ensure(scene: THREE.Scene): ParticleSystem {
  const existing = BY_SCENE.get(scene);
  if (existing) return existing;
  const positions = new Float32Array(POOL * 3);
  const velocities = new Float32Array(POOL * 3);
  const ages = new Float32Array(POOL);
  const sizes = new Float32Array(POOL);
  const colors = new Float32Array(POOL * 3);
  for (let i = 0; i < POOL; i++) ages[i] = -1;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.18,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geom, mat);
  points.frustumCulled = false;
  scene.add(points);
  const sys: ParticleSystem = { points, positions, velocities, ages, sizes, colors, cursor: 0 };
  BY_SCENE.set(scene, sys);
  return sys;
}

export function spawnBurst(
  scene: THREE.Scene,
  pos: THREE.Vector3,
  count: number,
  color: [number, number, number],
  speed = 3,
): void {
  const sys = ensure(scene);
  for (let i = 0; i < count; i++) {
    const idx = sys.cursor;
    sys.cursor = (sys.cursor + 1) % POOL;
    const o = idx * 3;
    sys.positions[o] = pos.x;
    sys.positions[o + 1] = pos.y;
    sys.positions[o + 2] = pos.z;
    const phi = Math.random() * Math.PI * 2;
    const up = 0.5 + Math.random() * 1.0;
    const r = (0.3 + Math.random() * 0.7) * speed;
    sys.velocities[o] = Math.cos(phi) * r;
    sys.velocities[o + 1] = up * speed;
    sys.velocities[o + 2] = Math.sin(phi) * r;
    sys.ages[idx] = 0.6 + Math.random() * 0.4;
    sys.sizes[idx] = 0.18;
    sys.colors[o] = color[0];
    sys.colors[o + 1] = color[1];
    sys.colors[o + 2] = color[2];
  }
  const geom = sys.points.geometry as THREE.BufferGeometry;
  (geom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  (geom.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
}

export function tickParticles(scene: THREE.Scene, dt: number): void {
  const sys = BY_SCENE.get(scene);
  if (!sys) return;
  let alive = false;
  for (let i = 0; i < POOL; i++) {
    if (sys.ages[i] <= 0) continue;
    alive = true;
    sys.ages[i] -= dt;
    const o = i * 3;
    sys.velocities[o + 1] -= 9.8 * dt;
    sys.positions[o] += sys.velocities[o] * dt;
    sys.positions[o + 1] += sys.velocities[o + 1] * dt;
    sys.positions[o + 2] += sys.velocities[o + 2] * dt;
    if (sys.positions[o + 1] < 0.05) {
      sys.positions[o + 1] = 0.05;
      sys.velocities[o] *= 0.4;
      sys.velocities[o + 1] = 0;
      sys.velocities[o + 2] *= 0.4;
      sys.ages[i] = Math.min(sys.ages[i], 0.25);
    }
    if (sys.ages[i] <= 0) {
      sys.positions[o + 1] = -100;
    }
  }
  // Skip the GPU upload entirely when nothing is alive — saves bandwidth on
  // mobile during quiet periods.
  if (alive) {
    const geom = sys.points.geometry as THREE.BufferGeometry;
    (geom.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }
}

export function disposeParticles(scene: THREE.Scene): void {
  const sys = BY_SCENE.get(scene);
  if (!sys) return;
  scene.remove(sys.points);
  sys.points.geometry.dispose();
  (sys.points.material as THREE.Material).dispose();
  BY_SCENE.delete(scene);
}
