import { useState } from 'react';
import { useGameStore, isNight } from '../state/useGameStore';
import { ITEMS, RARITY_COLOR } from '../game/items';
import Inventory from './Inventory';
import Crafting from './Crafting';
import Minimap from './Minimap';
import Settings from './Settings';
import Quests from './Quests';
import { t } from '../utils/i18n';

export default function HUD() {
  const player = useGameStore((s) => s.player);
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const worldTime = useGameStore((s) => s.worldTime);
  const dayCount = useGameStore((s) => s.dayCount);
  const toast = useGameStore((s) => s.toast);
  const setToast = useGameStore((s) => s.setToast);
  const [showInv, setShowInv] = useState(false);
  const [showCraft, setShowCraft] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const showFps = useGameStore((s) => s.showFps);
  const fps = useGameStore((s) => s.measuredFps);
  const quests = useGameStore((s) => s.quests);
  const pendingClaims = quests.filter((q) => q.done && !q.claimed).length;

  const weapon = player.equipped.weapon;
  const weaponDef = weapon ? ITEMS[weapon] : null;

  // Hotbar = first 6 stackable consumables / weapons
  const hotbar = player.inventory
    .filter((s) => {
      const d = ITEMS[s.item];
      return d && (d.slot === 'food' || d.slot === 'drink' || d.slot === 'medical' || d.slot === 'weapon' || d.slot === 'tool');
    })
    .slice(0, 6);

  const hh = Math.floor(worldTime * 24);
  const mm = Math.floor((worldTime * 24 - hh) * 60);
  const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const night = isNight(worldTime);

  return (
    <div className="hud-root">
      {/* Top-left: survival meters */}
      <div className="meters">
        <Meter label={t('meter.hp')} value={player.hp} max={player.hpMax} color="#d65a5a" icon="❤" />
        <Meter label={t('meter.hunger')} value={player.hunger} max={player.hungerMax} color="#d68a3a" icon="🍖" />
        <Meter label={t('meter.thirst')} value={player.thirst} max={player.thirstMax} color="#3a8ad6" icon="💧" />
        <Meter label={t('meter.stamina')} value={player.stamina} max={player.staminaMax} color="#5fcf6e" icon="⚡" />
      </div>

      {/* Top-right: clock + minimap (city only) */}
      <div className="top-right">
        <div className="clock">
          <div className={`clock-time${night ? ' night' : ''}`}>
            {night ? '🌙' : '☀'} {time}
          </div>
          <div className="clock-day">{t('time.day')} {dayCount}</div>
        </div>
        {screen === 'city' && <Minimap />}
      </div>

      {/* Top-center: level + XP + counters */}
      <div className="level-bar">
        <span className="lvl-num">УР {player.level}</span>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${(player.xp / (player.level * 100)) * 100}%` }} />
        </div>
        <span className="counter">☠ {useGameStore.getState().kills}</span>
      </div>

      {/* Bottom: hotbar */}
      <div className="hotbar hud-clickable">
        {Array.from({ length: 6 }).map((_, i) => {
          const stack = hotbar[i];
          const def = stack ? ITEMS[stack.item] : null;
          const sel = player.hotbarSelected === i;
          return (
            <button
              key={i}
              className={`hotbar-slot${sel ? ' selected' : ''}`}
              onClick={() => {
                if (stack && def) {
                  if (def.slot === 'weapon' || def.slot === 'tool') useGameStore.getState().equip(stack.item);
                  else useGameStore.getState().consume(stack.item);
                }
              }}
              title={def?.name ?? '(empty)'}
            >
              <span className="key-hint">{i + 1}</span>
              {def && (
                <>
                  <span className="hotbar-icon" style={{ color: RARITY_COLOR[def.rarity] }}>{def.icon}</span>
                  {stack && stack.qty > 1 && <span className="hotbar-qty">{stack.qty}</span>}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom-right: weapon panel + actions */}
      <div className="weapon-panel hud-clickable">
        <div className="weapon-row">
          <span className="weapon-icon">{weaponDef?.icon ?? '👊'}</span>
          <div className="weapon-meta">
            <div className="weapon-name" style={{ color: weaponDef ? RARITY_COLOR[weaponDef.rarity] : '#cfcfcf' }}>
              {weaponDef?.name ?? t('combat.unarmed')}
            </div>
            <div className="weapon-stats">
              {weaponDef ? `${t('combat.dmg')} ${weaponDef.damage} · ${t('combat.range')} ${weaponDef.range}${weaponDef.ranged ? ' · ' + t('combat.ranged') : ''}` : t('combat.find_weapon')}
            </div>
          </div>
        </div>
        <div className="action-row">
          <button className="btn small" onClick={() => setShowInv(true)}>{t('btn.bag')}</button>
          <button className="btn small" onClick={() => setShowCraft(true)}>{t('btn.craft')}</button>
          {screen === 'city' && <button className="btn small" onClick={() => setScreen('bastion')}>{t('btn.bastion')}</button>}
          {screen === 'bastion' && <button className="btn small" onClick={() => setScreen('city')}>{t('btn.city')}</button>}
          <button className="btn small" onClick={() => setShowQuests(true)}>
            {t('btn.tasks')}{pendingClaims > 0 ? ` (${pendingClaims}!)` : ''}
          </button>
          <button className="btn small ghost" onClick={() => setShowSettings(true)} title={t('btn.settings')}>⚙</button>
          <button className="btn small ghost" onClick={() => setScreen('menu')}>{t('btn.menu')}</button>
        </div>
      </div>

      {showFps && <div className="fps-readout">{fps} FPS</div>}

      {showInv && <Inventory onClose={() => setShowInv(false)} />}
      {showCraft && <Crafting onClose={() => setShowCraft(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showQuests && <Quests onClose={() => setShowQuests(false)} />}

      {toast && (
        <div className="toast" onAnimationEnd={() => setToast(null)}>{toast}</div>
      )}
    </div>
  );
}

function Meter({ label, value, max, color, icon }: { label: string; value: number; max: number; color: string; icon: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="meter">
      <span className="meter-icon">{icon}</span>
      <div className="meter-bar">
        <div className="meter-fill" style={{ width: `${pct}%`, background: color }} />
        <span className="meter-label">{label}</span>
        <span className="meter-val">{Math.round(value)}/{Math.round(max)}</span>
      </div>
    </div>
  );
}
