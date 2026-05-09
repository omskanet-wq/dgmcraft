import { useState } from 'react';
import { LOOTBOXES, rollLootbox } from '../game/lootboxes';
import { ITEMS, RARITY_COLOR } from '../game/items';
import { useGameStore } from '../state/useGameStore';

export function LootboxPanel() {
  const player = useGameStore((s) => s.player);
  const spend = useGameStore((s) => s.spendGold);
  const add = useGameStore((s) => s.addItem);
  const setToast = useGameStore((s) => s.setToast);
  const [reveal, setReveal] = useState<{ box: string; rolls: { item: string; qty: number }[] } | null>(null);

  function open(boxId: string) {
    const box = LOOTBOXES.find((b) => b.id === boxId);
    if (!box) return;
    if (player.gold < box.cost) { setToast('Not enough gold.'); return; }
    if (!spend(box.cost)) return;
    const rolls = rollLootbox(box);
    for (const r of rolls) add(r.item, r.qty);
    setReveal({ box: box.name, rolls });
  }

  return (
    <div>
      {LOOTBOXES.map((b) => (
        <div key={b.id} className="lootbox-card">
          <div>
            <div className="title">{b.name}</div>
            <div className="muted" style={{ marginTop: 4 }}>{b.description}</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Rolls {b.rolls} item{b.rolls > 1 ? 's' : ''} · Cost {b.cost} gold
            </div>
          </div>
          <button
            className="primary"
            disabled={player.gold < b.cost}
            onClick={() => open(b.id)}
          >Offer</button>
        </div>
      ))}
      {reveal && (
        <div className="lootbox-burst" onClick={() => setReveal(null)}>
          <div className="panel" style={{ padding: 24, minWidth: 320, textAlign: 'center' }}>
            <div className="title">{reveal.box} grants…</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              {reveal.rolls.map((r, i) => {
                const def = ITEMS[r.item];
                return (
                  <div key={i} className="slot" style={{ borderColor: RARITY_COLOR[def.rarity], width: 80, height: 80, fontSize: 36 }}>
                    {def.icon}
                    <span className="qty">{r.qty}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12 }} className="muted">
              {reveal.rolls.map((r) => `${ITEMS[r.item].name} ×${r.qty}`).join(' · ')}
            </div>
            <button className="primary" style={{ marginTop: 16 }} onClick={() => setReveal(null)}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}
