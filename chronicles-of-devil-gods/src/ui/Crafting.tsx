import { RECIPES } from '../game/recipes';
import { ITEMS, RARITY_COLOR } from '../game/items';
import { useGameStore } from '../state/useGameStore';

export function Crafting() {
  const player = useGameStore((s) => s.player);
  const has = useGameStore((s) => s.hasItems);
  const remove = useGameStore((s) => s.removeItem);
  const add = useGameStore((s) => s.addItem);
  const spend = useGameStore((s) => s.spendGold);
  const setToast = useGameStore((s) => s.setToast);

  function craft(rid: string) {
    const r = RECIPES.find((x) => x.id === rid);
    if (!r) return;
    if (player.gold < r.goldCost) { setToast('Not enough gold.'); return; }
    if (!has(r.requires)) { setToast('Missing materials.'); return; }
    if (!spend(r.goldCost)) return;
    for (const req of r.requires) remove(req.item, req.qty);
    add(r.result, r.resultQty);
    setToast(`Crafted ${ITEMS[r.result].name}.`);
  }

  return (
    <div>
      {RECIPES.map((r) => {
        const result = ITEMS[r.result];
        const canAfford = player.gold >= r.goldCost && has(r.requires);
        return (
          <div key={r.id} className="recipe-row">
            <div className="slot" style={{ borderColor: RARITY_COLOR[result.rarity] }}>
              {result.icon}
            </div>
            <div>
              <div style={{ color: RARITY_COLOR[result.rarity], letterSpacing: '0.08em' }}>
                {result.name} ×{r.resultQty}
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                {r.requires.map((req) => `${ITEMS[req.item].name} ×${req.qty}`).join(' · ')} · {r.goldCost} gold
              </div>
            </div>
            <button className={canAfford ? 'primary' : ''} disabled={!canAfford} onClick={() => craft(r.id)}>Forge</button>
          </div>
        );
      })}
    </div>
  );
}
