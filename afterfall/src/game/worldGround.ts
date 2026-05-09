// Builds the static world floor + road network. The floor and roads are a
// single mesh group rendered every frame regardless of chunk streaming, so
// the world doesn't look "empty" beyond the active chunks.
import * as THREE from 'three';
import { getPbrMaterial } from './textures';
import type { WorldData } from './world';

export function buildWorldGround(world: WorldData): THREE.Group {
  const root = new THREE.Group();

  // Big grass plane underneath everything
  const groundMat = getPbrMaterial('grass', Math.ceil(world.size / 4));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(world.size + 60, world.size + 60), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(world.size / 2, -0.02, world.size / 2);
  ground.receiveShadow = true;
  root.add(ground);

  // Sidewalk strip under each district (concrete, slightly larger than district)
  const sidewalkMat = getPbrMaterial('concrete', 6);
  const sidewalkGeom = new THREE.PlaneGeometry(world.districtSize, world.districtSize);
  for (let ix = 0; ix < world.gridSize; ix++) {
    for (let iz = 0; iz < world.gridSize; iz++) {
      const d = world.districts[ix][iz];
      // Only urban biomes get a concrete pad.
      if (d.biome !== 'downtown' && d.biome !== 'industrial' && d.biome !== 'suburb') continue;
      const sidewalk = new THREE.Mesh(sidewalkGeom, sidewalkMat);
      sidewalk.rotation.x = -Math.PI / 2;
      sidewalk.position.set(d.worldX + world.districtSize / 2, 0.01, d.worldZ + world.districtSize / 2);
      sidewalk.receiveShadow = true;
      root.add(sidewalk);
    }
  }

  // Roads — long thin asphalt quads
  const roadMat = getPbrMaterial('asphalt', 4);
  for (const r of world.roads) {
    const dx = r.bx - r.ax;
    const dz = r.bz - r.az;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz); // align "long axis" with z
    const geom = new THREE.PlaneGeometry(r.width, length);
    const m = new THREE.Mesh(geom, roadMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -angle + Math.PI / 2;
    m.position.set((r.ax + r.bx) / 2, 0.02, (r.az + r.bz) / 2);
    m.receiveShadow = true;
    root.add(m);
    // Center paint stripe
    if (r.hasPaint) {
      const paintMat = new THREE.MeshBasicMaterial({ color: 0xe6c84a, transparent: true, opacity: 0.7 });
      const dashStride = 4;
      for (let t = -length / 2 + 1; t < length / 2; t += dashStride) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 1.6), paintMat);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = -angle + Math.PI / 2;
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        const px = (r.ax + r.bx) / 2 + sinA * t;
        const pz = (r.az + r.bz) / 2 + cosA * t;
        dash.position.set(px, 0.03, pz);
        root.add(dash);
      }
    }
  }
  return root;
}
