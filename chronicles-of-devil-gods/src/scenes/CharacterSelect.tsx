import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RACES, type RaceDef, type ClassDef } from '../game/races';
import { buildHumanoid } from '../game/models';
import { useGameStore } from '../state/useGameStore';

export function CharacterSelect() {
  const [raceIdx, setRaceIdx] = useState(0);
  const [classIdx, setClassIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const select = useGameStore((s) => s.selectCharacter);

  const race: RaceDef = RACES[raceIdx];
  const cls: ClassDef = race.classes[classIdx];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c: HTMLCanvasElement = canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0814, 6, 20);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 1.6, 4.6);
    camera.lookAt(0, 1.2, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0x6c5cdd, 0.55);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffd9a0, 1.4);
    key.position.set(3, 6, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9b6cff, 0.8);
    rim.position.set(-3, 4, -3);
    scene.add(rim);

    // Pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.3, 0.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a1f4a, roughness: 0.6, metalness: 0.3 })
    );
    pedestal.position.y = 0.2;
    pedestal.receiveShadow = true;
    scene.add(pedestal);
    const pedestalRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.04, 8, 48),
      new THREE.MeshStandardMaterial({ color: 0xd4a04a, emissive: 0xd4a04a, emissiveIntensity: 0.6 })
    );
    pedestalRing.rotation.x = Math.PI / 2;
    pedestalRing.position.y = 0.42;
    scene.add(pedestalRing);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(8, 48),
      new THREE.MeshStandardMaterial({ color: 0x14102a, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    let model: THREE.Group | null = null;
    function setRaceModel(r: RaceDef) {
      if (model) scene.remove(model);
      model = buildHumanoid(r);
      model.position.y = 0.42;
      scene.add(model);
    }
    setRaceModel(race);

    function resize() {
      const rect = c.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    let raf = 0;
    let prev = performance.now();
    function loop(t: number) {
      const dt = (t - prev) / 1000;
      prev = t;
      if (model) model.rotation.y += dt * 0.6;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    // Expose setter via dataset hack
    (canvas as HTMLCanvasElement & { __setRace: (r: RaceDef) => void }).__setRace = setRaceModel;

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = canvasRef.current as (HTMLCanvasElement & { __setRace?: (r: RaceDef) => void }) | null;
    c?.__setRace?.(race);
  }, [race]);

  return (
    <div className="select-root">
      <div className="race-list">
        <h1>Chronicles of Devil Gods</h1>
        <h2>— Choose your bloodline —</h2>
        {RACES.map((r, i) => (
          <div
            key={r.id}
            className={`race-card ${i === raceIdx ? 'active' : ''}`}
            onClick={() => { setRaceIdx(i); setClassIdx(0); }}
          >
            <div className="race-name">{r.name}</div>
            <div className="race-arch">{r.archetype}</div>
          </div>
        ))}
      </div>
      <div className="preview">
        <canvas ref={canvasRef} />
      </div>
      <div className="class-panel">
        <div className="title">{race.name}</div>
        <p className="muted" style={{ marginTop: 4 }}>{race.description}</p>
        <div className="muted" style={{ margin: '12px 0 4px' }}>BASE STATS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 13 }}>
          <span>Strength</span><span>{race.baseStats.str}</span>
          <span>Dexterity</span><span>{race.baseStats.dex}</span>
          <span>Intellect</span><span>{race.baseStats.int}</span>
          <span>Vitality</span><span>{race.baseStats.vit}</span>
        </div>
        <div className="muted" style={{ margin: '20px 0 6px' }}>CHOOSE A CLASS</div>
        {race.classes.map((c, i) => (
          <div
            key={c.id}
            className={`class-card ${i === classIdx ? 'active' : ''}`}
            onClick={() => setClassIdx(i)}
          >
            <span className="class-name">{c.name}</span>
            <span className="class-role">{c.role}</span>
            <div className="muted" style={{ marginTop: 4 }}>{c.description}</div>
          </div>
        ))}
        <button
          className="primary"
          style={{ width: '100%', marginTop: 16, padding: '14px 0', fontSize: 16 }}
          onClick={() => select(race.id, cls)}
        >
          Enter the World
        </button>
      </div>
    </div>
  );
}
