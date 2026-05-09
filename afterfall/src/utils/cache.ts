// Shared geometry / material cache. Reusing these across thousands of meshes
// eliminates GC churn and dramatically reduces draw-call setup cost on weak GPUs.
import * as THREE from 'three';

const geomCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.Material>();

export function sharedBox(w: number, h: number, d: number): THREE.BufferGeometry {
  const k = `box:${w}:${h}:${d}`;
  let g = geomCache.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geomCache.set(k, g); }
  return g;
}

export function sharedCylinder(rt: number, rb: number, h: number, seg: number): THREE.BufferGeometry {
  const k = `cyl:${rt}:${rb}:${h}:${seg}`;
  let g = geomCache.get(k);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg); geomCache.set(k, g); }
  return g;
}

export function sharedSphere(r: number, w: number, h: number): THREE.BufferGeometry {
  const k = `sph:${r}:${w}:${h}`;
  let g = geomCache.get(k);
  if (!g) { g = new THREE.SphereGeometry(r, w, h); geomCache.set(k, g); }
  return g;
}

export function sharedPlane(w: number, h: number): THREE.BufferGeometry {
  const k = `pln:${w}:${h}`;
  let g = geomCache.get(k);
  if (!g) { g = new THREE.PlaneGeometry(w, h); geomCache.set(k, g); }
  return g;
}

export function sharedCone(r: number, h: number, seg: number): THREE.BufferGeometry {
  const k = `cone:${r}:${h}:${seg}`;
  let g = geomCache.get(k);
  if (!g) { g = new THREE.ConeGeometry(r, h, seg); geomCache.set(k, g); }
  return g;
}

export function sharedMat(key: string, factory: () => THREE.Material): THREE.Material {
  let m = matCache.get(key);
  if (!m) { m = factory(); matCache.set(key, m); }
  return m;
}

export function disposeAllCaches(): void {
  for (const g of geomCache.values()) g.dispose();
  for (const m of matCache.values()) m.dispose();
  geomCache.clear();
  matCache.clear();
}
