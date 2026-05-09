// Procedural 3D models. All built from primitives + canvas textures.
import * as THREE from 'three';
import type { ZombieDef } from './zombies';
import type { BuildingDef } from './buildings';
import { getTexture } from './textures';

function pbrMat(color: number, roughness = 0.85, metalness = 0.0, map?: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, map });
}

function box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[]): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Survivor — generic player model. Brown jacket, blue jeans, hood. */
export function buildSurvivor(): THREE.Group {
  const g = new THREE.Group();
  const skin = pbrMat(0xd4a07a, 0.9);
  const jacket = pbrMat(0x4a3a2a, 0.95);
  const pants = pbrMat(0x2a3450, 0.9);
  const boots = pbrMat(0x18120c, 0.7);
  // Legs
  const legL = box(0.22, 0.7, 0.22, pants);
  const legR = legL.clone(); legR.material = pants;
  legL.position.set(-0.13, 0.35, 0); legR.position.set(0.13, 0.35, 0); g.add(legL, legR);
  const bL = box(0.24, 0.12, 0.28, boots); const bR = bL.clone();
  bL.position.set(-0.13, 0.06, 0.04); bR.position.set(0.13, 0.06, 0.04); g.add(bL, bR);
  // Torso
  const torso = box(0.55, 0.65, 0.32, jacket); torso.position.y = 1.05; g.add(torso);
  // Hood
  const hood = box(0.6, 0.18, 0.34, jacket); hood.position.y = 1.45; g.add(hood);
  // Arms
  const armL = box(0.16, 0.6, 0.16, jacket); const armR = armL.clone();
  armL.position.set(-0.38, 1.05, 0); armR.position.set(0.38, 1.05, 0); g.add(armL, armR);
  // Hands
  const hL = box(0.14, 0.14, 0.14, skin); const hR = hL.clone();
  hL.position.set(-0.38, 0.72, 0); hR.position.set(0.38, 0.72, 0); g.add(hL, hR);
  // Head
  const head = box(0.28, 0.32, 0.28, skin); head.position.y = 1.6; g.add(head);
  // Eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
  const eL = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), eyeMat);
  const eR = eL.clone();
  eL.position.set(-0.07, 1.62, 0.141); eR.position.set(0.07, 1.62, 0.141);
  g.add(eL, eR);
  // Backpack
  const pack = box(0.4, 0.46, 0.18, pbrMat(0x222018, 0.9));
  pack.position.set(0, 1.05, -0.26);
  g.add(pack);
  return g;
}

/** Zombie. Hunched shoulders, dragged arm. */
export function buildZombie(def: ZombieDef): THREE.Group {
  const g = new THREE.Group();
  const skin = pbrMat(def.skin, 0.95);
  const shirt = pbrMat(def.shirt, 1);
  const pants = pbrMat(def.pants, 1);
  const sc = def.scale;
  const legL = box(0.22 * sc, 0.66 * sc, 0.22 * sc, pants);
  const legR = legL.clone();
  legL.position.set(-0.13 * sc, 0.33 * sc, 0); legR.position.set(0.13 * sc, 0.33 * sc, 0); g.add(legL, legR);
  const torso = box(0.55 * sc, 0.62 * sc, 0.32 * sc, shirt);
  torso.position.y = 0.66 * sc + 0.31 * sc; torso.rotation.x = 0.18; g.add(torso);
  const armL = box(0.16 * sc, 0.62 * sc, 0.16 * sc, skin); const armR = armL.clone();
  armL.position.set(-0.38 * sc, 1.0 * sc, 0.05); armL.rotation.x = -0.4;
  armR.position.set(0.38 * sc, 1.0 * sc, 0.05); armR.rotation.x = -0.6;
  g.add(armL, armR);
  const head = box(0.28 * sc, 0.32 * sc, 0.28 * sc, skin); head.position.y = 1.55 * sc; head.rotation.x = 0.15;
  g.add(head);
  // glowing eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a3a });
  const eL = new THREE.Mesh(new THREE.PlaneGeometry(0.06 * sc, 0.04 * sc), eyeMat);
  const eR = eL.clone();
  eL.position.set(-0.08 * sc, 1.58 * sc, 0.141 * sc);
  eR.position.set(0.08 * sc, 1.58 * sc, 0.141 * sc);
  g.add(eL, eR);
  // blood on chest
  const blood = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5 * sc, 0.5 * sc),
    new THREE.MeshBasicMaterial({ map: getTexture('blood'), transparent: true, depthWrite: false }),
  );
  blood.position.set(0, 1.0 * sc, 0.165 * sc);
  g.add(blood);
  return g;
}

/** Building model for the city — abandoned 3-4 story mid-rise. */
export function buildCityBuilding(width: number, depth: number, height: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const wallTex = getTexture('brick').clone();
  wallTex.repeat.set(Math.max(1, width / 3), Math.max(1, height / 3));
  wallTex.needsUpdate = true;
  const wallMat = pbrMat(0xffffff, 0.95, 0.05, wallTex);
  const roofTex = getTexture('roof').clone();
  roofTex.repeat.set(width / 3, depth / 3);
  roofTex.needsUpdate = true;
  const roofMat = pbrMat(0xffffff, 0.95, 0, roofTex);

  const core = box(width, height, depth, wallMat);
  core.position.y = height / 2;
  g.add(core);

  // Roof slab
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.3, depth + 0.2), roofMat);
  roof.position.y = height + 0.15;
  roof.castShadow = true; roof.receiveShadow = true;
  g.add(roof);

  // Windows (emissive when night)
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x111418, roughness: 0.2, metalness: 0,
    emissive: 0xffae5a, emissiveIntensity: 0.0,
  });
  const winW = 0.5, winH = 0.7;
  const rng = (function () {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  })();
  for (let floor = 1; floor < height - 0.5; floor += 1.4) {
    for (const side of ['front', 'back', 'left', 'right'] as const) {
      const span = side === 'front' || side === 'back' ? width : depth;
      for (let x = -span / 2 + 0.8; x < span / 2 - 0.4; x += 1.0) {
        if (rng() < 0.25) continue; // boarded up
        const lit = rng() < 0.05;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), winMat.clone());
        if (lit) {
          (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
          (m.material as THREE.MeshStandardMaterial).color = new THREE.Color(0x1a1a14);
        }
        const yPos = floor;
        if (side === 'front') m.position.set(x, yPos, depth / 2 + 0.01);
        if (side === 'back') { m.position.set(x, yPos, -depth / 2 - 0.01); m.rotation.y = Math.PI; }
        if (side === 'left') { m.position.set(-width / 2 - 0.01, yPos, x); m.rotation.y = -Math.PI / 2; }
        if (side === 'right') { m.position.set(width / 2 + 0.01, yPos, x); m.rotation.y = Math.PI / 2; }
        m.userData.lit = lit;
        g.add(m);
      }
    }
  }

  // Door
  const door = box(0.7, 1.6, 0.08, pbrMat(0x2a1a14, 0.95));
  door.position.set(0, 0.8, depth / 2 + 0.04);
  g.add(door);

  // AC unit / antenna on roof
  if (rng() < 0.7) {
    const ac = box(0.6, 0.4, 0.6, pbrMat(0x444444, 0.7, 0.3));
    ac.position.set((rng() - 0.5) * (width - 1), height + 0.5, (rng() - 0.5) * (depth - 1));
    g.add(ac);
  }
  return g;
}

/** Abandoned car. */
export function buildCar(seed: number): THREE.Group {
  const g = new THREE.Group();
  const colors = [0x5a2a2a, 0x2a3a5a, 0x4a4a4a, 0x2a4a2a, 0x6a5a2a, 0x1a1a1a];
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const carColor = colors[Math.floor(r() * colors.length)];
  const bodyMat = pbrMat(carColor, 0.55, 0.5);
  // body
  const lower = box(2.0, 0.6, 1.0, bodyMat);
  lower.position.y = 0.4;
  g.add(lower);
  // upper cabin
  const cabin = box(1.2, 0.5, 0.95, bodyMat);
  cabin.position.set(-0.1, 0.95, 0);
  g.add(cabin);
  // windows
  const winMat = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.05, metalness: 0.4 });
  const wF = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), winMat);
  wF.position.set(0.51, 0.95, 0); wF.rotation.y = -Math.PI / 2; g.add(wF);
  const wB = wF.clone(); wB.position.x = -0.71; wB.rotation.y = Math.PI / 2; g.add(wB);
  // wheels
  const wheelMat = pbrMat(0x14140e, 1);
  for (const x of [-0.7, 0.7]) for (const z of [-0.45, 0.45]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 16), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.22, z);
    w.castShadow = true;
    g.add(w);
  }
  // shattered glass / damage
  if (r() < 0.5) {
    const dmg = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: getTexture('blood'), transparent: true, depthWrite: false }));
    dmg.rotation.x = -Math.PI / 2;
    dmg.position.set(r() - 0.5, 1.21, r() - 0.5);
    g.add(dmg);
  }
  g.rotation.y = r() * Math.PI * 2;
  return g;
}

/** Lamppost. Returns the group + the point light so the scene can flicker it. */
export function buildLamppost(): { group: THREE.Group; light: THREE.PointLight } {
  const g = new THREE.Group();
  const metal = pbrMat(0x14140e, 0.4, 0.7);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4, 8), metal);
  post.position.y = 2;
  post.castShadow = true;
  g.add(post);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.3), metal);
  head.position.set(0, 4, 0);
  g.add(head);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffd47a, emissive: 0xffd47a, emissiveIntensity: 1.2 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), lampMat);
  lamp.position.set(0, 3.85, 0);
  g.add(lamp);
  const light = new THREE.PointLight(0xffd47a, 6, 12, 1.6);
  light.position.set(0, 3.85, 0);
  g.add(light);
  return { group: g, light };
}

/** Loot container — corpse, dumpster, locker. */
export function buildLootContainer(kind: 'corpse' | 'dumpster' | 'crate' | 'locker'): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'dumpster') {
    const body = box(1.6, 0.9, 1.0, pbrMat(0x2a4a3a, 0.7, 0.4, getTexture('rust')));
    body.position.y = 0.45; g.add(body);
    const lid = box(1.6, 0.1, 1.0, pbrMat(0x1a3a2a, 0.7, 0.5));
    lid.position.set(0, 0.95, 0); g.add(lid);
  } else if (kind === 'crate') {
    const body = box(0.9, 0.9, 0.9, pbrMat(0xffffff, 0.95, 0, getTexture('wood')));
    body.position.y = 0.45; g.add(body);
  } else if (kind === 'locker') {
    const body = box(0.7, 1.6, 0.5, pbrMat(0xffffff, 0.6, 0.4, getTexture('rust')));
    body.position.y = 0.8; g.add(body);
  } else {
    // corpse
    const torso = box(0.6, 0.2, 1.4, pbrMat(0x4a3a2a, 1));
    torso.position.y = 0.1; g.add(torso);
    const head = box(0.28, 0.28, 0.28, pbrMat(0xc89a7a, 1));
    head.position.set(0, 0.14, 0.85); g.add(head);
    const blood = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: getTexture('blood'), transparent: true, depthWrite: false }));
    blood.rotation.x = -Math.PI / 2;
    blood.position.y = 0.01;
    g.add(blood);
  }
  // hover-glow ring
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.85, 24),
    new THREE.MeshBasicMaterial({ color: 0xffce6a, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.userData.ring = true;
  g.add(ring);
  return g;
}

/** Bastion building model — keeps it simple and texture-driven. */
export function buildBastionBuilding(def: BuildingDef): THREE.Group {
  const g = new THREE.Group();
  const woodMat = pbrMat(0xffffff, 0.95, 0, getTexture('wood'));
  const metalMat = pbrMat(0xffffff, 0.7, 0.5, getTexture('rust'));
  const size = def.size;
  if (def.id === 'wall') {
    const w = box(size, 1.8, 0.18, woodMat); w.position.set(size / 2, 0.9, size / 2 - 0.1);
    g.add(w);
  } else if (def.id === 'gate') {
    const w = box(size, 1.8, 0.18, woodMat); w.position.set(size / 2, 0.9, size / 2 - 0.1);
    g.add(w);
    const reinf = box(size * 0.8, 0.2, 0.22, metalMat);
    reinf.position.set(size / 2, 1.3, size / 2 - 0.1); g.add(reinf);
    const reinf2 = reinf.clone(); reinf2.position.y = 0.6; g.add(reinf2);
  } else if (def.id === 'spike') {
    const baseM = box(size, 0.1, size, woodMat);
    baseM.position.set(size / 2, 0.05, size / 2); g.add(baseM);
    for (let i = 0; i < 9; i++) {
      const sx = (i % 3) / 3;
      const sz = Math.floor(i / 3) / 3;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), pbrMat(0xc1c1c1, 0.4, 0.7));
      sp.position.set(size * (sx + 0.16), 0.3, size * (sz + 0.16));
      sp.castShadow = true; g.add(sp);
    }
  } else if (def.id === 'turret') {
    const baseM = box(size * 0.8, 0.2, size * 0.8, metalMat);
    baseM.position.set(size / 2, 0.1, size / 2); g.add(baseM);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.6, 12), metalMat);
    stand.position.set(size / 2, 0.5, size / 2); g.add(stand);
    const head = box(0.5, 0.32, 0.5, metalMat);
    head.position.set(size / 2, 0.9, size / 2); head.userData.turretHead = true; g.add(head);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), pbrMat(0x14140e, 0.5, 0.6));
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(size / 2 + 0.4, 0.95, size / 2);
    head.add(barrel);
    // light
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3a3a }));
    dot.position.set(0.3, 0.05, 0); head.add(dot);
  } else if (def.id === 'workbench') {
    const top = box(size * 0.95, 0.12, size * 0.6, woodMat);
    top.position.set(size / 2, 0.85, size / 2); g.add(top);
    for (const [dx, dz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]] as [number, number][]) {
      const leg = box(0.08, 0.85, 0.08, woodMat);
      leg.position.set(size / 2 + dx, 0.42, size / 2 + dz); g.add(leg);
    }
    // tools
    const ham = box(0.12, 0.08, 0.32, pbrMat(0x4a3a2a));
    ham.position.set(size / 2, 0.95, size / 2); g.add(ham);
  } else if (def.id === 'bed') {
    const frame = box(size, 0.18, size * 0.5, woodMat);
    frame.position.set(size / 2, 0.18, size / 2); g.add(frame);
    const mattress = box(size * 0.96, 0.18, size * 0.46, pbrMat(0xc88a5a, 0.95));
    mattress.position.set(size / 2, 0.36, size / 2); g.add(mattress);
    const pillow = box(size * 0.3, 0.1, size * 0.36, pbrMat(0xeae0c8, 0.95));
    pillow.position.set(size * 0.18, 0.5, size / 2); g.add(pillow);
  } else if (def.id === 'campfire') {
    const stones = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.12, 6, 14), pbrMat(0x4a4a4a, 1));
    stones.rotation.x = Math.PI / 2;
    stones.position.set(size / 2, 0.12, size / 2); g.add(stones);
    for (let i = 0; i < 5; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), pbrMat(0x2a1a14, 1));
      log.position.set(size / 2, 0.18 + i * 0.05, size / 2);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 5) * Math.PI;
      g.add(log);
    }
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0xff7a2a }));
    fire.position.set(size / 2, 0.45, size / 2);
    fire.userData.fire = true;
    g.add(fire);
    const light = new THREE.PointLight(0xff7a2a, 4, 8, 1.6);
    light.position.set(size / 2, 0.6, size / 2);
    g.add(light);
  } else if (def.id === 'storage') {
    const body = box(size * 0.9, 0.7, size * 0.9, woodMat);
    body.position.set(size / 2, 0.35, size / 2); g.add(body);
    const lid = box(size * 0.92, 0.08, size * 0.92, woodMat);
    lid.position.set(size / 2, 0.74, size / 2); g.add(lid);
  } else if (def.id === 'water_collector') {
    const base = box(size * 0.9, 0.18, size * 0.9, metalMat);
    base.position.set(size / 2, 0.09, size / 2); g.add(base);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 16), pbrMat(0x9bc4ff, 0.2, 0.1));
    tank.position.set(size / 2, 0.6, size / 2); g.add(tank);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), metalMat);
    pipe.position.set(size / 2 + 0.34, 0.7, size / 2);
    pipe.rotation.z = Math.PI / 2;
    g.add(pipe);
  }
  return g;
}
