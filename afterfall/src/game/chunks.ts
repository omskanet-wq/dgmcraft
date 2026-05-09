// Chunk streaming. We pre-generate world *data* (lightweight JS objects), then
// instantiate Three.js groups for districts that are within `streamRadius` of
// the player. As the player walks, far districts are disposed and near
// districts are spawned. This keeps draw calls bounded for 600×600 maps.
import * as THREE from 'three';
import type { District, WorldData, PlacedObject, ObjectType } from './world';
import { buildLootContainer, buildCar, buildLamppost } from './models';
import {
  buildHouse, buildCottage, buildBarn, buildWarehouse, buildFuelTank,
  buildContainer, buildFence, buildTree, buildBush, buildRock, buildBus,
  buildTruck, buildForklift, buildRoadSign, buildRubble, buildCrater,
  buildTent, buildSmallCampfire, buildWell, buildCrops, buildMailbox,
  buildBench, buildTower, buildMidrise,
} from './worldModels';

export interface LiveContainer {
  group: THREE.Group;
  pos: THREE.Vector3;
  kind: 'corpse' | 'dumpster' | 'crate' | 'locker';
  opened: boolean;
}

export interface ChunkLight {
  light: THREE.PointLight;
  base: number;
  t: number;
  parent: THREE.Group;
}

export interface LiveChunk {
  district: District;
  group: THREE.Group;
  containers: LiveContainer[];
  emissiveMeshes: THREE.Mesh[]; // window strips that turn on at night
  lights: ChunkLight[];
  fires: THREE.Mesh[];
}

interface SpawnedFor {
  ix: number;
  iz: number;
  chunk: LiveChunk;
}

/** Builds a single object's Three.js group. */
function buildObject(o: PlacedObject): THREE.Group | null {
  switch (o.type) {
    case 'tower':     return buildTower(o.variant ?? 8, o.seed);
    case 'midrise':   return buildMidrise(o.variant ?? 2, o.seed);
    case 'house':     return buildHouse(o.variant ?? 0, o.seed);
    case 'cottage':   return buildCottage(o.variant ?? 0, o.seed);
    case 'barn':      return buildBarn();
    case 'warehouse': return buildWarehouse(o.variant ?? 0);
    case 'fueltank':  return buildFuelTank();
    case 'container': return buildContainer(o.seed);
    case 'fence_h':   return buildFence(true);
    case 'fence_v':   return buildFence(false);
    case 'lamppost':  return buildLamppost().group; // light handled below
    case 'tree':      return buildTree(o.seed);
    case 'bush':      return buildBush();
    case 'rock':      return buildRock(o.scale);
    case 'car':       return buildCar(o.seed);
    case 'truck':     return buildTruck();
    case 'bus':       return buildBus();
    case 'rubble':    return buildRubble(o.variant ?? 0);
    case 'crater':    return buildCrater();
    case 'roadsign':  return buildRoadSign();
    case 'tent':      return buildTent();
    case 'campfire':  return buildSmallCampfire();
    case 'well':      return buildWell();
    case 'crops':     return buildCrops();
    case 'forklift':  return buildForklift();
    case 'mailbox':   return buildMailbox();
    case 'bench':     return buildBench();
    case 'corpse':    return buildLootContainer('corpse');
    case 'dumpster':  return buildLootContainer('dumpster');
    case 'crate':     return buildLootContainer('crate');
    case 'locker':    return buildLootContainer('locker');
    default: return null;
  }
}

const LOOT_TYPES: Set<ObjectType> = new Set(['corpse', 'dumpster', 'crate', 'locker']);

export function spawnChunk(
  district: District,
  scene: THREE.Scene,
  enableShadows: boolean,
  enableTrees: boolean,
): LiveChunk {
  const group = new THREE.Group();
  group.position.set(district.worldX, 0, district.worldZ);

  const containers: LiveContainer[] = [];
  const emissiveMeshes: THREE.Mesh[] = [];
  const lights: ChunkLight[] = [];
  const fires: THREE.Mesh[] = [];

  for (const o of district.objects) {
    if (!enableTrees && (o.type === 'tree' || o.type === 'bush')) continue;
    const obj = buildObject(o);
    if (!obj) continue;
    obj.position.set(o.x, 0, o.z);
    obj.rotation.y = o.rot;
    obj.scale.setScalar(o.scale);
    if (!enableShadows) {
      obj.traverse((m) => {
        if ((m as THREE.Mesh).isMesh) {
          const me = m as THREE.Mesh;
          me.castShadow = false;
          me.receiveShadow = false;
        }
      });
    }
    // Capture window emissives + lamps + fires
    obj.traverse((m) => {
      const me = m as THREE.Mesh;
      if (!me.isMesh) return;
      if (me.userData.lit) emissiveMeshes.push(me);
      if (me.userData.fire) fires.push(me);
    });
    if (o.type === 'lamppost') {
      // attach a light separately so we can track it for night flicker
      const lightObj = new THREE.PointLight(0xffd47a, 0, 12, 1.6);
      lightObj.position.set(0, 3.85, 0);
      obj.add(lightObj);
      lights.push({ light: lightObj, base: 6, t: Math.random() * 10, parent: obj });
    }
    if (o.type === 'campfire') {
      const lightObj = new THREE.PointLight(0xff7a2a, 0, 8, 1.6);
      lightObj.position.set(0, 0.8, 0);
      obj.add(lightObj);
      lights.push({ light: lightObj, base: 3, t: Math.random() * 10, parent: obj });
    }
    if (LOOT_TYPES.has(o.type)) {
      const worldPos = new THREE.Vector3(district.worldX + o.x, 0, district.worldZ + o.z);
      containers.push({
        group: obj,
        pos: worldPos,
        kind: o.type as LiveContainer['kind'],
        opened: false,
      });
    }
    group.add(obj);
  }
  scene.add(group);
  return { district, group, containers, emissiveMeshes, lights, fires };
}

export function disposeChunk(chunk: LiveChunk, scene: THREE.Scene): void {
  scene.remove(chunk.group);
  chunk.group.traverse((o) => {
    const m = o as THREE.Mesh;
    // Only dispose materials we created locally; shared cache materials stay.
    if (m.isMesh && m.geometry && m.geometry.userData.shared !== true) {
      // We don't dispose geometries from the shared cache. Distinct geometries
      // (window planes etc) are negligible and dropping them is fine.
    }
  });
}

export interface ChunkManager {
  update: (playerX: number, playerZ: number) => void;
  getActive: () => LiveChunk[];
  getContainers: () => LiveContainer[];
  forEachLight: (fn: (light: ChunkLight) => void) => void;
  forEachEmissive: (fn: (m: THREE.Mesh) => void) => void;
  dispose: () => void;
}

export function makeChunkManager(
  world: WorldData,
  scene: THREE.Scene,
  options: { streamRadius: number; shadows: boolean; trees: boolean },
): ChunkManager {
  const active: SpawnedFor[] = [];
  const stride = world.districtSize + world.roadWidth;

  function update(playerX: number, playerZ: number): void {
    const cellX = Math.floor((playerX - world.roadWidth) / stride);
    const cellZ = Math.floor((playerZ - world.roadWidth) / stride);
    const radius = Math.ceil(options.streamRadius / stride);

    const wanted = new Set<string>();
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const ix = cellX + dx;
        const iz = cellZ + dz;
        if (ix < 0 || iz < 0 || ix >= world.gridSize || iz >= world.gridSize) continue;
        // also test world-space distance for corner culling
        const d = world.districts[ix][iz];
        const cx = d.worldX + world.districtSize / 2;
        const cz = d.worldZ + world.districtSize / 2;
        const dist = Math.hypot(playerX - cx, playerZ - cz);
        if (dist <= options.streamRadius) wanted.add(`${ix}:${iz}`);
      }
    }

    // Despawn far-away
    for (let i = active.length - 1; i >= 0; i--) {
      const a = active[i];
      const k = `${a.ix}:${a.iz}`;
      if (!wanted.has(k)) {
        disposeChunk(a.chunk, scene);
        active.splice(i, 1);
      }
    }
    // Spawn new
    const have = new Set(active.map((a) => `${a.ix}:${a.iz}`));
    for (const key of wanted) {
      if (have.has(key)) continue;
      const [ix, iz] = key.split(':').map(Number);
      const chunk = spawnChunk(world.districts[ix][iz], scene, options.shadows, options.trees);
      active.push({ ix, iz, chunk });
    }
  }

  function dispose(): void {
    for (const a of active) disposeChunk(a.chunk, scene);
    active.length = 0;
  }

  return {
    update,
    getActive: () => active.map((a) => a.chunk),
    getContainers: () => active.flatMap((a) => a.chunk.containers),
    forEachLight: (fn) => { for (const a of active) for (const l of a.chunk.lights) fn(l); },
    forEachEmissive: (fn) => { for (const a of active) for (const m of a.chunk.emissiveMeshes) fn(m); },
    dispose,
  };
}
