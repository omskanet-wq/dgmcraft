// Weighted loot table for urban containers (dumpsters, lockers, crates,
// corpses). The same roll function is reused for zombie corpse drops too.
import type { ItemId } from './items';

export interface LootRoll {
  item: ItemId;
  qty: number;
}

interface LootEntry { item: ItemId; weight: number; qty: [number, number] }

export const URBAN_LOOT_TABLE: LootEntry[] = [
  { item: 'wood', weight: 30, qty: [1, 4] },
  { item: 'scrap', weight: 30, qty: [1, 4] },
  { item: 'cloth', weight: 30, qty: [1, 3] },
  { item: 'nails', weight: 22, qty: [2, 8] },
  { item: 'electronics', weight: 8, qty: [1, 2] },
  { item: 'gunpowder', weight: 4, qty: [1, 2] },
  { item: 'can_food', weight: 18, qty: [1, 2] },
  { item: 'jerky', weight: 10, qty: [1, 2] },
  { item: 'apple', weight: 12, qty: [1, 3] },
  { item: 'water_bottle', weight: 18, qty: [1, 2] },
  { item: 'energy_drink', weight: 6, qty: [1, 1] },
  { item: 'bandage', weight: 14, qty: [1, 3] },
  { item: 'medkit', weight: 4, qty: [1, 1] },
  { item: 'pills', weight: 6, qty: [1, 2] },
  { item: 'flashlight', weight: 3, qty: [1, 1] },
  { item: 'hammer', weight: 6, qty: [1, 1] },
  { item: 'pipe', weight: 4, qty: [1, 1] },
  { item: 'fireaxe', weight: 1, qty: [1, 1] },
  { item: 'pistol', weight: 1, qty: [1, 1] },
  { item: 'pistol_ammo', weight: 6, qty: [4, 12] },
  { item: 'shotgun_shell', weight: 3, qty: [2, 6] },
  { item: 'battery', weight: 8, qty: [1, 2] },
  { item: 'vest', weight: 1, qty: [1, 1] },
];

export function rollContainerLoot(rng: () => number, count: number): LootRoll[] {
  const out: LootRoll[] = [];
  const total = URBAN_LOOT_TABLE.reduce((s, e) => s + e.weight, 0);
  for (let i = 0; i < count; i++) {
    let r = rng() * total;
    for (const e of URBAN_LOOT_TABLE) {
      r -= e.weight;
      if (r <= 0) {
        const qty = Math.floor(rng() * (e.qty[1] - e.qty[0] + 1)) + e.qty[0];
        out.push({ item: e.item, qty });
        break;
      }
    }
  }
  return out;
}
