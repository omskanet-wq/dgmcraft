import type { ItemId } from './items';

export interface ZombieDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  aggroRange: number;
  xp: number;
  loot: { item: ItemId; chance: number; qty: [number, number] }[];
  // Visual
  skin: number;
  shirt: number;
  pants: number;
  scale: number;
}

export const ZOMBIES: Record<string, ZombieDef> = {
  walker: {
    id: 'walker', name: 'Walker',
    hp: 45, damage: 8, speed: 1.4, aggroRange: 9, xp: 12,
    loot: [
      { item: 'cloth', chance: 0.4, qty: [1, 2] },
      { item: 'bandage', chance: 0.1, qty: [1, 1] },
    ],
    skin: 0x6a8856, shirt: 0x4a3a2a, pants: 0x2a2218, scale: 1.0,
  },
  runner: {
    id: 'runner', name: 'Runner',
    hp: 35, damage: 12, speed: 3.4, aggroRange: 14, xp: 22,
    loot: [
      { item: 'cloth', chance: 0.5, qty: [1, 2] },
      { item: 'pistol_ammo', chance: 0.08, qty: [1, 3] },
    ],
    skin: 0x7a8c4a, shirt: 0x6a2a2a, pants: 0x222018, scale: 0.95,
  },
  bloater: {
    id: 'bloater', name: 'Bloater',
    hp: 180, damage: 22, speed: 1.0, aggroRange: 7, xp: 60,
    loot: [
      { item: 'cloth', chance: 0.6, qty: [2, 4] },
      { item: 'gunpowder', chance: 0.3, qty: [1, 2] },
      { item: 'medkit', chance: 0.05, qty: [1, 1] },
    ],
    skin: 0x4a6a3a, shirt: 0x2a1a14, pants: 0x18120c, scale: 1.4,
  },
  brute: {
    id: 'brute', name: 'Brute',
    hp: 360, damage: 38, speed: 1.6, aggroRange: 10, xp: 180,
    loot: [
      { item: 'scrap', chance: 0.8, qty: [3, 6] },
      { item: 'electronics', chance: 0.25, qty: [1, 2] },
      { item: 'shotgun_shell', chance: 0.15, qty: [1, 3] },
      { item: 'machete', chance: 0.04, qty: [1, 1] },
    ],
    skin: 0x4a5a3a, shirt: 0x1a1812, pants: 0x14120a, scale: 1.7,
  },
};

export const ZOMBIE_LIST = Object.values(ZOMBIES);
