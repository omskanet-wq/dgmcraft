import { create } from 'zustand';
import type { ItemId, ItemSlot } from '../game/items';
import { ITEMS } from '../game/items';
import type { BuildingId } from '../game/buildings';
import { BUILDINGS } from '../game/buildings';
import { detectInitialPreset, persistPreset, type QualityPreset } from '../utils/quality';
import { QUESTS, makeInitialProgress, type QuestProgress } from '../game/quests';
import { loadSave, writeSave, clearSave, type SavePayload } from '../utils/persistence';
import {
  setMasterVolume, setMuted, sfxLevelUp, sfxQuestComplete,
} from '../utils/audio';
import { t } from '../utils/i18n';

export type Screen = 'menu' | 'city' | 'bastion';

export interface InventoryStack {
  item: ItemId;
  qty: number;
}

export interface PlacedBuilding {
  uid: number;
  building: BuildingId;
  x: number;
  z: number;
  hp: number;
  hpMax: number;
  builtAt: number; // ms target
  underConstruction: boolean;
}

export interface PlayerState {
  hp: number; hpMax: number;
  hunger: number; hungerMax: number;
  thirst: number; thirstMax: number;
  stamina: number; staminaMax: number;
  level: number; xp: number;
  inventory: InventoryStack[];
  equipped: Partial<Record<ItemSlot, ItemId>>;
  hotbarSelected: number;
}

interface GameState {
  screen: Screen;
  player: PlayerState;
  buildings: PlacedBuilding[];
  // World time: 0..1 cycles a full day every dayLength seconds.
  worldTime: number;
  dayCount: number;
  dayLength: number;
  paused: boolean;
  toast: string | null;
  quality: QualityPreset;
  measuredFps: number;

  setScreen: (s: Screen) => void;
  setPaused: (p: boolean) => void;
  setQuality: (q: QualityPreset) => void;
  reportFps: (fps: number) => void;

  addItem: (item: ItemId, qty: number) => void;
  removeItem: (item: ItemId, qty: number) => boolean;
  hasItems: (reqs: { item: ItemId; qty: number }[]) => boolean;

  equip: (item: ItemId) => void;
  unequip: (slot: ItemSlot) => void;
  selectHotbar: (idx: number) => void;
  consume: (item: ItemId) => boolean;

  damagePlayer: (n: number) => void;
  healPlayer: (n: number) => void;
  modHunger: (n: number) => void;
  modThirst: (n: number) => void;
  modStamina: (n: number) => void;
  gainXP: (n: number) => void;

  placeBuilding: (b: BuildingId, x: number, z: number) => boolean;
  damageBuilding: (uid: number, dmg: number) => void;
  tickWorld: (dt: number) => void;

  setToast: (msg: string | null) => void;

  kills: number;
  loot: number;
  containersOpened: number;
  nightsSurvived: number;
  addKill: () => void;
  addLoot: (n?: number) => void;
  addContainerOpened: () => void;

  // Quests
  quests: QuestProgress[];
  claimQuest: (id: string) => void;

  // Audio settings
  audioVolume: number;
  audioMuted: boolean;
  setAudioVolume: (v: number) => void;
  setAudioMuted: (m: boolean) => void;

  // FPS counter visibility
  showFps: boolean;
  setShowFps: (b: boolean) => void;

  // Save / load
  saveGame: () => void;
  loadGame: () => boolean;
  resetSave: () => void;
}

let buildingUid = 1;

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'menu',
  player: {
    hp: 100, hpMax: 100,
    hunger: 80, hungerMax: 100,
    thirst: 80, thirstMax: 100,
    stamina: 100, staminaMax: 100,
    level: 1, xp: 0,
    inventory: [
      { item: 'pipe', qty: 1 },
      { item: 'bandage', qty: 3 },
      { item: 'water_bottle', qty: 2 },
      { item: 'can_food', qty: 2 },
      { item: 'wood', qty: 8 },
      { item: 'scrap', qty: 6 },
      { item: 'nails', qty: 12 },
      { item: 'cloth', qty: 4 },
    ],
    equipped: { weapon: 'pipe' },
    hotbarSelected: 0,
  },
  buildings: [],
  worldTime: 0.3, // start mid-morning
  dayCount: 1,
  // Real-time seconds per full day. ~3600 = a full game-day every real hour,
  // so night falls roughly once an hour (and lasts ~20 real minutes).
  dayLength: 3600,
  paused: false,
  toast: null,
  quality: detectInitialPreset(),
  measuredFps: 60,
  kills: 0,
  loot: 0,
  containersOpened: 0,
  nightsSurvived: 0,
  addKill: () => {
    const st = get();
    const kills = st.kills + 1;
    set({ kills });
    advanceQuest(get, set, 'kill_zombies', 1);
  },
  addLoot: (n = 1) => set((st) => ({ loot: st.loot + n })),
  addContainerOpened: () => {
    const st = get();
    set({ containersOpened: st.containersOpened + 1 });
    advanceQuest(get, set, 'loot_containers', 1);
  },

  quests: makeInitialProgress(),
  claimQuest: (id) => {
    const st = get();
    const q = st.quests.find((p) => p.id === id);
    if (!q || !q.done || q.claimed) return;
    const def = QUESTS.find((d) => d.id === id);
    if (!def) return;
    get().gainXP(def.rewardXp);
    for (const r of def.rewardItems) get().addItem(r.item, r.qty);
    set({
      quests: get().quests.map((p) => p.id === id ? { ...p, claimed: true } : p),
      toast: t('toast.reward_claimed', { title: t(`q.${def.id}.title`) }),
    });
    sfxQuestComplete();
  },

  audioVolume: 0.6,
  audioMuted: false,
  setAudioVolume: (v) => { setMasterVolume(v); set({ audioVolume: v }); },
  setAudioMuted: (m) => { setMuted(m); set({ audioMuted: m }); },
  showFps: false,
  setShowFps: (b) => set({ showFps: b }),

  saveGame: () => {
    const st = get();
    const payload: SavePayload = {
      version: 1, savedAt: Date.now(),
      player: st.player, buildings: st.buildings,
      worldTime: st.worldTime, dayCount: st.dayCount,
      kills: st.kills, loot: st.loot, quests: st.quests,
      audio: { volume: st.audioVolume, muted: st.audioMuted },
      quality: st.quality,
    };
    writeSave(payload);
  },
  loadGame: () => {
    const save = loadSave();
    if (!save) return false;
    setMasterVolume(save.audio.volume);
    setMuted(save.audio.muted);
    set({
      player: save.player, buildings: save.buildings,
      worldTime: save.worldTime, dayCount: save.dayCount,
      kills: save.kills, loot: save.loot, quests: save.quests,
      audioVolume: save.audio.volume, audioMuted: save.audio.muted,
      quality: save.quality,
      toast: `Loaded save from ${new Date(save.savedAt).toLocaleString()}`,
    });
    return true;
  },
  resetSave: () => { clearSave(); set({ toast: t('toast.save_cleared') }); },

  setScreen: (s) => set({ screen: s, paused: false }),
  setPaused: (p) => set({ paused: p }),
  setQuality: (q) => { persistPreset(q); set({ quality: q }); },
  reportFps: (fps) => set({ measuredFps: fps }),

  addItem: (itemId, qty) =>
    set((st) => {
      const def = ITEMS[itemId];
      if (!def) return st;
      const inv = [...st.player.inventory];
      if (def.stackable) {
        const idx = inv.findIndex((s) => s.item === itemId);
        if (idx >= 0) inv[idx] = { ...inv[idx], qty: inv[idx].qty + qty };
        else inv.push({ item: itemId, qty });
      } else {
        for (let i = 0; i < qty; i++) inv.push({ item: itemId, qty: 1 });
      }
      return { player: { ...st.player, inventory: inv } };
    }),

  removeItem: (itemId, qty) => {
    const st = get();
    const inv = [...st.player.inventory];
    let remaining = qty;
    for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
      if (inv[i].item === itemId) {
        const take = Math.min(inv[i].qty, remaining);
        inv[i] = { ...inv[i], qty: inv[i].qty - take };
        remaining -= take;
        if (inv[i].qty <= 0) inv.splice(i, 1);
      }
    }
    if (remaining > 0) return false;
    set({ player: { ...st.player, inventory: inv } });
    return true;
  },

  hasItems: (reqs) => {
    const st = get();
    for (const r of reqs) {
      const total = st.player.inventory.filter((s) => s.item === r.item).reduce((sum, s) => sum + s.qty, 0);
      if (total < r.qty) return false;
    }
    return true;
  },

  equip: (itemId) => {
    const def = ITEMS[itemId];
    if (!def) return;
    if (!['weapon', 'armor', 'helmet', 'tool'].includes(def.slot)) return;
    const st = get();
    const inv = [...st.player.inventory];
    const idx = inv.findIndex((s) => s.item === itemId);
    if (idx === -1) return;
    inv[idx] = { ...inv[idx], qty: inv[idx].qty - 1 };
    if (inv[idx].qty <= 0) inv.splice(idx, 1);
    const equipped = { ...st.player.equipped };
    const cur = equipped[def.slot];
    if (cur) inv.push({ item: cur, qty: 1 });
    equipped[def.slot] = itemId;
    set({ player: { ...st.player, inventory: inv, equipped } });
  },

  unequip: (slot) => {
    const st = get();
    const cur = st.player.equipped[slot];
    if (!cur) return;
    if (slot === 'weapon' && cur === 'pipe') return; // keep at least the starter pipe? no, allow
    const equipped = { ...st.player.equipped };
    delete equipped[slot];
    set({ player: { ...st.player, equipped, inventory: [...st.player.inventory, { item: cur, qty: 1 }] } });
  },

  selectHotbar: (idx) => set((st) => ({ player: { ...st.player, hotbarSelected: idx } })),

  consume: (itemId) => {
    const def = ITEMS[itemId];
    if (!def) return false;
    if (!['food', 'drink', 'medical'].includes(def.slot)) return false;
    const st = get();
    const ok = get().removeItem(itemId, 1);
    if (!ok) return false;
    const p = { ...st.player };
    if (def.health) p.hp = Math.min(p.hpMax, p.hp + def.health);
    if (def.hunger) p.hunger = Math.min(p.hungerMax, p.hunger + def.hunger);
    if (def.thirst) p.thirst = Math.min(p.thirstMax, p.thirst + def.thirst);
    if (def.stamina) p.stamina = Math.min(p.staminaMax, p.stamina + def.stamina);
    set({ player: { ...p, inventory: get().player.inventory } });
    return true;
  },

  damagePlayer: (n) => set((st) => ({ player: { ...st.player, hp: Math.max(0, st.player.hp - n) } })),
  healPlayer: (n) => set((st) => ({ player: { ...st.player, hp: Math.min(st.player.hpMax, st.player.hp + n) } })),
  modHunger: (n) => set((st) => ({ player: { ...st.player, hunger: Math.max(0, Math.min(st.player.hungerMax, st.player.hunger + n)) } })),
  modThirst: (n) => set((st) => ({ player: { ...st.player, thirst: Math.max(0, Math.min(st.player.thirstMax, st.player.thirst + n)) } })),
  modStamina: (n) => set((st) => ({ player: { ...st.player, stamina: Math.max(0, Math.min(st.player.staminaMax, st.player.stamina + n)) } })),

  gainXP: (n) => set((st) => {
    let xp = st.player.xp + n;
    let level = st.player.level;
    let hpMax = st.player.hpMax;
    let leveled = false;
    while (xp >= level * 100) {
      xp -= level * 100;
      level += 1;
      hpMax += 10;
      leveled = true;
    }
    if (leveled) sfxLevelUp();
    return {
      player: {
        ...st.player, xp, level, hpMax,
        hp: leveled ? hpMax : st.player.hp,
      },
    };
  }),

  placeBuilding: (id, x, z) => {
    const def = BUILDINGS[id];
    const st = get();
    // costs
    for (const [k, v] of Object.entries(def.costs)) {
      const total = st.player.inventory.filter((s) => s.item === k).reduce((sum, s) => sum + s.qty, 0);
      if (total < v) {
        set({ toast: t('toast.missing_materials') });
        return false;
      }
    }
    // overlap
    for (const b of st.buildings) {
      const bdef = BUILDINGS[b.building];
      if (rectsOverlap(x, z, def.size, b.x, b.z, bdef.size)) {
        set({ toast: t('toast.tile_occupied') });
        return false;
      }
    }
    // pay
    for (const [k, v] of Object.entries(def.costs)) get().removeItem(k, v);
    const placed: PlacedBuilding = {
      uid: buildingUid++,
      building: id, x, z, hp: def.hp, hpMax: def.hp,
      builtAt: performance.now() + 1500,
      underConstruction: true,
    };
    set((s) => ({ buildings: [...s.buildings, placed], toast: t('toast.placed', { name: def.name }) }));
    advanceQuest(get, set, 'place_buildings', 1);
    return true;
  },

  damageBuilding: (uid, dmg) =>
    set((st) => {
      const buildings = st.buildings
        .map((b) => (b.uid === uid ? { ...b, hp: b.hp - dmg } : b))
        .filter((b) => b.hp > 0);
      return { buildings };
    }),

  tickWorld: (dt) => {
    const st = get();
    if (st.paused) return;
    // World time
    let wt = st.worldTime + dt / st.dayLength;
    let dc = st.dayCount;
    if (wt >= 1) { wt -= 1; dc += 1; }
    const wasNight = isNight(st.worldTime);
    const nowNight = isNight(wt);
    if (wasNight !== nowNight) {
      set({ toast: nowNight ? t('time.nightfall') : t('time.dayfall') });
      // Count "night survived" on dawn transition (i.e. when leaving night).
      if (!nowNight && wasNight) {
        const ns = st.nightsSurvived + 1;
        set({ nightsSurvived: ns });
        advanceQuest(get, set, 'survive_nights', 1);
      }
    }
    set({ worldTime: wt, dayCount: dc });
    // Construction completion
    const now = performance.now();
    let bChanged = false;
    const newB = st.buildings.map((b) => {
      if (b.underConstruction && now >= b.builtAt) { bChanged = true; return { ...b, underConstruction: false }; }
      return b;
    });
    if (bChanged) set({ buildings: newB });
    // Hunger / thirst slow drain
    const p = { ...st.player };
    p.hunger = Math.max(0, p.hunger - 0.6 * dt);
    p.thirst = Math.max(0, p.thirst - 0.9 * dt);
    p.stamina = Math.min(p.staminaMax, p.stamina + 4 * dt);
    if (p.hunger <= 0 || p.thirst <= 0) {
      p.hp = Math.max(0, p.hp - 1.2 * dt);
    } else if (p.hunger > 30 && p.thirst > 30 && p.hp < p.hpMax) {
      p.hp = Math.min(p.hpMax, p.hp + 0.4 * dt);
    }
    set({ player: p });
  },

  setToast: (msg) => set({ toast: msg }),
}));

function rectsOverlap(ax: number, az: number, asz: number, bx: number, bz: number, bsz: number): boolean {
  return ax < bx + bsz && ax + asz > bx && az < bz + bsz && az + asz > bz;
}

type GetFn = () => GameState;
type SetFn = (partial: Partial<GameState> | ((s: GameState) => Partial<GameState>)) => void;

/**
 * Advance the active progress for any quests whose goal kind matches.
 * Marks `done = true` on completion so the HUD can offer a Claim button.
 */
function advanceQuest(get: GetFn, set: SetFn, kind: string, by: number): void {
  const st = get();
  let toastForCompletion: string | null = null;
  const next = st.quests.map((p) => {
    if (p.done) return p;
    const def = QUESTS.find((d) => d.id === p.id);
    if (!def || def.goal.kind !== kind) return p;
    const need = (def.goal as { need: number }).need;
    const count = Math.min(need, p.count + by);
    const done = count >= need;
    if (done && !p.done) toastForCompletion = t(`q.${def.id}.title`);
    return { ...p, count, done };
  });
  set({ quests: next });
  if (toastForCompletion) set({ toast: t('toast.quest_complete', { title: toastForCompletion }) });
}

/** Returns true if the world is in night phase (low light, more aggressive zombies). */
export function isNight(t: number): boolean {
  return t < 0.2 || t > 0.8;
}

/** Returns ambient brightness 0..1 based on world time. */
export function ambientBrightness(t: number): number {
  // Day peak around 0.5, gradient
  const d = Math.cos((t - 0.5) * Math.PI * 2);
  return Math.max(0.05, (d + 1) / 2);
}
