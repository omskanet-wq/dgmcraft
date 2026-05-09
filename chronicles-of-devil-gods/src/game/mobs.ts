import type { ItemId } from './items';

export interface MobDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  speed: number; // world units per second
  xp: number;
  goldDrop: [number, number];
  lootTable: { item: ItemId; chance: number; qty: [number, number] }[];
  color: number;
  scale: number;
}

export const MOBS: MobDef[] = [
  {
    id: 'gloomspawn',
    name: 'Gloomspawn',
    hp: 35, atk: 6, speed: 2.2, xp: 18, goldDrop: [3, 9],
    lootTable: [
      { item: 'iron_ore', chance: 0.5, qty: [1, 2] },
      { item: 'minor_potion', chance: 0.15, qty: [1, 1] },
      { item: 'emberglass', chance: 0.08, qty: [1, 1] },
    ],
    color: 0x4a3a5a, scale: 0.9,
  },
  {
    id: 'ash_marauder',
    name: 'Ash Marauder',
    hp: 80, atk: 12, speed: 2.6, xp: 45, goldDrop: [8, 18],
    lootTable: [
      { item: 'iron_ore', chance: 0.6, qty: [2, 4] },
      { item: 'emberglass', chance: 0.25, qty: [1, 2] },
      { item: 'iron_sword', chance: 0.04, qty: [1, 1] },
    ],
    color: 0x86563a, scale: 1.1,
  },
  {
    id: 'void_revenant',
    name: 'Void Revenant',
    hp: 220, atk: 28, speed: 2.0, xp: 140, goldDrop: [25, 60],
    lootTable: [
      { item: 'moonsilver', chance: 0.35, qty: [1, 2] },
      { item: 'void_essence', chance: 0.15, qty: [1, 1] },
      { item: 'major_potion', chance: 0.2, qty: [1, 2] },
      { item: 'rune_gloves', chance: 0.04, qty: [1, 1] },
    ],
    color: 0x6a3aff, scale: 1.3,
  },
  {
    id: 'devil_herald',
    name: 'Herald of the Devil Gods',
    hp: 700, atk: 60, speed: 1.7, xp: 600, goldDrop: [180, 350],
    lootTable: [
      { item: 'void_essence', chance: 0.6, qty: [2, 5] },
      { item: 'ancient_rune', chance: 0.25, qty: [1, 2] },
      { item: 'voidsigil', chance: 0.06, qty: [1, 1] },
      { item: 'devilbreaker', chance: 0.02, qty: [1, 1] },
    ],
    color: 0xff3a3a, scale: 1.7,
  },
];

export const MOB_BY_ID: Record<string, MobDef> = Object.fromEntries(MOBS.map((m) => [m.id, m]));
