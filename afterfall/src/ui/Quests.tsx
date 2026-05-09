import { useGameStore } from '../state/useGameStore';
import { QUESTS } from '../game/quests';
import { ITEMS } from '../game/items';
import { t } from '../utils/i18n';

export default function Quests({ onClose }: { onClose: () => void }) {
  const progress = useGameStore((s) => s.quests);
  const claim = useGameStore((s) => s.claimQuest);

  return (
    <div className="modal hud-clickable" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ width: 480 }}>
        <div className="modal-head">
          <h3>{t('quests.title')}</h3>
          <button className="btn small ghost" onClick={onClose}>{t('btn.close')}</button>
        </div>
        <div className="quest-list">
          {QUESTS.map((q) => {
            const p = progress.find((x) => x.id === q.id);
            if (!p) return null;
            const need = (q.goal as { need: number }).need;
            const pct = Math.min(100, (p.count / need) * 100);
            return (
              <div key={q.id} className={`quest-card ${p.claimed ? 'claimed' : p.done ? 'done' : ''}`}>
                <div className="quest-head">
                  <span className="quest-title">{t(`q.${q.id}.title`)}</span>
                  {p.claimed
                    ? <span className="quest-badge">{t('quests.claimed')}</span>
                    : p.done
                      ? <button className="btn small" onClick={() => claim(q.id)}>{t('btn.claim')}</button>
                      : <span className="quest-count">{p.count} / {need}</span>}
                </div>
                <div className="quest-desc">{t(`q.${q.id}.desc`)}</div>
                {!p.claimed && (
                  <div className="quest-bar"><div className="quest-fill" style={{ width: `${pct}%` }} /></div>
                )}
                <div className="quest-rewards">
                  {t('quests.reward')} <span>+{q.rewardXp} XP</span>
                  {q.rewardItems.map((r) => {
                    const def = ITEMS[r.item];
                    return def ? (
                      <span key={r.item} className="quest-reward">
                        {def.icon} {r.qty}× {def.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
