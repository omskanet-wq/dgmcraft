// Procedural low-poly 3D models built from primitives. All original.
import * as THREE from 'three';
import type { RaceDef } from './races';
import type { BuildingDef } from './buildings';
import type { MobDef } from './mobs';

function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r: number, color: number, segs = 12): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, segs, segs),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  );
  m.castShadow = true;
  return m;
}

/** Build a humanoid model from a race definition. Differentiated by scale, palette, accessories. */
export function buildHumanoid(race: RaceDef): THREE.Group {
  const g = new THREE.Group();
  // Body proportions per race archetype.
  const tall = race.id === 'krohgar' ? 1.25 : race.id === 'stoneborn' ? 0.78 : 1.0;
  const wide = race.id === 'stoneborn' ? 1.25 : race.id === 'krohgar' ? 1.2 : 1.0;

  // Legs
  const legL = box(0.22 * wide, 0.7 * tall, 0.22 * wide, race.trim);
  const legR = legL.clone();
  legL.position.set(-0.15 * wide, 0.35 * tall, 0);
  legR.position.set(0.15 * wide, 0.35 * tall, 0);
  g.add(legL, legR);

  // Torso
  const torso = box(0.6 * wide, 0.65 * tall, 0.32 * wide, race.trim);
  torso.position.y = 0.7 * tall + 0.32 * tall;
  g.add(torso);

  // Arms
  const armL = box(0.18 * wide, 0.6 * tall, 0.18 * wide, race.skin);
  const armR = armL.clone();
  armL.position.set(-0.42 * wide, 0.7 * tall + 0.32 * tall, 0);
  armR.position.set(0.42 * wide, 0.7 * tall + 0.32 * tall, 0);
  g.add(armL, armR);

  // Head
  const head = sphere(0.22 * tall, race.skin);
  head.position.y = 0.7 * tall + 0.65 * tall + 0.25;
  g.add(head);

  // Hair / hood
  const hair = sphere(0.24 * tall, race.hair);
  hair.scale.set(1, 0.55, 1);
  hair.position.y = head.position.y + 0.12;
  g.add(hair);

  // Race accessories
  if (race.id === 'krohgar') {
    // Tusks
    const tuskGeo = new THREE.ConeGeometry(0.04, 0.18, 8);
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xfff2c2 });
    const tL = new THREE.Mesh(tuskGeo, tuskMat);
    const tR = tL.clone();
    tL.position.set(-0.07, head.position.y - 0.08, 0.18);
    tR.position.set(0.07, head.position.y - 0.08, 0.18);
    tL.rotation.x = Math.PI;
    tR.rotation.x = Math.PI;
    g.add(tL, tR);
  }
  if (race.id === 'lumireth' || race.id === 'nyxari') {
    // Pointed ears: cones on the sides of the head
    const earGeo = new THREE.ConeGeometry(0.05, 0.18, 8);
    const earMat = new THREE.MeshStandardMaterial({ color: race.skin });
    const eL = new THREE.Mesh(earGeo, earMat);
    const eR = eL.clone();
    eL.position.set(-0.22, head.position.y + 0.05, 0);
    eR.position.set(0.22, head.position.y + 0.05, 0);
    eL.rotation.z = Math.PI / 2;
    eR.rotation.z = -Math.PI / 2;
    g.add(eL, eR);
  }
  if (race.id === 'stoneborn') {
    // Beard
    const beard = box(0.32, 0.22, 0.1, race.hair);
    beard.position.set(0, head.position.y - 0.18, 0.18);
    g.add(beard);
  }
  if (race.id === 'aerian') {
    // Crown circlet
    const crownGeo = new THREE.TorusGeometry(0.22, 0.025, 8, 24);
    const crownMat = new THREE.MeshStandardMaterial({ color: race.trim, metalness: 0.8, roughness: 0.3 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = head.position.y + 0.2;
    g.add(crown);
  }

  // Shoulder pauldrons (trim)
  const pL = sphere(0.13 * wide, race.trim, 8);
  const pR = pL.clone();
  pL.position.set(-0.42 * wide, 0.7 * tall + 0.62 * tall, 0);
  pR.position.set(0.42 * wide, 0.7 * tall + 0.62 * tall, 0);
  g.add(pL, pR);

  // Cape (just a flat plane)
  const cape = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6 * wide, 0.9 * tall),
    new THREE.MeshStandardMaterial({ color: race.trim, side: THREE.DoubleSide })
  );
  cape.position.set(0, 0.95 * tall, -0.18);
  g.add(cape);

  g.userData.race = race.id;
  // Rotate so the model faces +Z by default.
  return g;
}

/** A basic mob model — small humanoid blob with race-like silhouette. */
export function buildMob(def: MobDef): THREE.Group {
  const g = new THREE.Group();
  const body = sphere(0.35 * def.scale, def.color);
  body.position.y = 0.35 * def.scale;
  body.scale.set(1, 1.2, 1);
  g.add(body);
  const head = sphere(0.22 * def.scale, def.color);
  head.position.y = 0.85 * def.scale;
  g.add(head);
  // Eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffe44a, emissive: 0xffe44a, emissiveIntensity: 1.4 });
  const eL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
  const eR = eL.clone();
  eL.position.set(-0.07 * def.scale, 0.88 * def.scale, 0.18 * def.scale);
  eR.position.set(0.07 * def.scale, 0.88 * def.scale, 0.18 * def.scale);
  g.add(eL, eR);
  // Spikes for higher-tier mobs
  if (def.scale > 1.2) {
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.25, 6),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
      );
      const angle = (i / 6) * Math.PI * 2;
      s.position.set(Math.cos(angle) * 0.32 * def.scale, 0.55 * def.scale, Math.sin(angle) * 0.32 * def.scale);
      s.lookAt(s.position.clone().multiplyScalar(2));
      g.add(s);
    }
  }
  return g;
}

/** Stronghold building model — sized to the building footprint. */
export function buildBuilding(def: BuildingDef): THREE.Group {
  const g = new THREE.Group();
  const tile = 1; // 1 world unit per tile
  const w = def.size * tile * 0.9;
  const h = def.size === 1 ? 0.8 : def.size === 2 ? 1.6 : 2.6;
  const baseColor = def.color;
  const trim = def.trim;
  // Base
  const base = box(w, h, w, baseColor);
  base.position.y = h / 2;
  g.add(base);
  // Roof: pyramid
  if (def.id !== 'wall') {
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(w * 0.78, h * 0.5, 4),
      new THREE.MeshStandardMaterial({ color: trim, roughness: 0.8 })
    );
    roof.position.y = h + h * 0.25;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
  }
  // Door
  const door = box(w * 0.18, h * 0.4, 0.05, 0x2a1a0a);
  door.position.set(0, h * 0.2, w / 2 + 0.03);
  g.add(door);
  // Towers / accents per building
  if (def.id === 'keep') {
    for (const corner of [
      [-1, -1], [1, -1], [-1, 1], [1, 1],
    ] as [number, number][]) {
      const t = box(0.5, h * 1.2, 0.5, baseColor);
      t.position.set(corner[0] * (w / 2 - 0.25), h * 0.6, corner[1] * (w / 2 - 0.25));
      g.add(t);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.6, 8),
        new THREE.MeshStandardMaterial({ color: trim })
      );
      cone.position.set(corner[0] * (w / 2 - 0.25), h * 1.2 + 0.3, corner[1] * (w / 2 - 0.25));
      g.add(cone);
    }
  }
  if (def.id === 'mage_tower') {
    const orb = sphere(0.3, 0x9b6cff);
    (orb.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x9b6cff);
    (orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5;
    orb.position.y = h + 0.7;
    g.add(orb);
  }
  if (def.id === 'forge') {
    const chimney = box(0.25, 0.6, 0.25, 0x3a3a3a);
    chimney.position.set(w * 0.3, h + 0.3, w * 0.3);
    g.add(chimney);
    const fire = sphere(0.12, 0xff6a2a);
    (fire.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0xff6a2a);
    (fire.material as THREE.MeshStandardMaterial).emissiveIntensity = 2;
    fire.position.set(w * 0.3, h + 0.65, w * 0.3);
    g.add(fire);
  }
  return g;
}

/** Loot pickup orb model. */
export function buildLootOrb(rarityColor: number): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.18, 0),
    new THREE.MeshStandardMaterial({
      color: rarityColor,
      emissive: rarityColor,
      emissiveIntensity: 1.2,
      roughness: 0.3,
    })
  );
  m.castShadow = true;
  return m;
}
