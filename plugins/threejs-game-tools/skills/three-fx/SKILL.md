---
name: three-fx
description: Adds 3D effects to Three.js games with the bundled fx3d.js library - splashes, ripples, sparkles, rarity reveals, coins, confetti, level-up pillars, hit sparks, explosions, smoke, fire, trails, floating damage/gold text, and pixelfx sprites shown in 3D. Use for "add effects/juice/particles" in a 3D or Three.js game.
---

# three-fx: 3D effects for Three.js games

`fx3d.js` (this skill's folder) is a dependency-free effect library for Three.js r128 and newer. It is one plain script that defines a global `FX3D`, so it drops into a single-file HTML game: paste it into its own `<script>` after three.js.

## Use it

```js
const fx = new FX3D(scene, { look: 'toon', unit: 1, quality: 1 });
fx.update(dt, camera);           // every frame, after moving things
```

- `look`: `'toon'` (default: crisp shapes, stepped colors, dithered fade-out, reads like hand-made game VFX), `'pixel'` (each particle drawn as a tiny pixel sprite, for pixel-styled 3D), `'soft'` (classic blurry particles). `fx.setLook()` switches live.
- `unit`: how many world units one meter is. Measure the game's scale first (character height, tile size) and set it.
- `quality`: 0.5 halves particle counts (phones, crowded scenes).
- Positions are a `THREE.Vector3` or `{x, y, z}`. Colors are `0xff8800`, `"#ff8800"` or a color name. `FX3D.RAMPS` has ready color ramps (water, fire, ember, smoke, dust, gold, silver, bronze, heal, magic, leaf, wood).

| call | what it is |
|---|---|
| `splash(p, {size})` | water crown that rises and collapses, droplets with motion trails, foam, ripples |
| `ripple(p, {count, radius})` | crisp rings on the water |
| `bubbles(p)` → handle | rising ring bubbles, loop |
| `sparkle(p, {ramp, count, radius, rainbow})` | twinkling stars + streaking glints + star flash |
| `rarity(p, grade, {ground})` | 0 bronze, 1 silver (+ring), 2 gold (+light beam from `ground`), 3 rainbow (+confetti) |
| `coins(p)`, `confetti(p)` | bouncing coins; spinning paper squares |
| `levelUp(p)` | beam + ring + hearts/squares + text |
| `aura(objOrPos, {ramp, rainbow})` → handle | rising diamonds around a target |
| `hit(p)` | star flash + trailing sparks + snap ring |
| `explosion(p, {size, floor})` | flash, toon-shaded fireballs (white→yellow→orange→red), rolling smoke, sparks, debris, ground shockwave |
| `poof(p)`, `dust(p)`, `debris(p)`, `leaves(p)` | small world reactions |
| `fire(p, {size})`, `smoke(p, {wind})` → handle | stretched flame tongues; puffy smoke column |
| `trail(object, {color, shape})` → handle | particles following a moving object |
| `text(p, "+120G", {color, size})` | pop-in floating text |
| `ring`, `pillar`, `flash`, `crown` | building blocks |
| `emit(p, {...})` | one particle: `vel, gravity, drag, wobble, floor, bounce, dieOnFloor, life, size→size2, sizeEase, pop, ramp (stepped over life) or color, alpha, fadeAt, shape (circle ring star spark puff square drop heart), rot, spin, stretch (motion trail), glow (additive), twinkle, rainbow, delay, fadeIn` |
| `pixel(p, name, opts, {pixel, life})` | a pixelfx effect on a camera-facing sprite (needs the PIXELFX bundle) |

Loops return a handle: `h.stop()`. A handle whose target Object3D is removed stops by itself.

## How it works (so you can extend it)

- Particles are instanced camera-facing quads (one `InstancedBufferGeometry` per blend mode: toon/soft and glow), so thousands cost two draw calls. Shapes are drawn in the fragment shader (no textures); `puff` is shaded like a lit ball with three steps, which is what makes smoke and fireballs look 3D.
- Fast particles stretch along their screen-space velocity (`stretch`), which gives droplets and sparks their trails.
- Colors step through `ramp` over the particle's life instead of blending; fade-out uses a 4x4 ordered dither instead of transparency, which keeps edges crisp and avoids sorting problems.
- Rings, beams and the splash crown are meshes with the same stepped/dithered shader; beams are rim-lit so the character inside stays visible.
- Additive glow is nearly invisible over bright skies; keep important effects in toon mode and use glow only for accents on dark scenes.

## pixelfx in 3D

The pixel-art-tools plugin's `pixelfx/bundle.mjs` makes a `PIXELFX` script. Load it before fx3d.js, then `fx.pixel(pos, 'collect-burst', { palette }, { pixel: 0.035 })`. `pixel` is the world size of one effect pixel; pick it so the effect is about as big as it should be next to the character. Pixel sprites look best in stylized or low-poly scenes.

## Making effects feel right

- Fast in, slow out: bursts start fast and brake (`drag` 2 to 4), gravity pulls water and debris (9 to 14), light motes barely fall.
- Keep the bright core small; additive white everywhere washes out.
- Big moments layer 3 things: a flash, a main burst, lingering bits (smoke, sparkles, rings). Small moments use one.
- Check every effect on screen (see three-game-dev: render-check.py and lab-template.html step through frames). Judge at phone size, against both sky and ground.
- Delay a result popup until the effect has played (about 0.8 to 1.5 s), or it hides the effect.
- Mobile: start with `quality: 0.6`, avoid stacking many loops, watch `fx.count()`.
