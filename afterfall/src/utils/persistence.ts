// Local-storage save/load for the game state. We persist a *subset* of the
// store (player progression + buildings + day count + quests + settings) and
// reapply it at startup. Live world objects (zombies, lootboxes) are not
// saved — they regenerate from seed.

import type { PlayerState, PlacedBuilding } from '../state/useGameStore';
import type { QuestProgress } from '../game/quests';
import type { QualityPreset } from './quality';

const KEY = 'afterfall:save:v1';

export interface SavePayload {
  version: 1;
  savedAt: number;
  player: PlayerState;
  buildings: PlacedBuilding[];
  worldTime: number;
  dayCount: number;
  kills: number;
  loot: number;
  quests: QuestProgress[];
  audio: { volume: number; muted: boolean };
  quality: QualityPreset;
}

export function loadSave(): SavePayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavePayload;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSave(payload: SavePayload): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // QuotaExceeded etc. — ignore.
  }
}

export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
