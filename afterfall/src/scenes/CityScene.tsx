import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore, ambientBrightness, isNight } from '../state/useGameStore';
import { getWorld } from '../game/worldSingleton';
import { setPlayerPos } from '../game/playerTracker';
import { buildWorldGround } from '../game/worldGround';
import { makeChunkManager, type LiveContainer } from '../game/chunks';
import { rollContainerLoot } from '../game/loot';
import { buildSurvivor, buildZombie } from '../game/models';
import { ZOMBIES, type ZombieDef } from '../game/zombies';
import { ITEMS, RARITY_COLOR } from '../game/items';
import { makeRenderer, makeRenderTarget } from '../utils/post';
import { spawnDamage, spawnPickup, tickHud } from '../utils/hud';
import { getProfile } from '../utils/quality';
import HUD from '../ui/HUD';

interface ZombieInstance {
  def: ZombieDef;
  group: THREE.Group;
  hp: number;
  state: 'idle' | 'wander' | 'chase' | 'attack';
  target: THREE.Vector3;
  cooldown: number;
  wanderTimer: number;
  uid: number;
}

let zid = 1;

export default function CityScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c: HTMLCanvasElement = canvas;
    const profile = getProfile(useGameStore.getState().quality);

    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      c.width = w * Math.min(window.devicePixelRatio, profile.pixelRatioCap);
      c.height = h * Math.min(window.devicePixelRatio, profile.pixelRatioCap);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    };
    resize();

    const renderer = makeRenderer(c, profile);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.FogExp2(0x0a0a14, profile.fogDensity);

    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 22;
    const camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 600);
    camera.position.set(20, 30, 20);
    camera.lookAt(0, 0, 0);
    const target = makeRenderTarget(renderer, scene, camera, profile);

    const onResize = () => {
      resize();
      const a = window.innerWidth / window.innerHeight;
      camera.left = -viewSize * a;
      camera.right = viewSize * a;
      camera.top = viewSize;
      camera.bottom = -viewSize;
      camera.updateProjectionMatrix();
      target.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Lights
    const hemi = new THREE.HemisphereLight(0xa8c0e0, 0x202018, 0.7 * profile.hemiIntensityMul);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe5b8, 1.2);
    sun.position.set(40, 60, 40);
    if (profile.shadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
      sun.shadow.camera.left = -50;
      sun.shadow.camera.right = 50;
      sun.shadow.camera.top = 50;
      sun.shadow.camera.bottom = -50;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 200;
    }
    scene.add(sun);
    const moon = new THREE.DirectionalLight(0x8aaeff, 0.0);
    moon.position.set(-30, 50, -30);
    scene.add(moon);

    // World data + ground + chunks
    const world = getWorld(7);
    const groundGroup = buildWorldGround(world);
    scene.add(groundGroup);
    const chunkMgr = makeChunkManager(world, scene, {
      streamRadius: profile.cityChunkRadius,
      shadows: profile.shadows,
      trees: profile.trees,
    });

    // Player
    const player = buildSurvivor();
    const playerSpawn = new THREE.Vector3(world.spawnPoint.x, 0, world.spawnPoint.z);
    player.position.copy(playerSpawn);
    scene.add(player);
    chunkMgr.update(player.position.x, player.position.z);

    const flashlight = new THREE.SpotLight(0xfff4cc, 0, 16, Math.PI / 7, 0.4, 1.5);
    flashlight.position.set(0, 2.5, 0);
    flashlight.target.position.set(0, 0, 4);
    player.add(flashlight);
    player.add(flashlight.target);

    // Zombies
    const zombies: ZombieInstance[] = [];
    function spawnZombieNear(pos: THREE.Vector3, def: ZombieDef): ZombieInstance | null {
      if (zombies.length >= profile.maxZombies) return null;
      const angle = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 10;
      const p = new THREE.Vector3(
        Math.max(2, Math.min(world.size - 2, pos.x + Math.cos(angle) * dist)),
        0,
        Math.max(2, Math.min(world.size - 2, pos.z + Math.sin(angle) * dist)),
      );
      const g = buildZombie(def);
      g.position.copy(p);
      scene.add(g);
      const zi: ZombieInstance = {
        def, group: g, hp: def.hp, state: 'wander', cooldown: 0,
        target: p.clone(), wanderTimer: 0, uid: zid++,
      };
      zombies.push(zi);
      return zi;
    }
    for (let i = 0; i < Math.min(profile.maxZombies / 2, 12); i++) spawnZombieNear(playerSpawn, ZOMBIES.walker);
    for (let i = 0; i < Math.min(profile.maxZombies / 4, 4); i++) spawnZombieNear(playerSpawn, ZOMBIES.runner);

    // Targeting
    const moveTarget = playerSpawn.clone();
    const tmpVec = new THREE.Vector3();
    const tmpRay = new THREE.Raycaster();
    let attackTarget: ZombieInstance | null = null;
    let attackCd = 0;

    // Joystick state
    let joystick = { active: false, x: 0, y: 0, baseX: 0, baseY: 0 };
    const stickZone = document.createElement('div');
    stickZone.className = 'touch-stick-zone';
    document.body.appendChild(stickZone);
    const stickKnob = document.createElement('div');
    stickKnob.className = 'touch-stick-knob';
    stickZone.appendChild(stickKnob);
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      joystick = { active: true, baseX: t.clientX, baseY: t.clientY, x: 0, y: 0 };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!joystick.active) return;
      const t = e.touches[0];
      let dx = t.clientX - joystick.baseX;
      let dy = t.clientY - joystick.baseY;
      const max = 50;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      joystick.x = dx / max; joystick.y = dy / max;
      stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const onTouchEnd = () => {
      joystick.active = false; joystick.x = 0; joystick.y = 0;
      stickKnob.style.transform = 'translate(0, 0)';
    };
    stickZone.addEventListener('touchstart', onTouchStart, { passive: true });
    stickZone.addEventListener('touchmove', onTouchMove, { passive: true });
    stickZone.addEventListener('touchend', onTouchEnd);
    stickZone.addEventListener('touchcancel', onTouchEnd);

    // Keyboard
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === 'b' || e.key === 'B') useGameStore.getState().setScreen('bastion');
      if (e.key === 'Escape') useGameStore.getState().setScreen('menu');
      if (e.key >= '1' && e.key <= '6') useGameStore.getState().selectHotbar(parseInt(e.key) - 1);
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function pointerToWorld(clientX: number, clientY: number): THREE.Vector3 | null {
      const rect = c.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      tmpRay.setFromCamera(ndc, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (tmpRay.ray.intersectPlane(plane, hit)) return hit;
      return null;
    }
    let attackPressed = false;
    const onPointerDown = (e: PointerEvent) => {
      const target2 = e.target as HTMLElement;
      if (target2.closest('.hud-clickable')) return;
      if (target2.closest('.touch-stick-zone')) return;
      const w = pointerToWorld(e.clientX, e.clientY);
      if (!w) return;
      const wId = useGameStore.getState().player.equipped.weapon ?? 'fists';
      const wp = ITEMS[wId];
      const ranged = wp?.ranged;
      let hit: ZombieInstance | null = null;
      let bestD = ranged ? Infinity : 1.5;
      for (const z of zombies) {
        const d = z.group.position.distanceTo(w);
        if (d < bestD) { bestD = d; hit = z; }
      }
      if (hit) {
        attackPressed = true;
        attackTarget = hit;
        if (!ranged) moveTarget.copy(hit.group.position);
        else moveTarget.copy(player.position);
        return;
      }
      moveTarget.copy(w);
    };
    c.addEventListener('pointerdown', onPointerDown);

    // FPS sample buffer for adaptive downgrade
    let fpsSamples: number[] = [];
    let lastFpsReport = performance.now();

    // AI throttle
    const aiInterval = 1000 / profile.aiTickHz;
    let aiAccum = 0;
    let lastChunkUpdate = 0;

    let last = performance.now();
    let raf = 0;
    let stop = false;
    function frame() {
      if (stop) return;
      const now = performance.now();
      const dtMs = now - last;
      const dt = Math.min(0.05, dtMs / 1000);
      last = now;

      // FPS sampling
      fpsSamples.push(1000 / dtMs);
      if (now - lastFpsReport > 500) {
        const avg = fpsSamples.reduce((s, v) => s + v, 0) / Math.max(1, fpsSamples.length);
        useGameStore.getState().reportFps(avg);
        fpsSamples = [];
        lastFpsReport = now;
      }

      const st = useGameStore.getState();
      st.tickWorld(dt);
      const wt = useGameStore.getState().worldTime;
      const bright = ambientBrightness(wt);
      const night = isNight(wt);

      hemi.intensity = (0.15 + 0.7 * bright) * profile.hemiIntensityMul;
      sun.intensity = 1.6 * bright;
      sun.color.setHSL(0.08 + (1 - bright) * 0.04, 0.4, 0.55 + bright * 0.2);
      moon.intensity = (1 - bright) * 0.35;
      const fogColor = new THREE.Color().setRGB(
        0.04 + bright * 0.34,
        0.04 + bright * 0.32,
        0.07 + bright * 0.28,
      );
      scene.background = fogColor;
      (scene.fog as THREE.FogExp2).color = fogColor;
      (scene.fog as THREE.FogExp2).density = profile.fogDensity * (1 + (1 - bright) * 0.6);

      // Lamp / window emissives
      chunkMgr.forEachLight((lf) => {
        lf.t += dt * (0.5 + Math.random() * 5);
        const flicker = night ? 0.85 + Math.sin(lf.t) * 0.08 + (Math.random() - 0.5) * 0.05 : 0;
        lf.light.intensity = lf.base * flicker;
      });
      if (!profile.windowEmissivePerformance) {
        chunkMgr.forEachEmissive((m) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = night ? 1.2 + Math.sin(now * 0.001 + m.id) * 0.2 : 0;
          }
        });
      }
      if (target.bloom) target.bloom.strength = 0.3 + (1 - bright) * 0.6;
      flashlight.intensity = (1 - bright) * 6;

      // Chunk streaming (every 250ms is enough)
      if (now - lastChunkUpdate > 250) {
        chunkMgr.update(player.position.x, player.position.z);
        lastChunkUpdate = now;
      }

      // Movement (sprint with Shift drains stamina)
      const stState = useGameStore.getState();
      const sprintWanted = !!keys['shift'] && stState.player.stamina > 4;
      const sprintMul = sprintWanted ? 1.7 : 1;
      const speed = 5 * sprintMul;
      const dirX = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
      const dirZ = (keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0);
      let mx = 0, mz = 0;
      const cos = Math.cos(-Math.PI / 4), sin = Math.sin(-Math.PI / 4);
      if (dirX || dirZ) {
        const len = Math.hypot(dirX, dirZ);
        const nx = dirX / len, nz = dirZ / len;
        mx = (nx * cos - nz * sin) * speed * dt;
        mz = (nx * sin + nz * cos) * speed * dt;
        moveTarget.copy(player.position);
      } else if (joystick.x || joystick.y) {
        mx = (joystick.x * cos - joystick.y * sin) * speed * dt;
        mz = (joystick.x * sin + joystick.y * cos) * speed * dt;
        moveTarget.copy(player.position);
      } else {
        const dirToTarget = tmpVec.subVectors(moveTarget, player.position);
        dirToTarget.y = 0;
        const dist = dirToTarget.length();
        if (dist > 0.1) {
          dirToTarget.normalize().multiplyScalar(Math.min(dist, speed * dt));
          mx = dirToTarget.x; mz = dirToTarget.z;
        }
      }
      player.position.x = Math.max(1, Math.min(world.size - 1, player.position.x + mx));
      player.position.z = Math.max(1, Math.min(world.size - 1, player.position.z + mz));
      const movDir = Math.hypot(mx, mz);
      if (movDir > 0.01) player.rotation.y = Math.atan2(mx, mz);
      if (sprintWanted && movDir > 0.01) useGameStore.getState().modStamina(-12 * dt);
      setPlayerPos(player.position.x, player.position.z);

      camera.position.set(player.position.x + 20, 30, player.position.z + 20);
      camera.lookAt(player.position.x, 0, player.position.z);

      // Loot pickup against currently-streamed chunks
      const containers = chunkMgr.getContainers();
      for (const cont of containers) {
        if (cont.opened) continue;
        const d = cont.pos.distanceTo(player.position);
        if (d < 1.6) {
          cont.group.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.userData.ring) {
              const mat = m.material as THREE.MeshBasicMaterial;
              mat.opacity = 0.55 + Math.sin(now * 0.008) * 0.25;
            }
          });
        }
        if (d < 1.0) openContainer(cont);
      }

      // AI throttle (low: 6Hz, med: 12Hz, high: 20Hz)
      aiAccum += dtMs;
      if (aiAccum >= aiInterval) {
        const aiDt = aiAccum / 1000;
        aiAccum = 0;
        const wantSpawn = (night ? profile.maxZombies : Math.floor(profile.maxZombies * 0.7)) - zombies.length;
        if (wantSpawn > 0 && Math.random() < aiDt * 0.4) {
          const tier = Math.random();
          const def = tier < 0.6 ? ZOMBIES.walker
            : tier < 0.9 ? ZOMBIES.runner
            : tier < 0.97 ? ZOMBIES.bloater : ZOMBIES.brute;
          spawnZombieNear(player.position, def);
        }
        const aggroBoost = night ? 1.6 : 1.0;
        for (let i = zombies.length - 1; i >= 0; i--) {
          const z = zombies[i];
          z.cooldown = Math.max(0, z.cooldown - aiDt);
          const distToPlayer = z.group.position.distanceTo(player.position);
          // Despawn very-far zombies (likely walked into a different district)
          if (distToPlayer > 80) {
            scene.remove(z.group);
            disposeGroup(z.group);
            zombies.splice(i, 1);
            continue;
          }
          if (distToPlayer < z.def.aggroRange * aggroBoost) z.state = 'chase';
          else if (z.state === 'chase' && distToPlayer > z.def.aggroRange * 2) z.state = 'wander';

          if (z.state === 'chase') {
            const dir = tmpVec.subVectors(player.position, z.group.position).setY(0).normalize();
            z.target.copy(player.position);
            void dir;
          } else {
            z.wanderTimer -= aiDt;
            if (z.wanderTimer <= 0) {
              z.target.set(
                Math.max(2, Math.min(world.size - 2, z.group.position.x + (Math.random() - 0.5) * 12)),
                0,
                Math.max(2, Math.min(world.size - 2, z.group.position.z + (Math.random() - 0.5) * 12)),
              );
              z.wanderTimer = 3 + Math.random() * 4;
            }
          }
        }
      }
      // Per-frame motion + attacks (interpolated, smooth)
      const aggroBoost = night ? 1.6 : 1.0;
      for (const z of zombies) {
        const dir = tmpVec.subVectors(z.target, z.group.position).setY(0);
        const len = dir.length();
        if (len > 0.05) {
          dir.normalize();
          const sp = (z.state === 'chase' ? z.def.speed * (night ? 1.2 : 1) : z.def.speed * 0.4);
          z.group.position.addScaledVector(dir, sp * dt);
          z.group.rotation.y = Math.atan2(dir.x, dir.z);
        }
        const distToPlayer = z.group.position.distanceTo(player.position);
        if (distToPlayer < 1.4 && z.cooldown <= 0 && z.state === 'chase') {
          useGameStore.getState().damagePlayer(z.def.damage * 0.4);
          spawnDamage(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), z.def.damage * 0.4, '#ff6a6a');
          z.cooldown = 1.0;
          void aggroBoost;
        }
      }

      // Player attacks
      attackCd = Math.max(0, attackCd - dt);
      const wId = useGameStore.getState().player.equipped.weapon ?? 'fists';
      const w = ITEMS[wId];
      if (attackPressed && attackTarget && attackCd === 0) {
        const dToTarget = attackTarget.group.position.distanceTo(player.position);
        const reach = w.range ?? 1.2;
        if (dToTarget <= reach) {
          attackTarget.hp -= w.damage ?? 5;
          spawnDamage(attackTarget.group.position.clone().add(new THREE.Vector3(0, 1.6, 0)), w.damage ?? 5, '#ffce6a');
          attackCd = w.ranged ? 0.4 : 0.7;
          if (attackTarget.hp <= 0) {
            for (const lr of attackTarget.def.loot) {
              if (Math.random() < lr.chance) {
                const q = Math.floor(Math.random() * (lr.qty[1] - lr.qty[0] + 1)) + lr.qty[0];
                useGameStore.getState().addItem(lr.item, q);
                const def = ITEMS[lr.item];
                spawnPickup(attackTarget.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
                  `+${q} ${def.name}`, RARITY_COLOR[def.rarity]);
              }
            }
            useGameStore.getState().gainXP(attackTarget.def.xp);
            scene.remove(attackTarget.group);
            disposeGroup(attackTarget.group);
            const idx = zombies.indexOf(attackTarget);
            if (idx >= 0) zombies.splice(idx, 1);
            attackTarget = null;
          }
        }
        attackPressed = false;
      }
      if (attackTarget && attackCd === 0) {
        const dToTarget = attackTarget.group.position.distanceTo(player.position);
        const reach = w.range ?? 1.2;
        if (dToTarget <= reach) attackPressed = true;
      }

      tickHud(camera, dt);
      target.render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function openContainer(cont: LiveContainer) {
      cont.opened = true;
      const rng = (() => {
        let s = (cont.pos.x * 1009 + cont.pos.z * 9973) >>> 0;
        return () => {
          s = (s + 0x6D2B79F5) >>> 0;
          let t = s; t = Math.imul(t ^ (t >>> 15), t | 1);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      })();
      const count = 2 + Math.floor(rng() * 4);
      const loot = rollContainerLoot(rng, count);
      let row = 0;
      for (const lr of loot) {
        useGameStore.getState().addItem(lr.item, lr.qty);
        const def = ITEMS[lr.item];
        spawnPickup(cont.pos.clone().add(new THREE.Vector3(0, 0.5 + row * 0.3, 0)),
          `+${lr.qty} ${def.name}`, RARITY_COLOR[def.rarity]);
        row++;
      }
      cont.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.userData.ring) m.visible = false;
      });
    }

    function disposeGroup(g: THREE.Group): void {
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        // Geometries are largely shared — only dispose if not flagged shared
        if (m.geometry && !m.geometry.userData.shared) {
          // skip dispose to be safe; cache lifetime is the page
        }
      });
    }

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      c.removeEventListener('pointerdown', onPointerDown);
      stickZone.remove();
      chunkMgr.dispose();
      target.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="scene-root">
      <canvas ref={canvasRef} className="scene-canvas" />
      <HUD />
    </div>
  );
}
