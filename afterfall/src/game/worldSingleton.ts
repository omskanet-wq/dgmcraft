// Single shared world instance so HUD components (minimap) can reuse the
// same generated world the active scene built. Lazy so we don't pay for
// generation on the menu screen.
import { generateWorld, type WorldData, type Biome } from './world';

let cached: WorldData | null = null;
let cachedSeed = 0;

export function getWorld(seed = 7): WorldData {
  if (!cached || cachedSeed !== seed) {
    cached = generateWorld(seed);
    cachedSeed = seed;
  }
  return cached;
}

export const BIOME_COLORS: Record<Biome, string> = {
  downtown: '#444a58',
  suburb: '#4d6a4a',
  industrial: '#5a4838',
  village: '#6c8a3e',
  highway: '#2a2a30',
  wilderness: '#2c4a2a',
  ruins: '#5a3030',
};
