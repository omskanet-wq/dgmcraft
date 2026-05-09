import { useGameStore } from '../state/useGameStore';
import { ITEMS, RARITY_COLOR } from '../game/items';
import type { ItemSlot } from '../game/items';
import { getLocale } from '../utils/i18n';

const EQUIP_SLOTS_RU: { slot: ItemSlot; label: string }[] = [
  { slot: 'helmet', label: 'Голова' },
  { slot: 'armor', label: 'Тело' },
  { slot: 'weapon', label: 'Оружие' },
  { slot: 'tool', label: 'Инструмент' },
];
const EQUIP_SLOTS_EN: { slot: ItemSlot; label: string }[] = [
  { slot: 'helmet', label: 'Head' },
  { slot: 'armor', label: 'Body' },
  { slot: 'weapon', label: 'Weapon' },
  { slot: 'tool', label: 'Tool' },
];

export default function Inventory({ onClose }: { onClose: () => void }) {
  const player = useGameStore((s) => s.player);
  const equip = useGameStore((s) => s.equip);
  const unequip = useGameStore((s) => s.unequip);
  const consume = useGameStore((s) => s.consume);

  return (
    <div className="modal-overlay hud-clickable" onClick={onClose}>
      <div className="modal inv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{getLocale() === 'ru' ? 'Сумка' : 'The Bag'}</h2>
          <button className="btn ghost" onClick={onClose}>{getLocale() === 'ru' ? 'Закрыть (Esc)' : 'Close (Esc)'}</button>
        </div>
        <div className="inv-grid">
          <div className="equip-panel">
            <div className="equip-title">{getLocale() === 'ru' ? 'Экипировка' : 'Equipped'}</div>
            {(getLocale() === 'ru' ? EQUIP_SLOTS_RU : EQUIP_SLOTS_EN).map(({ slot, label }) => {
              const id = player.equipped[slot];
              const def = id ? ITEMS[id] : null;
              return (
                <div key={slot} className="equip-row">
                  <span className="equip-label">{label}</span>
                  {def ? (
                    <button
                      className="equip-slot equipped"
                      onClick={() => unequip(slot)}
                      style={{ borderColor: RARITY_COLOR[def.rarity] }}
                    >
                      <span className="equip-icon" style={{ color: RARITY_COLOR[def.rarity] }}>{def.icon}</span>
                      <span className="equip-name">{def.name}</span>
                    </button>
                  ) : (
                    <div className="equip-slot empty">{getLocale() === 'ru' ? 'пусто' : 'empty'}</div>
                  )}
                </div>
              );
            })}
            <div className="stats-row">
              <div>LV {player.level}</div>
              <div>XP {player.xp}/{player.level * 100}</div>
            </div>
          </div>
          <div className="bag-panel">
            <div className="bag-title">Carry ({player.inventory.length})</div>
            <div className="bag-cells">
              {player.inventory.map((stack, idx) => {
                const def = ITEMS[stack.item];
                if (!def) return null;
                return (
                  <button
                    key={idx}
                    className="bag-cell"
                    style={{ borderColor: RARITY_COLOR[def.rarity] }}
                    onClick={() => {
                      if (def.slot === 'weapon' || def.slot === 'tool' || def.slot === 'armor' || def.slot === 'helmet') {
                        equip(stack.item);
                      } else if (def.slot === 'food' || def.slot === 'drink' || def.slot === 'medical') {
                        consume(stack.item);
                      }
                    }}
                    title={`${def.name} — ${def.slot}`}
                  >
                    <span className="bag-icon" style={{ color: RARITY_COLOR[def.rarity] }}>{def.icon}</span>
                    <span className="bag-name" style={{ color: RARITY_COLOR[def.rarity] }}>{def.name}</span>
                    {stack.qty > 1 && <span className="bag-qty">×{stack.qty}</span>}
                  </button>
                );
              })}
              {player.inventory.length === 0 && (
                <div className="bag-empty">{getLocale() === 'ru' ? 'Сумка пуста. Разбей шкафы и мусорки.' : 'Bag is empty. Smash some lockers and dumpsters out there.'}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
