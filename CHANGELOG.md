# Changelog

All notable changes to Grand Fireworks JS are documented here.

## [1.5.0] — July 23, 2026

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

## [1.4.0] — July 21, 2026

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

[1.4.0]: https://github.com/travisjmac/grand-fireworks-js/releases/tag/v1.4.0
[1.3.1]: https://github.com/travisjmac/grand-fireworks-js/releases/tag/v1.3.1
[1.3.0]: https://github.com/travisjmac/grand-fireworks-js/releases/tag/v1.3.0
