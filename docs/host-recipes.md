# Host recipes

How to actually wire the engine into a page, a demo, or a game. Each recipe is a pattern
that has been used in this repository, with the option names and the reasoning that matter.

Reference implementations to read alongside this:

- `examples/fireworks-command/` — a game that owns the frame loop and draws its own scene.
- `index.html` — the documentation homepage, which layers text over a show that never stops.

---

## 1. Let the engine run the show

Do nothing. The engine owns its own `requestAnimationFrame` loop, launches on a schedule,
and stops when told to.

```js
const fireworks = new GrandFireworks({ autoStart: true, mode: 'fullscreen', placement: 'background' });
```

Useful dials while it runs:

| Goal | Setting |
| --- | --- |
| More or fewer launches | `show.intensity` (live via `setOptions`) |
| Ceiling on simultaneous shells | `show.maxRockets` |
| Particle budget | `show.maxParticles` (a floor of 100, **no ceiling** — `Infinity` is allowed) |
| Which shells can break | `show.enabledTypes` |
| Whole-simulation pacing | `speedMultiplier` |

Set `performance.adaptive: true` (the default) and the engine will trade particle quality
down and back up to hold its target frame rate. Prefer that to hand-tuning budgets.

---

## 2. Own the frame loop, borrow the renderer

`setRenderPass(callback)` lends the engine's canvas to your own drawing code and **stops the
engine's own loop**, so the host becomes responsible for frame pacing through
`renderFrame(dt)`. This is what lets a host drive gameplay from one loop while the engine
supplies rendering, explosions, and audio.

```js
let previous = performance.now();

fireworks.setRenderPass(({ gl, ctx, canvas, width, height, dpr }) => {
  // Exactly one of gl / ctx is non-null, depending on the active renderer.
  // Draw your scene here: the canvas is already cleared (or trail-faded) and the
  // engine's particles are painted afterwards, on top of your artwork.
});

function frame(now) {
  const dt = now - previous;
  previous = now;
  updateGame(dt);          // your simulation
  fireworks.renderFrame(dt); // engine physics + both draws
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

Rules that are easy to get wrong:

- Do **not** clear the frame inside the callback — the engine has already done it, and
  clearing again throws away trail fade.
- `dt` is milliseconds. It is capped at 50ms internally, the same guard the engine's own
  loop uses, so a backgrounded tab cannot teleport effects.
- `renderFrame(0)` renders the current frame without advancing anything. That is how you
  pause the effects while keeping your scene on screen.
- Pass `null` to `setRenderPass` to hand pacing back to the engine.

The Canvas 2D path draws the render pass **before** the zoomed particle transform, so host
artwork is never scaled by engine zoom. The WebGL path runs it after the clear/trail-fade
and re-establishes its own GL state (program, VAO, blend function) straight after, so your
callback may bind programs, VAOs, and textures freely without cleaning up.

---

## 3. Fire at a point, or fly a shell to one

Both take **CSS pixels relative to the engine's container** — which is what pointer events
and `getBoundingClientRect()` already give you — and convert to world space through the
current zoom, so the effect lands where you aimed at any zoom.

```js
// Detonate immediately, no flight time. Fitted to an on-screen radius.
fireworks.placeburst({ x: event.clientX, y: event.clientY, radius: 220, type: 'grand_peony' });

// ...or at an element's centre.
fireworks.placeburst({ element: '#hero-playground', radius: 320 });

// Fly a real rocket from an origin to an arrival, over your own travel time.
fireworks.launchTo({ x: cannonX, y: cannonY, targetX: aimX, targetY: aimY, duration: 900 });
```

`launchTo` uses a purpose-built rocket: straight-line velocity over the requested flight
time, no gravity and no depth drift, so it bursts exactly where and when you asked.

### Making the blast match your hit circle

`radius` is the on-screen radius the sparks are fitted to. The fit targets the 90th
percentile of star reach — the visible rim — so a few fast strays travel past it, exactly as
a real break does.

`radius` alone is **asymptotic**: stars coast outward for well over a second, so a game whose
blast is lethal immediately would kill things the visible explosion has not reached yet. Ask
for `reachTime` and the rim arrives on a schedule instead:

```js
fireworks.placeburst({
  x, y,
  radius: 260,
  reachTime: 260,   // the rim is at `radius` after 260ms
  lifeScale: 0.55,  // sparks fade sooner, so fire does not linger
  gravityScale: 0.1 // and drift down slowly instead of dropping
});
```

Three star types (`weeping_willow`, `royal_palm`, `cascading_horsetail`) hard-override their
own drag in the integrator, so a requested schedule cannot be honoured for them; they keep
the asymptotic fit rather than arriving late and looking broken.

To attribute damage to what the player can see, listen for the engine's own report rather
than guessing. Every World Ender branch dispatches `finalestage` with
`{ stage: 'secondary-burst', x, y, radius, source }`, where `radius` is measured from the
stars actually created and bounded by the world diagonal:

```js
fireworks.addEventListener('finalestage', (event) => {
  const { stage, x, y, radius, source } = event.detail;
  if (stage !== 'secondary-burst') return;
  damageEverythingWithin(x, y, radius); // world units
});
```

Coordinates in that report are **world** units, so a host that converts with `x * zoom`
lands its damage where the carrier actually is. Reporting screen coordinates instead would
put every blast at the wrong distance.

---

## 4. Text that behaves

### Placement

`verticalPosition` and `horizontalPosition` are fractions of the viewport and the block is
centred on them. Both are clamped so a wide block can never be pushed half off the canvas,
which means **narrowing `maxWidth` is what lets text travel further off centre**:

```js
fireworks.launchText('BOOM', {
  maxWidth: 0.45,          // the block may be up to 45% of the width
  horizontalPosition: 0.3, // centred 30% across, after the clamp
  verticalPosition: 0.35
});
```

At `maxWidth: 0.45`, the clamp pins the centre between roughly `0.225` and `0.775` of the
width. Pushing a position past that does not move the text further out — it just clamps, so
the variation across a series of positions flattens. Keep deliberate positions inside the
range the block can actually reach.

The block is sized against `visuals.zoom`, so it shrinks and grows with the camera. At
`zoom: 1` it renders exactly as it always did.

### Interrupting the show, or not

`textFirework.exclusive` defaults to `true`: it sets the engine's `accepting` flag to
`false` for the whole text lifecycle and reserves the particle budget, so nothing competes
with the words. That is right for a message someone is meant to read.

Turn it off when the text is decoration on a show that must never stop:

```js
const fireworks = new GrandFireworks({ textFirework: { exclusive: false } });
```

It can also be set per call, so one deliberate message takes the show over while the rest
stay unobtrusive. With it off, the ambient show keeps launching while the words assemble,
and shells may drift through them — that is the trade.

One consequence to plan for: every `launchText` culls existing particles down to
`maxParticles - needed` to reserve room for its own block (this happens whether or not
`exclusive` is set). Two blocks that overlap therefore compete for the budget and can thin
each other out, and eat into the ambient show while they do. If text looks crowded on
screen, the dials are how often you launch, `fontSize`, and `particleSpacing` — the last two
set how many particles each block needs.

### Sequences

`launchTextSequence(messages, options)` shows messages one at a time and resolves with
`{ status, completed, total }`. It emits `textsequencestart`, `textsequenceitem`,
`textsequenceend`, and `textsequencecancel`. `cancelTextSequence()` cancels the queue.

A self-scheduling loop is the right shape for irregular text, rather than one repeating
timer, because a fixed period makes every gap identical:

```js
function textLoop() {
  fireworks.launchText(randomFrom(PHRASES), { maxWidth: 0.45, exclusive: false });
  setTimeout(textLoop, 1000 + Math.random() * 9000); // one to ten seconds later
}
```

---

## 5. Camera: making the horizon cover the viewport

`show.launchHorizon` is measured in **screen widths**, so a horizon of `1` covers one
screen-width however far the view is pulled back. Zoom out and the shells stay in a central
band, never reaching the edges.

Tie the horizon to the zoom to keep launches across the full viewport:

```js
function applyZoom(zoom) {
  fireworks.setOptions({ visuals: { zoom }, show: { launchHorizon: 1 / zoom } });
}
```

At `1 / zoom` the launch zone matches the visible width exactly. It also un-caps the
per-launch rocket count, which is `Math.min(show.launchHorizon, 1 / zoom)` and exists to
hold density steady as the field widens — at a horizon of `1` that cap was below the area
being filled.

Call it from **every** control that moves the camera. Style presets can carry their own
`visuals.zoom`, so a style switch that only updates the zoom slider will leave the horizon
out of step. At `zoom > 1` the expressions are equal, so this only changes zoomed-out
behaviour.

---

## 6. Palette modes

| `show.palettes` | Result |
| --- | --- |
| `'default'` | Cycles the built-in multi-colour palettes |
| `'single'` | One solid colour per shell, drawn from a spectrum-ordered set |
| `[['#FF0000', '#FFFF00']]` | Nested: each inner array is a full palette, normalized per shell (this ramps red to yellow) |
| `['#FF0000', '#FFFF00']` | Flat: a pool of solid shells, one colour each |

The flat form is easy to mistake for the nested one. `palettes: ['#FF0000', '#FFFF00']` is two
solid shells, not a gradient.

---

## 7. Budgets and safety

- `show.maxParticles` and `show.maxRockets` have **floors only, no ceilings** — a host that
  asks for a number gets that number, and may ask for `Infinity`. Adaptive quality is the
  brake when a machine cannot keep up.
- An explicit `show.maxParticles` is never silently halved. The Canvas 2D fallback halves
  the budget only when the host did **not** set one, because the software path needs the
  headroom.
- The World Ender uncaps its own limits for its duration and restores the host's values
  afterwards. Overlapping World Enders are supported: each keeps its own chain listener and
  completion timer, and only the last one out restores the configuration, so caps cannot
  ratchet down with every repeat.
- Show-stopper effects must not stop unrelated fireworks unless the caller asked for it.
  `worldEnder.stopAfter` and `textFirework.exclusive` are the explicit opt-ins.

---

## 8. Verification checklist

Before claiming a change is done:

```powershell
npm test              # dependency-free regression suite
npm run typecheck     # declaration contract
npm run build         # regenerates dist/
git diff --check      # whitespace
npm pack --dry-run    # expect exactly 9 files
```

Then confirm `dist/GrandFireworks.js` is byte-identical to `GrandFireworks.js`, and check the
remote refs rather than trusting a push:

```powershell
git ls-remote origin refs/heads/dev refs/heads/main
```

Two traps worth knowing:

- **Never hand-edit `dist/`.** Change `GrandFireworks.js` and run `npm run build`.
- The build leaves `dist/GrandFireworks.min.js` flagged as modified even when nothing
  changed, because the build writes LF while the checkout is CRLF. It is not a real diff:
  `git diff --numstat` for the file is empty and the regenerated `.min.js.gz` is
  byte-identical. The `.gz` is the reliable signal — if it moved, the change is real.
  Restore churn with `git checkout -- dist/GrandFireworks.min.js` rather than committing it.
