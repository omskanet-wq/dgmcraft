import { useEffect, useRef } from 'react';
import { getWorld, BIOME_COLORS } from '../game/worldSingleton';
import { getPlayerPos } from '../game/playerTracker';

const SIZE = 168;

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);

  // Render the static biome map once
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const world = getWorld();
    const ws = world.size;
    const stride = world.districtSize + world.roadWidth;
    c.width = SIZE; c.height = SIZE;
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, SIZE, SIZE);

    // Draw districts
    for (let ix = 0; ix < world.gridSize; ix++) {
      for (let iz = 0; iz < world.gridSize; iz++) {
        const d = world.districts[ix][iz];
        const x = (d.worldX / ws) * SIZE;
        const y = (d.worldZ / ws) * SIZE;
        const w = (world.districtSize / ws) * SIZE;
        ctx.fillStyle = BIOME_COLORS[d.biome] ?? '#222';
        ctx.fillRect(x, y, w, w);
      }
    }
    // Draw roads
    ctx.fillStyle = '#1a1c22';
    for (const r of world.roads) {
      const ax = (r.ax / ws) * SIZE;
      const az = (r.az / ws) * SIZE;
      const bx = (r.bx / ws) * SIZE;
      const bz = (r.bz / ws) * SIZE;
      ctx.save();
      ctx.lineWidth = Math.max(1, (r.width / ws) * SIZE);
      ctx.strokeStyle = r.hasPaint ? '#15181f' : '#1a1c22';
      ctx.beginPath();
      ctx.moveTo(ax, az);
      ctx.lineTo(bx, bz);
      ctx.stroke();
      ctx.restore();
    }
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);
    void stride;
  }, []);

  // Animate the player dot every frame
  useEffect(() => {
    const c = overlayRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = SIZE; c.height = SIZE;
    let raf = 0;
    let stop = false;
    const world = getWorld();
    function frame() {
      if (stop || !ctx) return;
      ctx.clearRect(0, 0, SIZE, SIZE);
      const p = getPlayerPos();
      const px = (p.x / world.size) * SIZE;
      const pz = (p.z / world.size) * SIZE;
      // Streaming radius indicator
      const r = (60 / world.size) * SIZE;
      ctx.beginPath();
      ctx.arc(px, pz, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 122, 42, 0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 122, 42, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Player dot
      ctx.beginPath();
      ctx.arc(px, pz, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7a2a';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => { stop = true; cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="minimap">
      <canvas ref={canvasRef} className="minimap-base" />
      <canvas ref={overlayRef} className="minimap-overlay" />
      <div className="minimap-tag">600 × 600 m</div>
    </div>
  );
}
