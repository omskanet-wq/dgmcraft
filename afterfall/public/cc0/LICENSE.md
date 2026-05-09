# Third-party assets

Every asset under `public/cc0/` is licensed under **CC0 1.0 (Public Domain
Dedication)** — no attribution required, free for any use including commercial.
Sources are listed below as a courtesy.

## Textures (sourced from ambientCG, CC0)

All maps were downloaded from <https://ambientcg.com>, downscaled to 512×512
and re-encoded as JPEG q=75 to keep the bundle small. We use only Color,
NormalGL, Roughness and (where present) Metalness channels.

| Slug | Source asset |
| --- | --- |
| `asphalt`  | Asphalt026A   |
| `bricks`   | Bricks075A    |
| `concrete` | Concrete033   |
| `metal`    | MetalPlates006|
| `ground`   | Ground037     |
| `grass`    | Grass001      |
| `rust`     | Rust004       |
| `wood`     | WoodFloor043  |

## Procedural assets

Everything else (3D models, UI iconography, sound effects) is generated at
runtime from primitives in `src/game/models.ts` and `src/game/textures.ts`.
No third-party model meshes or animations are used.
