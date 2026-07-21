# GrandFireworks

Created by **Travis MacDonald** on July 15, 2026.  
Version **1.3.1** · [Creator website](http://travisandjoelyweareaperfect.fit/) · [GitHub repository](https://github.com/travisjmac/grand-fireworks-js)

## Version 1.3.1

This maintenance release collects all improvements made after the original 1.3.0 publication: the staged ten-trail Super Grand Finale, standalone manual effects while the continuous show is stopped, corrected contained-mode layering, complete creator and social metadata, GitHub Pages/source/download navigation, and the interactive Configuration Builder. See [CHANGELOG.md](CHANGELOG.md) for the complete release notes.

Photorealistic WebGL-first fireworks with persistent long-exposure trails, HDR-style bloom, star cores, rocket exhaust, explosion flashes, secondary crackles, specialized shell geometry, grouped salvos, and a Canvas 2D fallback. The class also includes graceful stopping, an optional finale, fullscreen or contained placement, timed shows, performance presets, and synchronized multi-line hybrid text fireworks.

Open `index.html` for complete documentation and links to working examples.

## Live documentation and examples

After GitHub Pages is enabled for the repository, the complete interactive documentation will be available at:

**[Open the Grand Fireworks JS live documentation](https://travisjmac.github.io/grand-fireworks-js/)**

**[View the source repository](https://github.com/travisjmac/grand-fireworks-js)** · **[Download the latest source ZIP](https://github.com/travisjmac/grand-fireworks-js/archive/refs/heads/main.zip)**

- [Default show](https://travisjmac.github.io/grand-fireworks-js/examples/default.html)
- [Background overlay](https://travisjmac.github.io/grand-fireworks-js/examples/background.html)
- [Contained celebration](https://travisjmac.github.io/grand-fireworks-js/examples/contained.html)
- [Manual controls](https://travisjmac.github.io/grand-fireworks-js/examples/manual.html)
- [Super Grand Finale](https://travisjmac.github.io/grand-fireworks-js/examples/timed-finale.html)
- [Love text firework](https://travisjmac.github.io/grand-fireworks-js/examples/text-love.html)
- [Multiline text firework](https://travisjmac.github.io/grand-fireworks-js/examples/text-multiline.html)
- [Sequential text messages](https://travisjmac.github.io/grand-fireworks-js/examples/text-sequence.html)
- [Custom text firework](https://travisjmac.github.io/grand-fireworks-js/examples/text-custom.html)
- [Guided Configuration Builder](https://travisjmac.github.io/grand-fireworks-js/examples/guided-builder.html)
- [Advanced Configuration Builder](https://travisjmac.github.io/grand-fireworks-js/examples/configuration-builder.html)

The same files can be browsed directly inside the repository through the relative links in [`index.html`](index.html), but GitHub Pages is required to run the interactive JavaScript examples as a website.

```html
<script src="GrandFireworks.js"></script>
<script>
  const fireworks = new GrandFireworks();
  fireworks.start();
</script>
```

`duration: 0` runs indefinitely. `stop()` is graceful by default: it stops new launches, finishes active fireworks, optionally plays the configured finale, then fades out.

The library exposes `start`, `stop`, `pause`, `resume`, `clear`, `destroy`, `launch`, `launchText`, `launchTextSequence`, `cancelTextSequence`, `launchFinale`, `finalize`, `setOptions`, `setOpacity`, `setStyle`, `setColorTheme`, `feelingLucky`, `getOptions`, and `getStats`.

`launch()`, `launchText()`, and `launchFinale()` are standalone-safe: they wake the renderer when the regular show is idle, stopped, paused, or fading, play only the requested effect, then fade away automatically. They do not restart automatic launches.

The Super Grand Finale launches one central carrier, bursts it into independently glowing comet trails, sends those trails in different radial directions, and then detonates each into a large ringed, crackling secondary shell. Configure it with `finale.trails`, `finale.trailFlight`, `finale.burstScale`, `finale.maxWaitBeforeLaunch`, `finale.particleScale`, `finale.finishDelay`, and `finale.maxDuration`.

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

Sound uses one lazily created `AudioContext` per fireworks instance. Enable it from a user interaction when possible, and set `sound.volume` from `0` to `1`; zero is a true mute.

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
    secondaryCrackle: true
  },
  show: {
    launchSpread: 0.55,
    angleRange: 14,
    angleStrength: 1,
    textRocketAngle: 0
  }
});
```

Run the dependency-free regression suite with `npm test`.
