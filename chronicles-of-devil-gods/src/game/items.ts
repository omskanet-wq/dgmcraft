// Original item database. Names and stats are original.

export type ItemId = string;
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemSlot = 'weapon' | 'helm' | 'chest' | 'gloves' | 'boots' | 'ring' | 'amulet' | 'consumable' | 'material';

export interface ItemDef {
  id: ItemId;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  icon: string; // single-glyph icon
  stats?: Partial<{ atk: number; def: number; hp: number; mp: number; crit: number; magic: number }>;
  stackable?: boolean;
  description?: string;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#bfbfbf',
  uncommon: '#5fcf6e',
  rare: '#4ea0ff',
  epic: '#b65cff',
  legendary: '#ffae3d',
  mythic: '#ff4d6d',
};

export const ITEMS: Record<ItemId, ItemDef> = {
  // Materials
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', slot: 'material', rarity: 'common', icon: '⛏', stackable: true, description: 'Raw iron mined from the deep halls.' },
  emberglass: { id: 'emberglass', name: 'Emberglass Shard', slot: 'material', rarity: 'uncommon', icon: '🔶', stackable: true, description: 'Volcanic glass that hums with heat.' },
  moonsilver: { id: 'moonsilver', name: 'Moonsilver Ingot', slot: 'material', rarity: 'rare', icon: '◆', stackable: true, description: 'Refined silver charged under a Sundered Moon.' },
  void_essence: { id: 'void_essence', name: 'Void Essence', slot: 'material', rarity: 'epic', icon: '✦', stackable: true, description: 'A trapped breath of nothingness.' },
  ancient_rune: { id: 'ancient_rune', name: 'Ancient Rune', slot: 'material', rarity: 'legendary', icon: '✺', stackable: true, description: 'A rune carved before the gods fell.' },

  // Weapons
  iron_sword: { id: 'iron_sword', name: 'Iron Sword', slot: 'weapon', rarity: 'common', icon: '⚔', stats: { atk: 8 } },
  vale_bow: { id: 'vale_bow', name: 'Vale Longbow', slot: 'weapon', rarity: 'uncommon', icon: '🏹', stats: { atk: 12, dex: 4 } as never },
  moonsilver_blade: { id: 'moonsilver_blade', name: 'Moonsilver Blade', slot: 'weapon', rarity: 'rare', icon: '⚔', stats: { atk: 22, crit: 6 } },
  ash_greataxe: { id: 'ash_greataxe', name: 'Ash Greataxe', slot: 'weapon', rarity: 'epic', icon: '🪓', stats: { atk: 38 } },
  devilbreaker: { id: 'devilbreaker', name: 'Devilbreaker', slot: 'weapon', rarity: 'legendary', icon: '⚒', stats: { atk: 62, crit: 10 }, description: 'Forged to slay the Devil Gods.' },
  godfang: { id: 'godfang', name: 'Godfang', slot: 'weapon', rarity: 'mythic', icon: '⚔', stats: { atk: 110, crit: 18, magic: 40 }, description: 'A shard of the First Devil God\'s tooth.' },

  // Armor
  leather_chest: { id: 'leather_chest', name: 'Leather Cuirass', slot: 'chest', rarity: 'common', icon: '🛡', stats: { def: 6, hp: 20 } },
  scale_helm: { id: 'scale_helm', name: 'Scale Helm', slot: 'helm', rarity: 'uncommon', icon: '🪖', stats: { def: 5, hp: 15 } },
  rune_gloves: { id: 'rune_gloves', name: 'Runed Gauntlets', slot: 'gloves', rarity: 'rare', icon: '🧤', stats: { def: 7, atk: 4 } },
  swift_boots: { id: 'swift_boots', name: 'Swiftstride Boots', slot: 'boots', rarity: 'rare', icon: '👢', stats: { def: 6, dex: 5 } as never },

  // Trinkets
  emberband: { id: 'emberband', name: 'Emberband Ring', slot: 'ring', rarity: 'epic', icon: '◯', stats: { magic: 12, hp: 30 } },
  voidsigil: { id: 'voidsigil', name: 'Voidsigil Amulet', slot: 'amulet', rarity: 'legendary', icon: '✦', stats: { magic: 24, mp: 60 } },

  // Consumables
  minor_potion: { id: 'minor_potion', name: 'Minor Healing Vial', slot: 'consumable', rarity: 'common', icon: '🧪', stackable: true, description: 'Restores 50 HP.' },
  major_potion: { id: 'major_potion', name: 'Major Healing Vial', slot: 'consumable', rarity: 'uncommon', icon: '🧪', stackable: true, description: 'Restores 200 HP.' },
  mana_draught: { id: 'mana_draught', name: 'Mana Draught', slot: 'consumable', rarity: 'uncommon', icon: '🧪', stackable: true, description: 'Restores 100 MP.' },
};

export function item(id: ItemId): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error(`Unknown item ${id}`);
  return d;
}
