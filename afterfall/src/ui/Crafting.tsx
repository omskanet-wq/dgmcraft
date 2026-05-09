import { useGameStore } from '../state/useGameStore';
import { ITEMS, RARITY_COLOR } from '../game/items';
import { RECIPES } from '../game/recipes';
import { getLocale } from '../utils/i18n';

export default function Crafting({ onClose }: { onClose: () => void }) {
  const player = useGameStore((s) => s.player);
  const hasItems = useGameStore((s) => s.hasItems);
  const removeItem = useGameStore((s) => s.removeItem);
  const addItem = useGameStore((s) => s.addItem);
  const setToast = useGameStore((s) => s.setToast);
  const buildings = useGameStore((s) => s.buildings);

  const hasWorkbench = buildings.some((b) => b.building === 'workbench' && !b.underConstruction);

  return (
    <div className="modal-overlay hud-clickable" onClick={onClose}>
      <div className="modal craft-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{getLocale() === 'ru' ? 'Верстак' : 'Workbench'}</h2>
          <button className="btn ghost" onClick={onClose}>{getLocale() === 'ru' ? 'Закрыть (Esc)' : 'Close (Esc)'}</button>
        </div>
        <div className="craft-flag">
          {hasWorkbench
            ? <span className="ok">{getLocale() === 'ru' ? 'Верстак доступен — продвинутые рецепты открыты.' : 'Workbench available — advanced recipes unlocked.'}</span>
            : <span className="warn">{getLocale() === 'ru' ? 'Нет верстака в бастионе. Продвинутые рецепты заблокированы.' : 'No workbench in your bastion. Advanced recipes are locked.'}</span>}
        </div>
        <div className="craft-list">
          {RECIPES.map((r) => {
            const result = ITEMS[r.result];
            const can = (!r.needsWorkbench || hasWorkbench) && hasItems(r.requires);
            return (
              <div key={r.id} className={`craft-row${can ? '' : ' disabled'}`}>
                <div className="craft-result">
                  <span className="craft-icon" style={{ color: RARITY_COLOR[result.rarity] }}>{result.icon}</span>
                  <div>
                    <div className="craft-name" style={{ color: RARITY_COLOR[result.rarity] }}>{result.name}</div>
                    <div className="craft-meta">+{r.resultQty} {r.needsWorkbench ? (getLocale() === 'ru' ? '· верстак' : '· workbench') : ''}</div>
                  </div>
                </div>
                <div className="craft-reqs">
                  {r.requires.map((req) => {
                    const def = ITEMS[req.item];
                    const owned = player.inventory.filter((s) => s.item === req.item).reduce((sum, s) => sum + s.qty, 0);
                    const enough = owned >= req.qty;
                    return (
                      <span key={req.item} className={`craft-req${enough ? '' : ' missing'}`}>
                        {def.icon} {req.qty}× {def.name} <span className="craft-req-owned">({owned})</span>
                      </span>
                    );
                  })}
                </div>
                <button
                  className="btn small primary"
                  disabled={!can}
                  onClick={() => {
                    if (!can) return;
                    for (const req of r.requires) removeItem(req.item, req.qty);
                    addItem(r.result, r.resultQty);
                    setToast((getLocale() === 'ru' ? 'Собрано ' : 'Crafted ') + `${r.resultQty}× ${result.name}`);
                  }}
                >{getLocale() === 'ru' ? 'Создать' : 'Craft'}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
