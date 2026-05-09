# Chronicles of Devil Gods

A 3D action-RPG / city-builder hybrid that runs as a PWA in the browser and
ships to Android & iOS via Capacitor. Inspired by the **isometric ARPG**
genre and **base-building strategy** games — with all art, lore, names, and
mechanics 100% original.

> **The fallen gods stir again. Choose a bloodline, raise a stronghold, and
> hunt the Heralds before the Devil Gods wake.**

## Features

- **5 playable races, 15 classes** — Lumireth (light elves), Nyxari (dark
  elves), Aerians (humans), Stoneborn (dwarves), Krohgar (orcs). Each race has
  three class archetypes (melee, ranged, caster, tank, support).
- **Procedural 3D models** — every race, mob, building, and pickup is built
  from primitives in [Three.js](https://threejs.org/). No third-party assets,
  no copyrighted material.
- **Diablo-style adventure mode** — isometric ortho camera, click-to-move,
  click-to-attack ARPG combat, mob aggro, loot drops, XP & leveling.
- **Stronghold city-builder** — switch to top-down strategy view, place
  buildings on a grid, produce gold/stone/wood/food/mana, train a garrison.
- **Inventory + equipment** — 7-slot character paper-doll, drag-free click-to-equip,
  stack-based bag with rarity-coloured borders.
- **Crafting** — data-driven recipes consume materials and gold to forge
  weapons, armor, and consumables.
- **Lootbox / shrine offerings** — three tiers of weighted-random rewards.
  Open with an animated reveal that pulses gold.
- **Mobile-first controls** — virtual joystick on phones, full
  keyboard/mouse on desktop. Touch-and-tap building placement.
- **PWA-ready** — manifest, offline service worker, installable icon.
- **Capacitor-ready** — drop-in `capacitor.config.json` to wrap into native
  Android & iOS shells.

## Stack

- TypeScript + React 19 + Vite 8
- Three.js for all rendering
- Zustand for game state
- ESLint + tsc for CI

## Run locally

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # production bundle in dist/
pnpm preview      # serve the built bundle
```

## Build native apps

After `pnpm build`, install Capacitor and add platforms:

```bash
pnpm add -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
pnpm exec cap add android
pnpm exec cap add ios
pnpm exec cap sync
pnpm exec cap open android   # or ios
```

The PWA also installs directly from any modern mobile browser ("Add to
Home Screen").

## Project layout

```
src/
  game/        # data: races, items, recipes, lootboxes, mobs, buildings, models
  state/       # zustand store
  scenes/      # CharacterSelect, WorldScene (ARPG), StrongholdScene (builder)
  ui/          # HUD, Inventory, Crafting, LootboxPanel
  utils/       # screen-space damage numbers
public/        # PWA manifest, icons, service worker
```

## Controls

**Adventure mode**
- WASD / arrow keys — move
- Left-click ground — move there
- Left-click enemy — attack
- I — inventory · C — crafting · L — shrines · B — switch to stronghold

**Stronghold mode**
- WASD / arrows — pan camera
- Click building card → click empty tile to place
- Buildings cost gold/stone/wood and take time to construct
- Producers (Mine, Farm, Mage Tower) tick every 5 seconds

## License

MIT — but the lore, names, and procedural-art code in this repo are original
to the project. No third-party copyrighted assets are bundled.
