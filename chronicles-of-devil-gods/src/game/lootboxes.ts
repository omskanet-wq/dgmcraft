import type { ItemId } from './items';

export interface LootEntry {
  item: ItemId;
  qty: [number, number]; // min, max
  weight: number;
}

export interface LootboxDef {
  id: string;
  name: string;
  description: string;
  cost: number; // gold
  rolls: number; // how many items to roll
  table: LootEntry[];
}

export const LOOTBOXES: LootboxDef[] = [
  {
    id: 'common_shrine',
    name: 'Wayfarer Shrine',
    description: 'A weathered roadside shrine. Common rewards for a humble offering.',
    cost: 200,
    rolls: 2,
    table: [
      { item: 'iron_ore', qty: [3, 8], weight: 60 },
      { item: 'emberglass', qty: [1, 3], weight: 25 },
      { item: 'minor_potion', qty: [1, 3], weight: 20 },
      { item: 'iron_sword', qty: [1, 1], weight: 8 },
      { item: 'leather_chest', qty: [1, 1], weight: 6 },
      { item: 'moonsilver', qty: [1, 1], weight: 3 },
    ],
  },
  {
    id: 'arcane_shrine',
    name: 'Arcane Reliquary',
    description: 'A reliquary humming with stored magic. Better odds, higher cost.',
    cost: 1200,
    rolls: 3,
    table: [
      { item: 'emberglass', qty: [3, 8], weight: 30 },
      { item: 'moonsilver', qty: [1, 3], weight: 25 },
      { item: 'major_potion', qty: [1, 3], weight: 15 },
      { item: 'mana_draught', qty: [1, 3], weight: 10 },
      { item: 'rune_gloves', qty: [1, 1], weight: 6 },
      { item: 'swift_boots', qty: [1, 1], weight: 6 },
      { item: 'void_essence', qty: [1, 1], weight: 5 },
      { item: 'emberband', qty: [1, 1], weight: 2 },
      { item: 'ancient_rune', qty: [1, 1], weight: 1 },
    ],
  },
  {
    id: 'devil_shrine',
    name: "Devil God's Altar",
    description: 'A forbidden altar. Rumors say it answers only the truly wealthy.',
    cost: 6000,
    rolls: 4,
    table: [
      { item: 'moonsilver', qty: [3, 8], weight: 30 },
      { item: 'void_essence', qty: [2, 5], weight: 20 },
      { item: 'ancient_rune', qty: [1, 3], weight: 15 },
      { item: 'ash_greataxe', qty: [1, 1], weight: 8 },
      { item: 'voidsigil', qty: [1, 1], weight: 5 },
      { item: 'devilbreaker', qty: [1, 1], weight: 2 },
      { item: 'godfang', qty: [1, 1], weight: 1 },
    ],
  },
];

export function rollLootbox(box: LootboxDef): { item: ItemId; qty: number }[] {
  const total = box.table.reduce((s, e) => s + e.weight, 0);
  const out: { item: ItemId; qty: number }[] = [];
  for (let i = 0; i < box.rolls; i++) {
    let r = Math.random() * total;
    for (const e of box.table) {
      r -= e.weight;
      if (r <= 0) {
        const qty = Math.floor(Math.random() * (e.qty[1] - e.qty[0] + 1)) + e.qty[0];
        out.push({ item: e.item, qty });
        break;
      }
    }
  }
  return out;
}
