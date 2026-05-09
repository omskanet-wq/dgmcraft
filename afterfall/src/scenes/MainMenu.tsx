import { useGameStore } from '../state/useGameStore';
import type { QualityPreset } from '../utils/quality';

const PRESET_LABEL: Record<QualityPreset, string> = {
  low: 'LOW · phones / weak laptops',
  medium: 'MEDIUM · most modern devices',
  high: 'HIGH · gaming rigs',
};

export default function MainMenu() {
  const setScreen = useGameStore((s) => s.setScreen);
  const quality = useGameStore((s) => s.quality);
  const setQuality = useGameStore((s) => s.setQuality);
  const measuredFps = useGameStore((s) => s.measuredFps);

  return (
    <div className="menu-root">
      <div className="menu-bg" />
      <div className="menu-card">
        <div className="menu-tag">v0.1 · single-player · offline</div>
        <h1 className="menu-title">AFTERFALL</h1>
        <div className="menu-sub">— Bastion of the Last City —</div>
        <p className="menu-blurb">
          The world fell quiet, then it started moving again. Scavenge the ruined city
          for supplies. Carve a stronghold out of the rubble. Hold the gate when night
          drags the dead back home.
        </p>
        <div className="menu-actions">
          <button className="btn primary" onClick={() => setScreen('city')}>Enter the city</button>
          <button className="btn" onClick={() => setScreen('bastion')}>Open the bastion</button>
        </div>
        <div className="menu-quality">
          <div className="menu-quality-title">Graphics preset</div>
          <div className="menu-quality-row">
            {(['low', 'medium', 'high'] as QualityPreset[]).map((p) => (
              <button
                key={p}
                className={`btn small ${quality === p ? 'primary' : 'ghost'}`}
                onClick={() => setQuality(p)}
              >{PRESET_LABEL[p]}</button>
            ))}
          </div>
          <div className="menu-quality-hint">
            Auto-detected: <b>{quality}</b>. Live FPS: <b>{Math.round(measuredFps)}</b>.
            Drop a tier any time if you see lag — it takes effect when you re-enter a scene.
          </div>
        </div>
        <div className="menu-tips">
          <div><b>WASD</b> / click to move · <b>LMB</b> attack · <b>1-6</b> hotbar · <b>I</b> bag · <b>C</b> craft · <b>B</b> bastion</div>
          <div className="tip-mobile">On mobile: drag anywhere on the right half for the joystick, tap an enemy to attack, tap a building card then a tile to place.</div>
        </div>
        <div className="menu-credits">
          Procedural world &amp; models · CC0 PBR textures from ambientCG · No third-party game content.
        </div>
      </div>
    </div>
  );
}
