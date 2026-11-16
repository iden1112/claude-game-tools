---
name: three-models
description: Builds 3D models in code for Three.js games - detailed cute characters and NPCs (character3d.js - faces, hairstyles, hats, outfits, walk/wave/cast/cheer animations) plus low-poly fish, trees, rocks, islands, waves, grass, boats, houses, crates and lanterns (models3d.js), in smooth, flat or toon style. Use when a 3D/Three.js game needs props, creatures, characters or terrain without model files.
---

# three-models: 3D models in code

`models3d.js` (this skill's folder) defines a global `MODELS3D` for Three.js r128 and newer. Paste it into its own `<script>` after three.js. Every builder returns a `THREE.Group` that stands on y = 0.

```js
const M = MODELS3D;
const island = M.island({ radius: 12, height: 2.4, seed: 7 }); scene.add(island);
const H = island.userData.heightAt;                    // ground height at (x, z)
M.scatter(scene, (i, r) => M.tree({ type: 'palm', seed: i }), 12, { width: 20, depth: 20, heightAt: H, where: (x, z) => H(x, z) > 0.5 });
const fish = M.fish({ shape: 'shark', body: 0x7a8a9a, length: 2 });
// every frame
M.updateAll(scene, t, dt);                             // swims, sways, bobs, walks
```

| builder | options |
|---|---|
| `fish` | `shape` round/long/flat/shark/puffer, `length`, `body`, `belly`, `fin`, `stripes`, `stripeColor`, `spots`, `swimSpeed` |
| `tree` | `type` round/pine/palm/bush, `height`, `leaf`, `trunk`, `seed`, `sway` |
| `rock` | `size`, `color`, `moss`, `flat`, `seed`, `detail` |
| `island` | `radius`, `height`, `seed`, `segments`, `colors {sand, grass, rock, under}`; `userData.heightAt(x, z)` |
| `water` | `size`, `segments`, `waves`, `color`, `opacity`; `userData.heightAt(x, z, t)` |
| `grass` | `count`, `width`, `depth`, `color`, `heightAt` (one InstancedMesh) |
| `boat` | `length`, `hull`, `stripe`, `deck`, `cabin`, `roof`, `sail`, `sailColor` (bobs; set `userData.baseY`) |
| `house` | `width`, `depth`, `floors`, `wall`, `roof`, `door`, `window`, `lit`, `chimney` |
| `crate`, `lantern({light})` | props; `light: true` adds a PointLight (use few) |
| `humanoid` | old blocky character, kept for compatibility; use `character` instead |

## Characters (character3d.js, load after models3d.js)

```js
const hero = MODELS3D.character({ hair: 'spiky', hairColor: 0x3a2418, shirt: 0xe05a3a, hat: 'straw', props: ['rod'] });
const shop = MODELS3D.npc('shopkeeper');          // fisher, shopkeeper, farmer, kid, elder, sailor, girl, hero
hero.userData.moving = 1;                          // 0 idle (breathing, blinking, looking around), 1 walk, 2 run
hero.userData.play('wave');                        // 'wave' | 'cheer' | 'nod'
hero.userData.play('cast', { distance: 3, waterY: 0, onLand: (p) => fx.splash(p) });  // needs props: ['rod']
hero.userData.play('reel');                        // reel the bobber back
hero.userData.bobberWorld();                       // bobber position while it is in the water, else null
```

Options: `height` (1.6), `skin` (0-4 preset or a color), `shirt`, `pants`, `shoes`, `belt`, `hair` (short spiky long ponytail bob buns bald), `hairColor`, `eyeColor`, `hat` (straw cap beanie captain) + `hatColor`, `outfit` (apron vest overalls coat) + `outfitColor`, `beard` + `beardColor`, `glasses` (true or a color), `blush`, `longSleeves`, `props` (rod backpack bag), `style` ('smooth' default, 'toon').

The cast is keyed poses (hold → wind back over the shoulder → fast snap forward → hold) on shoulder, elbow and wrist; the bobber leaves the rod tip at the snap, flies an arc on a sagging line and calls `onLand` where it lands. When the camera faces the character, turn the camera to the side for the cast so the landing spot is on screen.

Built like a figure: rounded parts (spheres, tapered cylinders, home-made capsules) on joint groups. `userData.parts` has hips, torso, head, face, eyes, mouth, armL/R, elbowL/R, handL/R, legL/R, kneeL/R, footL/R and rod: attach tools to a hand group, or drive joints yourself with `userData.manual = true`. Walk bends knees and elbows; actions blend over the walk. Big head, big eyes with highlights, brows, blush and a smile keep it readable at phone size. When adding a look, check it close up and from the game camera (render-check.py) before shipping.

Helpers: `material(color, {style: 'flat'|'toon'|'smooth'|'basic', vertexColors, map, emissive})`, `pixelTexture(w, h, draw)` for crisp pixel textures, `paint(geo, fn)` vertex colors, `jitter(geo, amount)` lumpy shapes without cracks, `noise2`/`fbm2`, `rng(seed)`, `scatter`, `updateAll`, `dispose(obj)`. Set `MODELS3D.defaultStyle = 'toon'` to switch everything built after it.

## Building new models the same way

- Start from primitives (box, cylinder, cone, icosahedron, sphere), then shape them: scale, move vertices by a formula (taper a fish's tail, narrow a hull's bottom), `jitter` for natural lumps.
- Color with vertex colors (`paint`) rather than many materials: one material per model keeps draw calls low.
- Give moving parts their own pivot `Group` placed at the joint (tail base, shoulder, hip), and animate the pivot's rotation in `userData.update(t, dt)`.
- Many copies of one thing (grass, coins, rocks far away): `InstancedMesh`.
- Flat shading (`flatShading: true` on Phong) gives the low-poly look; `toon` gives a cartoon look. Keep one style per game.
- Check the size against the character (a humanoid is 1.6 tall) before placing.
