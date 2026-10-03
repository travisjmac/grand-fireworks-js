# GrandFireworks

> **Project status:** Grand Fireworks JS is now a stable legacy/showcase project. New product development has moved to **Papercloak Animation Studios**, a separate project for the broader visual animation platform. This repository remains available for its existing fireworks engine, documentation, examples, and demos. The Papercloak project link will be added here once its repository is published.

Created by **Travis MacDonald** on July 15, 2026.  
Version **1.9.1** · [Creator website](http://travisandjoelyweareaperfect.fit/) · [GitHub repository](https://github.com/travisjmac/grand-fireworks-js)

## Version 1.9.1

The homepage gains a **timed-show demo** beside Fireworks Command: its own contained instance, a clock counting the time since the show started, the cue that just fired, a Replay button, and a collapsible panel showing the source that ran. Nine cues fire shells and text at set times, then a finale, and the show loops. It only runs while it is on screen.

## Version 1.9.0

Text fireworks can be **placed and tilted**: `textFirework.horizontalPosition` sets where the block sits across the screen, and `textFirework.tilt` turns it, by a fixed angle or a fresh one from a `[min, max]` range on each launch. Text now **scales with the camera zoom**, and the Config Workbench has sliders for position and tilt. It also fixes `start()`/`stop()` under a host render pass, overlapping World Enders, options lost when a World Ender ended, and text off centre on very narrow screens.

Version 1.8.0 let a host drive the engine. **`setRenderPass(callback)`** lends the engine's canvas to your own drawing code — your scene is composited after the canvas is cleared and before the fireworks are drawn, so it sits behind them — and hands frame pacing to you, because the engine stops its own loop. **`renderFrame(dt)`** advances the simulation and draws one frame, with `dt` capped at 50 ms and `renderFrame(0)` rendering without advancing. **`placeburst()`** detonates a shell at a point, or at an element's centre, with no rocket and no flight time, fitted to an on-screen `radius`. **`launchTo()`** flies a real rocket from an origin and travel time you supply, so a game's own projectile logic and its visuals stay in lockstep. Fireworks Command is rebuilt on that API, and rockets with `gravity: 0` no longer fall.

Version 1.7.1 made text fireworks shrink to fit narrow screens instead of being squeezed tall and thin, fixed the Workbench's **Old School** style falling back to Medium, and added a **Show Fullscreen** shortcut plus links from the homepage controls to the Config Workbench and Feature Demo.

Version 1.7.0 shipped first-party TypeScript declarations, fixed a set of engine bugs (Canvas 2D memory growth, `durationMode: 'immediate'`, mobile point sizes, iOS audio unlock, resize churn, and webfont timing in text fireworks), made the guided builder's config import accept pasted JavaScript as well as JSON, fixed unreadable dropdowns, and gave the homepage a compact, phone-friendly fullscreen control bar. See [CHANGELOG.md](CHANGELOG.md) for the complete release notes.

Photorealistic WebGL-first fireworks with persistent long-exposure trails, HDR-style bloom, star cores, rocket exhaust, explosion flashes, secondary crackles, specialized shell geometry, grouped salvos, and a Canvas 2D fallback. The class also includes graceful stopping, an optional finale, fullscreen or contained placement, timed shows, performance presets, and synchronized multi-line hybrid text fireworks.

Open `index.html` for complete documentation and links to working examples.

Maintainers and AI collaborators should begin with the detailed [project handoff](docs/AI_HANDOFF.md).

## Install

```bash
npm install grand-fireworks-js
```

For a no-build webpage, use the stable CDN filename:

```html
<script src="https://cdn.jsdelivr.net/gh/travisjmac/grand-fireworks-js@main/dist/GrandFireworks.min.js"></script>
```

To stay on one release, pin its tag:

```html
<script src="https://cdn.jsdelivr.net/gh/travisjmac/grand-fireworks-js@v1.9.1/dist/GrandFireworks.min.js"></script>
```

### TypeScript

First-party type declarations ship with the package as `index.d.ts` and are
resolved automatically by TypeScript, bundlers, and editors. Both default and
named imports work:

```ts
import GrandFireworks from 'grand-fireworks-js';
// or: import { GrandFireworks } from 'grand-fireworks-js';

const fireworks = new GrandFireworks({
  baseStyle: 'cinematic',
  show: { intensity: 0.9 },
});

fireworks.start();
fireworks.setStyle('bold');
const stats = fireworks.getStats();
```

Configuration options, launch/text/finale/world-ender/stop vectors, stats,
and the `GrandFireworks` class are fully typed. The declarations reflect only
behaviour the engine actually implements — they include browser-only guards
and describe safe import expectations for CommonJS, ESM, and `<script>` use.

Run the declaration contract check with:

```bash
npm run typecheck
```

## Live documentation and examples

After GitHub Pages is enabled for the repository, the complete interactive documentation will be available at:

**[Open the Grand Fireworks JS live documentation](https://travisjmac.github.io/grand-fireworks-js/)**

**[View the source repository](https://github.com/travisjmac/grand-fireworks-js)** · **[Download the latest source ZIP](https://github.com/travisjmac/grand-fireworks-js/archive/refs/heads/main.zip)**

- [Moonlit Horizon](https://travisjmac.github.io/grand-fireworks-js/examples/moonlit-horizon.html) — the cinematic parallax showcase.
- [Feature Demo](https://travisjmac.github.io/grand-fireworks-js/examples/guided-builder.html?mode=features) — the shared draggable studio opened directly in feature-testing mode.
- [Config Workbench](https://travisjmac.github.io/grand-fireworks-js/examples/guided-builder.html?mode=workbench) — the same studio opened with build, preview, save, load, and copy controls.
- [Fireworks Command](https://travisjmac.github.io/grand-fireworks-js/examples/fireworks-command/) — a tactical Mars defence game showing the engine in an arcade setting.

The same files can be browsed directly inside the repository through the relative links in [`index.html`](index.html), but GitHub Pages is required to run the interactive JavaScript examples as a website.

```html
<script src="GrandFireworks.js"></script>
<script>
  const fireworks = new GrandFireworks();
  fireworks.start();
</script>
```

`duration: 0` runs indefinitely. `stop()` is graceful by default: it stops new launches, finishes active fireworks, optionally plays the configured finale, then fades out.

The library exposes `start`, `stop`, `pause`, `resume`, `clear`, `destroy`, `launch`, `launchText`, `launchTextSequence`, `cancelTextSequence`, `launchFinale`, `launchWorldEnder`, `finalize`, `setOptions`, `setOpacity`, `setZoom`, `setStyle`, `setColorTheme`, `feelingLucky`, `getOptions`, `getStats`, `setRenderPass`, `renderFrame`, `placeburst`, and `launchTo`.

### Effects at a point, and driving your own game

`placeburst()` detonates a shell at a point you choose, with no rocket and no flight time. Positions are CSS pixels relative to the container, or pass `element` to burst at that element's centre — which is what makes it easy to tie explosions to buttons, cards, or clicks:

```js
fireworks.placeburst({ element: '#buy-button', radius: 120, type: 'glitter_nova' });
fireworks.placeburst({ x: event.clientX, y: event.clientY, radius: 90 });
```

`radius` is the on-screen size the sparks are fitted to, in CSS pixels. The engine scales every star's speed and gravity by the same factor, so the shell keeps its shape at any size, and the fit targets the rim of the break — a few of the fastest stars deliberately travel past the radius. Omit it to keep the shell's natural size. `type`, `colors`, and `density` (a spark multiplier) are per-call, and `sound: false` silences one burst without touching the engine's sound setting.

`reachTime` sets how many milliseconds the sparks take to reach `radius`. Supply it whenever your own hit detection has to agree with what the player can see: without it the fit targets the *asymptotic* reach, so the stars keep coasting outward and the break is still only about a third of the way to its radius by the time a blast has gone fully lethal — which is how enemies end up dying outside the visible explosion. The sparks are retuned to arrive on time, with gravity compensated so they fall at the same rate and only the expansion speeds up.

```js
// A hit circle that grows at 0.26 px/ms toward 120px: draw the fire 15% larger and
// have it arrive in 60% of that time, so the fire always leads the damage.
const max = 120;
fireworks.placeburst({
  x, y,
  radius: max * 1.15,
  reachTime: (max / 0.26) * 0.6,
});
```

Two more options shape the aftermath. `lifeScale` below 1 fades the sparks over the fall rather than letting them outlive the explosion, and `gravityScale` slows the descent — `0.1` makes a break hang and settle at a tenth of the usual fall rate:

```js
fireworks.placeburst({ x, y, radius: 140, reachTime: 260, lifeScale: 0.55, gravityScale: 0.1 });
```

`launchTo()` fires the engine's real rocket — trail, exhaust, flash, burst, and audio — from an origin and travel time you supply, which is how a game keeps its own projectile logic and its visuals in lockstep:

```js
fireworks.launchTo({ x: tip.x, y: tip.y, targetX: x, targetY: y, duration: shot.flight, radius: shot.max });
```

For games where the engine should render the whole scene rather than just the fireworks, `setRenderPass()` lends the engine's canvas to your drawing code. Your callback runs every frame after the canvas is cleared and before the fireworks are drawn, so your artwork sits behind them:

```js
fireworks.setRenderPass(frame => {
  // frame: { gl, ctx, canvas, width, height, dpr }
  // Exactly one of gl/ctx is set, matching the renderer in use.
  drawMyScene(frame.ctx ?? null);
});

// Attaching a pass makes you responsible for frame pacing:
let last = performance.now();
requestAnimationFrame(function loop(now) {
  fireworks.renderFrame(now - last);
  last = now;
  requestAnimationFrame(loop);
});
```

Attaching a render pass stops the engine's own animation loop, so the engine never steps the simulation twice. `renderFrame(dt)` caps `dt` at 50ms internally, and `renderFrame(0)` renders the current frame without advancing anything — which is how you keep a scene on screen while effects are paused. The engine still owns the canvas, the renderer choice, and the WebGL state; your callback only draws. `examples/fireworks-command/` is a complete game built this way.

Use `setStyle('cinematic')` for a restrained, realistic show with warm pyrotechnic colours, longer ember trails, softer bloom, slower launches, and fewer simultaneous shells.

A shell normally breaks in a multi-colour ramp. Set `show.palettes` to `'single'` for one solid colour per shell, which is what makes a volley read as several distinct colours at once rather than a wash of gradients — each shell still gets a different hue:

```js
const fireworks = new GrandFireworks({ show: { palettes: 'single' } });
```

Pass a flat array of colours instead to choose the pool yourself. Each shell then breaks in exactly one of them:

```js
const fireworks = new GrandFireworks({
  show: { palettes: ['#FF3B30', '#0A84FF', '#FFD60A', '#34C759'] }
});
```

A *nested* array still means what it always did: each inner array is a full palette, normalized per shell. So `palettes: [['#FF0000', '#FFFF00']]` ramps red to yellow, while `palettes: ['#FF0000', '#FFFF00']` is two solid shells.

`launch()`, `launchText()`, and `launchFinale()` are standalone-safe: they wake the renderer when the regular show is idle, stopped, paused, or fading, play only the requested effect, then fade away automatically. They do not restart automatic launches.

The Super Grand Finale launches one central carrier, bursts it into independently glowing comet trails, sends those trails in different radial directions, and then detonates each into a large ringed, crackling secondary shell. Configure it with `finale.trails`, `finale.trailFlight`, `finale.burstScale`, `finale.maxWaitBeforeLaunch`, `finale.particleScale`, `finale.finishDelay`, and `finale.maxDuration`.

`launchWorldEnder()` reuses that same carrier-and-trail pipeline, then turns each first-wave burst into mixed warheads. Configure `worldEnder.firstSplitCount`, `worldEnder.secondSplitCount`, `worldEnder.promotionChance`, `worldEnder.maxChainDepth`, and `worldEnder.recursionDurationMs` to balance spectacle against performance.

Launch text messages one at a time with a cancellable sequence:

```js
const result = await fireworks.launchTextSequence([
  'WISH BIG',
  { text: 'SHINE BRIGHT', overrides: { colors: ['#00BFFF', '#FFFFFF'] } },
  'CELEBRATE!'
], {
  gap: 250,
  clearBetween: true
});

fireworks.cancelTextSequence();
```

Sequence events are `textsequencestart`, `textsequenceitem`, `textsequenceend`, and `textsequencecancel`. Set `textFirework.synchronizeExplosions: false` to stagger multi-line arrivals instead of synchronizing them.

#### Placing a message

`textFirework.verticalPosition` and `textFirework.horizontalPosition` are fractions of the viewport, and the block is centred on them. The horizontal position is clamped so a wide block can never be pushed half off the canvas — narrow `maxWidth` to let the text travel further off centre:

```js
fireworks.launchText('BOOM', {
  maxWidth: 0.45,          // the block may be up to 45% of the width
  horizontalPosition: 0.3, // centred 30% across, after the clamp
  verticalPosition: 0.35   // centred 35% down
});
```

`textFirework.tilt` turns the block, in degrees, clockwise positive: a number for a fixed angle, or `[min, max]` for a fresh angle on every launch. The block turns as one piece about its centre, it is limited to ±45°, and a tilted block is kept on screen vertically as well. The default is `0`.

```js
fireworks.launchText('Kaboom!', { tilt: [-30, 30] });
```

#### Several messages, at the times you choose

Every text option works per call, so each message can have its own position, angle, colours and size, and messages can overlap. `launchTextSequence` shows them one after another; to place them at set moments, keep a list of cues:

```js
const cues = [
  { at: 0,    text: 'HAPPY',    options: { horizontalPosition: 0.3, tilt: -15 } },
  { at: 600,  text: 'BIRTHDAY', options: { horizontalPosition: 0.7, tilt: 15 } },
  { at: 4000, text: 'SAM!',     options: { fontSize: 120 } },
];
const timers = cues.map(cue => setTimeout(() =>
  fireworks.launchText(cue.text, { maxWidth: 0.45, exclusive: false, ...cue.options }), cue.at));
timers.push(setTimeout(() => fireworks.launchFinale(), 9000)); // other effects fit the same list
// timers.forEach(clearTimeout) cancels whatever has not fired yet.
```

The homepage runs its text this way, with random times. The timers use the page clock, so they keep counting through `pause()` and a hidden tab. [docs/host-recipes.md](docs/host-recipes.md) covers the particle budget that overlapping messages share.

Text scales with the camera. The block is sized against `visuals.zoom`, so pulling the view back shrinks the words with everything else instead of leaving them full size; at `zoom: 1` nothing changes.

#### Text inside a running show

`textFirework.exclusive` defaults to `true`, which halts new launches for the whole text lifecycle and reserves the particle budget so nothing competes with the words. That is the right default for a message someone is meant to read. Turn it off when the text is decoration on a show that must never stop:

```js
const fireworks = new GrandFireworks({ textFirework: { exclusive: false } });
```

The ambient show then keeps launching while the words assemble, and shells may drift through them — that is the trade. It can also be set per call, so one deliberate message can take the show over while the rest stay unobtrusive.

### Sound

Sound is off by default. Call `enableSound()` from a click or tap handler to unlock browser audio, then use `setMuted(true)` or `setOptions({ sound: { volume: 0.2 } })` for live control.

```js
startButton.addEventListener('click', () => {
  fireworks.enableSound();
  fireworks.start();
});
```

The built-in realistic profile is fully procedural and adds positional launch whistles, low explosions, sharp reports, delayed crackle, a compressed master output, overlapping-voice protection, and a rhythmic grand-finale pattern. `sound.stereo`, `sound.finaleRhythm`, and `sound.maxVoices` are configurable; `sound.volume` accepts `0` through `1`, and zero is a true mute. No audio files are bundled.

When enabled, `performance.pauseWhenHidden`, `performance.pauseWhenOffscreen`, and `performance.respectReducedMotion` pause invisible work and reduce animation density for visitors who request less motion. A manual `pause()` is kept separate from automatic pause reasons, so returning to a visible tab does not unexpectedly resume a user-paused show.

Contained mode uses the reliable Canvas 2D renderer automatically, avoiding transparent WebGL compositor failures in nested browser layers. Fullscreen mode remains WebGL-first. To test WebGL inside a particular container, explicitly pass `renderer: { preferred: 'webgl2', preserveDrawingBuffer: true }`; Canvas 2D remains the fallback.

The separate crisp-text canvas is hidden during ordinary shows and is displayed only while a crisp or hybrid text firework is active. It automatically hides again when the text phase completes, preventing transparent multi-canvas compositor failures in contained Chrome layouts.

Rocket paths fan naturally by default. Ordinary rockets launch within the middle 55% of the display at a random angle of up to 14 degrees left or right. Text rockets remain vertical, and the finale uses a wider 18-degree fan.

```js
const fireworks = new GrandFireworks({
  speedMultiplier: 0.8, // run the complete firework simulation at 80% speed
  visuals: {
    trails: true,
    trailFade: 0.115,
    bloom: 1.25,
    rocketExhaust: true,
    explosionFlashes: true,
    starChance: 0.08,
    groupedSalvos: true,
    secondaryCrackle: true,
    zoom: 1 // 0.1–4; smaller values reveal a wider field of view
  },
  show: {
    launchSpread: 0.55,
    angleRange: 14,
    angleStrength: 1,
    textRocketAngle: 0,
    launchHorizon: 1, // total launch area, in screen widths
    minShellScale: 0.5, // each shell receives its own apparent scale
    maxShellScale: 1.5,
    grandFinaleShellChance: 0.05, // occasional layered finale shell, never a World Ender
    zAngleRange: 25, // 0–45° depth drift
    zAngleStrength: 0.8 // 0–3 depth drift multiplier
  }
});
```

### Depth-staged horizon

`visuals.zoom` controls the visible field of view: values below `1` pull back to reveal more of the horizon, while values above `1` move closer. `show.launchHorizon` sets the total launch area in screen widths. `show.minShellScale` and `show.maxShellScale` give every firework its own apparent scale while keeping its rocket, exhaust, burst, and particles together.

Shells are staged as near, middle, or far. Distance affects apparent size, flight speed, burst height, stereo position, loudness, and a slight delay on distant launch and boom sounds. Tune depth drift with `zAngleRange` and `zAngleStrength`, or call `fireworks.setZoom(0.5)` to update the view live. See the [Feature Demo panel](https://travisjmac.github.io/grand-fireworks-js/examples/guided-builder.html?mode=features) for a live reference.

`launchHorizon` is measured in screen widths, so a horizon of `1` covers one screen-width however far the view is pulled back. Zooming out therefore reveals more world than there are launchers in: the shells stay in a central band and never reach the edges. To keep them launching across the full viewport at any zoom, tie the horizon to the zoom:

```js
function applyZoom(zoom) {
  fireworks.setOptions({ visuals: { zoom }, show: { launchHorizon: 1 / zoom } });
}
```

At `1 / zoom` the launch zone matches the visible width exactly, and the per-launch rocket count — `Math.min(show.launchHorizon, 1 / zoom)`, which exists to hold density steady as the field widens — is no longer capped below the area it has to fill. Call it from every control that moves the camera, including style presets, since a preset can carry its own `visuals.zoom`.

Run the dependency-free regression suite with `npm test`, the declaration
contract check with `npm run typecheck`, and regenerate distribution builds
with `npm run build`.
