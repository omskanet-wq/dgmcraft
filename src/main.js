import * as THREE from 'three';
import { createNoise2D as createNoise2DFn } from 'simplex-noise';
import { World, CHUNK_SIZE } from './world.js';
import { Player } from './player.js';
import { Redstone } from './redstone.js';
import { HOTBAR, getBlock, AIR } from './blocks.js';

const SAVE_KEY = 'dgmcraft.save.v1';

const canvas = document.getElementById('game');
const menuEl = document.getElementById('menu');
const pauseEl = document.getElementById('pause');
const hotbarEl = document.getElementById('hotbar');
const modeNameEl = document.getElementById('mode-name');
const eduPanel = document.getElementById('edu-panel');
const eduText = document.getElementById('edu-text');
const healthFill = document.getElementById('health-fill');
const timeOfDay = document.getElementById('time-of-day');
const toastEl = document.getElementById('toast');

// ---- Three.js setup -----------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x88c5ff);
scene.fog = new THREE.Fog(0x88c5ff, 30, CHUNK_SIZE * 5);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 40, 0);

// Lighting
const sun = new THREE.DirectionalLight(0xffffff, 1.05);
sun.position.set(40, 80, 30);
scene.add(sun);
const ambient = new THREE.AmbientLight(0x6688aa, 0.55);
scene.add(ambient);
const moon = new THREE.DirectionalLight(0x8aa0d6, 0.0);
moon.position.set(-40, 60, -30);
scene.add(moon);

// ---- World, player, redstone -------------------------------------------
const initialSeed = (Math.random() * 0x7fffffff) | 0;
const world = new World(scene, { seed: initialSeed, viewDistance: 4 });
world.streamAround(0, 0);
const player = new Player(camera, world);
player.spawnAtSurface();
const redstone = new Redstone(world);

// Highlight box around the targeted block
const highlightGeom = new THREE.BoxGeometry(1.001, 1.001, 1.001);
const highlightMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 });
const highlightEdges = new THREE.EdgesGeometry(highlightGeom);
const highlight = new THREE.LineSegments(highlightEdges, highlightMat);
highlight.visible = false;
scene.add(highlight);

// ---- Hotbar UI ---------------------------------------------------------
let hotbarIndex = 0;
function rebuildHotbar() {
  hotbarEl.innerHTML = '';
  HOTBAR.forEach((blockId, i) => {
    const meta = getBlock(blockId);
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot' + (i === hotbarIndex ? ' active' : '');
    const idx = document.createElement('span');
    idx.className = 'index';
    idx.textContent = String(i + 1);
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.background = '#' + meta.color.toString(16).padStart(6, '0');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = meta.name.replace('Редстоун: ', 'RS: ');
    slot.append(idx, swatch, name);
    slot.addEventListener('click', () => { hotbarIndex = i; rebuildHotbar(); });
    hotbarEl.appendChild(slot);
  });
}
rebuildHotbar();

// ---- Toast helper ------------------------------------------------------
let toastTimer = null;
function toast(msg, ms = 1800) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), ms);
}

// ---- Input -------------------------------------------------------------
const keys = new Set();

window.addEventListener('keydown', (e) => {
  if (running) {
    if (e.code === 'Escape') { togglePause(); e.preventDefault(); return; }
    keys.add(e.code);
    if (/^Digit[1-9]$/.test(e.code)) {
      hotbarIndex = parseInt(e.code.replace('Digit', ''), 10) - 1;
      rebuildHotbar();
    }
    if (e.code === 'KeyF') player.toggleFly();
    if (e.code === 'KeyR') tryToggleRedstoneSource();
    if (e.code === 'KeyP') saveGame();
  } else {
    if (e.code === 'Escape' && !menuEl.classList.contains('hidden')) return;
  }
  updateInput();
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  updateInput();
});

window.addEventListener('blur', () => { keys.clear(); updateInput(); });

function updateInput() {
  player.input.forward = keys.has('KeyW');
  player.input.back    = keys.has('KeyS');
  player.input.left    = keys.has('KeyA');
  player.input.right   = keys.has('KeyD');
  player.input.jump    = keys.has('Space');
  player.input.sneak   = keys.has('ShiftLeft') || keys.has('ShiftRight');
  player.input.run     = keys.has('ControlLeft');
  player.input.flyUp   = keys.has('Space');
  player.input.flyDown = keys.has('ShiftLeft') || keys.has('ShiftRight');
}

window.addEventListener('wheel', (e) => {
  if (!running) return;
  hotbarIndex = (hotbarIndex + (e.deltaY > 0 ? 1 : -1) + HOTBAR.length) % HOTBAR.length;
  rebuildHotbar();
}, { passive: true });

// Pointer lock + look
canvas.addEventListener('click', () => {
  if (!running) return;
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
});

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    player.rotate(e.movementX, e.movementY);
  }
});

document.addEventListener('mousedown', (e) => {
  if (!running || document.pointerLockElement !== canvas) return;
  if (e.button === 0) breakBlock();
  if (e.button === 2) placeBlock();
});

document.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- Block interaction --------------------------------------------------
function currentRaycast() {
  const eye = player.eye();
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return world.raycast(eye, dir, 6);
}

function breakBlock() {
  const hit = currentRaycast();
  if (!hit) return;
  const meta = getBlock(hit.blockId);
  if (meta.hardness >= 100) return; // unbreakable (e.g. water)
  world.setBlock(hit.x, hit.y, hit.z, AIR);
  if (meta.redstone === 'source') {
    redstone.poweredSources.delete(redstone.key(hit.x, hit.y, hit.z));
  }
  redstone.update();
}

function placeBlock() {
  const hit = currentRaycast();
  if (!hit) return;
  const px = hit.x + hit.normal[0];
  const py = hit.y + hit.normal[1];
  const pz = hit.z + hit.normal[2];
  // Don't place inside the player AABB
  const playerMin = new THREE.Vector3(player.position.x - 0.3, player.position.y, player.position.z - 0.3);
  const playerMax = new THREE.Vector3(player.position.x + 0.3, player.position.y + 1.8, player.position.z + 0.3);
  if (px + 1 > playerMin.x && px < playerMax.x &&
      py + 1 > playerMin.y && py < playerMax.y &&
      pz + 1 > playerMin.z && pz < playerMax.z) {
    return;
  }
  const blockId = HOTBAR[hotbarIndex];
  if (world.getBlock(px, py, pz) !== AIR) return;
  world.setBlock(px, py, pz, blockId);
  redstone.update();
}

function tryToggleRedstoneSource() {
  const hit = currentRaycast();
  if (!hit) return;
  const meta = getBlock(hit.blockId);
  if (meta.redstone === 'source') {
    redstone.toggleSource(hit.x, hit.y, hit.z);
    toast(redstone.poweredSources.has(redstone.key(hit.x, hit.y, hit.z)) ? 'Источник включён' : 'Источник выключен');
  }
}

// ---- Mode + UI ---------------------------------------------------------
function setMode(mode) {
  player.setMode(mode);
  const labels = { creative: 'Творчество', survival: 'Выживание', education: 'Education' };
  modeNameEl.textContent = labels[mode] || mode;
  eduPanel.classList.toggle('hidden', mode !== 'education');
  document.getElementById('health-bar').style.display = mode === 'survival' ? 'flex' : 'none';
  refreshHealth();
}

function refreshHealth() {
  const pct = Math.max(0, Math.min(1, player.health / player.maxHealth));
  healthFill.style.width = (pct * 100) + '%';
  if (player.health <= 0 && player.mode === 'survival') {
    toast('Вы погибли. Возрождаемся...');
    player.health = player.maxHealth;
    player.spawnAtSurface();
  }
}

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    setMode(btn.dataset.mode);
  });
});
document.querySelector('.mode-btn[data-mode="creative"]').classList.add('active');

document.getElementById('start-btn').addEventListener('click', () => startGame());
document.getElementById('resume-btn').addEventListener('click', () => togglePause(false));
document.getElementById('save-btn').addEventListener('click', () => saveGame());
document.getElementById('reset-btn').addEventListener('click', () => resetWorld());
document.getElementById('back-menu-btn').addEventListener('click', () => exitToMenu());

let running = false;
function startGame() {
  menuEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  running = true;
  // Try to load a saved world; if none, just start with the freshly generated one.
  if (loadGame()) toast('Загружен сохранённый мир');
  setTimeout(() => canvas.requestPointerLock?.(), 100);
}

function togglePause(force) {
  const newState = typeof force === 'boolean' ? force : !pauseEl.classList.contains('hidden') ? false : true;
  // Above expression is a bit awkward — simpler:
  const wantOpen = typeof force === 'boolean' ? force : pauseEl.classList.contains('hidden');
  pauseEl.classList.toggle('hidden', !wantOpen);
  running = !wantOpen;
  if (!wantOpen) setTimeout(() => canvas.requestPointerLock?.(), 50);
  else if (document.pointerLockElement === canvas) document.exitPointerLock();
  void newState;
}

function exitToMenu() {
  pauseEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  running = false;
  if (document.pointerLockElement === canvas) document.exitPointerLock();
}

function resetWorld() {
  localStorage.removeItem(SAVE_KEY);
  // Tear down chunks & rebuild from a new seed
  for (const chunk of world.chunks.values()) {
    if (chunk.solidMesh) { world.group.remove(chunk.solidMesh); chunk.solidMesh.geometry.dispose(); }
    if (chunk.transparentMesh) { world.group.remove(chunk.transparentMesh); chunk.transparentMesh.geometry.dispose(); }
  }
  world.chunks.clear();
  world.changes.clear();
  world.seed = (Math.random() * 0x7fffffff) | 0;
  world.noise2D = createNoise(world.seed);
  world.noise2DTrees = createNoise(world.seed + 7);
  world.noise2DBiome = createNoise(world.seed + 13);
  world.streamAround(0, 0);
  player.spawnAtSurface();
  redstone.poweredSources.clear();
  togglePause(false);
  toast('Создан новый мир');
}

// Local helper because resetWorld needs createNoise2D from simplex-noise
function createNoise(seed) {
  let s = seed >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
  return createNoise2DFn(rng);
}

function saveGame() {
  const data = {
    world: world.serialize(),
    redstone: redstone.serialize(),
    player: {
      x: player.position.x, y: player.position.y, z: player.position.z,
      yaw: player.yaw, pitch: player.pitch,
      mode: player.mode, flying: player.flying, health: player.health
    },
    hotbarIndex
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    toast('Мир сохранён');
  } catch (err) {
    toast('Не удалось сохранить: ' + err.message);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data?.world?.seed) return false;

    // Rebuild world from saved seed
    for (const chunk of world.chunks.values()) {
      if (chunk.solidMesh) { world.group.remove(chunk.solidMesh); chunk.solidMesh.geometry.dispose(); }
      if (chunk.transparentMesh) { world.group.remove(chunk.transparentMesh); chunk.transparentMesh.geometry.dispose(); }
    }
    world.chunks.clear();
    world.changes.clear();
    world.seed = data.world.seed;
    world.noise2D = createNoise(world.seed);
    world.noise2DTrees = createNoise(world.seed + 7);
    world.noise2DBiome = createNoise(world.seed + 13);
    world.loadEdits(data.world.edits || []);
    redstone.load(data.redstone || []);
    if (data.player) {
      player.position.set(data.player.x, data.player.y, data.player.z);
      player.yaw = data.player.yaw || 0;
      player.pitch = data.player.pitch || 0;
      setMode(data.player.mode || 'creative');
      document.querySelectorAll('.mode-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.mode === player.mode);
      });
      player.flying = !!data.player.flying;
      player.health = data.player.health ?? player.maxHealth;
    }
    if (typeof data.hotbarIndex === 'number') hotbarIndex = data.hotbarIndex;
    rebuildHotbar();
    world.streamAround(player.position.x, player.position.z);
    redstone.update();
    return true;
  } catch (err) {
    console.warn('loadGame failed', err);
    return false;
  }
}

// ---- Education hover ----------------------------------------------------
function updateEducationPanel() {
  if (player.mode !== 'education') return;
  const hit = currentRaycast();
  if (!hit) {
    eduText.textContent = 'Наведите перекрестие на блок, чтобы узнать о нём.';
    return;
  }
  const meta = getBlock(hit.blockId);
  eduText.innerHTML = `<b>${meta.name}</b> — ${meta.edu || 'Описание отсутствует.'}`;
}

// ---- Day/night cycle ----------------------------------------------------
let timeAccum = 0; // seconds; full day = 240s
const DAY_LENGTH = 240;

function updateDayNight(dt) {
  timeAccum = (timeAccum + dt) % DAY_LENGTH;
  const t = timeAccum / DAY_LENGTH; // 0..1
  // Sun rotates around the world
  const sunAngle = t * Math.PI * 2;
  sun.position.set(Math.cos(sunAngle) * 80, Math.sin(sunAngle) * 80 + 20, 30);
  const above = Math.max(0, Math.sin(sunAngle));
  sun.intensity = 0.2 + above * 1.0;
  moon.intensity = 0.05 + (1 - above) * 0.25;
  ambient.intensity = 0.25 + above * 0.45;

  // Sky color
  const dayCol = new THREE.Color(0x88c5ff);
  const duskCol = new THREE.Color(0xff9a55);
  const nightCol = new THREE.Color(0x0a1024);
  const sky = new THREE.Color();
  if (above > 0.2) sky.copy(dayCol);
  else if (above > 0) sky.copy(duskCol).lerp(dayCol, above / 0.2);
  else sky.copy(nightCol).lerp(duskCol, Math.max(0, 1 + above * 5));
  scene.background = sky;
  scene.fog.color = sky;

  // HUD time
  const hours = Math.floor(t * 24);
  const mins = Math.floor((t * 24 - hours) * 60);
  timeOfDay.textContent = String(hours).padStart(2, '0') + ':' + String(mins).padStart(2, '0');
}

// ---- Resize -------------------------------------------------------------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---- Main loop ----------------------------------------------------------
let lastT = performance.now();
let streamCounter = 0;

function loop() {
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (running) {
    player.update(dt);

    // Stream chunks every ~250ms
    streamCounter += dt;
    if (streamCounter > 0.25) {
      world.streamAround(player.position.x, player.position.z);
      streamCounter = 0;
    }

    updateDayNight(dt);

    // Highlight target block
    const hit = currentRaycast();
    if (hit) {
      highlight.visible = true;
      highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    } else {
      highlight.visible = false;
    }

    updateEducationPanel();
    refreshHealth();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

setMode('creative');
document.getElementById('health-bar').style.display = 'none';
loop();
