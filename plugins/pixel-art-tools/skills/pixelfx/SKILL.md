---
name: pixelfx
description: Adds ready-made pixel art effects (244, from the MIT pixelfx library) to games, recolors them, exports sprite sheets, or makes new ones. Use when the user wants pixel VFX, game juice, sparkles, splashes, explosions, pickups, sprite sheets of effects, or mentions pixelfx.
---

# pixelfx

Pixel art effects as code (MIT, https://github.com/patch-gg/pixelfx). The library is bundled in this skill's folder under `pixelfx/`. Each effect is one file, `pixelfx/src/fx/<category>/<name>.js`, that draws into two buffers: **color** (opaque, dithered or translucent pixels) and **light** (additive glow). No images, so an effect can be played live, recolored, mirrored, reseeded and rendered to a sprite sheet.

Categories: moves, fire, explosions, water, ice, lightning, scifi, melee, impacts, projectiles, spawn, arcane, holy, shadow, status, nature, weather, ui, pickups, transitions, critters. `pixelfx/docs/CATALOG.md` lists every effect; `pixelfx/docs/AUTHORING.md` is the contract for writing new ones.

## Before anything

1. Copy `pixelfx/` from this skill's folder into the working directory (the plugin folder may be read-only; the tools write `records/`). No install step: the tools use only Node 18+.
2. Check it runs: `node tools/render.mjs fire/torch` inside the copy writes `records/fire/torch/contact.png`. Open that PNG with the image reader.

## 1. Pick an existing effect first

Most requests are an existing effect with different options. `node tools/list.mjs <words>` searches ids, names, tags and descriptions. Read each candidate's `export const meta` (`size`, `origin`, `duration`, `loop`, `options`, and `actor` if it acts out a character) and render it before choosing.

- `palette`: the main ramp, dark to bright, as hex strings (8 steps for most). A grade/rarity system can reuse one effect with a ramp per grade (bronze, silver, gold, rainbow).
- `seed` for a different take (use a random seed per play so repeats don't look identical), `flip`, `angle`, `light` (glow strength), plus each effect's own options. Try options with `node tools/render.mjs <id> --opts '{"palette":[...]}'`.
- Effects with `meta.actor` draw a stock character; skip them for games with their own characters, or use only their timing.
- Some effects draw a prop (loot-beam draws a sword). Read `draw()` and, if needed, wrap the prop in an option check (e.g. `if (o.item !== false)`) and note the change.

## 2. Put it in a game

**Canvas / JS games:** no dependencies.

```js
const [w, h] = mod.meta.size, [ox, oy] = mod.meta.origin;
const frame = createFrame(w, h, -ox, -oy);     // effect origin lands on (ox, oy) in the frame
const fx = createFx(mod, { x: 0, y: 0, palette, seed });
// every tick
fx.update(dt);
clearFrame(frame); fx.draw(frame);
composite(frame, img.data, null);              // null = transparent background
smallCtx.putImageData(img, 0, 0);
ctx.imageSmoothingEnabled = false;
ctx.drawImage(smallCanvas, sx - ox * ps, sy - oy * ps, w * ps, h * ps);
if (fx.done()) remove();                       // one-shots end by themselves; fx.stop() fades a loop out
```

**Single-file HTML games** (no build step): `bundle.mjs` in this skill's folder bundles only the needed modules into one plain script that defines a global `PIXELFX = { core, fx: { "<name>": module } }`:

```sh
node <skill>/bundle.mjs <pixelfx copy> out.js src/core/index.js src/fx/water/splash.js src/fx/pickups/collect-burst.js
```

Paste `out.js` into its own `<script>` before the game's script. Verify the bundle by rendering each effect with both the bundle and the original modules and comparing the color buffers.

**Scale.** Effects are authored at about 60 to 160 px, much bigger than a 16 px tile game's world pixels. Don't shrink them (pixels break). Draw them in screen space at their own pixel size (about 1 to 2 CSS px per effect pixel, e.g. `Math.max(1, Math.round(zoom / 2))`) anchored to a world point, and keep small in-world touches (bobber splashes, dust, chips) as tiny custom particles at the game's own resolution. Celebration effects (collect-burst, loot-beam, confetti) read well this way. If a popup appears over the spot, delay it until the effect has played.

**Layering.** Draw effects after the world, and give effects that sit on a UI element (e.g. a minigame ring) their own pass after that UI.

**Any engine** (Godot, Unity, etc.): `node tools/render.mjs <category>/<name> --sheet` writes a transparent sprite sheet plus Aseprite-style JSON; set the pivot to `meta.pixelfx.pivot`, import with nearest-neighbour filtering and no compression, play at `meta.pixelfx.fps`.

## 3. Make a new one

Read `docs/AUTHORING.md`. Say the effect in one line with art direction (what, how it moves, palette, timing), read the two or three closest effect files and borrow their techniques (`Particles`/`Bits` in `src/core/sim.js`, `cycle`, `tileFbm`), start from `node tools/new.mjs <category>/<name>`, render, look at the contact sheet, fix the worst thing, repeat at least three rounds. `node tools/check.mjs <id>` catches drawing outside the canvas, one-shots that don't end empty, loop seams and unseeded randomness.

| you see | fix |
|---|---|
| mush at 1x | fewer colors, clear silhouette, one focal point |
| lone noise pixels | threshold noise less, no noise on small shapes |
| floaty, no punch | fast in, slow out, a 1-2 frame white flash, shorter |
| stiff | vary each particle; add secondary motion |
| washed out | less glow, darker edge steps, white only at the core |
| one-shot pops off | shrink, dither out or fall away before the end |

Never use `Math.random` inside an effect; never recreate a specific game's sprites, characters or logos.

## Credit

Keep a comment crediting pixelfx (MIT, patch-gg) in any bundled copy, and note any changes made to effect code.
