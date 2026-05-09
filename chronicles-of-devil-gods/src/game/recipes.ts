import type { ItemId } from './items';

export interface Recipe {
  id: string;
  result: ItemId;
  resultQty: number;
  requires: { item: ItemId; qty: number }[];
  goldCost: number;
  unlockedFrom?: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'r_iron_sword',
    result: 'iron_sword',
    resultQty: 1,
    requires: [{ item: 'iron_ore', qty: 4 }],
    goldCost: 50,
  },
  {
    id: 'r_scale_helm',
    result: 'scale_helm',
    resultQty: 1,
    requires: [{ item: 'iron_ore', qty: 6 }, { item: 'emberglass', qty: 2 }],
    goldCost: 120,
  },
  {
    id: 'r_moonsilver_blade',
    result: 'moonsilver_blade',
    resultQty: 1,
    requires: [{ item: 'moonsilver', qty: 3 }, { item: 'emberglass', qty: 4 }],
    goldCost: 600,
  },
  {
    id: 'r_rune_gloves',
    result: 'rune_gloves',
    resultQty: 1,
    requires: [{ item: 'moonsilver', qty: 2 }, { item: 'ancient_rune', qty: 1 }],
    goldCost: 900,
  },
  {
    id: 'r_emberband',
    result: 'emberband',
    resultQty: 1,
    requires: [{ item: 'void_essence', qty: 2 }, { item: 'emberglass', qty: 6 }],
    goldCost: 1500,
  },
  {
    id: 'r_devilbreaker',
    result: 'devilbreaker',
    resultQty: 1,
    requires: [
      { item: 'moonsilver', qty: 8 },
      { item: 'void_essence', qty: 4 },
      { item: 'ancient_rune', qty: 2 },
    ],
    goldCost: 5000,
  },
  {
    id: 'r_minor_potion',
    result: 'minor_potion',
    resultQty: 5,
    requires: [{ item: 'emberglass', qty: 1 }],
    goldCost: 30,
  },
];
