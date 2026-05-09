import { useGameStore } from '../state/useGameStore';
import { resumeAudio } from '../utils/audio';
import { t, setLocale, getLocale, type Locale } from '../utils/i18n';

export default function Settings({ onClose }: { onClose: () => void }) {
  const volume = useGameStore((s) => s.audioVolume);
  const muted = useGameStore((s) => s.audioMuted);
  const quality = useGameStore((s) => s.quality);
  const setQuality = useGameStore((s) => s.setQuality);
  const setVolume = useGameStore((s) => s.setAudioVolume);
  const setMuted = useGameStore((s) => s.setAudioMuted);
  const showFps = useGameStore((s) => s.showFps);
  const setShowFps = useGameStore((s) => s.setShowFps);
  const fps = useGameStore((s) => s.measuredFps);
  const saveGame = useGameStore((s) => s.saveGame);
  const resetSave = useGameStore((s) => s.resetSave);

  return (
    <div className="modal hud-clickable" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ width: 420 }}>
        <div className="modal-head">
          <h3>{t('settings.title')}</h3>
          <button className="btn small ghost" onClick={onClose}>{t('btn.close')}</button>
        </div>
        <div className="settings-section">
          <label className="settings-row">
            <span>{t('settings.master_volume')}</span>
            <input
              type="range" min={0} max={1} step={0.05} value={volume}
              onChange={(e) => { resumeAudio(); setVolume(Number(e.target.value)); }}
            />
            <span className="settings-val">{Math.round(volume * 100)}%</span>
          </label>
          <label className="settings-row">
            <span>{t('settings.mute')}</span>
            <input type="checkbox" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
          </label>
        </div>
        <div className="settings-section">
          <div className="settings-row">
            <span>{t('settings.quality')}</span>
            <div className="seg">
              {(['low', 'medium', 'high'] as const).map((q) => (
                <button
                  key={q}
                  className={`seg-btn${quality === q ? ' on' : ''}`}
                  onClick={() => setQuality(q)}
                >{t(`settings.q.${q}`)}</button>
              ))}
            </div>
          </div>
          <p className="settings-hint">{t('settings.quality_hint')}</p>
        </div>
        <div className="settings-section">
          <div className="settings-row">
            <span>{t('settings.language')}</span>
            <div className="seg">
              {(['ru', 'en'] as Locale[]).map((l) => (
                <button
                  key={l}
                  className={`seg-btn${getLocale() === l ? ' on' : ''}`}
                  onClick={() => { setLocale(l); /* trigger rerender */ useGameStore.setState({ toast: l === 'ru' ? 'Язык: русский' : 'Language: English' }); }}
                >{l.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="settings-section">
          <label className="settings-row">
            <span>{t('settings.show_fps')}</span>
            <input type="checkbox" checked={showFps} onChange={(e) => setShowFps(e.target.checked)} />
            {showFps && <span className="settings-val">{fps} fps</span>}
          </label>
        </div>
        <div className="settings-section">
          <div className="settings-row">
            <span>{t('settings.save_slot')}</span>
            <div className="seg">
              <button className="seg-btn" onClick={saveGame}>{t('btn.save_now')}</button>
              <button className="seg-btn" onClick={resetSave}>{t('btn.clear_save')}</button>
            </div>
          </div>
          <p className="settings-hint">{t('settings.autosave_hint')}</p>
        </div>
      </div>
    </div>
  );
}
