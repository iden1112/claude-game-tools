---
name: car-engine-sound
description: Adds car, motorbike or boat engine sounds to browser games with the Web Audio API - synthesized (no files) or a looping recording whose pitch follows RPM. Use when a driving/racing/vehicle web game needs engine audio.
---

# car-engine-sound

`car-engine.js` (this folder) wraps the two techniques from CarEngines (buntine, CC0, `example/`): an oscillator engine and a looping sample whose `playbackRate` follows RPM. Paste it into its own `<script>` in a single-file game.

```js
const eng = new CarEngine({ mode: 'synth', idleHz: 38, maxHz: 150, cylinders: 2 });
startButton.onclick = () => eng.start();   // audio may only start after a tap/click
// every frame
eng.setRpm(rpm / maxRpm);                  // 0..1
eng.setThrottle(gasPedal);                 // 0..1, brightens the tone
```

- **synth**: two detuned sawtooths plus a square-wave tremolo at `hz / cylinders` for the firing pulse, through a low-pass filter that opens with throttle. Tune per vehicle: big V8 low `idleHz` (30), high `cylinders` (4) and `rough`; small bike higher `idleHz` (55) and `maxHz` (260), `cylinders` 1; boat low and smooth (`rough` 0.15).
- **sample**: `{ mode: 'sample', url }` or `{ buffer }` (an ArrayBuffer). A short seamless idle loop works best; `minRate`/`maxRate` set the pitch range. `example/sounds/engine.wav` is a CC0 loop; inline it as base64 in single-file pages, since artifact pages cannot fetch other hosts.
- Gear shifts: drop the target RPM fast (it glides with `setTargetAtTime`), then climb again. Revving in neutral: RPM up with throttle 1.
- Several cars: one `CarEngine` per car, volume by distance to the camera. Stop engines that are off-screen.
- Pages in the Claude app: start audio only from a click handler and catch refusals.
