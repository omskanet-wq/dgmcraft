import type { ItemId } from './items';

export interface Recipe {
  id: string;
  result: ItemId;
  resultQty: number;
  requires: { item: ItemId; qty: number }[];
  needsWorkbench?: boolean;
}

export const RECIPES: Recipe[] = [
  { id: 'r_pipe', result: 'pipe', resultQty: 1, requires: [{ item: 'scrap', qty: 4 }], needsWorkbench: false },
  { id: 'r_spiked_bat', result: 'spiked_bat', resultQty: 1, requires: [{ item: 'wood', qty: 4 }, { item: 'nails', qty: 6 }], needsWorkbench: true },
  { id: 'r_bandage', result: 'bandage', resultQty: 2, requires: [{ item: 'cloth', qty: 3 }] },
  { id: 'r_medkit', result: 'medkit', resultQty: 1, requires: [{ item: 'cloth', qty: 5 }, { item: 'pills', qty: 1 }], needsWorkbench: true },
  { id: 'r_pistol_ammo', result: 'pistol_ammo', resultQty: 6, requires: [{ item: 'scrap', qty: 1 }, { item: 'gunpowder', qty: 1 }], needsWorkbench: true },
  { id: 'r_shotgun_shell', result: 'shotgun_shell', resultQty: 4, requires: [{ item: 'scrap', qty: 2 }, { item: 'gunpowder', qty: 2 }], needsWorkbench: true },
  { id: 'r_nails', result: 'nails', resultQty: 8, requires: [{ item: 'scrap', qty: 1 }] },
  { id: 'r_hoodie', result: 'hoodie', resultQty: 1, requires: [{ item: 'cloth', qty: 8 }], needsWorkbench: true },
];
