// Original races for Chronicles of Devil Gods. Inspired by classic high-fantasy
// MMORPGs but lore, names, and visuals are original to this project.

export type RaceId = 'lumireth' | 'nyxari' | 'aerian' | 'stoneborn' | 'krohgar';

export interface RaceDef {
  id: RaceId;
  name: string;
  archetype: string;
  description: string;
  // Hex colors used by the procedural 3D model.
  skin: number;
  hair: number;
  trim: number;
  baseStats: {
    str: number;
    dex: number;
    int: number;
    vit: number;
  };
  classes: ClassDef[];
}

export interface ClassDef {
  id: string;
  name: string;
  role: 'melee' | 'ranged' | 'caster' | 'support' | 'tank';
  description: string;
}

export const RACES: RaceDef[] = [
  {
    id: 'lumireth',
    name: 'Lumireth',
    archetype: 'Light Elves of the Silvered Vale',
    description:
      'Graceful keepers of the dawn-light. Swift archers and arcane scholars.',
    skin: 0xf5e6d4,
    hair: 0xfff2c2,
    trim: 0x9bd6ff,
    baseStats: { str: 38, dex: 55, int: 50, vit: 40 },
    classes: [
      { id: 'lum_archer', name: 'Vale Archer', role: 'ranged', description: 'Long-range bow specialist with hawk-eye precision.' },
      { id: 'lum_blade', name: 'Silvered Blade', role: 'melee', description: 'Twin-blade duelist who weaves through battle.' },
      { id: 'lum_seer', name: 'Dawn Seer', role: 'caster', description: 'Channels radiant magic to scorch and heal.' },
    ],
  },
  {
    id: 'nyxari',
    name: 'Nyxari',
    archetype: 'Dark Elves of the Sundered Moon',
    description:
      'Pale-skinned exiles bound to shadow-magic and ancient pacts.',
    skin: 0x6f6580,
    hair: 0x2a1f3a,
    trim: 0xa44bff,
    baseStats: { str: 42, dex: 52, int: 55, vit: 38 },
    classes: [
      { id: 'nyx_assassin', name: 'Hollow Assassin', role: 'melee', description: 'Stealth striker that vanishes between heartbeats.' },
      { id: 'nyx_warlock', name: 'Moon Warlock', role: 'caster', description: 'Calls down curses and shadow-flame.' },
      { id: 'nyx_lancer', name: 'Voidlancer', role: 'melee', description: 'Polearm fighter empowered by void runes.' },
    ],
  },
  {
    id: 'aerian',
    name: 'Aerians',
    archetype: 'Humans of the Crownlands',
    description:
      'Versatile and ambitious. Master soldiers, merchants, and inventors.',
    skin: 0xe8b48a,
    hair: 0x4a2f1e,
    trim: 0xd4a04a,
    baseStats: { str: 50, dex: 48, int: 45, vit: 50 },
    classes: [
      { id: 'aer_vanguard', name: 'Crown Vanguard', role: 'tank', description: 'Sword-and-shield bulwark of the kingdom.' },
      { id: 'aer_ranger', name: 'Borderland Ranger', role: 'ranged', description: 'Crossbow scout with traps and beasts.' },
      { id: 'aer_cleric', name: 'Sun Cleric', role: 'support', description: 'Devout healer who buffs allies in formation.' },
    ],
  },
  {
    id: 'stoneborn',
    name: 'Stoneborn',
    archetype: 'Mountain-Forged Dwarves',
    description:
      'Stout artisans, miners, and rune-smiths from the deep halls.',
    skin: 0xd9a878,
    hair: 0x9a3a1a,
    trim: 0xb87333,
    baseStats: { str: 58, dex: 36, int: 44, vit: 60 },
    classes: [
      { id: 'sto_breaker', name: 'Hammerbreaker', role: 'melee', description: 'Two-handed warhammer crusher.' },
      { id: 'sto_runesmith', name: 'Runesmith', role: 'support', description: 'Engraves runes that buff weapons mid-fight.' },
      { id: 'sto_engineer', name: 'Forge Engineer', role: 'ranged', description: 'Wields cannon-pistols and clockwork bombs.' },
    ],
  },
  {
    id: 'krohgar',
    name: 'Krohgar',
    archetype: 'Tusked Warlords of the Ashplains',
    description:
      'Towering, tribal, and unbreakable. Live for the hunt and the war-drum.',
    skin: 0x86a36b,
    hair: 0x1a1208,
    trim: 0xc24a2a,
    baseStats: { str: 62, dex: 42, int: 30, vit: 58 },
    classes: [
      { id: 'kro_destroyer', name: 'Ash Destroyer', role: 'melee', description: 'Berserker swinging a colossal greataxe.' },
      { id: 'kro_shaman', name: 'Bone Shaman', role: 'caster', description: 'Speaks with ancestor-spirits, hexes foes.' },
      { id: 'kro_hunter', name: 'Tusk Hunter', role: 'ranged', description: 'Throws spears and rides war-beasts.' },
    ],
  },
];

export function getRace(id: RaceId): RaceDef {
  const r = RACES.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown race: ${id}`);
  return r;
}
