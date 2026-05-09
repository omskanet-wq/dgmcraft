// Stronghold buildings — original designs.

export type BuildingId =
  | 'keep'
  | 'barracks'
  | 'forge'
  | 'mine'
  | 'farm'
  | 'mage_tower'
  | 'wall'
  | 'shrine';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  size: 1 | 2 | 3; // tiles per side
  costGold: number;
  costStone: number;
  costWood: number;
  buildSeconds: number;
  // Per-tick (every 5s) production:
  produceGold?: number;
  produceStone?: number;
  produceWood?: number;
  produceFood?: number;
  produceMana?: number;
  hp: number;
  // Visual color used by the procedural model.
  color: number;
  trim: number;
  unique?: boolean;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  keep: {
    id: 'keep', name: 'The Keep', description: 'Heart of your stronghold. There can be only one.',
    size: 3, costGold: 0, costStone: 0, costWood: 0, buildSeconds: 0, hp: 5000,
    color: 0x8a8a93, trim: 0xd4a04a, unique: true, produceGold: 5,
  },
  barracks: {
    id: 'barracks', name: 'Barracks', description: 'Trains foot soldiers for the warband.',
    size: 2, costGold: 200, costStone: 80, costWood: 60, buildSeconds: 25, hp: 1500,
    color: 0x6f5840, trim: 0xa0593a,
  },
  forge: {
    id: 'forge', name: 'Forge', description: 'Smiths craft weapons and armor here.',
    size: 2, costGold: 350, costStone: 100, costWood: 50, buildSeconds: 35, hp: 1200,
    color: 0x4a4a4a, trim: 0xff6a2a,
  },
  mine: {
    id: 'mine', name: 'Mine', description: 'Extracts stone and iron from the earth.',
    size: 2, costGold: 150, costStone: 30, costWood: 80, buildSeconds: 20, hp: 800,
    produceStone: 4, produceGold: 1,
    color: 0x8a7a5a, trim: 0x3a3a3a,
  },
  farm: {
    id: 'farm', name: 'Farm', description: 'Feeds the stronghold and its garrison.',
    size: 2, costGold: 80, costStone: 20, costWood: 60, buildSeconds: 15, hp: 600,
    produceFood: 5, produceGold: 2,
    color: 0xb6a36b, trim: 0x4a7a2a,
  },
  mage_tower: {
    id: 'mage_tower', name: 'Mage Tower', description: 'Channels arcane currents into raw mana.',
    size: 2, costGold: 600, costStone: 150, costWood: 60, buildSeconds: 50, hp: 1000,
    produceMana: 3,
    color: 0x3a2a5a, trim: 0x9b6cff,
  },
  wall: {
    id: 'wall', name: 'Wall', description: 'Defensive stone barrier. Cheap and stackable.',
    size: 1, costGold: 30, costStone: 40, costWood: 0, buildSeconds: 5, hp: 800,
    color: 0x9a9aa0, trim: 0x6a6a70,
  },
  shrine: {
    id: 'shrine', name: 'Wayfarer Shrine', description: 'A small shrine that occasionally yields lootbox-style rewards.',
    size: 1, costGold: 250, costStone: 30, costWood: 30, buildSeconds: 20, hp: 500,
    color: 0xd4c89a, trim: 0xff9a2a,
  },
};

export const BUILDING_LIST = Object.values(BUILDINGS);
