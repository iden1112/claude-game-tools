# pixel-art-tools

Four MIT-licensed pixel art tools, bundled with their code so they work without downloading anything:

| Skill | What it does | Source |
|---|---|---|
| pixelfx | 244 ready-made pixel effects; drop into canvas games or export sprite sheets | github.com/patch-gg/pixelfx |
| codixel | Turn a reference image into pixel art, rig it with bones, animate it | github.com/mankidev/codixel |
| pixel-art-studio | Draw sprites, tiles and animations pixel by pixel with Python/Pillow | pixel-art-studio |
| pxl-pixel-art | Pixel art sprites, scenes and animations from a compact JS file | github.com/crsolver/claude-pxl |

Each skill folder keeps its project's LICENSE. Small changes for use inside a plugin: file paths, where outputs are written, and pixelfx's guide rewritten around bundling effects into single-file games (adds `bundle.mjs`). pixelfx's loot-beam effect is unchanged here; the game bundle added an `item: false` option.
Needs Node 22.18+ (pxl), Node 18+ (pixelfx, codixel) and Python 3 with Pillow (pixel-art-studio).
