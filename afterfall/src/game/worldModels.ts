// Procedural models for biome-specific props. Kept separate from `models.ts`
// to avoid one giant file. All meshes are built from primitives + cached
// geometries / CC0-textured PBR materials when quality allows.
import * as THREE from 'three';
import { sharedBox, sharedCylinder, sharedCone, sharedPlane, sharedMat, sharedSphere } from '../utils/cache';
import { getPbrMaterial, getTexture } from './textures';

function basicMat(color: number, roughness = 0.95, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function meshShared(geom: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(geom, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Suburban house — pitched roof + porch. */
export function buildHouse(variant: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const w = 6 + (variant % 3) * 1.2;
  const d = 5 + (variant % 2) * 1.0;
  const h = 2.6 + (variant % 2) * 0.6;
  const wallMat = getPbrMaterial(variant === 1 ? 'bricks' : 'wood', Math.max(1, w / 3));
  const roofTex = getTexture('roof').clone();
  roofTex.repeat.set(w / 3, d / 3);
  roofTex.needsUpdate = true;
  const roofMat = sharedMat('roof', () => new THREE.MeshStandardMaterial({ map: roofTex, roughness: 1 }));
  // walls
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  // pitched roof — two triangular prisms via a single beveled box
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.2, 1.6, 4), roofMat);
  roof.position.y = h + 0.8;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w / Math.hypot(w, d) * 1.4, 1, d / Math.hypot(w, d) * 1.4);
  g.add(roof);
  // door
  const door = new THREE.Mesh(sharedBox(0.9, 1.6, 0.06), basicMat(0x2a1a14));
  door.position.set(0, 0.8, d / 2 + 0.04);
  g.add(door);
  // windows
  const winMat = sharedMat('house-window', () => new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.2, metalness: 0.4, emissive: 0xffae5a, emissiveIntensity: 0 }));
  for (const dx of [-w / 3, w / 3]) {
    const wn = new THREE.Mesh(sharedPlane(0.8, 0.8), winMat);
    wn.position.set(dx, h * 0.65, d / 2 + 0.03);
    if (((seed >> 4) & 1) === 1) wn.userData.lit = true;
    g.add(wn);
  }
  // porch step + railing posts
  const porch = new THREE.Mesh(sharedBox(2.0, 0.18, 0.8), basicMat(0x6a4a2a));
  porch.position.set(0, 0.09, d / 2 + 0.4);
  g.add(porch);
  const postMat = sharedMat('porch-post', () => basicMat(0x4a3a26, 1));
  for (const dx of [-1.0, 1.0]) {
    const post = new THREE.Mesh(sharedBox(0.08, 1.4, 0.08), postMat);
    post.position.set(dx, 0.7, d / 2 + 0.78); g.add(post);
  }
  const awning = new THREE.Mesh(sharedBox(2.4, 0.06, 1.0), basicMat(0x6a3024));
  awning.position.set(0, 1.5, d / 2 + 0.4); g.add(awning);
  // chimney
  const chim = new THREE.Mesh(sharedBox(0.5, 1.0, 0.5), basicMat(0x6a4a3a));
  chim.position.set(w / 2 - 0.6, h + 0.6, -d / 4); g.add(chim);
  // mailbox
  const mb = new THREE.Mesh(sharedBox(0.18, 0.18, 0.32), basicMat(0x4a4a4a, 0.5, 0.5));
  mb.position.set(-w / 2 - 0.4, 0.9, d / 2 + 1.4); g.add(mb);
  return g;
}

/** Wooden village cottage. */
export function buildCottage(variant: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const w = 4.5 + variant * 0.6;
  const d = 4 + variant * 0.4;
  const h = 2.2;
  const wallMat = getPbrMaterial('wood', Math.max(1, w / 3));
  const roofMat = sharedMat('cottage-roof', () => new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 1 }));
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.2, 1.4, 4), roofMat);
  roof.position.y = h + 0.7; roof.rotation.y = Math.PI / 4;
  roof.scale.set(w / Math.hypot(w, d) * 1.4, 1, d / Math.hypot(w, d) * 1.4);
  g.add(roof);
  // chimney
  const chim = new THREE.Mesh(sharedBox(0.4, 0.8, 0.4), basicMat(0x4a2a1a));
  chim.position.set(w / 3, h + 1.2, -d / 4);
  g.add(chim);
  // log facade strakes (horizontal lines suggest stacked logs).
  const logMat = sharedMat('cottage-log', () => basicMat(0x6a3a22, 1));
  for (let y = 0.4; y < h - 0.2; y += 0.45) {
    const ln = new THREE.Mesh(sharedBox(w + 0.04, 0.08, 0.02), logMat);
    ln.position.set(0, y, d / 2 + 0.025); g.add(ln);
  }
  // small wooden door
  const door = new THREE.Mesh(sharedBox(0.7, 1.4, 0.05), basicMat(0x3a1e10));
  door.position.set(0, 0.7, d / 2 + 0.04); g.add(door);
  void seed;
  return g;
}

/** Big red barn with white trim. */
export function buildBarn(): THREE.Group {
  const g = new THREE.Group();
  const w = 9, d = 7, h = 4;
  const wallMat = getPbrMaterial('wood', 3, { color: 0xa84a3a });
  const roofMat = sharedMat('barn-roof', () => new THREE.MeshStandardMaterial({ color: 0x4a2a1a, roughness: 1 }));
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.3, 2, 4), roofMat);
  roof.position.y = h + 1; roof.rotation.y = Math.PI / 4;
  roof.scale.set(w / Math.hypot(w, d) * 1.4, 1, d / Math.hypot(w, d) * 1.4);
  g.add(roof);
  // big double doors
  const door = new THREE.Mesh(sharedBox(3, 2.6, 0.1), basicMat(0xeae0c8));
  door.position.set(0, 1.3, d / 2 + 0.05);
  g.add(door);
  return g;
}

/** Industrial warehouse — long shed with corrugated walls. */
export function buildWarehouse(variant: number): THREE.Group {
  const g = new THREE.Group();
  const w = 14 + variant * 4;
  const d = 9;
  const h = 4.5;
  const wallMat = getPbrMaterial('metal', 2, { color: 0x9a9a96 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  // arched roof
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(d / 1.7, d / 1.7, w + 0.3, 16, 1, false, 0, Math.PI), basicMat(0x6a6a66, 0.6, 0.4));
  roof.rotation.z = Math.PI / 2;
  roof.position.y = h;
  g.add(roof);
  // big roller door
  const door = new THREE.Mesh(sharedBox(3.5, 3, 0.1), basicMat(0x4a4a4a));
  door.position.set(-w / 2 + 2.5, 1.5, d / 2 + 0.05);
  g.add(door);
  // smokestack + roof vents
  const stack = new THREE.Mesh(sharedCylinder(0.5, 0.6, 4, 12), basicMat(0x4a4a48, 0.7, 0.4));
  stack.position.set(w / 2 - 1.5, h + 2 + 0.2, 0); g.add(stack);
  const stackTop = new THREE.Mesh(sharedCylinder(0.55, 0.55, 0.2, 12), basicMat(0x2a2a2a));
  stackTop.position.set(w / 2 - 1.5, h + 4.3, 0); g.add(stackTop);
  for (let i = -1; i <= 1; i += 2) {
    const vent = new THREE.Mesh(sharedBox(1.0, 0.8, 1.0), basicMat(0x6a6a66, 0.5, 0.5));
    vent.position.set(i * w / 4, h + 1.0, 0); g.add(vent);
  }
  // signage panel above roller door
  const sign = new THREE.Mesh(sharedPlane(3.6, 0.5), basicMat(0x9a3a2a));
  sign.position.set(-w / 2 + 2.5, 3.4, d / 2 + 0.06); g.add(sign);
  return g;
}

/** Cylindrical fuel tank. */
export function buildFuelTank(): THREE.Group {
  const g = new THREE.Group();
  const tankMat = getPbrMaterial('rust', 1, { color: 0xc0c0bc });
  const tank = new THREE.Mesh(sharedCylinder(2, 2, 4, 24), tankMat);
  tank.position.y = 2;
  tank.castShadow = true;
  g.add(tank);
  const top = new THREE.Mesh(sharedCylinder(2, 2, 0.2, 24), basicMat(0xc0c0bc, 0.5, 0.4));
  top.position.y = 4.1; g.add(top);
  // ladder
  const ladderMat = basicMat(0x4a4a4a, 0.6, 0.5);
  for (let y = 0.4; y < 4; y += 0.4) {
    const r = new THREE.Mesh(sharedBox(0.4, 0.04, 0.04), ladderMat);
    r.position.set(2.05, y, 0); g.add(r);
  }
  return g;
}

/** Shipping container. */
export function buildContainer(seed: number): THREE.Group {
  const g = new THREE.Group();
  const colors = [0xc04a3a, 0x3a7ac0, 0x6aa84a, 0xc8a83a, 0x4a4a4a, 0x8a4a3a];
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const color = colors[Math.floor(r() * colors.length)];
  const mat = getPbrMaterial('rust', 2, { color });
  const body = new THREE.Mesh(sharedBox(6, 2.6, 2.4), mat);
  body.position.y = 1.3;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  // door details on one short side
  const door = new THREE.Mesh(sharedBox(0.04, 2.4, 2.2), basicMat(0x4a3a2a, 0.7, 0.4));
  door.position.set(3.02, 1.3, 0); g.add(door);
  return g;
}

/** Wooden picket fence segment. */
export function buildFence(horizontal: boolean): THREE.Group {
  const g = new THREE.Group();
  const w = horizontal ? 3 : 0.06;
  const d = horizontal ? 0.06 : 3;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), basicMat(0x6a4a2a));
  rail.position.y = 0.4;
  g.add(rail);
  // pickets
  const length = horizontal ? w : d;
  for (let i = -length / 2 + 0.1; i <= length / 2; i += 0.3) {
    const pi = new THREE.Mesh(sharedBox(0.06, 0.8, 0.06), basicMat(0x5a3a22));
    if (horizontal) pi.position.set(i, 0.6, 0);
    else pi.position.set(0, 0.6, i);
    g.add(pi);
  }
  return g;
}

/** Tree (low-poly). */
export function buildTree(seed: number): THREE.Group {
  const g = new THREE.Group();
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const trunkMat = sharedMat('tree-trunk', () => basicMat(0x3a2614, 1));
  const leafMats = [0x2a4a2a, 0x3a5a3a, 0x4a6a3a, 0x5a4a2a, 0x6a4a3a].map((c) =>
    sharedMat(`tree-leaf-${c}`, () => basicMat(c, 1)),
  );
  const leafMat = leafMats[Math.floor(r() * leafMats.length)];
  const trunkH = 1.6 + r() * 0.8;
  const trunk = meshShared(sharedCylinder(0.12, 0.18, trunkH, 8), trunkMat);
  trunk.position.y = trunkH / 2; g.add(trunk);
  const canopyR = 0.7 + r() * 0.8;
  const canopy = meshShared(sharedSphere(canopyR, 8, 6), leafMat);
  canopy.position.y = trunkH + canopyR * 0.8;
  canopy.scale.y = 0.9;
  g.add(canopy);
  return g;
}

export function buildBush(): THREE.Group {
  const g = new THREE.Group();
  const mat = sharedMat('bush', () => basicMat(0x3a5a2a, 1));
  const b = meshShared(sharedSphere(0.6, 8, 6), mat);
  b.position.y = 0.5; b.scale.y = 0.7; g.add(b);
  return g;
}

export function buildRock(scale: number): THREE.Group {
  const g = new THREE.Group();
  const rockMat = sharedMat('rock', () => basicMat(0x6a6a66, 1));
  const r = meshShared(new THREE.IcosahedronGeometry(0.6 * scale, 0), rockMat);
  r.position.y = 0.4 * scale;
  r.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  g.add(r);
  return g;
}

export function buildBus(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = basicMat(0xd1c84a, 0.55, 0.5);
  const body = meshShared(sharedBox(7, 2.4, 2.2), bodyMat);
  body.position.y = 1.4; g.add(body);
  // window strip
  const winMat = basicMat(0x14181c, 0.05, 0.6);
  const win = meshShared(sharedPlane(6.6, 0.8), winMat);
  win.position.set(0, 2.0, 1.111); g.add(win);
  const win2 = win.clone(); win2.position.z = -1.111; win2.rotation.y = Math.PI; g.add(win2);
  // wheels
  const wheelMat = sharedMat('wheel', () => basicMat(0x14140e, 1));
  for (const x of [-2.3, 2.3]) for (const z of [-1, 1]) {
    const wh = meshShared(sharedCylinder(0.4, 0.4, 0.3, 16), wheelMat);
    wh.rotation.z = Math.PI / 2;
    wh.position.set(x, 0.4, z);
    g.add(wh);
  }
  return g;
}

export function buildTruck(): THREE.Group {
  const g = new THREE.Group();
  const cabMat = basicMat(0x3a3a3a, 0.55, 0.5);
  const cab = meshShared(sharedBox(2.5, 2.2, 2.2), cabMat);
  cab.position.set(-2, 1.3, 0); g.add(cab);
  const trailerMat = getPbrMaterial('rust', 2, { color: 0xeae0c8 });
  const trailer = meshShared(sharedBox(6, 2.6, 2.4), trailerMat);
  trailer.position.set(2.5, 1.5, 0); g.add(trailer);
  const wheelMat = sharedMat('wheel', () => basicMat(0x14140e, 1));
  for (const z of [-1, 1]) {
    for (const x of [-3, 0, 1.5, 4.5]) {
      const wh = meshShared(sharedCylinder(0.45, 0.45, 0.3, 16), wheelMat);
      wh.rotation.z = Math.PI / 2;
      wh.position.set(x, 0.45, z);
      g.add(wh);
    }
  }
  return g;
}

export function buildForklift(): THREE.Group {
  const g = new THREE.Group();
  const yellow = basicMat(0xd6c43a, 0.55, 0.5);
  const body = meshShared(sharedBox(1.6, 1.2, 2.2), yellow);
  body.position.y = 0.9; g.add(body);
  const cab = meshShared(sharedBox(1.4, 1.2, 1), basicMat(0x14140e));
  cab.position.set(0, 2.1, -0.3); g.add(cab);
  // forks
  const fork = meshShared(sharedBox(0.1, 0.05, 1.6), basicMat(0x4a4a4a, 0.5, 0.6));
  fork.position.set(-0.4, 0.2, 1.4); g.add(fork);
  const fork2 = fork.clone(); fork2.position.x = 0.4; g.add(fork2);
  const wheelMat = sharedMat('wheel', () => basicMat(0x14140e, 1));
  for (const x of [-0.7, 0.7]) for (const z of [-0.7, 0.7]) {
    const wh = meshShared(sharedCylinder(0.32, 0.32, 0.2, 12), wheelMat);
    wh.rotation.z = Math.PI / 2;
    wh.position.set(x, 0.32, z);
    g.add(wh);
  }
  return g;
}

export function buildRoadSign(): THREE.Group {
  const g = new THREE.Group();
  const post = meshShared(sharedCylinder(0.05, 0.05, 2.4, 8), basicMat(0x6a6a66, 0.5, 0.6));
  post.position.y = 1.2; g.add(post);
  const board = meshShared(sharedBox(1.2, 0.7, 0.04), basicMat(0xe6c84a));
  board.position.y = 2.0;
  g.add(board);
  return g;
}

export function buildRubble(variant: number): THREE.Group {
  const g = new THREE.Group();
  const mat = getPbrMaterial('bricks', 1, { color: 0x8a8a86 });
  const count = 5 + variant * 3;
  for (let i = 0; i < count; i++) {
    const r = new THREE.Mesh(sharedBox(0.4 + Math.random() * 0.6, 0.3 + Math.random() * 0.4, 0.4 + Math.random() * 0.6), mat);
    r.position.set((Math.random() - 0.5) * 2.5, 0.15 + Math.random() * 0.5, (Math.random() - 0.5) * 2.5);
    r.rotation.y = Math.random() * Math.PI;
    r.rotation.z = (Math.random() - 0.5) * 0.5;
    r.castShadow = true; r.receiveShadow = true;
    g.add(r);
  }
  return g;
}

export function buildCrater(): THREE.Group {
  const g = new THREE.Group();
  const mat = sharedMat('crater', () => basicMat(0x14110a, 1));
  const m = meshShared(new THREE.RingGeometry(2, 4, 18), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.01;
  g.add(m);
  // scorch
  const inner = new THREE.Mesh(new THREE.CircleGeometry(2, 18), sharedMat('crater-in', () => basicMat(0x2a1a10, 1)));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.02;
  g.add(inner);
  return g;
}

export function buildTent(): THREE.Group {
  const g = new THREE.Group();
  const mat = basicMat(0x3a4a3a, 1);
  const tent = new THREE.Mesh(sharedCylinder(1, 1, 1.4, 4), mat);
  tent.position.y = 0.7; tent.rotation.y = Math.PI / 4;
  g.add(tent);
  return g;
}

export function buildSmallCampfire(): THREE.Group {
  const g = new THREE.Group();
  const stones = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.12, 6, 14), basicMat(0x4a4a4a, 1));
  stones.rotation.x = Math.PI / 2;
  stones.position.y = 0.12; g.add(stones);
  const fire = new THREE.Mesh(sharedCone(0.18, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
  fire.position.y = 0.45;
  fire.userData.fire = true;
  g.add(fire);
  return g;
}

export function buildWell(): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = getPbrMaterial('bricks', 1, { color: 0x9a9a96 });
  const ring = new THREE.Mesh(sharedCylinder(1, 1, 0.8, 16), stoneMat);
  ring.position.y = 0.4; g.add(ring);
  const woodMat = basicMat(0x4a2a14, 1);
  const post1 = new THREE.Mesh(sharedBox(0.1, 1.6, 0.1), woodMat);
  post1.position.set(-0.8, 1.2, 0); g.add(post1);
  const post2 = post1.clone(); post2.position.x = 0.8; g.add(post2);
  const beam = new THREE.Mesh(sharedBox(2, 0.1, 0.1), woodMat);
  beam.position.set(0, 2.0, 0); g.add(beam);
  const roof = new THREE.Mesh(sharedCone(1.1, 0.6, 4), basicMat(0x6a4a2a, 1));
  roof.position.y = 2.3; roof.rotation.y = Math.PI / 4; g.add(roof);
  return g;
}

export function buildCrops(): THREE.Group {
  const g = new THREE.Group();
  const dirt = new THREE.Mesh(sharedPlane(3, 3), getPbrMaterial('ground', 1));
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.01; g.add(dirt);
  const stalkMat = sharedMat('stalk', () => basicMat(0x9aa84a, 1));
  for (let i = 0; i < 18; i++) {
    const stalk = new THREE.Mesh(sharedBox(0.04, 0.6 + Math.random() * 0.3, 0.04), stalkMat);
    stalk.position.set((Math.random() - 0.5) * 2.7, 0.4, (Math.random() - 0.5) * 2.7);
    g.add(stalk);
  }
  return g;
}

export function buildMailbox(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(sharedBox(0.1, 1.0, 0.1), basicMat(0x4a2a14, 1));
  post.position.y = 0.5; g.add(post);
  const box = new THREE.Mesh(sharedBox(0.3, 0.3, 0.5), basicMat(0x4a4a4a, 0.6, 0.4));
  box.position.y = 1.1; g.add(box);
  return g;
}

export function buildBench(): THREE.Group {
  const g = new THREE.Group();
  const mat = basicMat(0x4a3a2a, 1);
  const seat = new THREE.Mesh(sharedBox(1.6, 0.1, 0.4), mat);
  seat.position.y = 0.5; g.add(seat);
  const back = new THREE.Mesh(sharedBox(1.6, 0.6, 0.06), mat);
  back.position.set(0, 0.85, -0.18); g.add(back);
  for (const x of [-0.7, 0.7]) {
    const leg = new THREE.Mesh(sharedBox(0.06, 0.5, 0.4), mat);
    leg.position.set(x, 0.25, 0); g.add(leg);
  }
  return g;
}

/** Tall city tower — variant = floor count. Uses CC0 brick on med/high. */
export function buildTower(variant: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const w = 8 + (variant % 3) * 2;
  const d = 8 + (variant % 2) * 2;
  const floors = variant > 0 ? variant : 8;
  const h = floors * 1.5;
  const skin = (seed & 1) === 0 ? 'bricks' : 'concrete';
  const wallMat = getPbrMaterial(skin, Math.max(2, w / 3));
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  // ground floor signage panel + awning add visual variety to skyscrapers.
  const signColors = [0xc23a3a, 0x3a8ac0, 0x6aa84a, 0xc8a83a, 0x9a4a8a];
  const signMat = sharedMat(`tower-sign-${seed & 7}`, () =>
    new THREE.MeshStandardMaterial({ color: signColors[seed % signColors.length], roughness: 0.6, emissive: 0x1a0a00, emissiveIntensity: 0.05 })
  );
  const sign = new THREE.Mesh(sharedPlane(w * 0.7, 0.7), signMat);
  sign.position.set(0, 1.7, d / 2 + 0.02); g.add(sign);
  const awning = new THREE.Mesh(sharedBox(w * 0.8, 0.06, 1.0), basicMat(0x2a2a2a, 0.6, 0.5));
  awning.position.set(0, 1.05, d / 2 + 0.5); g.add(awning);
  // rooftop water tank + antenna spire
  const wt = new THREE.Mesh(sharedCylinder(1.0, 1.0, 1.2, 12), basicMat(0x6a6a66, 0.7, 0.4));
  wt.position.set(-w / 4, h + 0.6, 0); g.add(wt);
  const ant = new THREE.Mesh(sharedCylinder(0.04, 0.06, 3.0, 6), basicMat(0x2a2a2a, 0.5, 0.5));
  ant.position.set(w / 4, h + 1.5, d / 4); g.add(ant);
  // window strip — single emissive plane per floor (cheap)
  const winMat = sharedMat('tower-window', () => new THREE.MeshStandardMaterial({
    color: 0x14181c, roughness: 0.2, metalness: 0.5,
    emissive: 0xffae5a, emissiveIntensity: 0,
  }));
  for (let f = 1; f < floors; f++) {
    const y = f * 1.5 - 0.4;
    const lit = ((seed * 7919 + f * 31) & 7) === 0;
    for (const side of ['front', 'back', 'left', 'right'] as const) {
      const span = side === 'front' || side === 'back' ? w : d;
      const strip = new THREE.Mesh(sharedPlane(span - 1, 0.7), winMat);
      if (lit) strip.userData.lit = true;
      if (side === 'front') strip.position.set(0, y, d / 2 + 0.01);
      else if (side === 'back') { strip.position.set(0, y, -d / 2 - 0.01); strip.rotation.y = Math.PI; }
      else if (side === 'left') { strip.position.set(-w / 2 - 0.01, y, 0); strip.rotation.y = -Math.PI / 2; }
      else { strip.position.set(w / 2 + 0.01, y, 0); strip.rotation.y = Math.PI / 2; }
      g.add(strip);
    }
  }
  return g;
}

/** Mid-rise apartment / office — variant: floor count, -1 = ruined. */
export function buildMidrise(variant: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const ruined = variant < 0;
  const w = 6, d = 6, floors = ruined ? 2 : Math.max(2, variant);
  const h = floors * 1.3;
  const wallMat = getPbrMaterial(((seed >> 2) & 1) === 0 ? 'bricks' : 'concrete', Math.max(1, w / 3));
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  if (ruined) {
    body.rotation.z = (Math.random() - 0.5) * 0.2;
    body.position.y = h / 2 - 0.4;
  }
  g.add(body);
  if (ruined) {
    // tear off the top with a darker gap
    const gap = new THREE.Mesh(sharedBox(w + 0.4, 0.6, d + 0.4), basicMat(0x14110a, 1));
    gap.position.y = h - 0.3;
    g.add(gap);
  } else {
    // balconies on alternating sides + rooftop AC unit
    const balMat = basicMat(0x4a4a4a, 0.7, 0.4);
    for (let f = 1; f < floors; f++) {
      if ((f & 1) === 0) continue;
      const bal = new THREE.Mesh(sharedBox(w * 0.6, 0.08, 0.6), balMat);
      bal.position.set(0, f * 1.3, d / 2 + 0.3); g.add(bal);
      const railing = new THREE.Mesh(sharedBox(w * 0.6, 0.5, 0.04), basicMat(0x2a2a2a, 0.5, 0.5));
      railing.position.set(0, f * 1.3 + 0.25, d / 2 + 0.6); g.add(railing);
    }
    const ac = new THREE.Mesh(sharedBox(1.2, 0.6, 0.8), basicMat(0x9a9a96, 0.6, 0.4));
    ac.position.set(w / 4, h + 0.3, -d / 4); g.add(ac);
  }
  return g;
}
