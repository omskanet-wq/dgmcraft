import * as THREE from 'three';

interface FloatingNumber {
  el: HTMLDivElement;
  worldPos: THREE.Vector3;
  velocity: THREE.Vector3;
  ttl: number;
}

const floats: FloatingNumber[] = [];
let host: HTMLDivElement | null = null;

function ensureHost(): HTMLDivElement {
  if (host && document.body.contains(host)) return host;
  const h = document.createElement('div');
  h.style.position = 'fixed';
  h.style.inset = '0';
  h.style.pointerEvents = 'none';
  h.style.zIndex = '40';
  document.body.appendChild(h);
  host = h;
  return h;
}

export function spawnDamage(world: THREE.Vector3, n: number, color = '#ffce6a'): void {
  const h = ensureHost();
  const el = document.createElement('div');
  el.textContent = `-${Math.round(n)}`;
  el.style.position = 'absolute';
  el.style.color = color;
  el.style.fontWeight = '800';
  el.style.fontSize = '18px';
  el.style.textShadow = '0 0 6px rgba(0,0,0,0.9), 0 1px 0 #000';
  el.style.pointerEvents = 'none';
  h.appendChild(el);
  floats.push({
    el, worldPos: world.clone(), ttl: 1.0,
    velocity: new THREE.Vector3(0, 0, 0),
  });
}

export function spawnPickup(world: THREE.Vector3, label: string, color = '#cfcfcf'): void {
  const h = ensureHost();
  const el = document.createElement('div');
  el.textContent = label;
  el.style.position = 'absolute';
  el.style.color = color;
  el.style.fontWeight = '700';
  el.style.fontSize = '14px';
  el.style.textShadow = '0 1px 2px rgba(0,0,0,0.9)';
  el.style.pointerEvents = 'none';
  h.appendChild(el);
  floats.push({
    el, worldPos: world.clone(), ttl: 1.4,
    velocity: new THREE.Vector3(0, 0, 0),
  });
}

export function tickHud(camera: THREE.Camera, dt: number): void {
  const w = window.innerWidth, hh = window.innerHeight;
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i];
    f.ttl -= dt;
    if (f.ttl <= 0) {
      f.el.remove();
      floats.splice(i, 1);
      continue;
    }
    f.worldPos.y += dt * 0.8;
    const v = f.worldPos.clone().project(camera);
    const sx = (v.x * 0.5 + 0.5) * w;
    const sy = (1 - (v.y * 0.5 + 0.5)) * hh;
    f.el.style.left = `${sx}px`;
    f.el.style.top = `${sy}px`;
    f.el.style.opacity = `${Math.min(1, f.ttl)}`;
  }
}
