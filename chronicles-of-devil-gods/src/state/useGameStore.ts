import { create } from 'zustand';
import type { RaceId, ClassDef } from '../game/races';
import type { ItemId, ItemSlot } from '../game/items';
import { ITEMS } from '../game/items';
import type { BuildingId } from '../game/buildings';

export type Screen = 'select' | 'world' | 'stronghold';

export interface InventoryStack {
  item: ItemId;
  qty: number;
}

export interface PlacedBuilding {
  uid: number;
  building: BuildingId;
  x: number; // tile coords
  z: number;
  hp: number;
  builtAt: number; // ms timestamp when finished
  underConstruction: boolean;
}

export interface PlayerState {
  level: number;
  xp: number;
  hp: number;
  hpMax: number;
  mp: number;
  mpMax: number;
  gold: number;
  stone: number;
  wood: number;
  food: number;
  mana: number;
  inventory: InventoryStack[];
  equipped: Partial<Record<ItemSlot, ItemId>>;
}

interface GameState {
  screen: Screen;
  raceId: RaceId | null;
  classId: string | null;
  className: string | null;
  player: PlayerState;
  buildings: PlacedBuilding[];
  toast: string | null;
  // actions
  setScreen: (s: Screen) => void;
  selectCharacter: (race: RaceId, cls: ClassDef) => void;
  addItem: (item: ItemId, qty: number) => void;
  removeItem: (item: ItemId, qty: number) => boolean;
  hasItems: (reqs: { item: ItemId; qty: number }[]) => boolean;
  spendGold: (n: number) => boolean;
  earnGold: (n: number) => void;
  equip: (item: ItemId) => void;
  unequip: (slot: ItemSlot) => void;
  placeBuilding: (building: BuildingId, x: number, z: number) => boolean;
  tickStronghold: (dtSec: number) => void;
  damagePlayer: (n: number) => void;
  healPlayer: (n: number) => void;
  gainXP: (n: number) => void;
  setToast: (msg: string | null) => void;
}

const STARTER_LEVEL_HP = 100;
const STARTER_LEVEL_MP = 50;

let buildingUid = 1;

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'select',
  raceId: null,
  classId: null,
  className: null,
  player: {
    level: 1,
    xp: 0,
    hp: STARTER_LEVEL_HP,
    hpMax: STARTER_LEVEL_HP,
    mp: STARTER_LEVEL_MP,
    mpMax: STARTER_LEVEL_MP,
    gold: 500,
    stone: 200,
    wood: 200,
    food: 100,
    mana: 0,
    inventory: [
      { item: 'iron_sword', qty: 1 },
      { item: 'minor_potion', qty: 5 },
      { item: 'iron_ore', qty: 10 },
      { item: 'emberglass', qty: 4 },
    ],
    equipped: {},
  },
  buildings: [],
  toast: null,

  setScreen: (s) => set({ screen: s }),
  selectCharacter: (race, cls) =>
    set({ raceId: race, classId: cls.id, className: cls.name, screen: 'world' }),

  addItem: (item, qty) =>
    set((st) => {
      const inv = [...st.player.inventory];
      const def = ITEMS[item];
      if (def?.stackable || ['material', 'consumable'].includes(def?.slot ?? '')) {
        const found = inv.find((s) => s.item === item);
        if (found) found.qty += qty;
        else inv.push({ item, qty });
      } else {
        for (let i = 0; i < qty; i++) inv.push({ item, qty: 1 });
      }
      return { player: { ...st.player, inventory: inv } };
    }),

  removeItem: (item, qty) => {
    const st = get();
    const inv = [...st.player.inventory];
    let remaining = qty;
    for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
      if (inv[i].item === item) {
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
      const total = st.player.inventory
        .filter((s) => s.item === r.item)
        .reduce((sum, s) => sum + s.qty, 0);
      if (total < r.qty) return false;
    }
    return true;
  },

  spendGold: (n) => {
    const st = get();
    if (st.player.gold < n) return false;
    set({ player: { ...st.player, gold: st.player.gold - n } });
    return true;
  },
  earnGold: (n) => set((st) => ({ player: { ...st.player, gold: st.player.gold + n } })),

  equip: (itemId) => {
    const st = get();
    const def = ITEMS[itemId];
    if (!def) return;
    if (!['weapon', 'helm', 'chest', 'gloves', 'boots', 'ring', 'amulet'].includes(def.slot)) return;
    const equipped = { ...st.player.equipped };
    const inv = [...st.player.inventory];
    // remove one of itemId
    const idx = inv.findIndex((s) => s.item === itemId);
    if (idx === -1) return;
    inv[idx] = { ...inv[idx], qty: inv[idx].qty - 1 };
    if (inv[idx].qty <= 0) inv.splice(idx, 1);
    // unequip current in slot back to inventory
    const current = equipped[def.slot];
    if (current) inv.push({ item: current, qty: 1 });
    equipped[def.slot] = itemId;
    set({ player: { ...st.player, inventory: inv, equipped } });
  },

  unequip: (slot) => {
    const st = get();
    const cur = st.player.equipped[slot];
    if (!cur) return;
    const equipped = { ...st.player.equipped };
    delete equipped[slot];
    const inv = [...st.player.inventory, { item: cur, qty: 1 }];
    set({ player: { ...st.player, inventory: inv, equipped } });
  },

  placeBuilding: (building, x, z) => {
    const st = get();
    // import lazily to avoid cycle
    const def = (st as never as GameState & { _b?: never });
    void def;
    return placeBuildingImpl(set, get, building, x, z);
  },

  tickStronghold: (dtSec) => tickStrongholdImpl(set, get, dtSec),

  damagePlayer: (n) =>
    set((st) => ({ player: { ...st.player, hp: Math.max(0, st.player.hp - n) } })),
  healPlayer: (n) =>
    set((st) => ({ player: { ...st.player, hp: Math.min(st.player.hpMax, st.player.hp + n) } })),

  gainXP: (n) =>
    set((st) => {
      let xp = st.player.xp + n;
      let level = st.player.level;
      let hpMax = st.player.hpMax;
      let mpMax = st.player.mpMax;
      while (xp >= level * 100) {
        xp -= level * 100;
        level += 1;
        hpMax += 25;
        mpMax += 12;
      }
      return {
        player: {
          ...st.player,
          xp,
          level,
          hpMax,
          mpMax,
          hp: level !== st.player.level ? hpMax : st.player.hp,
          mp: level !== st.player.level ? mpMax : st.player.mp,
        },
      };
    }),

  setToast: (msg) => set({ toast: msg }),
}));

// Placement / tick implementations live outside the create() block to keep the
// store tidy and avoid circular imports with /game/buildings.ts.
import { BUILDINGS } from '../game/buildings';

function placeBuildingImpl(
  set: (fn: (st: GameState) => Partial<GameState>) => void,
  get: () => GameState,
  building: BuildingId,
  x: number,
  z: number,
): boolean {
  const def = BUILDINGS[building];
  const st = get();
  if (def.unique && st.buildings.some((b) => b.building === building)) {
    set((s) => ({ ...s, toast: `${def.name} is unique — already built.` }));
    return false;
  }
  if (st.player.gold < def.costGold || st.player.stone < def.costStone || st.player.wood < def.costWood) {
    set((s) => ({ ...s, toast: 'Not enough resources.' }));
    return false;
  }
  // Check overlap
  for (const b of st.buildings) {
    const bdef = BUILDINGS[b.building];
    if (rectsOverlap(x, z, def.size, b.x, b.z, bdef.size)) {
      set((s) => ({ ...s, toast: 'Tile is occupied.' }));
      return false;
    }
  }
  const placed: PlacedBuilding = {
    uid: buildingUid++,
    building,
    x,
    z,
    hp: def.hp,
    builtAt: performance.now() + def.buildSeconds * 1000,
    underConstruction: def.buildSeconds > 0,
  };
  set((s) => ({
    ...s,
    player: {
      ...s.player,
      gold: s.player.gold - def.costGold,
      stone: s.player.stone - def.costStone,
      wood: s.player.wood - def.costWood,
    },
    buildings: [...s.buildings, placed],
    toast: `${def.name} placed.`,
  }));
  return true;
}

function rectsOverlap(ax: number, az: number, asz: number, bx: number, bz: number, bsz: number): boolean {
  return ax < bx + bsz && ax + asz > bx && az < bz + bsz && az + asz > bz;
}

let prodAccumulator = 0;

function tickStrongholdImpl(
  set: (fn: (st: GameState) => Partial<GameState>) => void,
  get: () => GameState,
  dtSec: number,
): void {
  const st = get();
  // Finish constructions
  const now = performance.now();
  let updated = false;
  const newBuildings = st.buildings.map((b) => {
    if (b.underConstruction && now >= b.builtAt) {
      updated = true;
      return { ...b, underConstruction: false };
    }
    return b;
  });
  if (updated) set((s) => ({ ...s, buildings: newBuildings }));
  // Production every 5 seconds
  prodAccumulator += dtSec;
  if (prodAccumulator >= 5) {
    prodAccumulator = 0;
    let gold = 0, stone = 0, wood = 0, food = 0, mana = 0;
    for (const b of newBuildings) {
      if (b.underConstruction) continue;
      const def = BUILDINGS[b.building];
      gold += def.produceGold ?? 0;
      stone += def.produceStone ?? 0;
      wood += def.produceWood ?? 0;
      food += def.produceFood ?? 0;
      mana += def.produceMana ?? 0;
    }
    set((s) => ({
      ...s,
      player: {
        ...s.player,
        gold: s.player.gold + gold,
        stone: s.player.stone + stone,
        wood: s.player.wood + wood,
        food: s.player.food + food,
        mana: s.player.mana + mana,
      },
    }));
  }
}
