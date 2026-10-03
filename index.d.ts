// Type definitions for grand-fireworks-js
// Project: https://github.com/travisjmac/grand-fireworks-js
// Definitions by: Travis MacDonald
//
// These declarations describe the public API of the framework-free core
// engine. The runtime implementation lives in GrandFireworks.js; the build
// artifacts are dist/GrandFireworks.js (readable) and
// dist/GrandFireworks.min.js (minified).
//
// The engine is browser-first. In a bundler these types cover the CommonJS
// export. In a plain <script> context the class is exposed as
// window.GrandFireworks.
//
// Only behaviour that is actually implemented in the engine is declared
// here. If a feature is not listed, it is not part of the supported contract.

export type Mode = 'fullscreen' | 'contained';
export type Placement = 'overlay' | 'background';
export type DurationMode = 'graceful' | 'immediate';
export type RendererPreference = 'auto' | 'webgl2' | 'canvas2d';
export type RendererName = 'webgl2' | 'canvas2d';
export type BoomStyle = 'classic' | 'deep' | 'artillery' | 'double' | 'rolling' | 'mixed';
export type TextAlign = 'left' | 'center' | 'right';
export type TextRenderMode = 'hybrid' | 'crisp' | 'particles';
export type DissolveStyle = 'sparkle' | 'fade' | 'fall';
export type FinaleType = 'super-grand-finale' | 'world-ender';
export type PerformancePreset = 'low' | 'medium' | 'high' | 'ultra';
export type GameState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'finishing'
  | 'finale'
  | 'manual'
  | 'fading'
  | 'stopped'
  | 'destroyed';

export type StyleName =
  | 'classic'
  | 'oldSchool'
  | 'thin'
  | 'medium'
  | 'cinematic'
  | 'bold'
  | 'spectacle'
  | 'mixed';

export type ShellType =
  | 'grand_peony'
  | 'imperial_chrysanthemum'
  | 'weeping_willow'
  | 'royal_palm'
  | 'diamond_ring'
  | 'crossette_supreme'
  | 'golden_brocade'
  | 'dragon_fish'
  | 'majestic_comet'
  | 'cascading_horsetail'
  | 'starburst'
  | 'glitter_nova'
  | 'crown_jewel'
  | 'thunder_clap'
  | 'galactic_spiral';

/** A hex colour string such as "#FFD700" or "#F04". */
export type ColorString = string;

/** Options accepted by the GrandFireworks constructor. Every field is optional. */
export interface GrandFireworksOptions {
  /** A CSS selector or a DOM element used as the container. Defaults to document.body. */
  container?: string | Element | null;
  mode?: Mode;
  placement?: Placement;
  clip?: boolean;
  zIndex?: number;
  /** Start automatically once the constructor has set up the show. */
  autoStart?: boolean;
  baseStyle?: StyleName;
  /** Global simulation rate. 0.8 runs every firework motion and effect at 80%. */
  speedMultiplier?: number;
  mixedStyles?: Partial<Record<Exclude<StyleName, 'mixed'>, number>>;
  colorTheme?: ColorThemeName;
  showFps?: boolean;
  /** 0 runs indefinitely. */
  duration?: number;
  durationMode?: DurationMode;
  maxFinishTime?: number;
  /** The engine defaults this to false; pass an object to enable a backdrop. */
  background?: BackgroundOptions | false;
  transition?: TransitionOptions;
  renderer?: RendererOptions;
  visuals?: VisualOptions;
  sound?: SoundOptions;
  performance?: PerformanceOptions;
  show?: ShowOptions;
  finale?: FinaleOptions;
  worldEnder?: WorldEnderOptions;
  textFirework?: TextFireworkOptions;
}

export interface BackgroundOptions {
  /** A CSS background string, e.g. "linear-gradient(135deg, #1a0a2e, #040714)". */
  value?: string;
  opacity?: number;
  className?: string;
}

export interface TransitionOptions {
  fadeIn?: number;
  fadeOut?: number;
  easing?: string;
  clearOnHide?: boolean;
}

export interface RendererOptions {
  preferred?: RendererPreference;
  fallback?: 'canvas2d';
  preserveDrawingBuffer?: 'auto' | boolean;
}

export interface VisualOptions {
  opacity?: number;
  trails?: boolean;
  trailFade?: number;
  bloom?: number;
  rocketExhaust?: boolean;
  explosionFlashes?: boolean;
  flashColor?: ColorString | null;
  flashScale?: number;
  flashAlpha?: number;
  flashLife?: number;
  flashBangChance?: number;
  flashBangAlpha?: number;
  flashBangDuration?: number;
  flashBangCooldown?: number;
  burstVelocity?: number;
  shimmerChance?: number;
  sparkleChance?: number;
  pyroBurn?: boolean;
  sphereBurst?: boolean;
  windStrength?: number;
  starChance?: number;
  groupedSalvos?: boolean;
  secondaryCrackle?: boolean;
  /** Viewport zoom: 1 = normal, < 1 zoomed out, > 1 zoomed in (0.1–4). */
  zoom?: number;
}

export interface SoundTuningOptions {
  launchGain?: number;
  launchEnd?: number;
  whistleStart?: number;
  whistleEnd?: number;
  whistleDuration?: number;
  whistleGain?: number;
  whistleWave?: string;
  whistleWobbleRate?: number;
  whistleWobbleDepth?: number;
  boomDuration?: number;
  boomGain?: number;
  boomCutoff?: number;
  crackleGain?: number;
  cracklePitch?: number;
  crackleCount?: number;
}

export interface SoundOptions {
  enabled?: boolean;
  /** 0 through 1; 0 is a true mute. */
  volume?: number;
  ambience?: number;
  stereo?: boolean;
  whistleChance?: number;
  boomStyle?: BoomStyle;
  /** Randomizes the selected boom's duration, gain, and tone by ± this amount. */
  boomVariation?: number;
  /** Multiplier applied only to shells staged in front of the viewer. */
  nearBoomMultiplier?: number;
  finaleRhythm?: boolean;
  maxVoices?: number;
  tuning?: SoundTuningOptions;
}

export interface PerformanceOptions {
  preset?: PerformancePreset;
  adaptive?: boolean;
  pauseWhenHidden?: boolean;
  pauseWhenOffscreen?: boolean;
  respectReducedMotion?: boolean;
  fps?: number;
  dprCap?: number;
  particleScale?: number;
  secondary?: number;
}

/**
 * The shape of a built-in `GrandFireworks.PRESETS` entry. Preset entries also
 * carry the show-level caps they imply, which are read as the fallback for
 * `show.maxParticles`, `show.maxRockets`, and `show.launchInterval`.
 */
export interface PerformancePresetOptions extends PerformanceOptions {
  maxParticles?: number;
  maxRockets?: number;
  launchInterval?: number;
}

export interface ShowOptions {
  intensity?: number;
  openingSalvo?: number;
  maxRockets?: number;
  maxParticles?: number | null;
  launchInterval?: number | null;
  launchSpread?: number;
  /** Portion of regular shells deliberately staged near the viewer. */
  closeShellChance?: number;
  minShellScale?: number;
  maxShellScale?: number;
  /** Chance that a normal automatic launch becomes one layered finale bomb. */
  grandFinaleShellChance?: number;
  angleRange?: number;
  angleStrength?: number;
  textRocketAngle?: number;
  enabledTypes?: ShellType[] | 'all';
  /**
   * `'default'` cycles the built-in multi-colour palettes, `'single'` gives every
   * shell one solid colour instead of a ramp, an array of palettes is normalized
   * per shell, and a flat array of colour strings is a pool of solid shells.
   */
  palettes?: ColorString[][] | ColorString[] | 'default' | 'single';
  /** Total launch area in screen-width units. */
  launchHorizon?: number;
  zAngleRange?: number;
  zAngleStrength?: number;
}

export interface FinaleOptions {
  enabled?: boolean;
  type?: FinaleType;
  triggers?: Array<'stop' | 'duration'>;
  trails?: number;
  trailFlight?: number;
  trailSpread?: number;
  burstScale?: number;
  maxWaitBeforeLaunch?: number;
  particleScale?: number;
  finishDelay?: number;
  maxDuration?: number;
}

export interface WorldEnderOptions {
  carrierX?: number;
  carrierFlightMs?: number;
  carrierBurstHeight?: number;
  firstSplitCount?: number;
  firstSplitSpreadDegrees?: number;
  secondSplitDelayMs?: number;
  secondSplitCount?: number;
  secondSplitSpeed?: [number, number];
  promotionChance?: number;
  recursionDurationMs?: number;
  maxChainDepth?: number;
  maxParticles?: number;
  maxRockets?: number;
  soundBoost?: number;
  /** Manual World Enders layer into a live show by default. */
  stopAfter?: boolean;
}

export interface TextFireworkOptions {
  enabled?: boolean;
  renderMode?: TextRenderMode;
  maxCharacters?: number;
  maxCharactersPerLine?: number;
  maxLines?: number;
  overflow?: 'ellipsis' | 'clip';
  maxWidth?: number;
  verticalPosition?: number;
  /**
   * Where the text block is centred across the width, as a fraction. Defaults to 0.5.
   * Clamped so the block stays on screen — narrow `maxWidth` to move it further off centre.
   */
  horizontalPosition?: number;
  textAlign?: TextAlign;
  lineHeight?: number;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  particleSpacing?: number;
  particleSize?: number;
  colors?: ColorString[];
  revealDuration?: number;
  holdDuration?: number;
  dissolveDuration?: number;
  dissolveStyle?: DissolveStyle;
  fallDuration?: number;
  gravity?: number;
  textGlow?: number;
  shimmer?: boolean;
  synchronizeExplosions?: boolean;
  exclusive?: boolean;
}

export type ColorThemeName =
  | 'default'
  | 'iceBlue'
  | 'emberRed'
  | 'neonGreen'
  | 'goldenSun'
  | 'royalPurple'
  | 'festival'
  | (string & {});

/** Per-launch overrides accepted by launch() and low-level calls. */
export interface LaunchOptions {
  type?: ShellType | 'grand-finale-carrier' | 'text';
  x?: number;
  y?: number;
  burstHeight?: number;
  colors?: ColorString[];
  angle?: number;
  apparentScale?: number;
  finale?: boolean;
  syncAt?: number;
}

/**
 * Options for placeburst() — detonates a shell at a point, with no flight time.
 *
 * Positions are CSS pixels relative to the engine's container, which is what
 * pointer events already give you. Pass `element` instead to burst at that
 * element's centre, which is the common case for tying effects to buttons,
 * cards or clicks.
 */
export interface BurstOptions {
  /** CSS pixels from the container's left edge. */
  x?: number;
  /** CSS pixels from the container's top edge. */
  y?: number;
  /** Burst at this element's centre instead of at x/y. */
  element?: Element | string;
  /**
   * Target on-screen burst radius in CSS pixels. The sparks are fitted to it by
   * scaling velocity and gravity together, so the shell keeps its shape. The
   * fit targets the rim of the break, so a few of the fastest stars travel past
   * the radius. Omit for the shell's natural size.
   */
  radius?: number;
  /**
   * Milliseconds for the stars to reach `radius`. Omit it and the fit targets the
   * asymptotic reach, so the break keeps coasting outward for well over a second
   * — which lets a game that damages on impact kill things the visible explosion
   * has not reached. Set it to your blast's rise time so the rim arrives on
   * schedule. Star types that override their own drag (willow, palm, horsetail)
   * keep the asymptotic fit.
   */
  reachTime?: number;
  /**
   * Multiplies the spark fall after the radius fit. `0.1` makes the break drift down
   * at a tenth of the usual rate instead of dropping.
   */
  gravityScale?: number;
  /**
   * Multiplies how long the sparks live. Below 1 they fade over the fall rather than
   * outliving the explosion.
   */
  lifeScale?: number;
  /** Shell type. Structural types (text, finale carriers) fall back to grand_peony. */
  type?: ShellType | (string & {});
  /** Palette for the burst. */
  colors?: ColorString[];
  /** Spark multiplier; 1 is normal. */
  density?: number;
  /** false silences this burst only, leaving the engine's sound setting alone. */
  sound?: boolean;
}

/**
 * Options for launchTo() — an engine rocket from a host-supplied origin that
 * bursts on arrival, using the host's own travel time.
 */
export interface LaunchToOptions extends BurstOptions {
  /** Launch point, CSS pixels relative to the container. */
  x: number;
  /** Launch point, CSS pixels relative to the container. */
  y: number;
  /** Detonation point, CSS pixels relative to the container. */
  targetX: number;
  /** Detonation point, CSS pixels relative to the container. */
  targetY: number;
  /** Flight time in milliseconds. Defaults to 600. */
  duration?: number;
}

/**
 * Descriptor handed to a render pass once per frame. Exactly one of `gl`/`ctx`
 * is non-null, matching whichever renderer the engine fell back to. `width` and
 * `height` are CSS pixels and `dpr` is the device pixel ratio, so the context is
 * already scaled for you.
 */
export interface RenderPassFrame {
  gl: WebGL2RenderingContext | null;
  ctx: CanvasRenderingContext2D | null;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpr: number;
}

/**
 * A host render pass: draws your scene on the engine's canvas, behind its
 * fireworks. Must not clear the frame — the engine has already done that.
 */
export type RenderPass = (frame: RenderPassFrame) => void;

/** A single text-sequence item: a string or an object with overrides. */
export type TextSequenceItem =
  | string
  | {
      text: string;
      overrides?: Partial<TextFireworkOptions>;
      duration?: number;
    };

export interface TextSequenceOptions {
  /** Time between items, in ms. */
  interval?: number;
  /** Delay before the first item, in ms. */
  startDelay?: number;
  /** Global overrides applied to every item. */
  overrides?: Partial<TextFireworkOptions>;
  /** Clear the previous text between items. */
  clearBetween?: boolean;
  /** Clear text effects when the sequence ends. */
  clearOnComplete?: boolean;
  /** Clear any existing text effects before starting. */
  clearExisting?: boolean;
}

export interface TextSequenceResult {
  status: 'completed' | 'cancelled';
  completed: number;
  total: number;
}

export interface FinaleLaunchOptions {
  /** Stop automatic launches after the finale; manual finales stay live by default. */
  stopAfter?: boolean;
  /** Force the super-grand-finale even when finale.type is 'world-ender'. */
  forceSuper?: boolean;
  /** Overrides forwarded to launchWorldEnder() when finale.type is 'world-ender'. */
  worldEnder?: WorldEnderOptions;
}

export interface StopOptions {
  /** Skip the wind-down and fade immediately. */
  immediate?: boolean;
  /** Force or suppress the finale. */
  finale?: boolean;
}

export interface RunOptions {
  /** Runtime duration override, in ms. */
  duration?: number;
}

export interface Stats {
  renderer: RendererName;
  fallbackActive: boolean;
  contextLossCount: number;
  state: GameState;
  particles: number;
  rockets: number;
  fps: number;
  durationRemaining: number | null;
  quality: number;
}

export interface RendererChangeEventDetail {
  from: RendererName;
  to: RendererName;
  reason: string;
}

export interface FinaleStageEventDetail {
  stage: 'carrier' | 'trails' | 'secondary-burst' | string;
  type?: FinaleType;
  count?: number;
  x?: number;
  y?: number;
  source?: Record<string, unknown>;
}

export interface TextSequenceEventDetail extends TextSequenceResult {}

export interface TextLaunchEventDetail {
  text: string;
  lines: string[];
  particles: number;
}

/**
 * The Grand Fireworks engine. Instantiate with optional options, then start
 * the show. Works in a browser via a <script> tag (window.GrandFireworks)
 * and in CommonJS / bundlers via the package export.
 */
export class GrandFireworks extends EventTarget {
  constructor(options?: GrandFireworksOptions);

  /**
   * Starts the fireworks show. Fires an opening salvo, begins the render
   * loop, and fades in the backdrop.
   */
  start(run?: RunOptions): this;

  /**
   * Gracefully stops the show. Enters the "finishing" state — lets in-flight
   * rockets complete, optionally triggers the finale, then fades out.
   */
  stop(options?: StopOptions): Promise<this>;

  /**
   * Pauses the show. Pass internal=true (or a string reason) for automatic
   * pauses such as hidden tabs or offscreen visibility.
   */
  pause(internal?: boolean | string): this;

  /** Resumes a previously paused show. */
  resume(internal?: boolean | string): this;

  /** Clears all in-flight rockets, particles, flashes, and text effects. */
  clear(): this;

  /** Destroys the instance, releasing listeners, animation state, audio, and renderer resources. */
  destroy(): void;

  /** Triggers stop() with the finale forced on. */
  finalize(): Promise<this>;

  /** Manually fires a single rocket with optional overrides. */
  launch(options?: LaunchOptions): this;

  /**
   * Registers a host render pass — the engine lends its canvas and the host
   * draws the scene.
   *
   * The callback runs each frame after the canvas has been cleared (or
   * trail-faded) and before the fireworks are drawn, so host artwork sits behind
   * them. Attaching a pass makes the host responsible for frame pacing: the
   * engine stops starting its own animation loop and expects renderFrame(dt) to
   * be called each frame. Pass null to detach.
   */
  setRenderPass(callback: RenderPass | null): this;

  /**
   * Advances the simulation by dt milliseconds and draws one frame. For hosts
   * that own the animation loop alongside a render pass. dt is capped at 50ms
   * internally. Pass 0 to render the current frame without advancing anything.
   */
  renderFrame(dt?: number): this;

  /**
   * Detonates a shell immediately at a point, fitted to the requested on-screen
   * radius. No rocket and no flight time.
   */
  placeburst(options?: BurstOptions): this;

  /**
   * Flies a rocket from one point to another and bursts on arrival, using the
   * same origin and travel time the host is simulating.
   */
  launchTo(options: LaunchToOptions): this;

  /**
   * Rasterizes text to a hidden canvas and fires rockets that assemble into
   * the text shape mid-air. Resolves with the rendered lines.
   */
  launchText(text: string, overrides?: Partial<TextFireworkOptions>): Promise<string[]>;

  /** Plays a sequence of text fireworks. Resolves when the sequence completes or is cancelled. */
  launchTextSequence(
    messages: string | TextSequenceItem[] | TextSequenceItem,
    options?: TextSequenceOptions,
  ): Promise<TextSequenceResult>;

  /** Cancels the current text sequence. Returns true if a sequence was cancelled. */
  cancelTextSequence(options?: { clear?: boolean }): boolean;

  /** Launches the Super Grand Finale, or the World Ender when finale.type is 'world-ender'. */
  launchFinale(options?: FinaleLaunchOptions): this;

  /** Launches a staged, branching World Ender effect. */
  launchWorldEnder(overrides?: Partial<WorldEnderOptions>): this;

  /** Merges partial options into the current configuration and re-resolves. */
  setOptions(partial: GrandFireworksOptions): this;

  /** Sets the overall opacity of the fireworks layer (0 to 1). */
  setOpacity(level: number): this;

  /** Sets the viewport zoom level, scaling from the screen center (0.1 to 4). */
  setZoom(level: number): this;

  /** Switches to a named visual style preset. */
  setStyle(name: StyleName): this;

  /** Switches to a named colour theme and recolors in-flight particles and rockets. */
  setColorTheme(name: ColorThemeName): this;

  /** Enables procedural audio synthesis and fires up the AudioContext. */
  enableSound(): this;

  /** Suspends audio and tears down the ambience source. */
  disableSound(): this;

  /** Sets master volume to 0 (muted) or restores the previous level. */
  setMuted(muted?: boolean): this;

  /** Randomizes the visual configuration and applies it live. Returns the generated configuration. */
  feelingLucky(): GrandFireworksOptions & { transition?: TransitionOptions };

  /** Deep-cloned snapshot of the current resolved options. */
  getOptions(): GrandFireworksOptions;

  /** A snapshot of the current runtime statistics. */
  getStats(): Stats;
}

export namespace GrandFireworks {
  const VERSION: string;
  const DEFAULTS: GrandFireworksOptions;
  const PRESETS: Record<PerformancePreset, PerformancePresetOptions>;
  const TYPES: ShellType[];
  const STYLES: Record<Exclude<StyleName, 'mixed'>, { visuals?: VisualOptions; show?: ShowOptions; performance?: PerformanceOptions }>;
  const COLOR_THEMES: Record<string, { palettes?: ColorString[][] | 'default' | 'single' }>;
}

export default GrandFireworks;
