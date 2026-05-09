// Survival item DB. All names original.

export type ItemId = string;
export type Rarity = 'junk' | 'common' | 'uncommon' | 'rare' | 'epic';
export type ItemSlot =
  | 'weapon'
  | 'armor'
  | 'helmet'
  | 'tool'
  | 'food'
  | 'drink'
  | 'medical'
  | 'ammo'
  | 'material'
  | 'misc';

export interface ItemDef {
  id: ItemId;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  icon: string;
  stackable?: boolean;
  // Combat
  damage?: number;
  range?: number; // attack reach in world units
  ranged?: boolean;
  ammo?: ItemId;
  // Consumables
  hunger?: number;
  thirst?: number;
  health?: number;
  stamina?: number;
  description?: string;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  junk: '#7a7a7a',
  common: '#cfcfcf',
  uncommon: '#5fcf6e',
  rare: '#4ea0ff',
  epic: '#b65cff',
};

export const ITEMS: Record<ItemId, ItemDef> = {
  // Materials
  wood: { id: 'wood', name: 'Plank', slot: 'material', rarity: 'common', icon: '🪵', stackable: true },
  scrap: { id: 'scrap', name: 'Scrap Metal', slot: 'material', rarity: 'common', icon: '🔩', stackable: true },
  cloth: { id: 'cloth', name: 'Cloth Strip', slot: 'material', rarity: 'common', icon: '🧵', stackable: true },
  nails: { id: 'nails', name: 'Nails', slot: 'material', rarity: 'common', icon: '📌', stackable: true },
  electronics: { id: 'electronics', name: 'Electronics', slot: 'material', rarity: 'uncommon', icon: '🔌', stackable: true },
  gunpowder: { id: 'gunpowder', name: 'Gunpowder', slot: 'material', rarity: 'uncommon', icon: '⚫', stackable: true },

  // Weapons
  fists: { id: 'fists', name: 'Fists', slot: 'weapon', rarity: 'junk', icon: '👊', damage: 5, range: 1.2 },
  pipe: { id: 'pipe', name: 'Steel Pipe', slot: 'weapon', rarity: 'common', icon: '🔧', damage: 14, range: 1.5 },
  fireaxe: { id: 'fireaxe', name: 'Fire Axe', slot: 'weapon', rarity: 'uncommon', icon: '🪓', damage: 26, range: 1.6 },
  spiked_bat: { id: 'spiked_bat', name: 'Spiked Bat', slot: 'weapon', rarity: 'uncommon', icon: '🏏', damage: 30, range: 1.6 },
  machete: { id: 'machete', name: 'Machete', slot: 'weapon', rarity: 'rare', icon: '🔪', damage: 38, range: 1.5 },
  pistol: { id: 'pistol', name: 'Pistol', slot: 'weapon', rarity: 'rare', icon: '🔫', damage: 45, range: 14, ranged: true, ammo: 'pistol_ammo' },
  shotgun: { id: 'shotgun', name: 'Pump Shotgun', slot: 'weapon', rarity: 'epic', icon: '🔫', damage: 95, range: 8, ranged: true, ammo: 'shotgun_shell' },

  // Ammo
  pistol_ammo: { id: 'pistol_ammo', name: '9mm Round', slot: 'ammo', rarity: 'common', icon: '⏺', stackable: true },
  shotgun_shell: { id: 'shotgun_shell', name: 'Shotgun Shell', slot: 'ammo', rarity: 'uncommon', icon: '⏺', stackable: true },

  // Armor
  hoodie: { id: 'hoodie', name: 'Padded Hoodie', slot: 'armor', rarity: 'common', icon: '🧥', damage: 0 },
  vest: { id: 'vest', name: 'Tactical Vest', slot: 'armor', rarity: 'rare', icon: '🦺', damage: 0 },
  helmet: { id: 'helmet', name: 'Riot Helmet', slot: 'helmet', rarity: 'rare', icon: '⛑', damage: 0 },

  // Food / drink
  can_food: { id: 'can_food', name: 'Canned Beans', slot: 'food', rarity: 'common', icon: '🥫', stackable: true, hunger: 35 },
  jerky: { id: 'jerky', name: 'Beef Jerky', slot: 'food', rarity: 'uncommon', icon: '🥩', stackable: true, hunger: 22, stamina: 10 },
  apple: { id: 'apple', name: 'Apple', slot: 'food', rarity: 'common', icon: '🍎', stackable: true, hunger: 14, thirst: 6 },
  water_bottle: { id: 'water_bottle', name: 'Water Bottle', slot: 'drink', rarity: 'common', icon: '💧', stackable: true, thirst: 40 },
  energy_drink: { id: 'energy_drink', name: 'Energy Drink', slot: 'drink', rarity: 'uncommon', icon: '🥤', stackable: true, thirst: 25, stamina: 30 },

  // Medical
  bandage: { id: 'bandage', name: 'Bandage', slot: 'medical', rarity: 'common', icon: '🩹', stackable: true, health: 25 },
  medkit: { id: 'medkit', name: 'First Aid Kit', slot: 'medical', rarity: 'rare', icon: '🩺', stackable: true, health: 80 },
  pills: { id: 'pills', name: 'Painkillers', slot: 'medical', rarity: 'uncommon', icon: '💊', stackable: true, health: 35, stamina: 20 },

  // Tools
  flashlight: { id: 'flashlight', name: 'Flashlight', slot: 'tool', rarity: 'uncommon', icon: '🔦', description: 'Lights the dark when held.' },
  hammer: { id: 'hammer', name: 'Hammer', slot: 'tool', rarity: 'common', icon: '🔨' },

  // Misc / valuables
  battery: { id: 'battery', name: 'Battery', slot: 'misc', rarity: 'uncommon', icon: '🔋', stackable: true },
  map_piece: { id: 'map_piece', name: 'Map Fragment', slot: 'misc', rarity: 'rare', icon: '🗺', stackable: true },
};

export function item(id: ItemId): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error(`Unknown item ${id}`);
  return d;
}
