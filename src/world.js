import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { AIR, BLOCKS, faceColor, isSolid, isTransparent, isLiquid, getBlock } from './blocks.js';

// World is divided into chunks of CHUNK_SIZE x WORLD_HEIGHT x CHUNK_SIZE blocks.
// Each chunk has its own Three.js mesh that we rebuild on edits.

export const CHUNK_SIZE = 16;
export const WORLD_HEIGHT = 64;
export const SEA_LEVEL = 22;

const FACES = [
  // dir, normal, corners (CCW), face name (for color)
  {
    dir: [ 1, 0, 0],
    name: 'side',
    corners: [
      [1, 1, 0], [1, 0, 0], [1, 0, 1],
      [1, 1, 0], [1, 0, 1], [1, 1, 1]
    ],
    shade: 0.85
  },
  {
    dir: [-1, 0, 0],
    name: 'side',
    corners: [
      [0, 1, 1], [0, 0, 1], [0, 0, 0],
      [0, 1, 1], [0, 0, 0], [0, 1, 0]
    ],
    shade: 0.7
  },
  {
    dir: [0,  1, 0],
    name: 'top',
    corners: [
      [0, 1, 1], [0, 1, 0], [1, 1, 0],
      [0, 1, 1], [1, 1, 0], [1, 1, 1]
    ],
    shade: 1.0
  },
  {
    dir: [0, -1, 0],
    name: 'bottom',
    corners: [
      [0, 0, 0], [0, 0, 1], [1, 0, 1],
      [0, 0, 0], [1, 0, 1], [1, 0, 0]
    ],
    shade: 0.5
  },
  {
    dir: [0, 0,  1],
    name: 'side',
    corners: [
      [1, 1, 1], [1, 0, 1], [0, 0, 1],
      [1, 1, 1], [0, 0, 1], [0, 1, 1]
    ],
    shade: 0.9
  },
  {
    dir: [0, 0, -1],
    name: 'side',
    corners: [
      [0, 1, 0], [0, 0, 0], [1, 0, 0],
      [0, 1, 0], [1, 0, 0], [1, 1, 0]
    ],
    shade: 0.75
  }
];

function shadeColor(hex, factor) {
  const r = ((hex >> 16) & 0xff) * factor;
  const g = ((hex >>  8) & 0xff) * factor;
  const b = ( hex        & 0xff) * factor;
  return [r / 255, g / 255, b / 255];
}

class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.size = CHUNK_SIZE * WORLD_HEIGHT * CHUNK_SIZE;
    this.blocks = new Uint8Array(this.size);
    this.solidMesh = null;
    this.transparentMesh = null;
    this.dirty = true;
  }

  index(x, y, z) {
    return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
  }

  get(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT || z < 0 || z >= CHUNK_SIZE) return AIR;
    return this.blocks[this.index(x, y, z)];
  }

  set(x, y, z, id) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT || z < 0 || z >= CHUNK_SIZE) return;
    this.blocks[this.index(x, y, z)] = id;
    this.dirty = true;
  }
}

export class World {
  constructor(scene, { seed = 1337, viewDistance = 4 } = {}) {
    this.scene = scene;
    this.seed = seed;
    this.viewDistance = viewDistance;
    this.chunks = new Map();
    this.noise2D = createNoise2D(this._seededRng(seed));
    this.noise2DTrees = createNoise2D(this._seededRng(seed + 7));
    this.noise2DBiome = createNoise2D(this._seededRng(seed + 13));

    this.solidMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.transparentMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });

    this.group = new THREE.Group();
    this.group.name = 'world';
    this.scene.add(this.group);

    this.changes = new Map(); // worldKey "x,y,z" -> blockId (overrides over generation)
  }

  _seededRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  chunkKey(cx, cz) { return cx + ',' + cz; }
  worldKey(x, y, z) { return x + ',' + y + ',' + z; }

  // World coordinates -> chunk coords + local offset
  worldToChunk(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return { cx, cz, lx, lz };
  }

  ensureChunk(cx, cz) {
    const key = this.chunkKey(cx, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cz);
      this._generateChunk(chunk);
      this._applyOverrides(chunk);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  _applyOverrides(chunk) {
    for (const [k, id] of this.changes) {
      const [x, y, z] = k.split(',').map(Number);
      const { cx, cz, lx, lz } = this.worldToChunk(x, z);
      if (cx === chunk.cx && cz === chunk.cz) {
        chunk.set(lx, y, lz, id);
      }
    }
  }

  _generateChunk(chunk) {
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = baseX + lx;
        const wz = baseZ + lz;

        // Multi-octave height
        const n = this.noise2D(wx * 0.015, wz * 0.015) * 0.6
                + this.noise2D(wx * 0.05,  wz * 0.05)  * 0.3
                + this.noise2D(wx * 0.12,  wz * 0.12)  * 0.1;
        const height = Math.floor(SEA_LEVEL + n * 14);
        const biome = this.noise2DBiome(wx * 0.01, wz * 0.01); // -1..1

        for (let y = 0; y <= height; y++) {
          let id;
          if (y === 0) {
            id = 3; // stone bedrock-ish
          } else if (y < height - 3) {
            id = 3; // stone
          } else if (y < height) {
            id = 2; // dirt
          } else {
            // surface
            if (biome > 0.35) id = 4; // sand desert
            else if (height <= SEA_LEVEL) id = 4; // beach
            else id = 1; // grass
          }
          chunk.set(lx, y, lz, id);
        }

        // Water fill
        for (let y = height + 1; y <= SEA_LEVEL; y++) {
          chunk.set(lx, y, lz, 5);
        }

        // Trees on grass, sparse
        if (biome < 0.2 && height > SEA_LEVEL && height < WORLD_HEIGHT - 8) {
          const t = this.noise2DTrees(wx * 0.7, wz * 0.7);
          if (t > 0.86) {
            this._placeTree(chunk, lx, height + 1, lz);
          }
        }
      }
    }
  }

  _placeTree(chunk, lx, ly, lz) {
    const trunkH = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < trunkH; i++) {
      if (ly + i < WORLD_HEIGHT) chunk.set(lx, ly + i, lz, 6);
    }
    const top = ly + trunkH;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 3) continue;
          const x = lx + dx, y = top + dy, z = lz + dz;
          if (x < 0 || x >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) continue;
          if (chunk.get(x, y, z) === AIR) chunk.set(x, y, z, 7);
        }
      }
    }
    if (top + 2 < WORLD_HEIGHT) chunk.set(lx, top + 2, lz, 7);
  }

  getBlock(x, y, z) {
    if (y < 0 || y >= WORLD_HEIGHT) return AIR;
    const { cx, cz, lx, lz } = this.worldToChunk(x, z);
    const chunk = this.chunks.get(this.chunkKey(cx, cz));
    if (!chunk) return AIR;
    return chunk.get(lx, y, lz);
  }

  setBlock(x, y, z, id, { record = true } = {}) {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    const { cx, cz, lx, lz } = this.worldToChunk(x, z);
    const chunk = this.ensureChunk(cx, cz);
    chunk.set(lx, y, lz, id);
    chunk.dirty = true;
    if (record) this.changes.set(this.worldKey(x, y, z), id);
    // Mark neighbors dirty if we're on the chunk border so faces between chunks update.
    if (lx === 0)              this._markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this._markDirty(cx + 1, cz);
    if (lz === 0)              this._markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this._markDirty(cx, cz + 1);
  }

  _markDirty(cx, cz) {
    const c = this.chunks.get(this.chunkKey(cx, cz));
    if (c) c.dirty = true;
  }

  // Center streaming around a world position
  streamAround(x, z) {
    const ccx = Math.floor(x / CHUNK_SIZE);
    const ccz = Math.floor(z / CHUNK_SIZE);
    const wanted = new Set();
    for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
      for (let dz = -this.viewDistance; dz <= this.viewDistance; dz++) {
        const cx = ccx + dx;
        const cz = ccz + dz;
        wanted.add(this.chunkKey(cx, cz));
        this.ensureChunk(cx, cz);
      }
    }

    // Unload chunks that are far away
    for (const [key, chunk] of this.chunks) {
      if (!wanted.has(key)) {
        if (chunk.solidMesh) {
          this.group.remove(chunk.solidMesh);
          chunk.solidMesh.geometry.dispose();
          chunk.solidMesh = null;
        }
        if (chunk.transparentMesh) {
          this.group.remove(chunk.transparentMesh);
          chunk.transparentMesh.geometry.dispose();
          chunk.transparentMesh = null;
        }
        this.chunks.delete(key);
      }
    }

    // Rebuild dirty meshes
    for (const chunk of this.chunks.values()) {
      if (chunk.dirty) this._buildChunkMesh(chunk);
    }
  }

  _buildChunkMesh(chunk) {
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;

    const solidPos = [], solidCol = [], solidNorm = [], solidIdx = [];
    const transPos = [], transCol = [], transNorm = [], transIdx = [];

    let solidVtxCount = 0;
    let transVtxCount = 0;

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const id = chunk.get(x, y, z);
          if (id === AIR) continue;
          const isTrans = isTransparent(id);
          for (const f of FACES) {
            const nx = x + f.dir[0], ny = y + f.dir[1], nz = z + f.dir[2];
            const neighbor = this._neighborBlock(chunk, nx, ny, nz);
            // Hide face if neighbor is opaque solid OR same liquid (water)
            if (neighbor !== AIR) {
              const nb = getBlock(neighbor);
              const neighborIsTrans = isTransparent(neighbor);
              if (!neighborIsTrans) continue;
              if (id === neighbor) continue; // hide internal water faces
              if (!isTrans && neighborIsTrans) {
                // solid drawing face against transparent — show
              } else if (isTrans && neighborIsTrans && id !== neighbor) {
                // transparent vs different transparent — show outer face only on the hidden one
              }
              // fallthrough: render face
              void nb;
            }

            const colorHex = faceColor(id, f.name);
            const [r, g, b] = shadeColor(colorHex, f.shade);

            const pos = isTrans ? transPos : solidPos;
            const col = isTrans ? transCol : solidCol;
            const norm = isTrans ? transNorm : solidNorm;
            const idx = isTrans ? transIdx : solidIdx;
            const startVtx = isTrans ? transVtxCount : solidVtxCount;

            for (const c of f.corners) {
              pos.push(baseX + x + c[0], y + c[1], baseZ + z + c[2]);
              col.push(r, g, b);
              norm.push(f.dir[0], f.dir[1], f.dir[2]);
            }
            // 6 vertices = 2 triangles already triangulated
            for (let i = 0; i < 6; i++) idx.push(startVtx + i);
            if (isTrans) transVtxCount += 6; else solidVtxCount += 6;
          }
        }
      }
    }

    // Replace solid mesh
    if (chunk.solidMesh) {
      this.group.remove(chunk.solidMesh);
      chunk.solidMesh.geometry.dispose();
      chunk.solidMesh = null;
    }
    if (solidPos.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(solidPos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(solidCol, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(solidNorm, 3));
      geo.setIndex(solidIdx);
      const mesh = new THREE.Mesh(geo, this.solidMaterial);
      mesh.userData.cx = chunk.cx;
      mesh.userData.cz = chunk.cz;
      this.group.add(mesh);
      chunk.solidMesh = mesh;
    }

    if (chunk.transparentMesh) {
      this.group.remove(chunk.transparentMesh);
      chunk.transparentMesh.geometry.dispose();
      chunk.transparentMesh = null;
    }
    if (transPos.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(transPos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(transCol, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(transNorm, 3));
      geo.setIndex(transIdx);
      const mesh = new THREE.Mesh(geo, this.transparentMaterial);
      mesh.userData.cx = chunk.cx;
      mesh.userData.cz = chunk.cz;
      this.group.add(mesh);
      chunk.transparentMesh = mesh;
    }

    chunk.dirty = false;
  }

  _neighborBlock(chunk, nx, ny, nz) {
    if (ny < 0 || ny >= WORLD_HEIGHT) return AIR;
    if (nx >= 0 && nx < CHUNK_SIZE && nz >= 0 && nz < CHUNK_SIZE) {
      return chunk.get(nx, ny, nz);
    }
    // Cross-chunk lookup
    const wx = chunk.cx * CHUNK_SIZE + nx;
    const wz = chunk.cz * CHUNK_SIZE + nz;
    return this.getBlock(wx, ny, wz);
  }

  // Raycast in voxel grid using DDA. Returns {x,y,z, normal:[nx,ny,nz], blockId} or null.
  raycast(origin, direction, maxDistance = 6) {
    const dir = direction.clone().normalize();
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const stepX = Math.sign(dir.x) || 1;
    const stepY = Math.sign(dir.y) || 1;
    const stepZ = Math.sign(dir.z) || 1;

    const tDeltaX = dir.x !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = dir.y !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = dir.z !== 0 ? Math.abs(1 / dir.z) : Infinity;

    const fx = origin.x - x, fy = origin.y - y, fz = origin.z - z;
    let tMaxX = dir.x > 0 ? (1 - fx) * tDeltaX : fx * tDeltaX;
    let tMaxY = dir.y > 0 ? (1 - fy) * tDeltaY : fy * tDeltaY;
    let tMaxZ = dir.z > 0 ? (1 - fz) * tDeltaZ : fz * tDeltaZ;
    if (dir.x === 0) tMaxX = Infinity;
    if (dir.y === 0) tMaxY = Infinity;
    if (dir.z === 0) tMaxZ = Infinity;

    let face = [0, 0, 0];
    let traveled = 0;

    while (traveled <= maxDistance) {
      const id = this.getBlock(x, y, z);
      if (id !== AIR && !isLiquid(id)) {
        return { x, y, z, normal: face.slice(), blockId: id };
      }
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          x += stepX; traveled = tMaxX; tMaxX += tDeltaX; face = [-stepX, 0, 0];
        } else {
          z += stepZ; traveled = tMaxZ; tMaxZ += tDeltaZ; face = [0, 0, -stepZ];
        }
      } else {
        if (tMaxY < tMaxZ) {
          y += stepY; traveled = tMaxY; tMaxY += tDeltaY; face = [0, -stepY, 0];
        } else {
          z += stepZ; traveled = tMaxZ; tMaxZ += tDeltaZ; face = [0, 0, -stepZ];
        }
      }
    }
    return null;
  }

  // Returns true if the AABB at (x,y,z) - (x+w, y+h, z+d) collides with any solid block.
  collidesAABB(min, max) {
    const x0 = Math.floor(min.x), x1 = Math.floor(max.x);
    const y0 = Math.floor(min.y), y1 = Math.floor(max.y);
    const z0 = Math.floor(min.z), z1 = Math.floor(max.z);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          const id = this.getBlock(x, y, z);
          if (isSolid(id)) {
            const b = BLOCKS[id];
            // Treat fully transparent like glass as solid for collision (it's solid),
            // skip liquids (handled by isSolid -> false because liquid sets solid:false)
            void b;
            return true;
          }
        }
      }
    }
    return false;
  }

  // Find first non-air solid block height at (x, z), starting from top
  surfaceY(x, z) {
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      const id = this.getBlock(x, y, z);
      if (isSolid(id)) return y;
    }
    return 0;
  }

  // Serialization: only store edits + seed.
  serialize() {
    const edits = [];
    for (const [k, id] of this.changes) edits.push([k, id]);
    return { seed: this.seed, edits };
  }

  loadEdits(edits) {
    if (!Array.isArray(edits)) return;
    for (const [k, id] of edits) {
      this.changes.set(k, id);
    }
    // Rebuild any loaded chunks with the new overrides
    for (const chunk of this.chunks.values()) {
      this._applyOverrides(chunk);
      chunk.dirty = true;
    }
  }
}
