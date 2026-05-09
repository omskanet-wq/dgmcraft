// 600×600 procedural world generator. Outputs plain JS data only — Three.js
// objects are spawned later by the chunk streamer. A 10×10 grid of districts,
// each ~60×60 units, is laid out with a road network in the gaps between.

export type Biome =
  | 'downtown'    // dense high-rises, alleys
  | 'suburb'      // small houses + fences
  | 'industrial'  // warehouses + fuel tanks + containers
  | 'village'     // wooden cottages + barn + fields
  | 'highway'     // big road, jammed traffic
  | 'wilderness'  // trees + occasional camp
  | 'ruins';      // rubble + crater + wrecks

export interface PlacedObject {
  type: ObjectType;
  // Local coordinates within the district (0..districtSize)
  x: number;
  z: number;
  rot: number; // y rotation in radians
  scale: number; // uniform scale 0.6..1.4
  variant?: number; // for buildings: width/height roll
  seed: number; // per-object seed for deterministic detail
}

export type ObjectType =
  | 'tower'         // tall city building (3-15 floors)
  | 'midrise'       // 2-4 floors
  | 'house'         // suburban house
  | 'cottage'       // wooden village house
  | 'barn'
  | 'warehouse'
  | 'fueltank'
  | 'container'     // shipping container
  | 'forklift'
  | 'fence_h'       // horizontal fence segment
  | 'fence_v'
  | 'lamppost'
  | 'tree'
  | 'bush'
  | 'rock'
  | 'car'
  | 'truck'
  | 'bus'
  | 'rubble'
  | 'crater'
  | 'roadsign'
  | 'tent'
  | 'campfire'
  | 'well'
  | 'crops'
  | 'corpse'
  | 'dumpster'
  | 'crate'
  | 'locker'
  | 'mailbox'
  | 'bench';

export interface District {
  ix: number; // 0..gridSize-1
  iz: number;
  biome: Biome;
  objects: PlacedObject[];
  // World-space origin of the district's local (0,0)
  worldX: number;
  worldZ: number;
}

export interface Road {
  // Two endpoints in world space; rendered as a long thin asphalt quad
  ax: number;
  az: number;
  bx: number;
  bz: number;
  width: number;
  hasPaint: boolean;
}

export interface WorldData {
  size: number;            // overall world side length in units
  gridSize: number;        // districts per side
  districtSize: number;    // a district's interior side length
  roadWidth: number;       // standard street width
  highwayWidth: number;    // arterial width
  districts: District[][]; // [ix][iz]
  roads: Road[];
  spawnPoint: { x: number; z: number };
  isLootContainer: (t: ObjectType) => boolean;
}

const LOOT_TYPES = new Set<ObjectType>(['corpse', 'dumpster', 'crate', 'locker']);

interface Rng { (): number; next(): number; range(a: number, b: number): number; pick<T>(arr: T[]): T; chance(p: number): boolean }
function rng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const fn = next as Rng;
  fn.next = next;
  fn.range = (a, b) => a + next() * (b - a);
  fn.pick = (arr) => arr[Math.floor(next() * arr.length)];
  fn.chance = (p) => next() < p;
  return fn;
}

/** Pick a biome for a (ix,iz) cell with some clustering / structure. */
function pickBiome(r: Rng, ix: number, iz: number, gridSize: number): Biome {
  // City center cluster around (cx,cz)
  const cx = Math.floor(gridSize / 2);
  const cz = Math.floor(gridSize / 2);
  const dCenter = Math.max(Math.abs(ix - cx), Math.abs(iz - cz));
  if (dCenter <= 1) return 'downtown';
  if (dCenter === 2 && r.chance(0.4)) return 'downtown';

  // Industrial cluster on west side
  if (ix <= 1 && iz >= cz - 1 && iz <= cz + 2 && r.chance(0.7)) return 'industrial';
  // Highway band: a row 1 tile thick that runs east-west
  if (iz === cz + 3) return 'highway';
  // Village cluster south-east
  if (ix >= gridSize - 3 && iz >= gridSize - 3 && r.chance(0.55)) return 'village';
  // Suburbs ring
  if (dCenter >= 2 && dCenter <= 4 && r.chance(0.55)) return 'suburb';
  // Ruins scattered in the inner ring
  if (dCenter <= 3 && r.chance(0.18)) return 'ruins';
  // Default: wilderness
  return r.chance(0.3) ? 'ruins' : 'wilderness';
}

function populate(district: District, r: Rng, ds: number): void {
  const objs: PlacedObject[] = [];
  const margin = 4;

  function placeWithChecks(_type: ObjectType, footprint: number, attempts = 12): { x: number; z: number } | null {
    for (let i = 0; i < attempts; i++) {
      const x = margin + r.next() * (ds - margin * 2);
      const z = margin + r.next() * (ds - margin * 2);
      let bad = false;
      for (const o of objs) {
        if (Math.abs(o.x - x) < footprint && Math.abs(o.z - z) < footprint) { bad = true; break; }
      }
      if (!bad) return { x, z };
    }
    return null;
  }
  function add(type: ObjectType, x: number, z: number, opts: Partial<PlacedObject> = {}): void {
    objs.push({ type, x, z, rot: opts.rot ?? r.range(0, Math.PI * 2), scale: opts.scale ?? 1, variant: opts.variant, seed: opts.seed ?? Math.floor(r.next() * 1e9) });
  }

  switch (district.biome) {
    case 'downtown': {
      // 1-2 large towers + 4-6 midrises packed close
      const towerCount = 1 + Math.floor(r.next() * 2);
      for (let i = 0; i < towerCount; i++) {
        const p = placeWithChecks('tower', 12);
        if (p) add('tower', p.x, p.z, { variant: 6 + Math.floor(r.next() * 10), rot: Math.floor(r.next() * 4) * (Math.PI / 2) });
      }
      const mid = 3 + Math.floor(r.next() * 4);
      for (let i = 0; i < mid; i++) {
        const p = placeWithChecks('midrise', 8);
        if (p) add('midrise', p.x, p.z, { variant: 2 + Math.floor(r.next() * 3), rot: Math.floor(r.next() * 4) * (Math.PI / 2) });
      }
      // street furniture on perimeter
      for (let i = 0; i < 5; i++) add('lamppost', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 4; i++) add('dumpster', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 6; i++) add('car', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 2; i++) add('bus', r.range(4, ds - 4), r.range(4, ds - 4));
      for (let i = 0; i < 5; i++) add('crate', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 3; i++) add('corpse', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 2; i++) add('bench', r.range(2, ds - 2), r.range(2, ds - 2));
      break;
    }
    case 'suburb': {
      const houseCount = 4 + Math.floor(r.next() * 4);
      for (let i = 0; i < houseCount; i++) {
        const p = placeWithChecks('house', 10);
        if (p) add('house', p.x, p.z, { variant: Math.floor(r.next() * 3), rot: Math.floor(r.next() * 4) * (Math.PI / 2) });
      }
      // Fences along the lot edges (cosmetic)
      const fenceCount = 12 + Math.floor(r.next() * 8);
      for (let i = 0; i < fenceCount; i++) {
        const horiz = r.chance(0.5);
        add(horiz ? 'fence_h' : 'fence_v',
          r.range(2, ds - 2), r.range(2, ds - 2),
          { rot: 0, scale: 0.8 + r.next() * 0.4 });
      }
      // mailboxes / cars / trees
      for (let i = 0; i < houseCount; i++) add('mailbox', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 4; i++) add('car', r.range(3, ds - 3), r.range(3, ds - 3));
      for (let i = 0; i < 8; i++) add('tree', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 5; i++) add('bush', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 2; i++) add('locker', r.range(3, ds - 3), r.range(3, ds - 3));
      for (let i = 0; i < 2; i++) add('crate', r.range(3, ds - 3), r.range(3, ds - 3));
      for (let i = 0; i < 2; i++) add('lamppost', r.range(2, ds - 2), r.range(2, ds - 2));
      break;
    }
    case 'industrial': {
      const warehouseCount = 1 + Math.floor(r.next() * 2);
      for (let i = 0; i < warehouseCount; i++) {
        const p = placeWithChecks('warehouse', 18);
        if (p) add('warehouse', p.x, p.z, { variant: Math.floor(r.next() * 2), rot: Math.floor(r.next() * 2) * (Math.PI / 2) });
      }
      for (let i = 0; i < 3; i++) {
        const p = placeWithChecks('fueltank', 8);
        if (p) add('fueltank', p.x, p.z);
      }
      const containerCount = 6 + Math.floor(r.next() * 6);
      for (let i = 0; i < containerCount; i++) {
        add('container', r.range(3, ds - 3), r.range(3, ds - 3),
          { rot: Math.floor(r.next() * 2) * (Math.PI / 2) });
      }
      for (let i = 0; i < 2; i++) add('forklift', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 6; i++) add('crate', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 4; i++) add('locker', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 4; i++) add('lamppost', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 4; i++) add('car', r.range(2, ds - 2), r.range(2, ds - 2));
      break;
    }
    case 'village': {
      const cottageCount = 3 + Math.floor(r.next() * 3);
      for (let i = 0; i < cottageCount; i++) {
        const p = placeWithChecks('cottage', 8);
        if (p) add('cottage', p.x, p.z, { variant: Math.floor(r.next() * 2) });
      }
      const barnP = placeWithChecks('barn', 16);
      if (barnP) add('barn', barnP.x, barnP.z, { rot: Math.floor(r.next() * 2) * (Math.PI / 2) });
      const wellP = placeWithChecks('well', 4);
      if (wellP) add('well', wellP.x, wellP.z);
      for (let i = 0; i < 5; i++) add('crops', r.range(3, ds - 3), r.range(3, ds - 3), { rot: 0 });
      for (let i = 0; i < 16; i++) {
        const horiz = r.chance(0.5);
        add(horiz ? 'fence_h' : 'fence_v', r.range(2, ds - 2), r.range(2, ds - 2));
      }
      for (let i = 0; i < 6; i++) add('tree', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 4; i++) add('bush', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 2; i++) add('crate', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 2; i++) add('locker', r.range(3, ds - 3), r.range(3, ds - 3));
      break;
    }
    case 'highway': {
      // The highway runs east-west across the entire district. We just add
      // wrecked traffic + signs; the asphalt is rendered as a continuous quad.
      const carCount = 14 + Math.floor(r.next() * 8);
      for (let i = 0; i < carCount; i++) {
        const t = r.next();
        const type: ObjectType = t < 0.7 ? 'car' : t < 0.92 ? 'truck' : 'bus';
        const x = r.range(1, ds - 1);
        const z = ds / 2 + (r.next() - 0.5) * 8;
        add(type, x, z, { rot: r.chance(0.5) ? 0 : Math.PI });
      }
      for (let i = 0; i < 6; i++) add('roadsign', r.range(1, ds - 1), ds / 2 + (r.chance(0.5) ? -7 : 7));
      for (let i = 0; i < 8; i++) add('lamppost', r.range(2, ds - 2), ds / 2 + (r.chance(0.5) ? -7 : 7));
      for (let i = 0; i < 4; i++) add('rubble', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 5; i++) add('crate', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 4; i++) add('corpse', r.range(2, ds - 2), r.range(2, ds - 2));
      break;
    }
    case 'wilderness': {
      const treeCount = 12 + Math.floor(r.next() * 12);
      for (let i = 0; i < treeCount; i++) add('tree', r.range(1, ds - 1), r.range(1, ds - 1), { scale: 0.8 + r.next() * 0.7 });
      for (let i = 0; i < 8; i++) add('bush', r.range(1, ds - 1), r.range(1, ds - 1));
      for (let i = 0; i < 4; i++) add('rock', r.range(1, ds - 1), r.range(1, ds - 1), { scale: 0.6 + r.next() * 1.2 });
      // Survivor camp
      if (r.chance(0.35)) {
        const cx = r.range(8, ds - 8);
        const cz = r.range(8, ds - 8);
        add('tent', cx, cz);
        add('campfire', cx + 2, cz);
        add('crate', cx + 3, cz - 1);
        add('corpse', cx - 2, cz + 1);
      }
      break;
    }
    case 'ruins': {
      // Lots of debris, half-buildings, wrecked vehicles
      const ruinCount = 3 + Math.floor(r.next() * 4);
      for (let i = 0; i < ruinCount; i++) {
        const p = placeWithChecks('rubble', 6);
        if (p) add('rubble', p.x, p.z, { variant: Math.floor(r.next() * 3) });
      }
      // Half-collapsed midrise
      if (r.chance(0.7)) {
        const p = placeWithChecks('midrise', 10);
        if (p) add('midrise', p.x, p.z, { variant: -1 /* flag for ruined version */, rot: r.range(0, Math.PI * 2) });
      }
      if (r.chance(0.5)) {
        add('crater', r.range(8, ds - 8), r.range(8, ds - 8));
      }
      for (let i = 0; i < 4; i++) add('car', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 2; i++) add('truck', r.range(3, ds - 3), r.range(3, ds - 3));
      for (let i = 0; i < 6; i++) add('rubble', r.range(2, ds - 2), r.range(2, ds - 2), { scale: 0.5 + r.next() });
      for (let i = 0; i < 6; i++) add('rock', r.range(1, ds - 1), r.range(1, ds - 1), { scale: 0.4 + r.next() * 0.7 });
      for (let i = 0; i < 4; i++) add('corpse', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 4; i++) add('crate', r.range(2, ds - 2), r.range(2, ds - 2));
      for (let i = 0; i < 2; i++) add('locker', r.range(2, ds - 2), r.range(2, ds - 2));
      break;
    }
  }
  district.objects = objs;
}

export function generateWorld(seed = 7): WorldData {
  const gridSize = 10;
  const districtSize = 56;
  const roadWidth = 6;
  const highwayWidth = 12;
  const stride = districtSize + roadWidth;
  const size = gridSize * stride + roadWidth;

  const r = rng(seed);
  const districts: District[][] = [];
  for (let ix = 0; ix < gridSize; ix++) {
    districts[ix] = [];
    for (let iz = 0; iz < gridSize; iz++) {
      const biome = pickBiome(r, ix, iz, gridSize);
      const d: District = {
        ix, iz, biome,
        objects: [],
        worldX: roadWidth + ix * stride,
        worldZ: roadWidth + iz * stride,
      };
      populate(d, rng(seed * 31 + ix * 1009 + iz * 9973), districtSize);
      districts[ix][iz] = d;
    }
  }

  // Roads: full grid between districts
  const roads: Road[] = [];
  for (let iz = 0; iz <= gridSize; iz++) {
    const z = iz * stride + roadWidth / 2;
    roads.push({ ax: 0, az: z, bx: size, bz: z, width: roadWidth, hasPaint: iz % 3 === 0 });
  }
  for (let ix = 0; ix <= gridSize; ix++) {
    const x = ix * stride + roadWidth / 2;
    roads.push({ ax: x, az: 0, bx: x, bz: size, width: roadWidth, hasPaint: ix % 3 === 0 });
  }
  // The highway band is wider — reinforce it on the highway row
  const highwayRow = Math.floor(gridSize / 2) + 3;
  if (highwayRow >= 0 && highwayRow < gridSize) {
    const z = roadWidth + highwayRow * stride + districtSize / 2;
    roads.push({ ax: 0, az: z, bx: size, bz: z, width: highwayWidth, hasPaint: true });
  }

  const spawnPoint = { x: size / 2, z: size / 2 };

  return {
    size, gridSize, districtSize, roadWidth, highwayWidth,
    districts, roads, spawnPoint,
    isLootContainer: (t) => LOOT_TYPES.has(t),
  };
}
