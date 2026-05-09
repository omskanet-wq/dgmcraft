import { useState } from 'react';
import { useGameStore } from '../state/useGameStore';
import { ITEMS, RARITY_COLOR, type ItemSlot } from '../game/items';

const EQUIP_SLOTS: { slot: ItemSlot; label: string }[] = [
  { slot: 'helm', label: 'HELM' },
  { slot: 'amulet', label: 'AMULET' },
  { slot: 'chest', label: 'CHEST' },
  { slot: 'weapon', label: 'WEAPON' },
  { slot: 'gloves', label: 'GLOVES' },
  { slot: 'ring', label: 'RING' },
  { slot: 'boots', label: 'BOOTS' },
];

export function Inventory() {
  const inv = useGameStore((s) => s.player.inventory);
  const equipped = useGameStore((s) => s.player.equipped);
  const equip = useGameStore((s) => s.equip);
  const unequip = useGameStore((s) => s.unequip);
  const heal = useGameStore((s) => s.healPlayer);
  const remove = useGameStore((s) => s.removeItem);
  const [hover, setHover] = useState<{ x: number; y: number; itemId: string } | null>(null);

  function clickItem(itemId: string) {
    const def = ITEMS[itemId];
    if (!def) return;
    if (def.slot === 'consumable') {
      if (def.id === 'minor_potion' && remove(itemId, 1)) heal(50);
      else if (def.id === 'major_potion' && remove(itemId, 1)) heal(200);
      else if (def.id === 'mana_draught') {
        // simple mp restore via store mutation
        const st = useGameStore.getState();
        if (remove(itemId, 1)) {
          useGameStore.setState({
            player: { ...st.player, mp: Math.min(st.player.mpMax, st.player.mp + 100) },
          });
        }
      }
    } else if (['weapon','helm','chest','gloves','boots','ring','amulet'].includes(def.slot)) {
      equip(itemId);
    }
  }

  // Pad inventory to fixed grid size for visual consistency
  const slots = [...inv];
  while (slots.length < 32) slots.push({ item: '', qty: 0 });

  return (
    <div>
      <div className="title" style={{ marginBottom: 10 }}>Equipment</div>
      <div className="equip-grid">
        {EQUIP_SLOTS.map(({ slot, label }) => {
          const id = equipped[slot];
          const def = id ? ITEMS[id] : null;
          return (
            <div
              key={slot}
              className="slot equip-slot"
              style={{ borderColor: def ? RARITY_COLOR[def.rarity] : undefined }}
              onClick={() => unequip(slot)}
              onMouseEnter={(e) => def && setHover({ x: e.clientX + 14, y: e.clientY + 14, itemId: def.id })}
              onMouseLeave={() => setHover(null)}
            >
              <span className="slot-label">{label}</span>
              {def?.icon ?? ''}
            </div>
          );
        })}
      </div>
      <div className="title" style={{ margin: '14px 0 8px' }}>Bag</div>
      <div className="inv-grid">
        {slots.map((stack, i) => {
          const def = stack.item ? ITEMS[stack.item] : null;
          return (
            <div
              key={i}
              className="slot"
              style={{ borderColor: def ? RARITY_COLOR[def.rarity] : undefined }}
              onClick={() => stack.item && clickItem(stack.item)}
              onMouseEnter={(e) => def && setHover({ x: e.clientX + 14, y: e.clientY + 14, itemId: def.id })}
              onMouseLeave={() => setHover(null)}
            >
              {def?.icon ?? ''}
              {stack.qty > 1 && <span className="qty">{stack.qty}</span>}
            </div>
          );
        })}
      </div>
      {hover && <ItemTooltip x={hover.x} y={hover.y} itemId={hover.itemId} />}
    </div>
  );
}

export function ItemTooltip({ x, y, itemId }: { x: number; y: number; itemId: string }) {
  const def = ITEMS[itemId];
  if (!def) return null;
  return (
    <div className="tooltip" style={{ left: x, top: y, color: RARITY_COLOR[def.rarity] }}>
      <div className="name">{def.name}</div>
      <div className="muted" style={{ textTransform: 'capitalize' }}>{def.rarity} · {def.slot}</div>
      {def.stats && (
        <div style={{ marginTop: 4 }}>
          {Object.entries(def.stats).map(([k, v]) => (
            <div key={k} className="stat">+{String(v)} {k.toUpperCase()}</div>
          ))}
        </div>
      )}
      {def.description && (
        <div style={{ marginTop: 4, color: '#a8a08a', fontStyle: 'italic' }}>{def.description}</div>
      )}
    </div>
  );
}
