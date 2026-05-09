// Builds the static world floor + road network. The floor and roads are a
// single mesh group rendered every frame regardless of chunk streaming, so
// the world doesn't look "empty" beyond the active chunks.
import * as THREE from 'three';
import { getPbrMaterial } from './textures';
import type { WorldData } from './world';

interface BuildOpts {
  // Skip the per-dash road-paint meshes on low presets — visually nearly
  // identical with the asphalt PBR but saves up to ~150 draw calls.
  paintDashes?: boolean;
}

export function buildWorldGround(world: WorldData, opts: BuildOpts = {}): THREE.Group {
  const paintDashes = opts.paintDashes !== false;
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
  // Single shared paint material + geometry — instanced where dashes are kept.
  const paintMat = paintDashes
    ? new THREE.MeshBasicMaterial({ color: 0xe6c84a, transparent: true, opacity: 0.7 })
    : null;
  const dashGeom = paintDashes ? new THREE.PlaneGeometry(0.25, 1.6) : null;
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
    // Center paint stripe — InstancedMesh batches all dashes for this road
    // into a single draw call.
    if (paintDashes && r.hasPaint && paintMat && dashGeom) {
      const dashStride = 4;
      const count = Math.max(0, Math.floor((length - 2) / dashStride));
      if (count > 0) {
        const inst = new THREE.InstancedMesh(dashGeom, paintMat, count);
        const dummy = new THREE.Object3D();
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        const cx = (r.ax + r.bx) / 2;
        const cz = (r.az + r.bz) / 2;
        for (let i = 0; i < count; i++) {
          const t = -length / 2 + 1 + i * dashStride;
          const px = cx + sinA * t;
          const pz = cz + cosA * t;
          dummy.position.set(px, 0.03, pz);
          dummy.rotation.set(-Math.PI / 2, 0, -angle + Math.PI / 2);
          dummy.updateMatrix();
          inst.setMatrixAt(i, dummy.matrix);
        }
        inst.instanceMatrix.needsUpdate = true;
        root.add(inst);
      }
    }
  }
  return root;
}
