# GrandFireworks

Created by **Travis MacDonald** on July 15, 2026.  
Version **1.3.0** · [Creator website](http://travisandjoelyweareaperfect.fit/) · [GitHub repository](https://github.com/travisjmac/grand-fireworks-js)

Photorealistic WebGL-first fireworks with persistent long-exposure trails, HDR-style bloom, star cores, rocket exhaust, explosion flashes, secondary crackles, specialized shell geometry, grouped salvos, and a Canvas 2D fallback. The class also includes graceful stopping, an optional finale, fullscreen or contained placement, timed shows, performance presets, and synchronized multi-line hybrid text fireworks.

Open `index.html` for complete documentation and links to working examples.

```html
<script src="GrandFireworks.js"></script>
<script>
  const fireworks = new GrandFireworks();
  fireworks.start();
</script>
```

`duration: 0` runs indefinitely. `stop()` is graceful by default: it stops new launches, finishes active fireworks, optionally plays the configured finale, then fades out.

The library exposes `start`, `stop`, `pause`, `resume`, `clear`, `destroy`, `launch`, `launchText`, `launchFinale`, `finalize`, `setOptions`, `getOptions`, and `getStats`.

`launch()`, `launchText()`, and `launchFinale()` are standalone-safe: they wake the renderer when the regular show is idle, stopped, paused, or fading, play only the requested effect, then fade away automatically. They do not restart automatic launches.

The Super Grand Finale launches one central carrier, bursts it into ten independently glowing comet trails, sends those trails in different radial directions, and then detonates each into a large ringed, crackling secondary shell. Configure it with `finale.trails`, `finale.trailFlight`, and `finale.burstScale`.

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
