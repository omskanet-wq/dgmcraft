import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BUILDING_LIST, BUILDINGS, type BuildingId } from '../game/buildings';
import { buildBuilding } from '../game/models';
import { useGameStore } from '../state/useGameStore';
import { HUD } from '../ui/HUD';

const GRID_SIZE = 20; // tiles per side
const TILE = 1;

export function StrongholdScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<BuildingId>('keep');
  const selectedRef = useRef<BuildingId>('keep');
  useLayoutEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const buildings = useGameStore((s) => s.buildings);
  const place = useGameStore((s) => s.placeBuilding);
  const tick = useGameStore((s) => s.tickStronghold);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const c: HTMLDivElement = container;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    c.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1208);
    scene.fog = new THREE.Fog(0x0a1208, 25, 60);

    const aspect = c.clientWidth / c.clientHeight;
    const viewSize = 14;
    const camera = new THREE.OrthographicCamera(
      -viewSize * aspect, viewSize * aspect,
      viewSize, -viewSize, 0.1, 200,
    );
    camera.position.set(18, 22, 18);
    camera.lookAt(GRID_SIZE / 2, 0, GRID_SIZE / 2);

    scene.add(new THREE.AmbientLight(0x8a9c5a, 0.6));
    const sun = new THREE.DirectionalLight(0xfff2c2, 1.2);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.camera.left = -25;
    sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 25;
    sun.shadow.camera.bottom = -25;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    // Grass plain
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_SIZE * TILE, GRID_SIZE * TILE),
      new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: 1 }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(GRID_SIZE / 2, 0, GRID_SIZE / 2);
    grass.receiveShadow = true;
    scene.add(grass);

    // Grid lines (single buffer)
    const lineMat = new THREE.LineBasicMaterial({ color: 0x6a7a4a, transparent: true, opacity: 0.35 });
    const pts: number[] = [];
    for (let i = 0; i <= GRID_SIZE; i++) {
      pts.push(i, 0.01, 0, i, 0.01, GRID_SIZE);
      pts.push(0, 0.01, i, GRID_SIZE, 0.01, i);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    // Hover preview
    let hoverGroup: THREE.Group | null = null;
    let hoverTile = { x: -1, z: -1 };
    function rebuildHoverPreview(id: BuildingId) {
      if (hoverGroup) scene.remove(hoverGroup);
      const def = BUILDINGS[id];
      hoverGroup = buildBuilding(def);
      hoverGroup.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.material) {
          const mat = (m.material as THREE.Material).clone();
          (mat as THREE.MeshStandardMaterial).transparent = true;
          (mat as THREE.MeshStandardMaterial).opacity = 0.5;
          m.material = mat;
        }
      });
      hoverGroup.visible = false;
      scene.add(hoverGroup);
    }
    rebuildHoverPreview(selectedRef.current);

    const placedMeshes = new Map<number, THREE.Group>();
    function syncBuildings() {
      const current = useGameStore.getState().buildings;
      // Remove deleted (none for now) and add new
      for (const b of current) {
        if (!placedMeshes.has(b.uid)) {
          const def = BUILDINGS[b.building];
          const g = buildBuilding(def);
          g.position.set(b.x + def.size / 2, 0, b.z + def.size / 2);
          if (b.underConstruction) {
            g.traverse((o) => {
              const m = o as THREE.Mesh;
              if (m.isMesh && m.material) {
                const mat = (m.material as THREE.Material).clone();
                (mat as THREE.MeshStandardMaterial).transparent = true;
                (mat as THREE.MeshStandardMaterial).opacity = 0.4;
                m.material = mat;
              }
            });
          }
          scene.add(g);
          placedMeshes.set(b.uid, g);
        } else {
          // Update construction state
          const g = placedMeshes.get(b.uid)!;
          if (!b.underConstruction) {
            g.traverse((o) => {
              const m = o as THREE.Mesh;
              if (m.isMesh && m.material) {
                (m.material as THREE.MeshStandardMaterial).opacity = 1;
                (m.material as THREE.MeshStandardMaterial).transparent = false;
              }
            });
          }
        }
      }
    }

    // Mouse picking
    const ray = new THREE.Raycaster();
    const m2 = new THREE.Vector2();
    function pointerToTile(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      m2.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      m2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(m2, camera);
      const hit = ray.intersectObject(grass);
      if (hit.length === 0) return null;
      const p = hit[0].point;
      return {
        x: Math.floor(p.x),
        z: Math.floor(p.z),
      };
    }

    function onMove(e: PointerEvent) {
      const tgt = e.target as HTMLElement;
      if (tgt.closest('.hud-root') || tgt.closest('.build-menu')) return;
      const tile = pointerToTile(e);
      if (!tile) return;
      const def = BUILDINGS[selectedRef.current];
      const tx = Math.max(0, Math.min(GRID_SIZE - def.size, tile.x));
      const tz = Math.max(0, Math.min(GRID_SIZE - def.size, tile.z));
      hoverTile = { x: tx, z: tz };
      if (hoverGroup) {
        hoverGroup.visible = true;
        hoverGroup.position.set(tx + def.size / 2, 0, tz + def.size / 2);
      }
    }
    function onLeave() {
      if (hoverGroup) hoverGroup.visible = false;
    }
    function onDown(e: PointerEvent) {
      const tgt = e.target as HTMLElement;
      if (tgt.closest('.hud-root') || tgt.closest('.build-menu')) return;
      const tile = pointerToTile(e);
      if (!tile) return;
      const def = BUILDINGS[selectedRef.current];
      const tx = Math.max(0, Math.min(GRID_SIZE - def.size, tile.x));
      const tz = Math.max(0, Math.min(GRID_SIZE - def.size, tile.z));
      place(selectedRef.current, tx, tz);
      // syncBuildings runs in loop
    }
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.addEventListener('pointerdown', onDown);

    // Resize
    function resize() {
      const w = c.clientWidth;
      const h = c.clientHeight;
      renderer.setSize(w, h, false);
      const a = w / h;
      camera.left = -viewSize * a;
      camera.right = viewSize * a;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    // Camera pan with arrow keys
    const keys = new Set<string>();
    const kd = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
    const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    let lastSelected: BuildingId = selectedRef.current;
    let raf = 0;
    let prev = performance.now();
    const camTarget = new THREE.Vector3(GRID_SIZE / 2, 0, GRID_SIZE / 2);
    function loop(t: number) {
      const dt = (t - prev) / 1000;
      prev = t;

      if (selectedRef.current !== lastSelected) {
        rebuildHoverPreview(selectedRef.current);
        lastSelected = selectedRef.current;
      }

      const panSpeed = 8;
      if (keys.has('w') || keys.has('arrowup')) { camTarget.x -= panSpeed * dt; camTarget.z -= panSpeed * dt; }
      if (keys.has('s') || keys.has('arrowdown')) { camTarget.x += panSpeed * dt; camTarget.z += panSpeed * dt; }
      if (keys.has('a') || keys.has('arrowleft')) { camTarget.x -= panSpeed * dt; camTarget.z += panSpeed * dt; }
      if (keys.has('d') || keys.has('arrowright')) { camTarget.x += panSpeed * dt; camTarget.z -= panSpeed * dt; }
      camTarget.x = Math.max(0, Math.min(GRID_SIZE, camTarget.x));
      camTarget.z = Math.max(0, Math.min(GRID_SIZE, camTarget.z));
      camera.position.set(camTarget.x + 18, 22, camTarget.z + 18);
      camera.lookAt(camTarget);

      tick(dt);
      syncBuildings();

      // animate hover ring color when invalid
      if (hoverGroup) {
        hoverGroup.position.y = Math.sin(t * 0.005) * 0.05;
      }

      void hoverTile;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      renderer.dispose();
      c.removeChild(renderer.domElement);
    };
  // We intentionally only run effect once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={containerRef} style={{ position: 'fixed', inset: 0 }} />
      <HUD />
      <div className="build-menu">
        {BUILDING_LIST.map((b) => {
          const blocked = b.unique && buildings.some((x) => x.building === b.id);
          return (
            <div
              key={b.id}
              className={`build-card ${selected === b.id ? 'active' : ''}`}
              onClick={() => !blocked && setSelected(b.id)}
              style={{ opacity: blocked ? 0.4 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
            >
              <div className="b-name">{b.name}</div>
              <div className="b-cost">
                {b.costGold ? `${b.costGold}g ` : ''}
                {b.costStone ? `${b.costStone}s ` : ''}
                {b.costWood ? `${b.costWood}w` : ''}
              </div>
              <div className="muted" style={{ marginTop: 4 }}>{b.size}×{b.size} · {b.buildSeconds}s</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
