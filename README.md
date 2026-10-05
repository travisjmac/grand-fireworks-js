# GrandFireworks

> **Project status:** Grand Fireworks JS is now a stable legacy/showcase project. New product development has moved to **Papercloak Animation Studios**, a separate project for the broader visual animation platform. This repository remains available for its existing fireworks engine, documentation, examples, and demos. The Papercloak project link will be added here once its repository is published.

Created by **Travis MacDonald** on July 15, 2026.  
Version **1.10.0** · [Creator website](http://travisandjoelyweareaperfect.fit/) · [GitHub repository](https://github.com/travisjmac/grand-fireworks-js)

## Version 1.10.0

A dedicated Configuration & API Guide now includes editable initialisation settings, methods and properties, contextual help and one-click Workbench previews. The Workbench shares the editor and adds background colour/gradient/image controls. Dedicated Default Show and Happy Birthday Timed Show demos showcase the engine with a live cue timeline and visible source.

Text rockets now arrive at their fitted message positions. Finales preserve queued effects, and explicit launches are no longer discarded at the automatic-show rocket limit.

## Version 1.9.2

The homepage control panel is rebuilt. It **keeps its controls when slimmed** instead of hiding them, gains an **Auto text** switch for the random messages, and adds a **firework type picker** — a Types button in the bar and in the panel opens a dialog of all fifteen shells with drawn previews and checkboxes, applied live. The launch band also now holds a fixed 90% of the view at every zoom so bursts are not clipped at the edges.

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
<script src="https://cdn.jsdelivr.net/gh/travisjmac/grand-fireworks-js@v1.10.0/dist/GrandFireworks.min.js"></script>
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

[Open the Detailed Config Guide](detailed-config-guide.html) for an indexed, expandable explanation of every setting.

## Complete configuration reference

All constructor settings are optional. Nested settings use objects, for example `performance: { dprCap: 1.5 }`. The **base default** column below comes from `GrandFireworks.DEFAULTS` (the four preset-derived performance fields show the high preset); it is not always the final value. The default `cinematic` style changes several visual, show and sound settings, and performance presets supply omitted budgets. Use `fireworks.getOptions()` to inspect your resolved configuration. Recognized colour themes supply their own palettes. Explicit values generally override style values, subject to normalization and the theme/preset rules described below.

### DPR, FPS and other terms

**DPR** means **device pixel ratio**, not DRP: physical screen pixels per CSS pixel. A 1000 × 600 CSS-pixel canvas at DPR 2 uses a 2000 × 1200 drawing buffer: four times the pixel count. **dprCap** limits that ratio; it does not change the CSS size, zoom or number of particles. The engine uses `Math.min(window.devicePixelRatio || 1, performance.dprCap)`. On a DPR 3 screen, a cap of 1.5 renders at 1.5. On a DPR 1 screen, a cap of 2 still renders at 1. Higher caps sharpen fine details but increase buffer memory and rendering work; pixel count grows with the square of DPR.

**FPS** is frames per second. `performance.fps` is the target; `getStats().fps` is measured performance. **Particles** are individual sparks; **rockets** are flying shells before they burst. **ms** means milliseconds (1000 ms = 1 second), **Hz** means cycles per second, **gain** is audio amplitude, and **alpha/opacity** controls transparency. A **chance** of 0.25 means roughly 25% of eligible random choices, not an exact quota. A **multiplier** of 1 means normal, 0.5 half, and 2 double. WebGL 2 uses GPU graphics; Canvas 2D is the fallback renderer. Bloom is the glow around bright sparks; a salvo is a group of launches.

### Performance presets and overrides

| Preset | FPS | DPR cap | Particle budget | Rocket fallback | Interval (ms) | Particle scale | Secondary scale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| low | 30 | 1 | 1500 | 4 | 1000 | 0.72 | 0.45 |
| medium | 60 | 1.25 | 3000 | 6 | 750 | 0.88 | 0.7 |
| high | 60 | 1.5 | 5000 | 10 | 550 | 1 | 1 |
| ultra | 60 | 2 | 8000 | 14 | 350 | 1.2 | 1.25 |

Preset rocket counts are fallbacks: the base configuration already supplies `show.maxRockets: 6`, and styles can change it. Selecting a performance preset alone therefore does not necessarily select that row's rocket count. Canvas 2D halves an implicit particle budget; explicitly supplying `show.maxParticles` preserves your value. Regular particle and rocket budgets have minimums but no upper cap. Increasing DPR, particle density, secondary detail and budgets together increases work.

`performance.dprCap`, `fps` and `particleScale` require positive numbers or fall back to the preset. `secondary: 0` is valid. Numeric normalization is not uniform: some options use zero as a fallback, so zero does not always disable an effect. Ranges below describe known clamps; for unlisted ranges use valid, sensible values rather than assuming universal validation. Sound tuning durations are in seconds; most other durations are in milliseconds.

`setOptions(partial)` merges settings; it is not a blanket reconstruction of the instance. Container, placement and layer setup are best chosen at construction. Live changes such as DPR, opacity, zoom and style have dedicated handling.

```js
const fireworks = new GrandFireworks({
  performance: { preset: 'high', dprCap: 1.5, adaptive: true },
  show: { maxParticles: 5000, maxRockets: 10 },
});
console.log(fireworks.getOptions()); // actual resolved settings
```

### Placement and show lifecycle

| Option | Base default | Explanation |
| --- | --- | --- |
| `container` | `null` | CSS selector or DOM element; null uses document.body. |
| `mode` | `"fullscreen"` | 'fullscreen' fills the viewport; 'contained' fills the container. |
| `placement` | `"overlay"` | 'overlay' sits above content; 'background' inserts behind it with z-index 0. |
| `clip` | `true` | Hide effects outside the container when true. |
| `zIndex` | `9999` | CSS stacking order for overlay placement. |
| `autoStart` | `false` | Begin the show during construction when true. |
| `baseStyle` | `"cinematic"` | 'classic', 'oldSchool', 'thin', 'medium', 'cinematic', 'bold', 'spectacle', or 'mixed'; styles change several settings together. |
| `speedMultiplier` | `1` | Simulation speed multiplier, clamped to 0.1–3; 0.8 runs motion at 80%. Zero falls back to 1. |
| `colorTheme` | `"default"` | 'default', 'iceBlue', 'emberRed', 'neonGreen', 'goldenSun', 'royalPurple', or 'festival'. A recognized non-default theme supplies its palettes, including over show.palettes. |
| `showFps` | `false` | Display the measured frames-per-second counter. |
| `duration` | `0` | Show length in milliseconds; 0 runs indefinitely. |
| `durationMode` | `"graceful"` | 'graceful' finishes active effects; 'immediate' begins shutdown at the duration limit. |
| `maxFinishTime` | `5000` | Maximum regular-show wind-down wait in milliseconds. |
| `background` | `false` | false for transparency, or { value, opacity, className } for a backdrop. |

### Mixed style weights

| Option | Base default | Explanation |
| --- | --- | --- |
| `mixedStyles` | `{"classic":15,"oldSchool":10,"thin":15,"medium":20,"cinematic":20,"bold":10,"spectacle":10}` | Relative weights for each style when baseStyle is 'mixed'; they need not total 100. |

### `transition`

| Option | Base default | Explanation |
| --- | --- | --- |
| `transition.fadeIn` | `500` | Backdrop fade-in time in milliseconds. |
| `transition.fadeOut` | `400` | Fade-out time in milliseconds. |
| `transition.easing` | `"ease-out"` | CSS transition timing function, such as 'linear' or 'ease-out'. |
| `transition.clearOnHide` | `true` | Clear effects when the display finishes hiding. |

### `renderer`

| Option | Base default | Explanation |
| --- | --- | --- |
| `renderer.preferred` | `"auto"` | 'auto', 'webgl2', or 'canvas2d'. Auto chooses Canvas 2D for contained mode and tries WebGL 2 for fullscreen. |
| `renderer.fallback` | `"canvas2d"` | Supported fallback is 'canvas2d'; WebGL failure always falls back to Canvas 2D. |
| `renderer.preserveDrawingBuffer` | `"auto"` | 'auto' enables preservation for contained mode or trails; true/false explicitly sets the WebGL context attribute. Preservation supports retained trails but can cost GPU work. |

### `visuals`

| Option | Base default | Explanation |
| --- | --- | --- |
| `visuals.opacity` | `1` | Overall layer opacity, 0–1; 0 makes it invisible. |
| `visuals.trails` | `true` | Retain previous frames to leave long-exposure trails. |
| `visuals.trailFade` | `0.115` | Amount erased per frame, clamped to 0.03–1. Smaller values leave longer trails; 1 clears them quickly. Zero falls back to 0.115. |
| `visuals.bloom` | `1.25` | Glow strength multiplier, 0.5–10; higher values brighten the halo. Zero falls back to 1. |
| `visuals.rocketExhaust` | `true` | Draw glowing exhaust behind flying rockets. |
| `visuals.explosionFlashes` | `true` | Draw a brief local flash when a shell bursts. |
| `visuals.flashColor` | `null` | Hex flash colour; null lets the engine choose from the shell. |
| `visuals.flashScale` | `1` | Local flash size multiplier, 0.5–3. |
| `visuals.flashAlpha` | `0.34` | Local flash opacity, 0.05–1. |
| `visuals.flashLife` | `420` | Local flash lifetime in milliseconds, 80–900. |
| `visuals.flashBangChance` | `0` | Chance of a large screen flash per eligible explosion, 0–1; 0 disables it. |
| `visuals.flashBangAlpha` | `0.55` | Screen flash opacity, 0.1–1. |
| `visuals.flashBangDuration` | `240` | Screen flash duration in milliseconds, 100–700. |
| `visuals.flashBangCooldown` | `3000` | Minimum gap between screen flashes in milliseconds, 800–15000. |
| `visuals.burstVelocity` | `1` | Burst expansion speed multiplier, 0.4–2.5; higher spreads sparks faster. |
| `visuals.shimmerChance` | `0` | Chance of assigning twinkling brightness to a particle, 0–1. |
| `visuals.sparkleChance` | `0` | Chance of assigning sparkle behaviour to a particle, 0–1. |
| `visuals.pyroBurn` | `false` | Vary particle brightness and fading to resemble burning embers. |
| `visuals.sphereBurst` | `false` | Add depth variation to burst particles for a spherical appearance. |
| `visuals.windStrength` | `0` | Random sideways wind strength, 0–0.25; 0 disables added wind. |
| `visuals.starChance` | `0.08` | Chance of star-core styling, 0–0.3. |
| `visuals.groupedSalvos` | `true` | Allow grouped automatic launches rather than only isolated rockets. |
| `visuals.secondaryCrackle` | `true` | Enable delayed crackling particles after the main break. |
| `visuals.zoom` | `1` | Camera scale, 0.1–4: below 1 shows a wider field; above 1 moves closer. |

### `sound`

| Option | Base default | Explanation |
| --- | --- | --- |
| `sound.enabled` | `false` | Enable procedural audio. Call enableSound() from a click/tap to unlock browser audio. |
| `sound.volume` | `1` | Master volume, 0–1; 0 is mute. |
| `sound.ambience` | `0.005` | Background ambience level, clamped to 0–0.12; 0 disables it. |
| `sound.stereo` | `true` | Position sound across the left and right channels. |
| `sound.whistleChance` | `0.03` | Probability of a launch whistle; use 0–1. |
| `sound.boomStyle` | `"mixed"` | 'classic', 'deep', 'artillery', 'double', 'rolling', or 'mixed'. Mixed varies the boom character. |
| `sound.boomVariation` | `0.25` | Random variation in boom duration, gain and tone, 0–0.5; 0 removes this variation. |
| `sound.nearBoomMultiplier` | `1` | Loudness multiplier for near-viewer shells, 0.2–10. |
| `sound.finaleRhythm` | `true` | Enable the staged finale's rhythmic audio pattern. |
| `sound.maxVoices` | `36` | Maximum overlapping audio voices; higher values allow more simultaneous sounds. |

### `sound.tuning` (advanced audio synthesis)

| Option | Base default | Explanation |
| --- | --- | --- |
| `sound.tuning.launchGain` | `0.015` | Launch sound gain; higher is louder before master volume/compression. |
| `sound.tuning.launchEnd` | `1180` | Launch filter sweep end frequency in hertz (Hz), clamped to 120–1800. |
| `sound.tuning.whistleStart` | `4100` | Starting whistle filter frequency in Hz. |
| `sound.tuning.whistleEnd` | `3500` | Ending whistle filter frequency in Hz. |
| `sound.tuning.whistleDuration` | `0.75` | Whistle length in seconds (not milliseconds). |
| `sound.tuning.whistleGain` | `0.045` | Whistle gain before master volume. |
| `sound.tuning.whistleWave` | `"sine"` | Oscillator waveform, such as 'sine', 'square', 'sawtooth', or 'triangle'. |
| `sound.tuning.whistleWobbleRate` | `7` | Whistle frequency modulation rate in Hz. |
| `sound.tuning.whistleWobbleDepth` | `0.1` | Relative strength of whistle frequency wobble. |
| `sound.tuning.boomDuration` | `1.4` | Base boom length in seconds; the chosen boom style also shapes it. |
| `sound.tuning.boomGain` | `0.7` | Base boom gain before style, distance, master volume and compression. |
| `sound.tuning.boomCutoff` | `170` | Base boom filter cutoff frequency in Hz; lower sounds darker. |
| `sound.tuning.crackleGain` | `0.045` | Crackle gain before master volume. |
| `sound.tuning.cracklePitch` | `1400` | Base crackle frequency in Hz. |
| `sound.tuning.crackleCount` | `12` | Number of synthesized crackle reports. |

### `performance`

| Option | Base default | Explanation |
| --- | --- | --- |
| `performance.preset` | `"high"` | 'low', 'medium', 'high', or 'ultra'; supplies omitted performance values and show budget fallbacks. |
| `performance.adaptive` | `true` | Adjust particle quality when measured rendering performance drops. |
| `performance.pauseWhenHidden` | `true` | Pause automatically while the browser tab is hidden. |
| `performance.pauseWhenOffscreen` | `true` | Pause automatically when the contained display is outside the viewport. |
| `performance.respectReducedMotion` | `true` | Reduce animation density for visitors requesting reduced motion. |
| `performance.fps` | `60` | Positive target frames per second. A pacing target, not a guarantee; omitted/non-positive uses the preset. |
| `performance.dprCap` | `1.5` | Positive maximum device pixel ratio for the drawing buffer. Effective DPR is min(window.devicePixelRatio || 1, dprCap); omitted/non-positive uses the preset. |
| `performance.particleScale` | `1` | Positive particle-count multiplier; lower values make sparser bursts. Omitted/non-positive uses the preset, so 0 does not turn particles off. |
| `performance.secondary` | `1` | Non-negative multiplier for secondary effect counts. 0 suppresses scaled secondary particles; higher values add detail and work. |

### `show`

| Option | Base default | Explanation |
| --- | --- | --- |
| `show.intensity` | `0.75` | Automatic-show density multiplier; higher produces a busier show. |
| `show.openingSalvo` | `6` | Number of opening launches when start() begins the show. |
| `show.maxRockets` | `6` | Regular rocket budget; minimum 1, with no upper cap. Infinity is supported. Affects work and density. |
| `show.maxParticles` | `null` | Regular particle budget; null uses the performance preset, minimum 100, with no upper cap. Infinity is supported. Implicit Canvas 2D budgets are halved; explicit budgets are preserved. |
| `show.launchInterval` | `null` | Base automatic launch interval in milliseconds; null uses the preset. Intensity and show behaviour affect actual cadence. |
| `show.launchSpread` | `0.55` | Fraction of the launch zone used by ordinary rockets, 0–1; 0.55 means the middle 55%. |
| `show.closeShellChance` | `0.25` | Fraction of regular shells staged near the viewer, 0–0.8. |
| `show.minShellScale` | `1` | Minimum per-shell apparent size multiplier, 0.25–2. |
| `show.maxShellScale` | `1` | Maximum per-shell apparent size multiplier, 0.25–2. Reversed min/max values are swapped. |
| `show.grandFinaleShellChance` | `0` | Chance of a regular automatic launch becoming a layered finale shell, 0–0.5; never a World Ender. |
| `show.angleRange` | `14` | Maximum left/right rocket fan angle in degrees, 0–45. |
| `show.angleStrength` | `1` | Fan strength multiplier, 0–3; 0 removes the fan. |
| `show.textRocketAngle` | `0` | Text rocket angle in degrees, -45–45; 0 is vertical. |
| `show.enabledTypes` | `"all"` | 'all' or an array of shell names; see the shell catalogue below. |
| `show.palettes` | `"default"` | 'default' cycles palettes; 'single' uses one colour per shell; a flat hex-colour array is a solid-colour pool; nested arrays are multi-colour shell palettes. |
| `show.launchHorizon` | `1` | Launch area in screen widths, 0.5–20. Use 1 / visuals.zoom to fill the visible width at different zoom levels. |
| `show.zAngleRange` | `25` | Maximum depth-drift angle in degrees, 0–45. |
| `show.zAngleStrength` | `0.8` | Depth-drift multiplier, 0–3. |

### `finale`

| Option | Base default | Explanation |
| --- | --- | --- |
| `finale.enabled` | `false` | Automatically play a finale on configured stop/duration triggers; manual launchFinale() remains available. |
| `finale.type` | `"super-grand-finale"` | 'super-grand-finale' or 'world-ender'. |
| `finale.triggers` | `["stop","duration"]` | Array containing 'stop', 'duration', or both, selecting automatic finale triggers. |
| `finale.trails` | `10` | Number of carrier comet trails, rounded and clamped to 3–20. |
| `finale.trailFlight` | `1100` | Trail flight time before secondary bursts in milliseconds; minimum 500. |
| `finale.trailSpread` | `360` | Angular spread of trails in degrees, 30–360. |
| `finale.burstScale` | `1` | Secondary burst size multiplier, 0.4–2. |
| `finale.maxWaitBeforeLaunch` | `3000` | Maximum wait for regular fireworks before the finale launches, in milliseconds; minimum 0. |
| `finale.particleScale` | `1` | Finale particle density multiplier, 0.25–2. |
| `finale.finishDelay` | `800` | Extra wait after finale completion, in milliseconds; minimum 0. |
| `finale.maxDuration` | `9000` | Finale timeout in milliseconds; minimum 1000. |

### `worldEnder`

| Option | Base default | Explanation |
| --- | --- | --- |
| `worldEnder.carrierX` | `0.5` | Horizontal carrier launch position as a fraction of the width; 0.5 is centred. |
| `worldEnder.carrierFlightMs` | `2350` | Carrier flight time in milliseconds. |
| `worldEnder.carrierBurstHeight` | `0.384` | Carrier burst position as a fraction of viewport height, measured from the top. |
| `worldEnder.firstSplitCount` | `8` | Number of first-wave trails split from the carrier. |
| `worldEnder.firstSplitSpreadDegrees` | `300` | Angular spread of first-wave trails, in degrees. |
| `worldEnder.secondSplitDelayMs` | `3000` | Delay before second-wave splits, in milliseconds. |
| `worldEnder.secondSplitCount` | `8` | Number of second-wave warheads per first-wave burst. |
| `worldEnder.secondSplitSpeed` | `[130,220]` | [minimum, maximum] speed range for second-wave warheads in simulation units. |
| `worldEnder.promotionChance` | `0.02` | Chance of a warhead becoming another branching carrier; use 0–1. |
| `worldEnder.recursionDurationMs` | `20000` | Time window allowing recursive promotions, in milliseconds. |
| `worldEnder.maxChainDepth` | `8` | Maximum recursive branching depth; higher can greatly increase work. |
| `worldEnder.maxParticles` | `Infinity` | World Ender particle budget; Infinity means no fixed budget. |
| `worldEnder.maxRockets` | `Infinity` | World Ender rocket budget; Infinity means no fixed budget. |
| `worldEnder.soundBoost` | `2.1` | World Ender sound gain multiplier. |
| `worldEnder.stopAfter` | `false` | true winds the show down after the effect; false layers a manual World Ender into a live show. |

### `textFirework`

| Option | Base default | Explanation |
| --- | --- | --- |
| `textFirework.enabled` | `true` | Enable text fireworks. |
| `textFirework.renderMode` | `"hybrid"` | 'hybrid' combines crisp letters and particles; 'crisp' emphasizes the text layer; 'particles' uses particle lettering. |
| `textFirework.maxCharacters` | `72` | Maximum total message characters. |
| `textFirework.maxCharactersPerLine` | `24` | Character limit used to wrap each line. |
| `textFirework.maxLines` | `3` | Maximum number of text lines. |
| `textFirework.overflow` | `"ellipsis"` | 'ellipsis' indicates truncated text; 'clip' truncates without an ellipsis. |
| `textFirework.maxWidth` | `0.82` | Maximum block width as a viewport fraction; smaller values allow more off-centre positioning. |
| `textFirework.verticalPosition` | `0.42` | Text block centre as a fraction of viewport height, measured from the top. |
| `textFirework.horizontalPosition` | `0.5` | Text block centre as a fraction of viewport width; clamped to keep it on screen. |
| `textFirework.tilt` | `0` | Clockwise angle in degrees, or [min, max] for a random angle per launch; limited to ±45. |
| `textFirework.textAlign` | `"center"` | 'left', 'center', or 'right' aligns lines inside the block. |
| `textFirework.lineHeight` | `1.15` | Line spacing multiplier relative to font size. |
| `textFirework.fontFamily` | `"system-ui, sans-serif"` | CSS font family list. Ensure custom fonts are loaded. |
| `textFirework.fontWeight` | `800` | Numeric CSS font weight. |
| `textFirework.fontSize` | `92` | Base font size in CSS pixels; fitted to the block and scaled by camera zoom. |
| `textFirework.particleSpacing` | `4` | Spacing between sampled letter particles; smaller values add detail and particle cost. |
| `textFirework.particleSize` | `2.5` | Letter particle size in CSS pixels before effect scaling. |
| `textFirework.colors` | `["#FFFFFF","#FFD700","#FF69B4"]` | Array of hex colours used for text effects. |
| `textFirework.revealDuration` | `250` | Letter reveal time in milliseconds. |
| `textFirework.holdDuration` | `1400` | Time the message stays readable in milliseconds. |
| `textFirework.dissolveDuration` | `900` | Text dissolve phase length in milliseconds. |
| `textFirework.dissolveStyle` | `"sparkle"` | 'sparkle', 'fade', or 'fall' selects the breakup style. |
| `textFirework.fallDuration` | `3200` | Falling letter-particle lifetime in milliseconds. |
| `textFirework.gravity` | `0.025` | Text particle fall acceleration in simulation units; higher falls faster. |
| `textFirework.textGlow` | `1` | Text glow strength multiplier. |
| `textFirework.shimmer` | `true` | Enable shimmering text particles. |
| `textFirework.synchronizeExplosions` | `true` | Make multi-line text rockets arrive together; false staggers arrivals. |
| `textFirework.exclusive` | `true` | Pause new regular launches and reserve particle budget for the message. false lets the show continue behind it. |

### Optional background object (disabled by default)

| Option | Base default | Explanation |
| --- | --- | --- |
| `background.value` | `""` | CSS background value, such as a colour or gradient; omitted means an empty background. |
| `background.opacity` | `1` | Backdrop opacity from 0 to 1; omitted uses 1 during display. |
| `background.className` | `""` | Optional CSS class on the backdrop element. |

### Shell names for show.enabledTypes

`grand_peony`, `imperial_chrysanthemum`, `weeping_willow`, `royal_palm`, `diamond_ring`, `crossette_supreme`, `golden_brocade`, `dragon_fish`, `majestic_comet`, `cascading_horsetail`, `starburst`, `glitter_nova`, `crown_jewel`, `thunder_clap`, `galactic_spiral`. Use `'all'` to allow every regular shell.
