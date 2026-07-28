# GrandFireworks

Created by **Travis MacDonald** on July 15, 2026.  
Version **1.6.1** · [Creator website](http://travisandjoelyweareaperfect.fit/) · [GitHub repository](https://github.com/travisjmac/grand-fireworks-js)

## Version 1.6.1

This feature release adds the Guided Configuration Builder, curated themes and styles, reusable synthesized sound, cancellable sequential text messages, accessibility-aware motion and pause behavior, complete finale timing controls, automated regression tests, and reproducible distribution builds. See [CHANGELOG.md](CHANGELOG.md) for the complete release notes.

Photorealistic WebGL-first fireworks with persistent long-exposure trails, HDR-style bloom, star cores, rocket exhaust, explosion flashes, secondary crackles, specialized shell geometry, grouped salvos, and a Canvas 2D fallback. The class also includes graceful stopping, an optional finale, fullscreen or contained placement, timed shows, performance presets, and synchronized multi-line hybrid text fireworks.

Open `index.html` for complete documentation and links to working examples.

## Live documentation and examples

After GitHub Pages is enabled for the repository, the complete interactive documentation will be available at:

**[Open the Grand Fireworks JS live documentation](https://travisjmac.github.io/grand-fireworks-js/)**

**[View the source repository](https://github.com/travisjmac/grand-fireworks-js)** · **[Download the latest source ZIP](https://github.com/travisjmac/grand-fireworks-js/archive/refs/heads/main.zip)**

- [Moonlit Horizon](https://travisjmac.github.io/grand-fireworks-js/examples/moonlit-horizon.html) — the cinematic parallax showcase.
- [Feature Demos](https://travisjmac.github.io/grand-fireworks-js/examples/feature-demos.html) — one draggable control panel for depth, shells, themes, text, finale, and sound.
- [Config Maker & Loader](https://travisjmac.github.io/grand-fireworks-js/examples/guided-builder.html) — build, preview, save, load, and copy reusable configurations.

The same files can be browsed directly inside the repository through the relative links in [`index.html`](index.html), but GitHub Pages is required to run the interactive JavaScript examples as a website.

```html
<script src="GrandFireworks.js"></script>
<script>
  const fireworks = new GrandFireworks();
  fireworks.start();
</script>
```

`duration: 0` runs indefinitely. `stop()` is graceful by default: it stops new launches, finishes active fireworks, optionally plays the configured finale, then fades out.

The library exposes `start`, `stop`, `pause`, `resume`, `clear`, `destroy`, `launch`, `launchText`, `launchTextSequence`, `cancelTextSequence`, `launchFinale`, `launchWorldEnder`, `finalize`, `setOptions`, `setOpacity`, `setZoom`, `setStyle`, `setColorTheme`, `feelingLucky`, `getOptions`, and `getStats`.

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
    zAngleRange: 25, // 0–45° depth drift
    zAngleStrength: 0.8 // 0–3 depth drift multiplier
  }
});
```

### Depth-staged horizon

`visuals.zoom` controls the visible field of view: values below `1` pull back to reveal more of the horizon, while values above `1` move closer. `show.launchHorizon` sets the total launch area in screen widths.

Shells are staged as near, middle, or far. Distance affects apparent size, flight speed, burst height, stereo position, loudness, and a slight delay on distant launch and boom sounds. Tune depth drift with `zAngleRange` and `zAngleStrength`, or call `fireworks.setZoom(0.5)` to update the view live. See the [Feature Demos](https://travisjmac.github.io/grand-fireworks-js/examples/feature-demos.html) for a live reference.

Run the dependency-free regression suite with `npm test`.
