import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../state/useGameStore';
import { BUILDING_LIST, BUILDINGS, type BuildingId } from '../game/buildings';
import { buildBastionBuilding } from '../game/models';
import { getPbrMaterial } from '../game/textures';
import { makeRenderer, makeRenderTarget } from '../utils/post';
import { getProfile } from '../utils/quality';
import HUD from '../ui/HUD';

const GRID = 20;

export default function BastionScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selected, setSelected] = useState<BuildingId | null>(null);
  const selectedRef = useRef<BuildingId | null>(null);
  useLayoutEffect(() => { selectedRef.current = selected; }, [selected]);

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
    window.addEventListener('resize', resize);

    const renderer = makeRenderer(c, profile);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a26);
    scene.fog = new THREE.FogExp2(0x1a1a26, 0.018);

    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 14;
    const camera = new THREE.OrthographicCamera(-viewSize * aspect, viewSize * aspect, viewSize, -viewSize, 0.1, 200);
    camera.position.set(GRID / 2 + 14, 22, GRID / 2 + 14);
    camera.lookAt(GRID / 2, 0, GRID / 2);
    const target = makeRenderTarget(renderer, scene, camera, profile);

    // Ground — packed dirt with grid lines
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID, GRID),
      getPbrMaterial('grass', GRID / 2),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(GRID / 2, 0, GRID / 2);
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid overlay
    const grid = new THREE.GridHelper(GRID, GRID, 0x6a6a8a, 0x4a4a6a);
    grid.position.set(GRID / 2, 0.01, GRID / 2);
    (grid.material as THREE.LineBasicMaterial).opacity = 0.35;
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    scene.add(grid);

    // Lights
    scene.add(new THREE.HemisphereLight(0xa8b0d0, 0x1a1a14, 0.7 * profile.hemiIntensityMul));
    const sun = new THREE.DirectionalLight(0xffd9a0, 1.2);
    sun.position.set(20, 30, 20);
    if (profile.shadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
      sun.shadow.camera.left = -25;
      sun.shadow.camera.right = 25;
      sun.shadow.camera.top = 25;
      sun.shadow.camera.bottom = -25;
    }
    scene.add(sun);

    // Existing buildings
    const groupsByUid = new Map<number, THREE.Group>();
    function syncBuildings() {
      const list = useGameStore.getState().buildings;
      // remove vanished
      for (const [uid, g] of groupsByUid.entries()) {
        if (!list.find((b) => b.uid === uid)) {
          scene.remove(g);
          g.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
          groupsByUid.delete(uid);
        }
      }
      for (const b of list) {
        let g = groupsByUid.get(b.uid);
        if (!g) {
          const def = BUILDINGS[b.building];
          g = buildBastionBuilding(def);
          g.position.set(b.x, 0, b.z);
          scene.add(g);
          groupsByUid.set(b.uid, g);
        }
        // construction state
        const targetOpacity = b.underConstruction ? 0.5 : 1.0;
        g.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.material) {
            const mat = m.material as THREE.MeshStandardMaterial & { transparent?: boolean; opacity?: number };
            if (mat.opacity !== undefined) {
              mat.transparent = b.underConstruction;
              mat.opacity = targetOpacity;
            }
          }
        });
      }
    }
    const unsub = useGameStore.subscribe(syncBuildings);
    syncBuildings();

    // Hover preview
    const previewMat = new THREE.MeshStandardMaterial({ color: 0x6aff9a, transparent: true, opacity: 0.45, emissive: 0x2a8a4a, emissiveIntensity: 0.4 });
    const invalidMat = new THREE.MeshStandardMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.45, emissive: 0x7a2a2a, emissiveIntensity: 0.4 });
    const previewGroup = new THREE.Group();
    previewGroup.visible = false;
    scene.add(previewGroup);
    let previewTile = { x: 0, z: 0 };

    function setPreview(id: BuildingId | null) {
      previewGroup.clear();
      if (!id) { previewGroup.visible = false; return; }
      const def = BUILDINGS[id];
      const g = buildBastionBuilding(def);
      g.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.material) m.material = previewMat;
      });
      previewGroup.add(g);
      previewGroup.visible = true;
    }

    const tmpRay = new THREE.Raycaster();
    function pointerToTile(clientX: number, clientY: number): { x: number; z: number } | null {
      const rect = c.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      tmpRay.setFromCamera(ndc, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (!tmpRay.ray.intersectPlane(plane, hit)) return null;
      return { x: Math.floor(hit.x), z: Math.floor(hit.z) };
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!selectedRef.current) { previewGroup.visible = false; return; }
      const t = pointerToTile(e.clientX, e.clientY);
      if (!t) return;
      previewTile = t;
      previewGroup.position.set(t.x, 0, t.z);
      previewGroup.visible = true;
      // valid?
      const def = BUILDINGS[selectedRef.current];
      const list = useGameStore.getState().buildings;
      let invalid = t.x < 0 || t.z < 0 || t.x + def.size > GRID || t.z + def.size > GRID;
      if (!invalid) for (const b of list) {
        const bdef = BUILDINGS[b.building];
        if (t.x < b.x + bdef.size && t.x + def.size > b.x && t.z < b.z + bdef.size && t.z + def.size > b.z) {
          invalid = true; break;
        }
      }
      previewGroup.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.material) m.material = invalid ? invalidMat : previewMat;
      });
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.hud-clickable')) return;
      if (!selectedRef.current) return;
      const t = pointerToTile(e.clientX, e.clientY);
      if (!t) return;
      const ok = useGameStore.getState().placeBuilding(selectedRef.current, t.x, t.z);
      if (!ok) return;
      // Keep building selected for rapid placement
    };
    c.addEventListener('pointermove', onPointerMove);
    c.addEventListener('pointerdown', onPointerDown);

    // Camera pan with arrows / WASD
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === 'b' || e.key === 'B') useGameStore.getState().setScreen('city');
      if (e.key === 'Escape') {
        if (selectedRef.current) { selectedRef.current = null; setSelected(null); setPreview(null); }
        else useGameStore.getState().setScreen('menu');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let camTargetX = GRID / 2;
    let camTargetZ = GRID / 2;
    let last = performance.now();
    let raf = 0;
    let stop = false;
    function frame() {
      if (stop) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Pan
      const panSpeed = 12;
      if (keys['arrowleft'] || keys['a']) camTargetX -= panSpeed * dt;
      if (keys['arrowright'] || keys['d']) camTargetX += panSpeed * dt;
      if (keys['arrowup'] || keys['w']) camTargetZ -= panSpeed * dt;
      if (keys['arrowdown'] || keys['s']) camTargetZ += panSpeed * dt;
      camTargetX = Math.max(2, Math.min(GRID - 2, camTargetX));
      camTargetZ = Math.max(2, Math.min(GRID - 2, camTargetZ));
      camera.position.set(camTargetX + 14, 22, camTargetZ + 14);
      camera.lookAt(camTargetX, 0, camTargetZ);

      // pulse preview
      if (previewGroup.visible) {
        const s = 1 + Math.sin(now * 0.005) * 0.04;
        previewGroup.scale.set(s, s, s);
      }

      // Re-sync construction states (mutates materials each frame for sub-second progression smoothness)
      syncBuildings();

      target.render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // expose preview setter via dataset attribute on the canvas, picked up by React
    (c as unknown as { __setPreview?: (id: BuildingId | null) => void }).__setPreview = setPreview;
    void previewTile;

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      c.removeEventListener('pointermove', onPointerMove);
      c.removeEventListener('pointerdown', onPointerDown);
      target.dispose();
      renderer.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    };
  }, []);

  // Push preview updates from React selection state
  useEffect(() => {
    const c = canvasRef.current as (HTMLCanvasElement & { __setPreview?: (id: BuildingId | null) => void }) | null;
    if (!c || !c.__setPreview) return;
    c.__setPreview(selected);
  }, [selected]);

  return (
    <div className="scene-root">
      <canvas ref={canvasRef} className="scene-canvas" />
      <HUD />
      <div className="build-bar hud-clickable">
        <div className="build-bar-title">BUILD MENU</div>
        <div className="build-bar-grid">
          {BUILDING_LIST.map((b) => {
            const isSel = selected === b.id;
            return (
              <button
                key={b.id}
                className={`build-card${isSel ? ' selected' : ''}`}
                onClick={() => setSelected(isSel ? null : b.id)}
              >
                <div className="build-name">{b.name}</div>
                <div className="build-desc">{b.description}</div>
                <div className="build-costs">
                  {Object.entries(b.costs).map(([k, v]) => (
                    <span key={k} className="build-cost">{v}× {k}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        <div className="build-hint">
          {selected
            ? `Click a tile to place. Esc to cancel. B to enter the city.`
            : `Pick a building. Use WASD / arrows to pan.`}
        </div>
      </div>
    </div>
  );
}
