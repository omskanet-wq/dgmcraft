import { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { Inventory } from './Inventory';
import { Crafting } from './Crafting';
import { LootboxPanel } from './LootboxPanel';

interface Props {
  showStrongholdButton?: boolean;
}

export function HUD({ showStrongholdButton = true }: Props) {
  const player = useGameStore((s) => s.player);
  const className = useGameStore((s) => s.className);
  const setScreen = useGameStore((s) => s.setScreen);
  const screen = useGameStore((s) => s.screen);
  const [openModal, setOpenModal] = useState<null | 'inv' | 'craft' | 'loot'>(null);

  const hpPct = (player.hp / player.hpMax) * 100;
  const mpPct = (player.mp / player.mpMax) * 100;

  return (
    <div className="hud-root">
      <div className="hud-top-left">
        <div className="name">{className ?? 'Hero'}</div>
        <div className="muted">Lv {player.level} · XP {player.xp}/{player.level * 100}</div>
        <div className="res">
          <span>Gold</span><span>{player.gold}</span>
          <span>Stone</span><span>{player.stone}</span>
          <span>Wood</span><span>{player.wood}</span>
          <span>Food</span><span>{player.food}</span>
          <span>Mana</span><span>{player.mana}</span>
        </div>
      </div>

      <div className="hud-top-right">
        <button onClick={() => setOpenModal('inv')}>Inventory (I)</button>
        <button onClick={() => setOpenModal('craft')}>Crafting (C)</button>
        <button onClick={() => setOpenModal('loot')}>Shrines (L)</button>
        {showStrongholdButton && screen === 'world' && (
          <button onClick={() => setScreen('stronghold')}>Stronghold (B)</button>
        )}
        {screen === 'stronghold' && (
          <button onClick={() => setScreen('world')}>Adventure (B)</button>
        )}
      </div>

      <div className="hud-bottom-center">
        <div className="globe">
          <div className="fill" style={{ height: `${hpPct}%` }} />
          <div className="label">{Math.floor(player.hp)} / {player.hpMax}</div>
        </div>
        <div className="hud-skillbar">
          <div className="skill-btn" title="Basic Attack"><span className="key">LMB</span>⚔</div>
          <div className="skill-btn" title="Power Strike (Q)"><span className="key">Q</span>⚡</div>
          <div className="skill-btn" title="Whirlwind (W)"><span className="key">W</span>🌀</div>
          <div className="skill-btn" title="Heal (E)"><span className="key">E</span>✚</div>
          <div className="skill-btn" title="Use Potion (R)"><span className="key">R</span>🧪</div>
        </div>
        <div className="globe mp">
          <div className="fill" style={{ height: `${mpPct}%` }} />
          <div className="label">{Math.floor(player.mp)} / {player.mpMax}</div>
        </div>
      </div>

      {openModal === 'inv' && <Modal title="Inventory" onClose={() => setOpenModal(null)}><Inventory /></Modal>}
      {openModal === 'craft' && <Modal title="Forge & Crafting" onClose={() => setOpenModal(null)}><Crafting /></Modal>}
      {openModal === 'loot' && <Modal title="Shrines of the Devil Gods" onClose={() => setOpenModal(null)}><LootboxPanel /></Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="title">{title}</span>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="modal-body scroll">{children}</div>
      </div>
    </div>
  );
}
