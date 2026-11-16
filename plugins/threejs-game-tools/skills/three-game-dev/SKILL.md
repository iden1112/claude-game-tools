---
name: three-game-dev
description: Workflow for building and upgrading 3D browser games with Three.js in a single HTML file - r128 compatibility traps, project layout, performance, testing without a GPU or network using the bundled three-stub.js, and a demo page template. Use when making or changing a Three.js / 3D web game, or when three.js cannot be downloaded to test.
---

# three-game-dev: making 3D web games with Three.js

Use with `three-fx` (effects) and `three-models` (models in code). Their files live in the sibling skill folders `../three-fx/fx3d.js` and `../three-models/models3d.js`.

## Setup in a single-file game

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>/* paste fx3d.js */</script>
<script>/* paste models3d.js */</script>
<script>/* the game */</script>
```

This r128 build is one classic script that sets a global `THREE`, which is why single-file games use it. Recent three.js versions ship as ES modules (load them with an import map) and rename some APIs, so check the version before copying code between games.

## r128 traps (each one has broken a real game)

- Not in r128: `CapsuleGeometry` (r139+), `MeshPhysicalMaterial` features like `transmission` partly, `BufferGeometryUtils` on the global. Build capsules from a cylinder and two spheres.
- Feature checks need parentheses: `new THREE.CapsuleGeometry?new ...:...` parses wrong and throws in r128. Write `THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(...) : fallback()`.
- `MeshLambertMaterial` ignores `flatShading` in r128; use `MeshPhongMaterial({ flatShading: true })`.
- Colors: `renderer.outputEncoding = THREE.sRGBEncoding` in r128 (not `outputColorSpace`).
- `Geometry` is gone; everything is `BufferGeometry` (`PlaneGeometry` is the old `PlaneBufferGeometry`).

## Structure that stays manageable

- One `update(dt)` loop: input → movement → game rules → `MODELS3D.updateAll` → `fx.update(dt, camera)` → render. Clamp `dt` (0.05).
- Keep world data (islands, shops, fish tables) in plain objects, separate from meshes, so saves and balance changes don't touch rendering.
- Big worlds: split into chunks and hide (`visible = false`) chunks far from the camera; dispose what is gone for good (`MODELS3D.dispose`).
- Performance on phones: `renderer.setPixelRatio(Math.min(2, devicePixelRatio))`, few real lights (hemisphere + one directional with shadows), InstancedMesh for repeats, shared materials, fog to hide the far plane, `fx` `quality` 0.6.

## Testing without a GPU or the internet

`three-stub.js` (this folder) is a fake `THREE` that does no drawing but keeps the scene tree, vertex positions and transforms, and has none of the post-r128 APIs. Use it to run game logic and catch errors when three.js cannot be downloaded:

```js
require('<this folder>/three-stub.js').install();     // globalThis.THREE, document, window
require('<three-fx folder>/fx3d.js'); require('<three-models folder>/models3d.js');
// build the scene, run update() for a few hundred frames, assert on numbers (no NaN, counts go back to 0)
```

**Seeing real frames.** Headless Chromium here renders WebGL through SwiftShader. Only three.js itself is missing when the network is off: ask the user to download `https://registry.npmjs.org/three/-/three-0.128.0.tgz` and attach it, unpack it, and use `render-check.py page.html package/build/three.min.js out.png` (it routes the CDN script to the local file). `lab-template.html` is a small stage with a frozen clock: `step(n)` advances n frames and renders, so effects can be shot frame by frame and laid side by side. Look at every effect and model this way before calling it done; the stub alone cannot tell you how it looks.

For a whole HTML page without three.js at all, open it in headless Chromium (Playwright) and route the three.js script URL to the stub, wrapped for the browser: `var module = {exports: {}};` + stub source + `module.exports.install(window);`. Press every button from a script and fail on page errors. It proves the code runs, not that it looks right: for looks, publish the page and have the user look on their device, or render with real three.js when the network allows.

## Demo template

`demo-template.html` shows an island stage with the hero and NPCs, water, trees, a house, boats, swimming fish and every effect and character action behind buttons, with a touch orbit/pinch camera that frames the stage on phones. Paste the libraries into its placeholder scripts (`/*FX3D*/`, `/*MODELS3D*/`, `/*CHAR3D*/`, optional `/*PIXELFX*/`) to preview them, or use it as a starting scene. Keep effects where the camera looks: on phones (portrait) widen the field of view and frame a fixed stage.
