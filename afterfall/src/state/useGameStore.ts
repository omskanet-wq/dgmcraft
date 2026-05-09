import { create } from 'zustand';
import type { ItemId, ItemSlot } from '../game/items';
import { ITEMS } from '../game/items';
import type { BuildingId } from '../game/buildings';
import { BUILDINGS } from '../game/buildings';
import { detectInitialPreset, persistPreset, type QualityPreset } from '../utils/quality';

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
  addKill: () => void;
  addLoot: (n?: number) => void;
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
  dayLength: 480, // seconds per full day
  paused: false,
  toast: null,
  quality: detectInitialPreset(),
  measuredFps: 60,
  kills: 0,
  loot: 0,
  addKill: () => set((st) => ({ kills: st.kills + 1 })),
  addLoot: (n = 1) => set((st) => ({ loot: st.loot + n })),

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
    while (xp >= level * 100) {
      xp -= level * 100;
      level += 1;
      hpMax += 10;
    }
    return {
      player: {
        ...st.player, xp, level, hpMax,
        hp: level !== st.player.level ? hpMax : st.player.hp,
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
        set({ toast: 'Missing materials.' });
        return false;
      }
    }
    // overlap
    for (const b of st.buildings) {
      const bdef = BUILDINGS[b.building];
      if (rectsOverlap(x, z, def.size, b.x, b.z, bdef.size)) {
        set({ toast: 'Tile is occupied.' });
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
    set((s) => ({ buildings: [...s.buildings, placed], toast: `${def.name} placed.` }));
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
      set({ toast: nowNight ? `Night falls — they wake up.` : `Dawn breaks — push out.` });
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
