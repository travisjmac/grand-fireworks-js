/**
 * TypeScript fixture for the grand-fireworks-js public API contract.
 *
 * This file is not shipped in the package and never runs; it exists so
 * `npm run typecheck` can verify the declarations in index.d.ts describe
 * behaviour that actually exists in the engine. Adding a usage here is a
 * contract test: if it fails to compile, either the declaration is wrong or
 * a method/option is missing.
 */
import GrandFireworks, {
  GrandFireworksOptions,
  Stats,
  TextSequenceResult,
  StyleName,
  ColorThemeName,
  ShellType,
  BoomStyle,
} from '../../index';

// Constructor accepts a partial options object. Every field is optional.
const empty = new GrandFireworks();
const full = new GrandFireworks({
  container: document.body,
  mode: 'contained',
  placement: 'overlay',
  clip: true,
  zIndex: 10,
  autoStart: false,
  baseStyle: 'cinematic',
  speedMultiplier: 0.8,
  mixedStyles: { classic: 20, cinematic: 80 },
  colorTheme: 'iceBlue',
  showFps: true,
  duration: 0,
  durationMode: 'graceful',
  maxFinishTime: 5000,
  background: { value: 'linear-gradient(#000, #111)', opacity: 0.5 },
  transition: { fadeIn: 500, fadeOut: 400, easing: 'ease-out', clearOnHide: true },
  renderer: { preferred: 'webgl2', fallback: 'canvas2d', preserveDrawingBuffer: 'auto' },
  visuals: { opacity: 1, trails: true, trailFade: 0.115, bloom: 1.25, zoom: 1, windStrength: 0.2 },
  sound: { enabled: false, volume: 0.5, boomStyle: 'artillery', boomVariation: 0.25, tuning: { boomGain: 0.7 } },
  performance: { preset: 'high', adaptive: true, fps: 60, dprCap: 1.5, particleScale: 1, secondary: 1 },
  show: {
    intensity: 0.75,
    maxParticles: 5000,
    maxRockets: 10,
    launchInterval: 550,
    minShellScale: 0.5,
    maxShellScale: 1.5,
    enabledTypes: ['grand_peony', 'starburst'],
    palettes: [['#FFD700', '#FFFFFF']],
    zAngleRange: 25,
    zAngleStrength: 0.8,
  },
  finale: { enabled: true, type: 'super-grand-finale', triggers: ['stop', 'duration'], trails: 10 },
  worldEnder: { carrierX: 0.5, firstSplitCount: 8, secondSplitCount: 8, maxChainDepth: 8 },
  textFirework: { enabled: true, textAlign: 'center', colors: ['#FFFFFF', '#FFD700'], maxCharacters: 72, tilt: 10 },
});

// Methods return the instance for chaining.
const chained: GrandFireworks = full
  .start({ duration: 5000 })
  .setOptions({ show: { intensity: 1 } })
  .setOpacity(0.25)
  .setZoom(0.5)
  .setStyle('bold')
  .setColorTheme('festival')
  .enableSound()
  .disableSound()
  .setMuted(true)
  .launch({ type: 'grand_peony', x: 0.5, colors: ['#FFD700'] });

// start() returns this and accepts runtime overrides.
full.start({ duration: 0 });

// pause/resume accept an internal flag or a string reason.
full.pause();
full.pause(true);
full.pause('hidden');
full.resume();
full.resume('offscreen');

// stop/finalize return promises resolving to the instance.
const stopPromise: Promise<GrandFireworks> = full.stop({ immediate: true, finale: true });
const finalePromise: Promise<GrandFireworks> = full.finalize();

// clear returns this.
const cleared: GrandFireworks = full.clear();

// launchText resolves with the rendered lines.
const textPromise: Promise<string[]> = full.launchText('WISH BIG', { textAlign: 'center', colors: ['#fff'], tilt: [-30, 30] });

// launchTextSequence accepts a single string or an array of items.
const seq1: Promise<TextSequenceResult> = full.launchTextSequence(['ONE', { text: 'TWO', overrides: { colors: ['#fff'] } }], {
  interval: 250,
  startDelay: 50,
  clearOnComplete: true,
});
const seq2: Promise<TextSequenceResult> = full.launchTextSequence('HELLO', { interval: 1 });

// cancelTextSequence returns a boolean.
const cancelled: boolean = full.cancelTextSequence({ clear: true });

// launchFinale / launchWorldEnder return the instance.
const finale: GrandFireworks = full.launchFinale({ stopAfter: true, forceSuper: true });
const worldEnder: GrandFireworks = full.launchWorldEnder({ firstSplitCount: 10, maxChainDepth: 6 });

// feelingLucky returns the generated configuration.
const lucky = full.feelingLucky();

// getOptions returns the resolved options.
const options: GrandFireworksOptions = full.getOptions();

// getStats returns a well-typed snapshot.
const stats: Stats = full.getStats();
const rendererName: 'webgl2' | 'canvas2d' = stats.renderer;
const remaining: number | null = stats.durationRemaining;

// Events are available because the class extends EventTarget.
full.addEventListener('start', () => {});
full.addEventListener('stop', () => {});

// Named typed strings are exported.
const style: StyleName = 'spectacle';
const theme: ColorThemeName = 'emberRed';
const shell: ShellType = 'galactic_spiral';
const boom: BoomStyle = 'mixed';

// Static namespace members are typed.
const version: string = GrandFireworks.VERSION;
const defaults: GrandFireworksOptions = GrandFireworks.DEFAULTS;
const types: ShellType[] = GrandFireworks.TYPES;
const presets = GrandFireworks.PRESETS;
const styles = GrandFireworks.STYLES;
const themes = GrandFireworks.COLOR_THEMES;

// destroy() returns void.
full.destroy();
empty.destroy();

// Default export and named export refer to the same class.
const fromDefault: typeof GrandFireworks = GrandFireworks;

// Keep the compiler honest: reference values so no type is unused.
export {
  chained,
  stopPromise,
  finalePromise,
  cleared,
  textPromise,
  seq1,
  seq2,
  cancelled,
  finale,
  worldEnder,
  lucky,
  options,
  stats,
  rendererName,
  remaining,
  version,
  defaults,
  types,
  presets,
  styles,
  themes,
  style,
  theme,
  shell,
  boom,
  fromDefault,
};
