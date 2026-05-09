// Bastion buildings — base defense.

export type BuildingId =
  | 'wall'
  | 'gate'
  | 'spike'
  | 'turret'
  | 'workbench'
  | 'bed'
  | 'campfire'
  | 'storage'
  | 'water_collector';

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  size: 1 | 2;
  costs: Record<string, number>;
  hp: number;
  blocksZombies?: boolean;
  damageOnTouch?: number; // spikes
  shootsAt?: number; // turret damage per shot
  shootRange?: number;
  shootRate?: number; // shots per second
  description2?: string;
  color: number;
  trim: number;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  wall: {
    id: 'wall', name: 'Wood Wall', description: 'Cheap reinforced wall.',
    size: 1, costs: { wood: 4, nails: 2 }, hp: 250, blocksZombies: true,
    color: 0x6a4a2a, trim: 0x3a2818,
  },
  gate: {
    id: 'gate', name: 'Reinforced Gate', description: 'Walk-through wall, blocks zombies.',
    size: 1, costs: { wood: 6, scrap: 4, nails: 4 }, hp: 400, blocksZombies: true,
    color: 0x6a4a2a, trim: 0xb87333,
  },
  spike: {
    id: 'spike', name: 'Spike Trap', description: 'Damages anything that walks over it.',
    size: 1, costs: { wood: 2, scrap: 4 }, hp: 120, damageOnTouch: 14,
    color: 0x3a3a3a, trim: 0xc1c1c1,
  },
  turret: {
    id: 'turret', name: 'Auto Turret', description: 'Shoots nearby zombies. Needs ammo nearby (uses bag).',
    size: 1, costs: { scrap: 12, electronics: 2, nails: 4 }, hp: 200, shootsAt: 22, shootRange: 9, shootRate: 1.6,
    color: 0x2a2a2a, trim: 0x5a8aff,
  },
  workbench: {
    id: 'workbench', name: 'Workbench', description: 'Required for advanced crafting.',
    size: 1, costs: { wood: 8, scrap: 4, nails: 4 }, hp: 300,
    color: 0x6a4a2a, trim: 0x4a3a2a,
  },
  bed: {
    id: 'bed', name: 'Camp Bed', description: 'Sleep through the night when safe.',
    size: 2, costs: { wood: 6, cloth: 4 }, hp: 150,
    color: 0x4a3a2a, trim: 0xc88a5a,
  },
  campfire: {
    id: 'campfire', name: 'Campfire', description: 'Light + warmth. Cooks food (later).',
    size: 1, costs: { wood: 6, scrap: 1 }, hp: 80,
    color: 0x2a1a14, trim: 0xff7a2a,
  },
  storage: {
    id: 'storage', name: 'Storage Crate', description: 'Increases bag capacity.',
    size: 1, costs: { wood: 8, nails: 4 }, hp: 200,
    color: 0x6a4a2a, trim: 0x2a1a14,
  },
  water_collector: {
    id: 'water_collector', name: 'Water Collector', description: 'Slowly produces water bottles.',
    size: 1, costs: { scrap: 6, electronics: 1 }, hp: 150,
    color: 0x6a8aaa, trim: 0x9bc4ff,
  },
};

export const BUILDING_LIST = Object.values(BUILDINGS);
