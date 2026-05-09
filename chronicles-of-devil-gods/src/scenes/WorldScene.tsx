import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getRace } from '../game/races';
import { buildHumanoid, buildMob, buildLootOrb } from '../game/models';
import { MOBS, MOB_BY_ID, type MobDef } from '../game/mobs';
import { useGameStore } from '../state/useGameStore';
import { ITEMS, RARITY_COLOR } from '../game/items';
import { HUD } from '../ui/HUD';
import { spawnDamageNumber, spawnLootText } from '../utils/hud';

interface MobInstance {
  group: THREE.Group;
  def: MobDef;
  hp: number;
  hpMax: number;
  attackCd: number;
  hpBar: THREE.Sprite;
  alive: boolean;
}
interface LootInstance {
  mesh: THREE.Mesh;
  itemId: string;
  qty: number;
  spawnAt: number;
}

export function WorldScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const raceId = useGameStore((s) => s.raceId);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !raceId) return;
    const c: HTMLDivElement = container;
    const race = getRace(raceId);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    c.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0814);
    scene.fog = new THREE.Fog(0x0a0814, 18, 45);

    // Isometric ortho camera
    const aspect = c.clientWidth / c.clientHeight;
    const viewSize = 14;
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect, viewSize * aspect,
      viewSize, -viewSize, 0.1, 200,
    );
    camera.position.set(20, 24, 20);
    camera.lookAt(0, 0, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0x4a3aaa, 0.5));
    const sun = new THREE.DirectionalLight(0xffd9a0, 1.2);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    // Ground
    const groundSize = 80;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(groundSize, groundSize, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a1f3a, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Glowing rune circles scattered around
    for (let i = 0; i < 8; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.4, 32),
        new THREE.MeshBasicMaterial({ color: 0x9b6cff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set((Math.random() - 0.5) * 60, 0.02, (Math.random() - 0.5) * 60);
      scene.add(ring);
    }
    // Decorative rocks/trees
    for (let i = 0; i < 30; i++) {
      const isRock = Math.random() < 0.5;
      const m = isRock
        ? new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.4),
            new THREE.MeshStandardMaterial({ color: 0x4a4458, roughness: 0.9 }),
          )
        : new THREE.Mesh(
            new THREE.ConeGeometry(0.6, 2, 8),
            new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.9 }),
          );
      m.position.set((Math.random() - 0.5) * 70, isRock ? 0.4 : 1, (Math.random() - 0.5) * 70);
      m.castShadow = true;
      scene.add(m);
    }

    // Player
    const player = buildHumanoid(race);
    player.position.set(0, 0, 0);
    scene.add(player);

    // Player health bar sprite
    const playerHpBar = makeHpBar();
    playerHpBar.position.set(0, 2.4, 0);
    player.add(playerHpBar);

    // Mobs
    const mobs: MobInstance[] = [];
    function spawnMob(def: MobDef, x: number, z: number) {
      const g = buildMob(def);
      g.position.set(x, 0, z);
      scene.add(g);
      const hpBar = makeHpBar();
      hpBar.position.set(0, 1.6 * def.scale, 0);
      g.add(hpBar);
      mobs.push({ group: g, def, hp: def.hp, hpMax: def.hp, attackCd: 0, hpBar, alive: true });
    }
    function populate() {
      // Initial wave
      for (let i = 0; i < 14; i++) {
        const def = MOBS[Math.floor(Math.random() * Math.min(3, MOBS.length))];
        const angle = Math.random() * Math.PI * 2;
        const r = 6 + Math.random() * 22;
        spawnMob(def, Math.cos(angle) * r, Math.sin(angle) * r);
      }
      // One boss far away
      spawnMob(MOB_BY_ID.devil_herald, 18, 18);
    }
    populate();

    // Loot
    const loots: LootInstance[] = [];
    function dropLoot(x: number, z: number, itemId: string, qty: number) {
      const def = ITEMS[itemId];
      const color = parseInt(RARITY_COLOR[def.rarity].slice(1), 16);
      const orb = buildLootOrb(color);
      orb.position.set(x + (Math.random() - 0.5) * 0.6, 0.4, z + (Math.random() - 0.5) * 0.6);
      scene.add(orb);
      loots.push({ mesh: orb, itemId, qty, spawnAt: performance.now() });
    }

    // Click-to-move + click-to-attack
    const targetPos = new THREE.Vector3();
    let target: MobInstance | null = null;
    let attackTimer = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function pointerToWorld(e: PointerEvent | { clientX: number; clientY: number }): { ground: THREE.Vector3 | null; mob: MobInstance | null } {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      // mob hit
      let mobHit: MobInstance | null = null;
      for (const m of mobs) {
        if (!m.alive) continue;
        const hits = raycaster.intersectObject(m.group, true);
        if (hits.length > 0) {
          mobHit = m;
          break;
        }
      }
      const groundHits = raycaster.intersectObject(ground);
      const groundPt = groundHits[0]?.point ?? null;
      return { ground: groundPt, mob: mobHit };
    }

    function onPointerDown(e: PointerEvent) {
      // Ignore if clicking HUD overlay
      const tgt = e.target as HTMLElement;
      if (tgt.closest('.hud-root') && !tgt.classList.contains('touch-stick')) return;
      const { ground: gpt, mob } = pointerToWorld(e);
      if (mob) {
        target = mob;
      } else if (gpt) {
        target = null;
        targetPos.copy(gpt);
      }
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Keyboard controls
    const keys = new Set<string>();
    function onKey(e: KeyboardEvent, down: boolean) {
      if (down) keys.add(e.key.toLowerCase());
      else keys.delete(e.key.toLowerCase());
    }
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // Resize
    function resize() {
      const w = c.clientWidth;
      const h = c.clientHeight;
      renderer.setSize(w, h, false);
      const a = w / h;
      camera.left = -viewSize * a;
      camera.right = viewSize * a;
      camera.top = viewSize;
      camera.bottom = -viewSize;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    // Touch joystick
    let stickActive = false;
    const stickDir = new THREE.Vector2();
    const stickEl = document.querySelector('.touch-stick') as HTMLElement | null;
    const stickNub = stickEl?.querySelector('.nub') as HTMLElement | null;
    function stickStart(e: PointerEvent) { stickActive = true; stickMove(e); }
    function stickMove(e: PointerEvent) {
      if (!stickActive || !stickEl || !stickNub) return;
      const r = stickEl.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      const max = r.width / 2 - 18;
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      stickNub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      stickDir.set(dx / max, dy / max);
    }
    function stickEnd() {
      stickActive = false;
      stickDir.set(0, 0);
      if (stickNub) stickNub.style.transform = 'translate(-50%, -50%)';
    }
    stickEl?.addEventListener('pointerdown', stickStart);
    window.addEventListener('pointermove', stickMove);
    window.addEventListener('pointerup', stickEnd);

    // Game loop
    let raf = 0;
    let prev = performance.now();
    targetPos.copy(player.position);

    function loop(t: number) {
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;

      // Keyboard movement
      const kdir = new THREE.Vector3();
      if (keys.has('w') || keys.has('arrowup')) kdir.z -= 1;
      if (keys.has('s') || keys.has('arrowdown')) kdir.z += 1;
      if (keys.has('a') || keys.has('arrowleft')) kdir.x -= 1;
      if (keys.has('d') || keys.has('arrowright')) kdir.x += 1;
      // Stick adds to keyboard direction. Stick is screen-axis but world is rotated 45° because cam is iso.
      if (stickDir.lengthSq() > 0.01) {
        // Map screen-space stick (x right, y down) to world axes using camera.
        const camForward = new THREE.Vector3();
        camera.getWorldDirection(camForward);
        camForward.y = 0; camForward.normalize();
        const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();
        kdir.add(camRight.multiplyScalar(stickDir.x));
        kdir.add(camForward.multiplyScalar(-stickDir.y));
      }
      const speed = 5;
      if (kdir.lengthSq() > 0.01) {
        kdir.normalize();
        player.position.x += kdir.x * speed * dt;
        player.position.z += kdir.z * speed * dt;
        player.rotation.y = Math.atan2(kdir.x, kdir.z);
        // moving with keys cancels click-target
        target = null;
        targetPos.copy(player.position);
      } else if (target && target.alive) {
        // Move toward target until in attack range
        const dx = target.group.position.x - player.position.x;
        const dz = target.group.position.z - player.position.z;
        const dist = Math.hypot(dx, dz);
        const range = 1.4;
        if (dist > range) {
          const nx = dx / dist;
          const nz = dz / dist;
          player.position.x += nx * speed * dt;
          player.position.z += nz * speed * dt;
          player.rotation.y = Math.atan2(nx, nz);
        } else {
          attackTimer -= dt;
          if (attackTimer <= 0) {
            attackTimer = 0.6;
            const equipped = useGameStore.getState().player.equipped.weapon;
            const baseAtk = equipped ? (ITEMS[equipped].stats?.atk ?? 8) : 8;
            const lvl = useGameStore.getState().player.level;
            const dmg = Math.floor(baseAtk * (1 + lvl * 0.1) * (0.85 + Math.random() * 0.3));
            target.hp -= dmg;
            updateHpBar(target.hpBar, target.hp / target.hpMax);
            const screenPos = worldToScreen(target.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)), camera, c);
            spawnDamageNumber(screenPos.x, screenPos.y, dmg, '#ffce6a');
            if (target.hp <= 0) killMob(target);
          }
        }
      } else {
        // Move toward targetPos (click move)
        const dx = targetPos.x - player.position.x;
        const dz = targetPos.z - player.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.05) {
          const step = Math.min(dist, speed * dt);
          const nx = dx / dist;
          const nz = dz / dist;
          player.position.x += nx * step;
          player.position.z += nz * step;
          player.rotation.y = Math.atan2(nx, nz);
        }
      }
      // Clamp inside ground
      const g = groundSize / 2 - 1;
      player.position.x = Math.max(-g, Math.min(g, player.position.x));
      player.position.z = Math.max(-g, Math.min(g, player.position.z));

      // Camera follows
      camera.position.set(player.position.x + 20, 24, player.position.z + 20);
      camera.lookAt(player.position);

      // Update player HP bar
      const ps = useGameStore.getState().player;
      updateHpBar(playerHpBar, ps.hp / ps.hpMax);

      // Mob AI
      for (const m of mobs) {
        if (!m.alive) continue;
        m.attackCd -= dt;
        const dx = player.position.x - m.group.position.x;
        const dz = player.position.z - m.group.position.z;
        const dist = Math.hypot(dx, dz);
        const aggro = 8;
        if (dist < aggro) {
          if (dist > 1.0) {
            const nx = dx / dist;
            const nz = dz / dist;
            m.group.position.x += nx * m.def.speed * dt;
            m.group.position.z += nz * m.def.speed * dt;
            m.group.rotation.y = Math.atan2(nx, nz);
          } else if (m.attackCd <= 0) {
            m.attackCd = 1.2;
            const equippedDef = useGameStore.getState().player.equipped.chest;
            const armor = equippedDef ? (ITEMS[equippedDef].stats?.def ?? 0) : 0;
            const dmg = Math.max(1, Math.floor(m.def.atk - armor * 0.5) * (0.9 + Math.random() * 0.2));
            useGameStore.getState().damagePlayer(dmg);
            const screenPos = worldToScreen(player.position.clone().add(new THREE.Vector3(0, 1.6, 0)), camera, c);
            spawnDamageNumber(screenPos.x, screenPos.y, Math.floor(dmg), '#ff5a5a');
          }
        }
        // Idle bob
        m.group.position.y = Math.sin(t * 0.003 + m.group.position.x) * 0.05;
      }

      // Loot pickup
      for (let i = loots.length - 1; i >= 0; i--) {
        const l = loots[i];
        l.mesh.rotation.y += dt * 2;
        l.mesh.position.y = 0.4 + Math.sin((t - l.spawnAt) * 0.004) * 0.1;
        const dx = l.mesh.position.x - player.position.x;
        const dz = l.mesh.position.z - player.position.z;
        if (Math.hypot(dx, dz) < 0.9) {
          useGameStore.getState().addItem(l.itemId, l.qty);
          const screenPos = worldToScreen(l.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), camera, c);
          const def = ITEMS[l.itemId];
          spawnLootText(screenPos.x, screenPos.y, `${def.name} ×${l.qty}`, def.rarity);
          scene.remove(l.mesh);
          loots.splice(i, 1);
        }
      }

      // Respawn waves
      const aliveCount = mobs.filter((m) => m.alive).length;
      if (aliveCount < 6) {
        const def = MOBS[Math.floor(Math.random() * MOBS.length)];
        const angle = Math.random() * Math.PI * 2;
        const r = 16 + Math.random() * 14;
        spawnMob(def, player.position.x + Math.cos(angle) * r, player.position.z + Math.sin(angle) * r);
      }

      // Player death -> respawn at center, half hp
      if (ps.hp <= 0) {
        useGameStore.getState().healPlayer(ps.hpMax / 2);
        player.position.set(0, 0, 0);
        target = null;
        targetPos.copy(player.position);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }

    function killMob(m: MobInstance) {
      m.alive = false;
      scene.remove(m.group);
      // Loot
      useGameStore.getState().earnGold(
        Math.floor(m.def.goldDrop[0] + Math.random() * (m.def.goldDrop[1] - m.def.goldDrop[0])),
      );
      useGameStore.getState().gainXP(m.def.xp);
      for (const entry of m.def.lootTable) {
        if (Math.random() < entry.chance) {
          const qty = Math.floor(entry.qty[0] + Math.random() * (entry.qty[1] - entry.qty[0] + 1));
          dropLoot(m.group.position.x, m.group.position.z, entry.item, qty);
        }
      }
    }

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('pointermove', stickMove);
      window.removeEventListener('pointerup', stickEnd);
      renderer.dispose();
      c.removeChild(renderer.domElement);
    };
  }, [raceId]);

  return (
    <>
      <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} />
      <div className="touch-stick"><div className="nub" /></div>
      <HUD />
    </>
  );
}

function makeHpBar(): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 14;
  drawHpBar(canvas, 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.2, 0.14, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.tex = tex;
  return sprite;
}
function drawHpBar(canvas: HTMLCanvasElement, pct: number) {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = pct > 0.5 ? '#5fcf6e' : pct > 0.25 ? '#ffce6a' : '#c13a3a';
  ctx.fillRect(2, 2, (canvas.width - 4) * Math.max(0, pct), canvas.height - 4);
  ctx.strokeStyle = '#d4a04a';
  ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
}
function updateHpBar(sprite: THREE.Sprite, pct: number) {
  const canvas = sprite.userData.canvas as HTMLCanvasElement;
  drawHpBar(canvas, pct);
  (sprite.userData.tex as THREE.CanvasTexture).needsUpdate = true;
}

function worldToScreen(pos: THREE.Vector3, camera: THREE.Camera, container: HTMLElement) {
  const rect = container.getBoundingClientRect();
  const v = pos.clone().project(camera);
  return {
    x: rect.left + ((v.x + 1) / 2) * rect.width,
    y: rect.top + ((-v.y + 1) / 2) * rect.height,
  };
}
