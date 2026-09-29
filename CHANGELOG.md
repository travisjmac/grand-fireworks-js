# Changelog

All notable changes to Grand Fireworks JS are documented here.

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
