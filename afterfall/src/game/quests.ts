// Simple quest / objective system.
// Each quest has a goal type, target count, and reward (xp + items).

export type QuestGoal =
  | { kind: 'kill_zombies'; need: number }
  | { kind: 'loot_containers'; need: number }
  | { kind: 'survive_nights'; need: number }
  | { kind: 'place_buildings'; need: number };

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  goal: QuestGoal;
  rewardXp: number;
  rewardItems: { item: string; qty: number }[];
}

export const QUESTS: QuestDef[] = [
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Drop 5 walkers — break the silence.',
    goal: { kind: 'kill_zombies', need: 5 },
    rewardXp: 60,
    rewardItems: [{ item: 'bandage', qty: 2 }, { item: 'scrap', qty: 4 }],
  },
  {
    id: 'scavenger',
    title: 'Scavenger',
    description: 'Crack open 6 containers in the city.',
    goal: { kind: 'loot_containers', need: 6 },
    rewardXp: 80,
    rewardItems: [{ item: 'wood', qty: 6 }, { item: 'cloth', qty: 4 }],
  },
  {
    id: 'cleanser',
    title: 'Cleanser',
    description: 'Put down 25 of the dead.',
    goal: { kind: 'kill_zombies', need: 25 },
    rewardXp: 220,
    rewardItems: [{ item: 'bandage', qty: 5 }, { item: 'nails', qty: 12 }, { item: 'scrap', qty: 8 }],
  },
  {
    id: 'survivor',
    title: 'Survivor',
    description: 'Outlast 3 nights.',
    goal: { kind: 'survive_nights', need: 3 },
    rewardXp: 300,
    rewardItems: [{ item: 'water_bottle', qty: 4 }, { item: 'can_food', qty: 4 }],
  },
  {
    id: 'foreman',
    title: 'Foreman',
    description: 'Place 4 buildings in your Bastion.',
    goal: { kind: 'place_buildings', need: 4 },
    rewardXp: 150,
    rewardItems: [{ item: 'wood', qty: 12 }, { item: 'nails', qty: 16 }],
  },
];

export interface QuestProgress {
  id: string;
  count: number;
  done: boolean;
  claimed: boolean;
}

export function makeInitialProgress(): QuestProgress[] {
  return QUESTS.map((q) => ({ id: q.id, count: 0, done: false, claimed: false }));
}

export function findDef(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}
