# Grand Fireworks JS: AI Handoff

## Project status: maintenance-only

Grand Fireworks JS is now a stable legacy/showcase project. New product development has moved to **Papercloak Animation Studios**, a separate project intended to provide a broader visual animation engine and design studio for fireworks, rings, reveals, banners, presentation effects, and related compositions.

Do not begin new developer-platform sprints or attempt to turn this repository into the Papercloak product. Preserve the current engine, package compatibility, documentation, examples, and demos. The destination repository link will be added when the Papercloak repository is published.

Read this file before making changes. It is the technical and product context for a fresh AI or contributor. Treat it as a living handoff: update it whenever architecture, public API, important product decisions, demo ownership, release workflow, or planned next work materially changes.

## 1. Project in one paragraph

Grand Fireworks JS is a dependency-free browser fireworks engine created by **Travis MacDonald**. It uses WebGL 2 when available and Canvas 2D as a fallback. It is intended for landing pages, cinematic scenes, interactive demos, and game experiments. The core API is one browser-friendly `GrandFireworks` class with configurable styles, shell geometry, text fireworks, procedural sound, depth, zoom, finales, and adaptive performance.

The project is deliberately fun and visually ambitious, but it must stay usable as a small framework-free library. New work should improve the core engine, examples, or documentation without turning the core into a framework-specific application.

## 2. Current release and repository state

- Current release: **v1.8.0**
- Core source: `GrandFireworks.js`
- Generated builds: `dist/GrandFireworks.js`, `dist/GrandFireworks.min.js`, and `dist/GrandFireworks.min.js.gz`
- Documentation homepage: `index.html`
- Main README: `README.md`
- Release history: `CHANGELOG.md`
- Tests: `tests/run-tests.js`
- Build: `npm run build`
- Test: `npm test`

The v1.8.0 release turns the engine into something a host can drive. `setRenderPass(callback)` lends the engine's canvas to the host's own drawing code — the callback runs after the canvas is cleared and before the fireworks are drawn, and receives `{ gl, ctx, canvas, width, height, dpr }` — and stops the engine's own animation loop so the host owns frame pacing through `renderFrame(dt)`. `placeburst(options)` detonates a shell at a point, or at an element's centre, with no flight time, fitted to an on-screen `radius`. `launchTo(options)` flies a real rocket from a host-supplied origin to a target over the host's own travel time, so gameplay and visuals stay in lockstep. Fireworks Command (`examples/fireworks-command/`) is rebuilt on that API, with its artwork drawn through the render pass by `scene-renderer.js` and wind switched off on that instance only. Also fixes rockets with `gravity: 0` falling, because the integrator read `r.gravity || 45`. Placed bursts also take a `reachTime`, which puts the rim of the break on a schedule rather than letting it drift out asymptotically — the difference between a game's hit circle and its visible fire agreeing or not. Fireworks Command builds on all of it: right-click fires the engine's World Ender with damage attributed positionally from each reported secondary explosion, interceptor and chain blasts are drawn larger than their hit circles and reach full size before those circles go lethal, and the palette picker gained a solid-colour mode (`show.palettes: 'single'`). The v1.7.1 release before it made text fireworks shrink their font to fit instead of being squeezed tall and thin on narrow screens, fixed the Workbench's Old School style choice (it silently fell back to Medium), and added a homepage Show Fullscreen shortcut after scrolling plus links from the homepage controls to the Config Workbench and Feature Demo. The v1.7.0 release before it added first-party TypeScript declarations (`index.d.ts`), fixed the Canvas 2D sprite-cache memory growth, `durationMode: 'immediate'`, WebGL point-size limits, iOS audio unlock, redundant resizes, and webfont timing in text fireworks, made the guided builder's config import accept JavaScript object literals, fixed unreadable dropdowns, and added the phone-friendly fullscreen control bar on the homepage. The v1.6.5 release before it introduced the cinematic style and related effects, ballistic rockets, stable distribution filenames, homepage automation, richer sound options, text controls, mixed-style weights, and guided-builder fixes.

Development happens on `dev` and is merged into `main` for releases. The developer-platform plan (see `docs/developer-platform-plan.md`) is implemented one sprint at a time. Sprint 1 (TypeScript and public API contract) is complete: the package now ships first-party types in `index.d.ts`, resolved automatically through `package.json`. TypeScript is a dev-only dependency; the published runtime stays zero-dependency.

Since v1.8.0 (unreleased at the time of writing), all of it documented in `docs/host-recipes.md`:

- Text fireworks gained `textFirework.horizontalPosition`, and the block now **scales with `visuals.zoom`**. Text plans are sampled in screen pixels and `_explodeType` divides each point by the zoom to undo the camera, so the block's base font is now scaled by the zoom while its centre is deliberately left alone — the requested position still holds exactly, and at `zoom: 1` nothing changed.
- `textFirework.exclusive` is the opt-in that halts other launches for the whole text lifecycle and reserves the particle budget. It is right for a message someone should read, and wrong for text layered over a show that must never stop — the homepage sets it to `false`.
- `show.launchHorizon` is measured in screen widths, so the homepage ties it to `1 / zoom` to keep launches across the full viewport at any zoom. That also un-caps the per-launch rocket count, `Math.min(launchHorizon, 1 / zoom)`, which exists to hold density steady as the field widens.
- The homepage fires text from two independent self-scheduling loops, each waiting one to ten seconds and picking a random phrase from ten, walking a declared series of four areas. A fixed `setInterval` would have made every gap identical, which is why the loop re-arms through `setTimeout`.

Important: **never hand-edit `dist/`**. Make source changes in `GrandFireworks.js`, then run `npm run build`.

## 3. Architecture

### Core engine

`GrandFireworks.js` is the source of truth. It is a self-contained IIFE that:

- exposes `window.GrandFireworks` in a browser;
- assigns `module.exports = GrandFireworks` when CommonJS exists;
- owns all particle, rocket, rendering, audio, lifecycle, and configuration logic;
- has no runtime dependencies.

Configuration is resolved in this order:

```text
DEFAULTS → selected style → selected colour theme → performance preset → user options
```

The public configuration object is intentionally deep-merged. New configuration fields must be represented in `DEFAULTS`, resolved and clamped in `_resolve()`, documented, and added to the guided builder when appropriate.

### Renderers

- `WebGLRenderer` is the preferred renderer. It batches particle data and uses additive blending.
- `CanvasRenderer` is a compatibility fallback.
- `renderer.preserveDrawingBuffer` must be enabled for persistent trails. The engine recreates the WebGL surface when a live trail setting changes because the WebGL context attribute cannot be changed in place.
- A renderer recreation must preserve active engine state. Do not call `clear()` just because a user changed a style or control.

### Animation and physics

- The main frame loop updates rockets, particles, flashes, text, adaptive quality, and rendering.
- Normal rockets use a ballistic arc. They slow near their apex, tip slightly into a fall, then burst. Do not revert this to constant-speed upward motion.
- Global `speedMultiplier` affects simulation pacing.
- View `zoom` is a camera-style world scaling control. Per-shell apparent scale and Z depth are separate and deliberately vary to create depth.
- When zoom changes, active objects are recentered so they do not slide away from the screen centre.

### Sound

Sound is procedural Web Audio, not a bundled sound-effect library.

- Sound must remain opt-in because browsers require a user gesture before audio can play.
- `enableSound()` should be called from a click/tap action.
- `sound.boomStyle` supports `classic`, `deep`, `artillery`, `double`, `rolling`, and `mixed`.
- `sound.boomVariation` controls variation within the selected character.
- Respect `sound.volume: 0` as a real mute.

## 4. Styles, themes, and live switching

Named visual styles live in `STYLES`:

```text
classic, oldSchool, thin, medium, cinematic, bold, spectacle, mixed
```

`mixed` chooses named styles using `mixedStyles` weights. The builder normalizes those ratios to 100%.

`setStyle(name)` intentionally removes fields owned by all previous styles before resolving the new one. This prevents Cinematic-only settings such as shimmer, wind, sphere bursts, or flash effects leaking into Bold or Classic.

Rules for style changes:

1. Existing rockets and particles keep the properties they were created with.
2. New launches use the newly selected style.
3. Do not clear the current show merely to demonstrate a style switch.
4. Keep unrelated user settings such as sound, placement, or a manually selected colour theme unless a feature explicitly says otherwise.

## 5. Important public API

The class exposes at least these primary methods:

```js
start(options?)
stop(options?)
pause()
resume()
clear()
destroy()
launch(options?)
launchText(text, options?)
launchTextSequence(messages, options?)
cancelTextSequence(options?)
launchFinale(options?)
launchWorldEnder(options?)
finalize()
setOptions(partial)
setOpacity(level)
setZoom(level)
setStyle(name)
setColorTheme(name)
enableSound()
disableSound()
setMuted(muted)
feelingLucky()
getOptions()
getStats()
```

Keep changes backward-compatible where practical. If a behaviour changes, document it in `CHANGELOG.md` and add a focused test.

**TypeScript:** First-party declarations live in `index.d.ts` and are the single source of truth for the TypeScript surface. When a public method or configuration field is added or changed, update `index.d.ts`, extend the fixtures under `types/fixtures/`, and run `npm run typecheck`. The declarations must not claim features that are not implemented.

## 6. Demos and pages

### Homepage: `index.html`

The homepage is both documentation and a live showcase. It starts Cinematic by default and has a draggable fullscreen control panel. It includes:

- style and colour selectors;
- speed, zoom, and intensity controls;
- an optional style-and-colour automation with a 20-second countdown;
- optional automatic smooth intensity movement;
- periodic Grand Finale launches;
- two independent text-firework firers over a declared series of areas, with the ambient show deliberately left running behind them;
- sound, random configuration, copy configuration, and fullscreen controls.

Homepage-specific show logic belongs in its inline script, not in the core engine. The homepage may use high-intensity moments, but it must retain sensible safety caps. It currently permits up to 20 active rockets to make 700% intensity visually meaningful.

### Guided builder: `examples/guided-builder.html`

This is the main configuration UI. It supports two modes via query string:

```text
?mode=features
?mode=workbench
```

It has a draggable/minimizable panel and live previews. Key details:

- Saved configurations may use `baseStyle: 'custom'`; `PRESET_MAP` must handle it safely.
- Text colours use visible colour picker controls rather than only a comma-separated string.
- Text alignment is supported with `textFirework.textAlign`.
- Mixed style weights must remain normalized.
- The panel and preview should remain consistent with the homepage visual language.

### Moonlit Horizon: `examples/moonlit-horizon.html`

This is the cinematic parallax showcase. It uses layered sky, moon, stars, and ground with separate movement speeds. It includes an opening sound choice, a slow sign entrance and departure, music, credits, an automatically staged show, and a Grand Finale. Preserve the scene layers and parallax feel if working here.

### Game examples

- `examples/fireworks-command/`: deliberately cheesy Mars-defence arcade game.

The games are examples of the engine, not replacements for the core product. Keep each game self-contained in its own folder with readable HTML, CSS, and JavaScript.

### Future 3D work

`docs/interactive-flight-spec.md` describes a possible separate free-flight 3D companion project. It is explicitly not a request to rewrite the core as a 3D engine.

## 7. Performance and safety decisions

- Prefer WebGL 2, fall back to Canvas 2D.
- Preserve a Canvas fallback even if it is not the headline renderer.
- Use adaptive quality and particle/rocket limits.
- The World Ender effect can easily overload a browser. Its recursion, particle counts, and duration need strict, configurable limits.
- Show-stopper effects must not automatically stop unrelated fireworks unless a caller explicitly asks for exclusivity.
- Respect reduced motion, offscreen pause, and hidden-tab pause settings.
- Avoid unexpected sound. Audio is off by default.

## 8. Release workflow

1. Make source, demo, and documentation changes.
2. Bump the version consistently in `package.json`, `package-lock.json`, `GrandFireworks.js`, homepage-visible metadata, README, and changelog.
3. Run:

   ```powershell
   npm run build
   npm test
   npm run typecheck
   npm pack --dry-run
   git diff --check
   ```

4. Confirm `npm pack --dry-run` contains only intended publish files.
5. Commit the release, create an annotated tag such as `v1.8.0`, push `main` and the tag, then publish with npm.

### Distribution naming rule

Build files have stable names, with no version number in the filename:

```text
dist/GrandFireworks.js
dist/GrandFireworks.min.js
dist/GrandFireworks.min.js.gz
```

This avoids broken `@main` / `@latest` CDN URLs after a future build. Version pinning belongs in a Git tag or npm version, for example:

```html
<script src="https://cdn.jsdelivr.net/gh/travisjmac/grand-fireworks-js@v1.7.1/dist/GrandFireworks.min.js"></script>
```

For the moving development branch, use:

```html
<script src="https://cdn.jsdelivr.net/gh/travisjmac/grand-fireworks-js@main/dist/GrandFireworks.min.js"></script>
```

## 9. Framework wrappers: planned, not part of the core release

Do not add Vue or React as dependencies of this repository's core package.

Future wrappers should be separate packages:

```text
@grand-fireworks/vue
@grand-fireworks/react
```

Each wrapper should do only lifecycle integration:

- create a `GrandFireworks` instance on mount;
- apply option changes with `setOptions()`;
- expose useful engine methods;
- destroy the instance on unmount;
- provide one focused example and documentation.

Suggested APIs:

```text
Vue:   <GrandFireworks>, useGrandFireworks()
React: <GrandFireworks>, useGrandFireworks()
```

The renderer and physics stay in the core library. A basic wrapper is small; do not delay core releases for framework packaging.

## 10. Working conventions

- Use `apply_patch` for intentional source edits.
- Keep JavaScript readable and commented. Do not compress source files by hand.
- Use `npm run build` to generate minified distribution artifacts.
- Add or update tests for engine behaviour changes.
- Run `npm run typecheck` after any public API or configuration change, and update `index.d.ts` and the fixtures under `types/fixtures/` to match.
- Check the worktree before editing. Preserve unrelated user changes.
- Do not make a commit, tag, publish, or push unless Travis requests it.
- Never expose credentials, access tokens, private SSH keys, or browser confirmation codes in documentation or chat.

## 11. Suggested first read order for a new AI

1. This handoff file.
2. `README.md`.
3. `CHANGELOG.md`.
4. `package.json` and `scripts/build-dist.js`.
5. `GrandFireworks.js`: `DEFAULTS`, `STYLES`, `_resolve`, `setOptions`, `setStyle`, renderer classes, and public API exports.
6. `tests/run-tests.js`.
7. `index.d.ts` and `types/fixtures/` when changing the public API or configuration.
8. `index.html` and `examples/guided-builder.html` when changing UI or demo behaviour.
9. `docs/product-roadmap.md` and `docs/interactive-flight-spec.md` only when planning future work.
10. `docs/host-recipes.md` when wiring the engine into a page, a demo, or a game — it is the code-level companion to this handoff, covering the host render pass, point bursts and `reachTime`, text placement and exclusivity, and the horizon-follows-zoom pattern.

## 12. Known documentation cleanup opportunity

Some older standalone examples still contain historical version metadata such as `1.5.0`. They are not the primary showcase pages. Update them together in a dedicated documentation/version sweep rather than mixing that large mechanical change into an unrelated feature patch.
