# Changelog

All notable changes to Grand Fireworks JS are documented here.

## [Unreleased]

### Added

- **`horizontalPosition` on text fireworks.** The text block can be centred anywhere across the width as a fraction, clamped so it can never be pushed half off the canvas — narrow `maxWidth` to move it further off centre. Defaults to `0.5`, so existing text renders exactly as it did.

### Changed

- The homepage now shoots a text firework reading **BOOM** or **Grand Fireworks** every sixteen seconds from a **set series of areas** — left, centre-high, right, centre-low — walked in order, so each message lands somewhere deliberate and every area is used. The exact spot is randomised within the chosen area rather than anywhere on the page.
- The homepage sets `textFirework.exclusive: false`, so the ambient show **keeps launching while the words assemble** instead of pausing for the text's whole lifecycle. The engine default is unchanged: `exclusive: true` remains right for a deliberate message that should be read without competition.

## [1.8.0] — October 2, 2026

The engine can now be driven by a host: lend it your scene, detonate shells at exact points, and launch rockets from wherever your own logic says they start.

### Added

- **`setRenderPass(callback)`** — draw your own scene on the engine's canvas. The callback runs every frame after the canvas has been cleared (or trail-faded) and before the fireworks are drawn, so your artwork sits behind them, and it receives `{ gl, ctx, canvas, width, height, dpr }` — exactly one of `gl`/`ctx` is set, matching the renderer in use. Attaching a pass hands frame pacing to you: the engine stops starting its own animation loop, so effects are never stepped twice. Pass `null` to detach.
- **`renderFrame(dt)`** — advance the simulation by `dt` milliseconds and draw one frame. `dt` is capped at 50 ms internally, the same guard the engine's own loop applies, and `renderFrame(0)` renders the current frame without advancing anything, so a paused host keeps its scene on screen.
- **`placeburst(options)`** — detonate a shell immediately at a point, with no rocket and no flight time. Accepts `x`/`y` in container CSS pixels, or `element` (an element or selector) to burst at that element's centre, which is what makes it easy to tie explosions to buttons, cards, or clicks. Per-call `radius`, `type`, `colors`, `density`, and `sound` are supported.
- **`launchTo(options)`** — fly the engine's real rocket — trail, exhaust, detonation flash, burst, and audio — from an origin and travel time you supply. A host that already simulates a projectile passes the same origin and duration it is using, so the firework and the gameplay arrive together by construction.
- **Radius-fitted bursts.** The on-screen `radius` you ask for is matched by scaling every star's velocity and gravity by the same factor, so the shell keeps its shape at any size. The fit targets the rim of the break — the 90th percentile of star reach — so a few of the fastest stars travel past the radius, the way a real break does. The detonation flash scales with the burst so a small explosion is not swamped by a full-size flash.
- **`density`** scales a burst's spark count per call (1 is normal), and **`sound: false`** silences a single burst or rocket without changing the engine's sound setting.
- **`reachTime`** puts the rim of a burst on a schedule. The fit normally targets the *asymptotic* reach, so the stars keep coasting outward and a blast is still only about a third of the way to its radius when a game's hit circle has already gone fully lethal — which is exactly how enemies end up dying outside the visible fire. Given `reachTime`, each star's drag and speed are retuned so the rim arrives then, with gravity compensated so the sparks fall at the same rate and only the expansion gets faster. Star types that override their own drag (willow, palm, horsetail) keep the asymptotic fit.
- Fireworks Command (`examples/fireworks-command/`) is rebuilt on the engine. The game keeps its own artwork, gameplay and collision circles, and the engine renders the scene, the interceptor rockets, the bursts and the sound. Interceptors launch from the nearest armed launcher using the game's existing cannon-tip origin and flight time, so the detonation lands exactly where the game's own logic says it does. Wind is switched off on that instance only — the library's presets are untouched.
- `examples/fireworks-command/scene-renderer.js` — the game's artwork (sky, terrain, cities, cannons, missiles), composited through the engine's render pass.
- **A solid-colour palette mode.** `show.palettes: 'single'` gives every shell one solid colour instead of a multi-colour ramp, so a volley reads as several distinct colours at once rather than a wash of gradients. A flat array of colour strings does the same with your own hues — `palettes: ['#FF3B30', '#0A84FF']` — while a *nested* array keeps its existing meaning of one full palette per shell. Passing a flat array of colours previously fell through to the first built-in palette and silently ignored them.
- Fireworks Command's palette picker gains **One colour each**, so every burst in a volley breaks in a different solid colour — including the SuperNova and round-clear celebrations, which now walk the palette from a fresh hue each time. The Config Builder's `show.palettes` control offers the same choice.
- **Right-click fires a World Ender** in Fireworks Command — the engine's staged apocalypse, running uncapped as asked so the full volley spawns every star it wants, and with no rationing: fire it as often as you like. Overlapping enders are allowed and no longer cancel each other — each keeps its own chain listener and completion timer, and the raised particle and rocket caps are reference-counted so they are only restored once the last one has finished. Because every secondary explosion reports its position, the damage is attributed positionally: the game works out which enemies each blast actually covered instead of clearing the screen.
- **Secondary explosions report their own blast radius.** Every `finalestage` `secondary-burst` now carries a `radius` in world units, measured with the same 90th-percentile reach that the radius fit targets, so the two can never disagree about how big a break was. Fireworks Command sizes each World Ender blast's damage from that instead of guessing with a fraction of the screen, which was leaving enemies standing inside explosions that visibly engulfed them.
- **`gravityScale`** and **`lifeScale`** tune a break's aftermath. `gravityScale: 0.1` makes the sparks drift down at a tenth of the usual rate instead of dropping, and `lifeScale` below 1 fades them over the fall rather than letting them outlive the explosion. Both apply per burst, after the radius fit has done its own gravity compensation.
- **A shield dome** over the cities in Fireworks Command: a glassy arc spanning the screen that absorbs four hits before it fails. Every hit leaves a crack exactly where it landed, growing inward into the glass rather than spraying off the outside of the dome, and drawn from a seeded generator so the cracks keep one shape instead of crawling. The rim brightens as the field weakens, and when it finally fails the dome and every crack vanish together, leaving the cities visibly exposed. Cracks are stored as a fraction across the dome, so they survive a resize.
- **The blast radius ring returns** in Fireworks Command as a very light outline of what the explosion is lethal to right now. It is drawn under the engine's particles, so it reads as a faint rim beneath the fire, and a kill is never a mystery.
- Fireworks Command's scene renderer no longer repaints or re-uploads its artwork for an unchanged frame. The artwork is a pure function of the game state, so identical frames skip both the repaint and the full-frame texture upload — roughly 33 MB per frame at 1080p with DPR 2, near 2 GB/s at 60fps — while still compositing every frame, because the engine clears the canvas. Menus, pauses and quiet moments now cost a single draw call.
- **Dev shortcuts** in Fireworks Command, so a wave can be tested without playing to it: `1`–`9` jump straight to that wave with a full defence, `U` pauses the game and opens the upgrade picker so a package can be chosen, and `R` returns to a clean wave 1. Choosing from the picker applies the package and resumes the same wave rather than starting the next round. They announce themselves in the console.
- **No ceilings on the budgets.** `show.maxParticles` and `show.maxRockets` accept any value, including `Infinity`, and nothing clamps them on the way through — the World Ender used to impose its own 10,000/25 ceiling on top of whatever the host asked for. Only a floor remains, so a zero cannot switch the show off by accident. Adaptive quality is the brake when a machine cannot keep up.
- The Canvas2D fallback no longer halves an **explicitly configured** particle count. It still halves the preset defaults, which is what the accommodation is for, but a requested 24,000 silently becoming 12,000 was exactly the kind of invisible limit that costs an afternoon.
- The blast radius reported to a host is bounded by the world's own diagonal. A willow's stars barely shed speed, so its computed reach worked out several times the size of the screen — and a blast larger than the viewport is a screen clear in disguise, which reads to a player as enemies vanishing with no fire near them.
- **Click the documentation page for fireworks.** Clicking anywhere on the homepage detonates a shell at that point, using the page's current style, colours and zoom. The engine canvas is a fixed, pointer-transparent overlay, so viewport coordinates need no conversion. Clicks on the controls are left alone and dragging the control bar does not fire.
- A placed burst with no colours given now follows the palette the show is already configured with, rather than always falling through to the first built-in ramp.

### Fixed

- Rockets with `gravity: 0` no longer fall. The rocket integrator read `r.gravity || 45`, so an explicit zero was silently replaced by the default. Host-launched rockets set gravity to zero deliberately so they fly straight to their target.
- Fireworks Command's SuperNova and round-clear celebrations no longer collapse into hit-marker-sized puffs. Those bursts were queued without a radius, so they fell through to the 48 px default reserved for confirming an enemy kill, which turned a screen-filling finale into forty specks. Every queued burst now states its own size, and the two spectacles scale with the viewport.
- Fireworks Command's interceptor and chain-reaction blasts now lead their damage. The visible explosion is drawn 15% larger than the hit circle and reaches full size in 60% of the time that circle takes to go lethal, so every enemy that dies is visibly inside the fire that killed it. Bursts with no hit circle snap open as well, instead of swelling slowly.
- World Ender blasts stay lethal for as long as their fire is still burning. The damage was applied once, at the instant a secondary explosion detonated, so an enemy crossing the blaze a moment later sat there unharmed inside a visible explosion. Each blast is now a live hazard checked every frame — the same model the interceptor blasts already used.
- Every World Ender branch now reports itself, whatever shell type it is. Only `grand-finale-burst` used to report, and that is a minority of the chained generations — the rest are warheads, which burst with no report at all, so a host listening for them had nothing to attribute damage to and those explosions did nothing. The engine's own chaining is untouched: only promoted shells still branch onward.
- A burst throttled by the particle cap reports the reach it was built for instead of nothing. Reporting zero left a host sizing its damage from a low guess, which is how enemies kept surviving inside a blast — and the first attempt at a stand-in, reusing the last measured radius, swung the other way and made a throttled burst lethal across half the screen, so enemies vanished well outside any fire.
- Starting a second World Ender before the first has finished no longer ratchets the engine's limits down. The effect applied its own inflated particle and rocket caps through `setOptions`, so the values it later captured as "the host's originals" were its own, and each repeat lowered the budget a little further — the Canvas2D path halves `maxParticles` on every resolve, so a restore could never land back where it started. The effect now adjusts the live options directly, keeps the engine's ceilings, and restores exact snapshots, so the host's configuration is returned untouched.

### Removed

- Removed the Starlight Intercept example game and its logo. It never used the fireworks engine. Its Mars backdrop was renamed `assets/fireworks-command-mars.png` for Fireworks Command, but the rebuilt game paints its Martian sky procedurally, so the image is now unused and kept only as source artwork.

## [1.7.1] — September 28, 2026

Text fireworks keep their shape on phones, the Workbench's Old School style works, and the homepage gets quicker routes to fullscreen and to the full tools. No option or method changed shape.

### Added

- Homepage scroll shortcut. Once the controls panel scrolls out of view, a compact **🎬 Show Fullscreen** button appears centred just below the sticky section menu. It hides again when the controls are back in view or while fullscreen is showing.
- Homepage controls link to the full tools. A **More controls** row at the bottom of the controls panel links to the **🎛 Config Workbench** and **🔭 Feature Demo**, both on the page and in fullscreen.

### Fixed

- Text fireworks no longer look stretched tall on phones. A line wider than the allowed width (`maxWidth`) was squeezed horizontally by the canvas to fit, so on narrow screens the letters looked tall and thin. The engine now shrinks the font for the whole text block instead, so every line keeps its normal shape and they share one size.
- The Workbench's Guided **Style → Old School** now shows Old School. It was sending `oldschool` instead of the engine's `oldSchool`, which silently fell back to Medium.

## [1.7.0] — September 28, 2026

First-party TypeScript declarations, a round of engine reliability fixes, a more forgiving guided-builder import, and a phone-friendly fullscreen control bar on the homepage. No existing option or method changed shape.

### Added

- Added first-party TypeScript declarations (`index.d.ts`) for the public API: constructor and per-launch options, configuration sections (visuals, sound, performance, show, finale, world-ender, text firework, renderer, transition, background), method signatures, return types for `getOptions()`, `getStats()`, and cleanup handles, and the static `VERSION`, `DEFAULTS`, `PRESETS`, `TYPES`, `STYLES`, and `COLOR_THEMES` members.
- Wired `types`/exports so TypeScript, bundlers, and editors resolve `index.d.ts` automatically. Both `import GrandFireworks from` and `import { GrandFireworks } from` are supported.
- Added `npm run typecheck`, which compiles focused fixtures exercising the default and named import paths against the declarations with `strict` mode.
- Added a declaration contract test to `npm test` that verifies the published methods and configuration interfaces are represented in `index.d.ts` and that the file is wired into `package.json` publishing.
- Homepage fullscreen control bar. In fullscreen the controls panel now has **Slim/Full**, **Random**, a 🔇/🔊 sound toggle, and **Exit** in its title bar. On phones it opens as a slim `Controls: Full | Random | 🔇 | Exit` bar locked to the top left so it cannot be dragged or pushed off screen; **Full** opens the complete controls below it, capped at 60% of the screen and scrolling inside. Desktop keeps the draggable panel.

### Changed

- Added `typescript` as a dev-only dependency for the type-check fixture; the runtime stays framework-free and dependency-free.

### Fixed

- Dropdown menus are readable again. Several dark-themed pages set light text on `<select>` elements without styling their `<option>`s, so the native popup showed white text on a white background. Options are now styled on the homepage, guided builder, configuration builder, I'm Feeling Lucky, and Fireworks Command.
- The guided builder's **Load Config** accepts every option the engine supports, including `worldEnder`. The accepted list is now read from `GrandFireworks.DEFAULTS` instead of a hand-maintained copy, and an unrecognised option reports "nothing was imported" rather than a bare error.
- WebGL point sprites now respect the driver's real size limit. Every point was clamped to a hardcoded 256 without ever querying `ALIASED_POINT_SIZE_RANGE`, which many mobile GPUs cap at 64. The limit is now read once at renderer init and the clamp accounts for zoom, because the vertex shader scales point size by the zoom factor. The existing 256 buffer cap still applies, so output on GPUs with a large point-size range is unchanged.
- Sound enabled through options now unlocks on iOS. `sound: { enabled: true }` (including with `autoStart`) previously created a suspended `AudioContext` that nothing ever resumed, so the show stayed silent with no error. `start()` now attempts the resume, and because browsers only permit that inside a gesture the engine also listens once for the first pointer or key interaction and unlocks there. While audio is active the session is declared as playback, so the iOS hardware silent switch no longer mutes it.
- Resize no longer reallocates for unchanged sizes. The engine skips the drawing-buffer and text-canvas reallocation entirely when width, height and pixel ratio have not actually moved, removing repeated work from bursts of resize events such as a collapsing iOS URL bar.
- Text fireworks wait for fonts to load. Rasterisation samples pixels immediately, so a host-supplied webfont that was still loading would be measured with fallback metrics and the particles would assemble into the wrong shape. `launchText()` now awaits `document.fonts.ready` while fonts are loading, and launches synchronously as before otherwise.
- Bounded the Canvas 2D sprite cache. Sprites were keyed on the exact runtime colour, but `pyroBurn` drifts each particle's colour every frame, so a single show with the default palettes could mint roughly 12,000 live 64×64 canvases — around 184 MB of canvas memory that was only released by `destroy()`. Colours are now quantised to 16 levels per channel (indistinguishable inside a soft additive glow) and the cache is capped with least-recently-used eviction, which bounds it to about 16 MB. This was reachable in the default embedded configuration: `mode: 'contained'` selects Canvas 2D and `baseStyle: 'cinematic'` enables `pyroBurn`.
- `durationMode: 'immediate'` now works. The engine previously compared the option against an undocumented `'strict'` value, so neither the declared type nor the guided builder's "End mode → Immediate" control could ever trigger an immediate finish — every show wound down gracefully regardless. The comparison now matches the documented `'graceful' | 'immediate'` contract in `index.d.ts`, and the configuration builder's End mode dropdown offers `immediate` instead of the dead `strict` value.
- The guided builder's **Load Config** now accepts JavaScript object literals and the Copy Config snippet, not just strict JSON. Pasted text is parsed, never evaluated, and `__proto__`/`constructor`/`prototype` keys are dropped.

## [1.6.5] — July 31, 2026

### Added

- Added ballistic rocket arcs that slow into the burst and tip into a natural fall.
- Added cinematic shimmer, sparkle, varied particle persistence, wind, flash bursts, and a dedicated Cinematic style.
- Added global speed control, varied apparent shell depth, mixed-style weighting, expanded text alignment and colour controls, and procedural boom character choices.
- Added smooth automatic intensity movement, automatic style-and-colour changes, periodic Grand Finale launches, and a 20-shell homepage ceiling.

### Changed

- Reworked live style switching so new launches use the selected preset without interrupting shells already in flight.
- Replaced versioned distribution filenames with stable `GrandFireworks.js` and `GrandFireworks.min.js` files for reliable CDN `@main` and `@latest` use.
- Expanded the guided builder with normalized mixed-style ratios, visible colour pickers, and more sound and text controls.

### Fixed

- Live trail settings now recreate the WebGL surface when needed, allowing trail-capable styles to activate correctly.
- Fixed custom saved configurations in the guided builder when no named preset applies.

## [1.6.4] — July 29, 2026

### Fixed

- Style switching now clears values owned by the previous preset before applying the next preset.
- Cinematic-only shimmer, sparkle, wind, spherical bursts, flash effects, and particle settings no longer leak into Bold, Classic, or other styles.
- The public `setStyle()` method now accepts the supported Mixed style.
- Colour theme, zoom, sound, placement, and other unrelated user settings remain intact while switching styles.

## [1.6.3] — July 29, 2026

### Added

- Added a cinematic fireworks style with shimmer, varied particle persistence, bright flash bursts, and consistent wind.
- Added global speed control and randomized per-shell apparent depth and scale.
- Added a richer draggable homepage playground with live style, colour, speed, zoom, intensity, sound, and fullscreen controls.
- Added visual multi-selection for individual shell types.

### Changed

- Unified Feature Demos and the Configuration Workbench into one query-selectable studio.
- Replaced the studio's side hide arrow with a title-bar minimize control and a WebGL2 melt/morph animation.
- Made the cinematic style the primary showcase style and added safe periodic Grand Finale bombs to the homepage.

### Fixed

- Preserved moved configuration-window positions while minimizing and restoring.
- Prevented standalone show-stopper demonstrations from unintentionally stopping the running display.
- Corrected depth-aware launch scaling, height, sound, and text placement.

## [1.6.2] — July 28, 2026

### Added

- Added Fireworks Command, a Mars defence game showcase with bunker interceptors, waves, upgrades, chain reactions, a SuperNova, music, and a Mars dust-scape.
- Added Starlight Intercept, a space-action showcase with ember fields, power-ups, asteroids, saucers, laser bursts, music, and a cinematic warp ending.
- Added polished game logos and home-page showcase cards for both examples.

### Changed

- Moved both games into self-contained example folders with separated HTML, CSS, and readable, commented JavaScript source credited to Travis MacDonald.

### Fixed

- Preserved the player's sound preference when advancing to the next Fireworks Command round.

## [1.6.1] — July 28, 2026

### Added

- Added World Ender as a reusable engine effect, Feature Demos show-stopper option, and Guided Builder choice.
- Added depth-aware close-shell staging, near-field boom controls, mixed styles, and live scene zoom support.
- Added the Moonlit Horizon cinematic sequence with music, show timeline, style showcase, credits, and a configurable World Ender finale.

### Changed

- Manual Super Grand Finales and World Enders now keep a live show running unless `stopAfter: true` is requested.
- Renamed the Zoom Playground experience to Feature Demos.

### Fixed

- Fixed camera zoom centring for active rockets, particles, flashes, and text fireworks.

## [1.6.0] — July 23, 2026

### Changed

- Updated home page logo to a static SVG with toggle behavior removed.
- Replaced Guided Builder with unified Configuration Tool.
- Removed Advanced Builder from navigation (functionality folded into Configuration Tool).
- Added sound toggle buttons to all example pages, styled consistently.
- Simplified themes page to use `start()` instead of duplicating full config.
- Renamed logo CSS class from `logo-toggle` to `logo` and cleaned up related styles.
- Fixed `disableSound()` to properly stop ambience, voices, and suspend the AudioContext.
- Fixed missing `applyStyle()`/`applyTheme()` functions in index.html after code cleanup.
- Fixed preview layout in Configuration Tool (fullscreen toggle, always-visible hide tab).

## [1.5.0] — July 21, 2026

### Added

- Added the Guided Configuration Builder with presets, a first-run wizard, live preview, playback controls, named local saves, raw JSON loading, and focused option tabs.
- Added curated color themes, style switching, the optional FPS overlay, and synthesized launch/explosion sound effects.
- Added cancellable sequential text messages through `launchTextSequence()` and `cancelTextSequence()`, including lifecycle events and per-message overrides.
- Added dependency-free automated regression tests and a reproducible Terser-based distribution build.

### Changed

- Performance presets now support explicit `fps`, `dprCap`, `particleScale`, and `secondary` overrides.
- Live option changes now preserve opacity, resize immediately for DPR changes, and keep `setOpacity()` values across later updates.
- Sound now reuses one lazily created `AudioContext`, preserves true zero volume, and closes resources during destruction.
- Reduced-motion visitors receive smaller salvos, lower particle limits, and slower automatic launch frequency.
- Finale timing and density now honor `maxWaitBeforeLaunch`, `particleScale`, `finishDelay`, and `maxDuration`.
- Updated all examples, metadata, documentation, cache-busting references, and distribution filenames to 1.4.0.

### Fixed

- Fixed standalone effects launching before renderer dimensions were initialized.
- Fixed configured opacity being replaced when regular or manual effects started.
- Fixed user-paused shows resuming when tab visibility or intersection state changed.
- Fixed offscreen contained shows continuing to animate when automatic pausing was enabled.
- Fixed Lucky mode generating twice per click and returning palettes that were overridden by an active color theme.
- Fixed default-theme selection failing to restore the active style palette.

## [1.3.1] — July 15, 2026

### Added

- Added the staged Super Grand Finale: one central carrier bursts into ten directional comet trails, followed by ten large secondary explosions.
- Added configurable finale trail count, flight time, burst scale, finish timing, and maximum duration.
- Added the interactive Configuration Builder with grouped settings, descriptions, defaults, recommendations, generated initialization code, copy/reset actions, and contained previews.
- Added visible creator attribution to the documentation index and every example.
- Added author, creator, version, date, website, repository, Open Graph, and social-sharing metadata to every HTML page.
- Added GitHub Pages, source repository, and direct source ZIP links to the documentation and examples.
- Added `GrandFireworks.VERSION`, currently `1.3.1`.

### Changed

- Manual `launch()`, `launchText()`, and `launchFinale()` calls now work while the continuous show is idle, stopped, paused, or fading.
- Standalone manual effects wake only the renderer, play the requested effect, and fade away without restarting automatic launches.
- Updated documentation and examples to describe the Super Grand Finale and standalone manual triggering behavior.
- Updated all package banners, visible credits, metadata, example cache-busting URLs, and documentation references to version 1.3.1.
- Improved project navigation so every example links back to the documentation index.

### Fixed

- Fixed contained-mode canvas stacking so the transparent text layer no longer hides the main fireworks canvas.
- The text canvas now remains hidden when no crisp text block is active, preventing browser compositing interference.
- Fixed manual finale triggering after a stop by clearing conflicting queued launches and ensuring the finale carrier can be created.
- Fixed graceful-finish cleanup so rockets, queued rockets, particles, flashes, and text layers are cleared consistently before a timed finale.
- Corrected stale version text in the documentation footer.

## [1.3.0] — July 15, 2026

- Original 1.3.0 publication.

[1.5.0]: https://github.com/travisjmac/grand-fireworks-js/releases/tag/v1.5.0
[1.4.0]: https://github.com/travisjmac/grand-fireworks-js/releases/tag/v1.4.0
[1.3.1]: https://github.com/travisjmac/grand-fireworks-js/releases/tag/v1.3.1
[1.3.0]: https://github.com/travisjmac/grand-fireworks-js/releases/tag/v1.3.0
