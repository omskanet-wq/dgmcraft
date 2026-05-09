import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore, ambientBrightness, isNight } from '../state/useGameStore';
import { getWorld } from '../game/worldSingleton';
import { setPlayerPos } from '../game/playerTracker';
import { buildWorldGround } from '../game/worldGround';
import { makeChunkManager, type LiveContainer } from '../game/chunks';
import { rollContainerLoot } from '../game/loot';
import { buildSurvivor, buildZombie } from '../game/models';
import { loadCharacterTemplate, spawnCharacterInstance, type SkinnedInstance } from '../game/skinnedChar';
import { ZOMBIES, type ZombieDef } from '../game/zombies';
import { ITEMS, RARITY_COLOR } from '../game/items';
import { makeRenderer, makeRenderTarget } from '../utils/post';
import { spawnDamage, spawnPickup, tickHud } from '../utils/hud';
import { spawnBurst, tickParticles, disposeParticles } from '../utils/particles';
import { getProfile } from '../utils/quality';
import {
  resumeAudio, sfxFootstep, sfxAttack, sfxHit, sfxZombieGroan,
  sfxContainerOpen, sfxPlayerHurt, startAmbientWind, stopAmbientWind, setAmbientNight,
} from '../utils/audio';
import HUD from '../ui/HUD';

import type { HumanoidBones } from '../game/models';

interface ZombieInstance {
  def: ZombieDef;
  group: THREE.Group & { bones: HumanoidBones };
  hp: number;
  state: 'idle' | 'wander' | 'chase' | 'attack';
  target: THREE.Vector3;
  cooldown: number;
  wanderTimer: number;
  uid: number;
  // Combat reactions: per-zombie knockback velocity + flinch timer.
  knockX: number;
  knockZ: number;
  flinchT: number;
}

interface Projectile {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  damage: number;
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
    let viewSize = 22;
    const ZOOM_MIN = 12, ZOOM_MAX = 50;
    const camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 600);
    camera.position.set(20, 30, 20);
    camera.lookAt(0, 0, 0);
    const target = makeRenderTarget(renderer, scene, camera, profile);

    function applyView(): void {
      const a = window.innerWidth / window.innerHeight;
      camera.left = -viewSize * a;
      camera.right = viewSize * a;
      camera.top = viewSize;
      camera.bottom = -viewSize;
      camera.updateProjectionMatrix();
    }
    const onResize = () => {
      resize();
      applyView();
      target.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Mouse wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.sign(e.deltaY);
      viewSize = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, viewSize + delta * 2));
      applyView();
    };
    c.addEventListener('wheel', onWheel, { passive: false });

    // Pinch zoom on touch
    let pinchStart = 0;
    let pinchView = viewSize;
    const onTouchMoveZoom = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.hypot(dx, dy);
      if (pinchStart === 0) { pinchStart = d; pinchView = viewSize; return; }
      const ratio = pinchStart / d;
      viewSize = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchView * ratio));
      applyView();
    };
    const onTouchEndZoom = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStart = 0;
    };
    c.addEventListener('touchmove', onTouchMoveZoom, { passive: true });
    c.addEventListener('touchend', onTouchEndZoom);
    c.addEventListener('touchcancel', onTouchEndZoom);

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
      // Manually-triggered shadow updates (every ~250ms) instead of every
      // frame. Big GPU saver on integrated GPUs / mobile.
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
    }
    scene.add(sun);
    const moon = new THREE.DirectionalLight(0x8aaeff, 0.0);
    moon.position.set(-30, 50, -30);
    scene.add(moon);

    // World data + ground + chunks
    const world = getWorld(7);
    const groundGroup = buildWorldGround(world, { paintDashes: profile.preset !== 'low' });
    scene.add(groundGroup);
    const chunkMgr = makeChunkManager(world, scene, {
      streamRadius: profile.cityChunkRadius,
      shadows: profile.shadows,
      trees: profile.trees,
    });

    // Player — procedural visual is the immediate fallback. A higher-fidelity
    // skinned model loads asynchronously on medium/high; once it arrives we
    // hide the proc visual and drive the SkinnedMesh via AnimationMixer.
    const player = buildSurvivor();
    const playerSpawn = new THREE.Vector3(world.spawnPoint.x, 0, world.spawnPoint.z);
    player.position.copy(playerSpawn);
    scene.add(player);
    chunkMgr.update(player.position.x, player.position.z);

    let playerSkin: SkinnedInstance | null = null;
    let prevPlayerPosX = playerSpawn.x;
    let prevPlayerPosZ = playerSpawn.z;
    if (profile.preset !== 'low') {
      loadCharacterTemplate()
        .then((template) => {
          playerSkin = spawnCharacterInstance(template);
          // Mixamo soldier is roughly 1.6m tall — fits our 1.7m proc survivor.
          playerSkin.group.position.y = 0;
          // Hide all the procedural visuals; keep the parent Group at the
          // same transform so the camera follow & flashlight still work.
          for (const c of player.children.slice()) {
            // Only hide visuals we created in buildSurvivor; the flashlight
            // attached later is added after this point so isn't a child yet.
            const cm = c as THREE.Object3D & { isLight?: boolean };
            if (!cm.isLight) c.visible = false;
          }
          player.add(playerSkin.group);
        })
        .catch((err) => {
          // Stay on procedural — log once.
          console.warn('Soldier.glb failed to load, staying on procedural model', err);
        });
    }

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
        knockX: 0, knockZ: 0, flinchT: 0,
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
    let attackSwing = 0; // seconds of remaining attack-arm animation

    // Combat: live projectiles + combo counter.
    const projectiles: Projectile[] = [];
    let comboCount = 0;
    let comboT = 0; // seconds since last hit; reset to 0 on hit, clears combo at >2.5s

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

    const reusableFogColor = new THREE.Color();

    // AI throttle
    const aiInterval = 1000 / profile.aiTickHz;
    let aiAccum = 0;
    let lastChunkUpdate = 0;
    let lastEmissiveTick = 0;

    let last = performance.now();
    let raf = 0;
    let stop = false;
    // Adaptive performance tracker: if FPS stays under 30 for >2s, scale down.
    let fpsAccum = 0; let fpsFrames = 0; let fpsCheckT = 0;
    let lowFpsStreak = 0;
    let degradeLevel = 0; // 0 = normal, 1 = shadows off, 2 = lower zombie cap, 3 = pixel ratio dropped

    // Audio bootstrap: lazy-resume on first user gesture; start an ambient wind
    // bed once and let setAmbientNight modulate intensity by day/night.
    const onFirstGesture = () => {
      resumeAudio();
      startAmbientWind();
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
    window.addEventListener('pointerdown', onFirstGesture);
    window.addEventListener('keydown', onFirstGesture);

    // Footstep stride accumulator (distance-based so sprint produces more taps).
    let stepDist = 0;
    let savedAt = performance.now();
    function frame() {
      if (stop) return;
      const now = performance.now();
      const dtMs = now - last;
      const dt = Math.min(0.05, dtMs / 1000);
      last = now;
      // FPS sample
      fpsAccum += dtMs; fpsFrames += 1;
      if (now - fpsCheckT > 1000) {
        const fps = (fpsFrames * 1000) / Math.max(1, fpsAccum);
        useGameStore.setState({ measuredFps: Math.round(fps) });
        fpsAccum = 0; fpsFrames = 0; fpsCheckT = now;
        if (fps < 30) lowFpsStreak += 1; else lowFpsStreak = 0;
        if (lowFpsStreak >= 2 && degradeLevel < 3) {
          degradeLevel += 1;
          lowFpsStreak = 0;
          if (degradeLevel === 1 && profile.shadows) {
            renderer.shadowMap.enabled = false;
          } else if (degradeLevel === 2) {
            // Halve max zombies — despawn the farthest until we're under cap.
            const cap = Math.max(6, Math.floor(profile.maxZombies * 0.5));
            zombies.sort((a, b) =>
              b.group.position.distanceTo(player.position) - a.group.position.distanceTo(player.position),
            );
            while (zombies.length > cap) {
              const z = zombies.shift()!;
              scene.remove(z.group); disposeGroup(z.group);
            }
            profile.maxZombies = cap;
          } else if (degradeLevel === 3) {
            const dpr = Math.min(window.devicePixelRatio, profile.pixelRatioCap) * 0.75;
            renderer.setPixelRatio(dpr);
          }
          useGameStore.getState().setToast(`Auto-quality: stepping down (lv ${degradeLevel})`);
        }
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
      // Reuse a single Color instance for fog/background to skip per-frame
      // allocations (was a top GC offender on low-end devices).
      reusableFogColor.setRGB(
        0.04 + bright * 0.34,
        0.04 + bright * 0.32,
        0.07 + bright * 0.28,
      );
      (scene.background as THREE.Color).copy(reusableFogColor);
      (scene.fog as THREE.FogExp2).color.copy(reusableFogColor);
      (scene.fog as THREE.FogExp2).density = profile.fogDensity * (1 + (1 - bright) * 0.6);

      // Lamps: only animate flicker at night; off entirely during day.
      if (night) {
        chunkMgr.forEachLight((lf) => {
          lf.t += dt * 3;
          lf.light.intensity = lf.base * (0.85 + Math.sin(lf.t) * 0.08);
        });
      } else {
        chunkMgr.forEachLight((lf) => {
          if (lf.light.intensity !== 0) lf.light.intensity = 0;
        });
      }
      // Window emissives: toggle at most every 250ms — visually identical,
      // dramatic CPU saver on the chunked window meshes.
      if (!profile.windowEmissivePerformance && now - lastEmissiveTick > 250) {
        lastEmissiveTick = now;
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
        if (profile.shadows) renderer.shadowMap.needsUpdate = true;
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

      // Distance-based footstep clicks. Stride length ~1.6m at walk, ~1.2m at sprint.
      if (movDir > 0.01) {
        stepDist += movDir;
        const stride = sprintWanted ? 1.2 : 1.6;
        if (stepDist >= stride) { stepDist = 0; sfxFootstep(sprintWanted); }
      } else {
        stepDist = 0;
      }

      // Modulate the ambient wind by day/night and toggle audio mute when settings change.
      setAmbientNight(isNight(useGameStore.getState().worldTime) ? 1 : 0);

      // Autosave every 30s (saves the current state to localStorage).
      if (now - savedAt > 30000) {
        savedAt = now;
        useGameStore.getState().saveGame?.();
      }

      // Animation update path differs depending on whether the high-fidelity
      // skinned model has finished loading.
      if (playerSkin) {
        const dxp = player.position.x - prevPlayerPosX;
        const dzp = player.position.z - prevPlayerPosZ;
        const speedNow = Math.hypot(dxp, dzp) / Math.max(0.001, dt);
        playerSkin.setMotion(speedNow);
        playerSkin.mixer.update(dt);
        prevPlayerPosX = player.position.x;
        prevPlayerPosZ = player.position.z;
      } else {
        // Procedural walk cycle — alternate legs and arms.
        const moving = movDir > 0.01;
        const pPhase = now * 0.012 * (sprintWanted ? 1.5 : 1.0);
        const pSwing = moving ? Math.sin(pPhase) * 0.6 : 0;
        const pSwingA = moving ? Math.sin(pPhase + Math.PI) * 0.45 : 0;
        const pb = player.bones;
        pb.legL.rotation.x = pSwing;
        pb.legR.rotation.x = -pSwing;
        pb.armL.rotation.x = pSwingA;
        if (attackSwing <= 0) pb.armR.rotation.x = -pSwingA;
      }

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
        // Apply knockback (damped) before normal motion so we can be pushed
        // through the chase target temporarily.
        if (Math.abs(z.knockX) > 0.001 || Math.abs(z.knockZ) > 0.001) {
          z.group.position.x += z.knockX * dt;
          z.group.position.z += z.knockZ * dt;
          const damp = Math.exp(-dt * 8);
          z.knockX *= damp; z.knockZ *= damp;
        }
        z.flinchT = Math.max(0, z.flinchT - dt);
        const flinching = z.flinchT > 0;

        const dir = tmpVec.subVectors(z.target, z.group.position).setY(0);
        const len = dir.length();
        let moving = false;
        if (!flinching && len > 0.05) {
          dir.normalize();
          const sp = (z.state === 'chase' ? z.def.speed * (night ? 1.2 : 1) : z.def.speed * 0.4);
          z.group.position.addScaledVector(dir, sp * dt);
          z.group.rotation.y = Math.atan2(dir.x, dir.z);
          moving = true;
        }
        // Walk-cycle: alternate legs and arms via the rigged pivot groups.
        const phase = (now + z.uid * 73) * 0.006 * (z.state === 'chase' ? 1.7 : 1.0);
        const swing = moving ? Math.sin(phase) * 0.55 : 0;
        const swingArmL = moving ? Math.sin(phase + Math.PI) * 0.35 : 0;
        const b = z.group.bones;
        if (flinching) {
          // Flinch pose — head and torso jerk back, arms fling out.
          const ft = z.flinchT / 0.25;
          b.torso.rotation.x = -0.4 * ft;
          b.head.rotation.x = -0.6 * ft;
          b.armL.rotation.x = -1.2;
          b.armR.rotation.x = -1.2;
          b.legL.rotation.x = 0;
          b.legR.rotation.x = 0;
        } else {
          b.torso.rotation.x = 0;
          b.head.rotation.x = 0;
          b.legL.rotation.x = swing;
          b.legR.rotation.x = -swing;
          b.armL.rotation.x = -0.4 + swingArmL;
          b.armR.rotation.x = -0.6 - swingArmL;
        }
        z.group.position.y = moving ? Math.abs(Math.sin(phase)) * 0.04 : 0;
        z.group.rotation.z = moving && !flinching ? Math.sin(phase * 1.3) * 0.03 : 0;
        // Stochastic moan: ~one zombie per second total starts a 0.7s groan.
        if (Math.random() < dt * 0.5 / zombies.length && z.state === 'chase') sfxZombieGroan();
        const distToPlayer = z.group.position.distanceTo(player.position);
        if (distToPlayer < 1.4 && z.cooldown <= 0 && z.state === 'chase' && !flinching) {
          useGameStore.getState().damagePlayer(z.def.damage * 0.4);
          spawnDamage(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), z.def.damage * 0.4, '#ff6a6a');
          spawnBurst(scene, player.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 6, [0.85, 0.18, 0.18], 2.4);
          sfxPlayerHurt();
          z.cooldown = 1.0;
          void aggroBoost;
        }
      }

      // Update live projectiles (arrows / bullets fired from ranged weapons).
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const pr = projectiles[i];
        pr.life -= dt;
        pr.mesh.position.addScaledVector(pr.vel, dt);
        let consumed = pr.life <= 0;
        if (!consumed) {
          for (const z of zombies) {
            if (pr.mesh.position.distanceTo(z.group.position) < 1.0) {
              applyHit(z, pr.damage, pr.vel.x * 0.3, pr.vel.z * 0.3);
              consumed = true;
              break;
            }
          }
        }
        if (consumed) {
          scene.remove(pr.mesh);
          (pr.mesh.geometry as THREE.BufferGeometry).dispose();
          (pr.mesh.material as THREE.Material).dispose();
          projectiles.splice(i, 1);
        }
      }

      // Combo decay
      comboT += dt;
      if (comboT > 2.5 && comboCount > 0) comboCount = 0;
      (window as unknown as { __afterfallCombo?: number }).__afterfallCombo = comboCount;

      // Player attacks
      attackCd = Math.max(0, attackCd - dt);
      attackSwing = Math.max(0, attackSwing - dt);
      if (attackSwing > 0 && !playerSkin) {
        // Forward chop on the procedural right arm during the swing window.
        const t = 1 - attackSwing / 0.35;
        player.bones.armR.rotation.x = -1.6 * Math.sin(t * Math.PI);
      }
      const wId = useGameStore.getState().player.equipped.weapon ?? 'fists';
      const w = ITEMS[wId];
      // Auto-fire when target is in range and cooldown elapsed.
      if (attackTarget && attackCd === 0) {
        const dToTarget = attackTarget.group.position.distanceTo(player.position);
        const reach = w.range ?? 1.2;
        if (dToTarget <= reach + (w.ranged ? 14 : 0)) attackPressed = true;
      }
      if (attackPressed && attackCd === 0) {
        const dmg = w.damage ?? 5;
        if (w.ranged) {
          // Projectile fired forward from the player's facing.
          const fwd = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
          const geo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8);
          geo.rotateX(Math.PI / 2);
          const mat = new THREE.MeshBasicMaterial({ color: 0xffd070 });
          const m = new THREE.Mesh(geo, mat);
          m.position.copy(player.position).add(new THREE.Vector3(0, 1.0, 0)).addScaledVector(fwd, 0.6);
          m.lookAt(m.position.clone().add(fwd));
          scene.add(m);
          projectiles.push({ mesh: m, vel: fwd.clone().multiplyScalar(28), life: 1.2, damage: dmg });
          attackCd = 0.4;
          attackSwing = 0.25;
          sfxAttack('ranged');
        } else if (attackTarget) {
          const dToTarget = attackTarget.group.position.distanceTo(player.position);
          const reach = w.range ?? 1.2;
          if (dToTarget <= reach) {
            // AOE arc: melee swing also damages other zombies in front of the
            // player within reach × 1.4. Damage to splash targets is halved.
            sfxAttack('melee');
            const fwd = new THREE.Vector3(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
            for (const z of zombies) {
              const toZ = tmpVec.subVectors(z.group.position, player.position).setY(0);
              const d = toZ.length();
              if (d > reach * 1.4) continue;
              toZ.normalize();
              const dot = toZ.dot(fwd);
              if (dot < 0.2) continue; // behind / to the side
              const isPrimary = z === attackTarget;
              const useDmg = isPrimary ? dmg : Math.round(dmg * 0.6);
              applyHit(z, useDmg, toZ.x * 6, toZ.z * 6);
            }
            attackCd = 0.7;
            attackSwing = 0.35;
          }
        }
        attackPressed = false;
      }

      function applyHit(z: ZombieInstance, damage: number, kx: number, kz: number): void {
        z.hp -= damage;
        z.knockX += kx; z.knockZ += kz;
        z.flinchT = 0.25;
        spawnDamage(z.group.position.clone().add(new THREE.Vector3(0, 1.6, 0)), damage, '#ffce6a');
        spawnBurst(scene, z.group.position.clone().add(new THREE.Vector3(0, 1.0, 0)), 10, [0.78, 0.12, 0.12], 3.2);
        sfxHit();
        comboCount += 1;
        comboT = 0;
        if (z.hp <= 0) {
          for (const lr of z.def.loot) {
            if (Math.random() < lr.chance) {
              const q = Math.floor(Math.random() * (lr.qty[1] - lr.qty[0] + 1)) + lr.qty[0];
              useGameStore.getState().addItem(lr.item, q);
              const def = ITEMS[lr.item];
              spawnPickup(z.group.position.clone().add(new THREE.Vector3(0, 1.5, 0)),
                `+${q} ${def.name}`, RARITY_COLOR[def.rarity]);
            }
          }
          useGameStore.getState().gainXP(z.def.xp);
          useGameStore.getState().addKill();
          scene.remove(z.group);
          disposeGroup(z.group);
          const idx = zombies.indexOf(z);
          if (idx >= 0) zombies.splice(idx, 1);
          if (attackTarget === z) attackTarget = null;
        }
      }

      tickHud(camera, dt);
      tickParticles(scene, dt);
      target.render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function openContainer(cont: LiveContainer) {
      cont.opened = true;
      sfxContainerOpen();
      useGameStore.getState().addContainerOpened?.();
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
      stopAmbientWind();
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      c.removeEventListener('pointerdown', onPointerDown);
      c.removeEventListener('wheel', onWheel);
      c.removeEventListener('touchmove', onTouchMoveZoom);
      c.removeEventListener('touchend', onTouchEndZoom);
      c.removeEventListener('touchcancel', onTouchEndZoom);
      stickZone.remove();
      chunkMgr.dispose();
      disposeParticles(scene);
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
