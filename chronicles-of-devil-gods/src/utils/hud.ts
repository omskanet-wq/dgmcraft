// Helper that spawns a floating damage number on the screen at given pixel coords.
import { RARITY_COLOR, type Rarity } from '../game/items';

export function spawnDamageNumber(x: number, y: number, value: number | string, color = '#ffce6a') {
  const el = document.createElement('div');
  el.className = 'dmg';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  el.textContent = typeof value === 'number' ? `-${value}` : value;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

export function spawnLootText(x: number, y: number, name: string, rarity: Rarity) {
  spawnDamageNumber(x, y, `+ ${name}`, RARITY_COLOR[rarity]);
}
