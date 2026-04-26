import { getBlock } from './blocks.js';

// Very small redstone simulation:
// - Sources can be toggled on/off (R key when looking at source).
// - Wires propagate signal up to MAX_WIRE_DISTANCE blocks (BFS).
// - Lamps adjacent to a powered wire/source switch between id 14 (off) and 15 (on).
//
// We also persist the "powered" state of each source in a Set keyed by "x,y,z".

const MAX_WIRE_DISTANCE = 32;

const NEIGHBORS = [
  [ 1, 0, 0], [-1, 0, 0],
  [ 0, 1, 0], [ 0,-1, 0],
  [ 0, 0, 1], [ 0, 0,-1]
];

export class Redstone {
  constructor(world) {
    this.world = world;
    this.poweredSources = new Set(); // "x,y,z"
  }

  key(x, y, z) { return x + ',' + y + ',' + z; }

  toggleSource(x, y, z) {
    const k = this.key(x, y, z);
    if (this.poweredSources.has(k)) this.poweredSources.delete(k);
    else this.poweredSources.add(k);
    this.update();
  }

  serialize() {
    return Array.from(this.poweredSources);
  }

  load(arr) {
    this.poweredSources = new Set(Array.isArray(arr) ? arr : []);
  }

  // Recompute lamp states from current sources + wires. Cheap because we only
  // walk wires from active sources.
  update() {
    // 1) Find all powered tiles (sources + wires reachable from sources)
    const powered = new Set();
    const queue = [];

    for (const k of this.poweredSources) {
      const [x, y, z] = k.split(',').map(Number);
      const id = this.world.getBlock(x, y, z);
      const meta = getBlock(id);
      if (meta.redstone === 'source') {
        powered.add(k);
        queue.push([x, y, z, 0]);
      }
    }

    while (queue.length) {
      const [x, y, z, dist] = queue.shift();
      if (dist >= MAX_WIRE_DISTANCE) continue;
      for (const [dx, dy, dz] of NEIGHBORS) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        const k = this.key(nx, ny, nz);
        if (powered.has(k)) continue;
        const id = this.world.getBlock(nx, ny, nz);
        const meta = getBlock(id);
        if (meta.redstone === 'wire') {
          powered.add(k);
          queue.push([nx, ny, nz, dist + 1]);
        }
      }
    }

    // 2) Update lamps: any lamp adjacent to a powered source/wire turns on.
    // Walk every chunk's blocks to find lamps near the powered set; cheaper
    // approach: scan neighbors of powered tiles.
    const lampToggles = new Map(); // key -> targetId
    const visitedLamp = new Set();
    for (const k of powered) {
      const [x, y, z] = k.split(',').map(Number);
      for (const [dx, dy, dz] of NEIGHBORS) {
        const nx = x + dx, ny = y + dy, nz = z + dz;
        const lk = this.key(nx, ny, nz);
        if (visitedLamp.has(lk)) continue;
        visitedLamp.add(lk);
        const id = this.world.getBlock(nx, ny, nz);
        if (id === 14 || id === 15) lampToggles.set(lk, 15);
      }
    }

    // Also turn off lamps that are no longer powered. We can't easily know
    // "all lamps in the world" without scanning, so we maintain a set of
    // lamps that were ever turned on.
    if (!this._everOnLamps) this._everOnLamps = new Set();
    for (const k of lampToggles.keys()) this._everOnLamps.add(k);

    for (const k of this._everOnLamps) {
      const [x, y, z] = k.split(',').map(Number);
      const id = this.world.getBlock(x, y, z);
      if (id !== 14 && id !== 15) continue; // block was removed/replaced
      const target = lampToggles.has(k) ? 15 : 14;
      if (id !== target) this.world.setBlock(x, y, z, target);
    }
  }
}
