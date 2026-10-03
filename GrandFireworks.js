/**
 * Grand Fireworks JS
 * Photorealistic, configurable WebGL-first fireworks with a Canvas 2D fallback.
 *
 * Creator: Travis MacDonald
 * Website: http://travisandjoelyweareaperfect.fit/
 * Repository: https://github.com/travisjmac/grand-fireworks-js
 * Created: July 15, 2026
 * Version: 1.8.0
 *
 * @author Travis MacDonald
 * @version 1.8.0
 * @since 2026-07-15
 * @see http://travisandjoelyweareaperfect.fit/
 * @see https://github.com/travisjmac/grand-fireworks-js
 */
(function (global) {
  "use strict";

  /* ========================================================================
   *  CONSTANTS & DEFAULTS
   *  All configuration lives here — shell types, color palettes,
   *  performance presets, visual styles, color themes, and the master
   *  defaults object that drives the entire engine.
   * ======================================================================== */

  // 2π — used throughout for angular math (burst rings, spirals, twinkling)
  const TAU = Math.PI * 2;

  // The 15 named pyrotechnic shell types. Each has its own burst algorithm
  // in _explode(). The list doubles as the "all" option for enabledTypes.
  const TYPES = [
    "grand_peony",
    "imperial_chrysanthemum",
    "weeping_willow",
    "royal_palm",
    "diamond_ring",
    "crossette_supreme",
    "golden_brocade",
    "dragon_fish",
    "majestic_comet",
    "cascading_horsetail",
    "starburst",
    "glitter_nova",
    "crown_jewel",
    "thunder_clap",
    "galactic_spiral",
  ];
  const PALETTES = [
    ["#FFD700", "#FFA500", "#FFE082", "#FFFFFF"],
    ["#FF1744", "#FF5252", "#FF8A80", "#FFFFFF"],
    ["#2962FF", "#4D96FF", "#89CFF0", "#FFFFFF"],
    ["#00E676", "#69F0AE", "#B9F6CA", "#FFFFFF"],
    ["#AA00FF", "#D17FE0", "#EA80FC", "#FFFFFF"],
    ["#FF1493", "#FF69B4", "#FFC0CB", "#FFFFFF"],
    ["#00CED1", "#40E0D0", "#7FFFD4", "#FFFFFF"],
    ["#FFFFFF", "#E6E6FA", "#F5F5F5", "#FFD700"],
  ];
  // Distinct, fully saturated hues behind the "single" palette mode, where each
  // shell breaks in one solid colour instead of a multi-colour ramp. Ordered so
  // that walking the list reads as a spectrum rather than two similar blues.
  const SOLID_COLORS = [
    "#FF3B30",
    "#FF9500",
    "#FFD60A",
    "#34C759",
    "#00E5C0",
    "#0A84FF",
    "#5E5CE6",
    "#FF2D92",
  ];
  const PRESETS = {
    low: {
      fps: 30,
      dprCap: 1,
      maxParticles: 1500,
      maxRockets: 4,
      launchInterval: 1000,
      particleScale: 0.72,
      secondary: 0.45,
    },
    medium: {
      fps: 60,
      dprCap: 1.25,
      maxParticles: 3000,
      maxRockets: 6,
      launchInterval: 750,
      particleScale: 0.88,
      secondary: 0.7,
    },
    high: {
      fps: 60,
      dprCap: 1.5,
      maxParticles: 5000,
      maxRockets: 10,
      launchInterval: 550,
      particleScale: 1,
      secondary: 1,
    },
    ultra: {
      fps: 60,
      dprCap: 2,
      maxParticles: 8000,
      maxRockets: 14,
      launchInterval: 350,
      particleScale: 1.2,
      secondary: 1.25,
    },
  };
  const STYLES = {
    classic: {
      visuals: {
        opacity: 1,
        trails: false,
        trailFade: 1,
        bloom: 0.65,
        rocketExhaust: false,
        explosionFlashes: false,
        starChance: 0,
        groupedSalvos: false,
        secondaryCrackle: false,
      },
      show: {
        intensity: 1,
        openingSalvo: 4,
        launchInterval: 1200,
        launchSpread: 0.45,
        angleRange: 8,
        angleStrength: 0.4,
        enabledTypes: ["grand_peony", "starburst"],
        palettes: [
          ["#FF0000", "#FF4444", "#FFFFFF"],
          ["#00CC00", "#44FF44", "#FFFFFF"],
          ["#0066FF", "#4499FF", "#FFFFFF"],
          ["#FFD700", "#FFEE88", "#FFFFFF"],
          ["#FF6600", "#FF9944", "#FFFFFF"],
        ],
      },
    },
    oldSchool: {
      visuals: {
        opacity: 0.5,
        trails: true,
        trailFade: 0.35,
        bloom: 0.55,
        rocketExhaust: false,
        explosionFlashes: false,
        starChance: 0,
        groupedSalvos: false,
        secondaryCrackle: false,
      },
      show: {
        intensity: 1,
        openingSalvo: 3,
        launchInterval: 650,
        launchSpread: 0.5,
        angleRange: 20,
        angleStrength: 1,
        enabledTypes: ["grand_peony", "starburst", "imperial_chrysanthemum"],
        palettes: [
          ["#FF0040", "#FF8080", "#FFFFFF"],
          ["#00FF80", "#80FFC0", "#FFFFFF"],
          ["#4080FF", "#80B0FF", "#FFFFFF"],
          ["#FFD700", "#FFE880", "#FFFFFF"],
          ["#FF00FF", "#FF80FF", "#FFFFFF"],
          ["#00FFFF", "#80FFFF", "#FFFFFF"],
        ],
      },
    },
    thin: {
      visuals: {
        opacity: 1,
        trails: true,
        trailFade: 0.18,
        bloom: 0.7,
        rocketExhaust: true,
        explosionFlashes: true,
        starChance: 0.02,
        groupedSalvos: false,
        secondaryCrackle: false,
      },
      show: {
        intensity: 1,
        openingSalvo: 4,
        launchInterval: 1000,
        launchSpread: 0.5,
        angleRange: 10,
        angleStrength: 0.5,
        enabledTypes: [
          "grand_peony",
          "starburst",
          "imperial_chrysanthemum",
          "diamond_ring",
        ],
        palettes: "default",
      },
    },
    medium: {
      visuals: {
        opacity: 1,
        trails: true,
        trailFade: 0.115,
        bloom: 1.25,
        rocketExhaust: true,
        explosionFlashes: true,
        starChance: 0.08,
        groupedSalvos: true,
        secondaryCrackle: true,
      },
      show: {
        intensity: 1,
        openingSalvo: 6,
        launchInterval: null,
        launchSpread: 0.55,
        angleRange: 14,
        angleStrength: 1,
        enabledTypes: "all",
        palettes: "default",
      },
    },
    // A restrained, realistic show: fewer launches, natural shell forms,
    // warmer pyrotechnic colours, crisp shimmer, and no persistent trails.
    cinematic: {
      performance: {
        // Pack each cinematic shell with twice the normal number of stars.
        secondary: 2,
      },
      visuals: {
        opacity: 1,
        trails: false,
        trailFade: 1,
        bloom: 1.45,
        rocketExhaust: true,
        explosionFlashes: true,
        // A brief white-hot ignition before the coloured stars take over.
        flashColor: "#FFF9E8",
        flashScale: 1.9,
        flashAlpha: 0.78,
        flashLife: 180,
        // Rare camera-overload bursts briefly light the whole scene.
        flashBangChance: 0.1,
        flashBangAlpha: 0.72,
        flashBangDuration: 260,
        flashBangCooldown: 2800,
        burstVelocity: 1.25,
        shimmerChance: 0.82,
        sparkleChance: 0.58,
        pyroBurn: true,
        sphereBurst: true,
        windStrength: 0.06,
        starChance: 0.085,
        groupedSalvos: false,
        secondaryCrackle: true,
      },
      show: {
        // Leave enough room for the denser shells to coexist on screen.
        maxParticles: 10000,
        intensity: 0.72,
        openingSalvo: 2,
        launchInterval: 1650,
        launchSpread: 0.38,
        angleRange: 7,
        angleStrength: 0.55,
        enabledTypes: [
          "grand_peony",
          "imperial_chrysanthemum",
          "weeping_willow",
          "royal_palm",
          "diamond_ring",
          "crossette_supreme",
        ],
        palettes: [
          ["#FF6A35", "#FFB347", "#FFF2C2", "#FFFFFF"],
          ["#D72638", "#FF665A", "#FFE0C2", "#FFFFFF"],
          ["#3F8CFF", "#78B8FF", "#D7ECFF", "#FFFFFF"],
          ["#47A447", "#8DD17E", "#E8F6D0", "#FFFFFF"],
          ["#D69B25", "#F3CF74", "#FFF3C8", "#FFFFFF"],
        ],
      },
    },
    bold: {
      visuals: {
        opacity: 1,
        trails: true,
        trailFade: 0.06,
        bloom: 1.9,
        rocketExhaust: true,
        explosionFlashes: true,
        starChance: 0.15,
        groupedSalvos: true,
        secondaryCrackle: true,
      },
      show: {
        intensity: 1.6,
        openingSalvo: 9,
        launchInterval: 350,
        launchSpread: 0.75,
        angleRange: 22,
        angleStrength: 1.6,
        enabledTypes: "all",
        palettes: [
          ["#FF0055", "#FFCC00"],
          ["#00F2FE", "#4FACFE"],
          ["#FFD700", "#FFA500", "#FFFFFF"],
          ["#FF1744", "#FF5252", "#FF8A80", "#FFFFFF"],
          ["#AA00FF", "#D17FE0", "#EA80FC", "#FFFFFF"],
        ],
      },
    },
    spectacle: {
      visuals: {
        opacity: 1,
        trails: true,
        trailFade: 0.18,
        bloom: 2.2,
        rocketExhaust: true,
        explosionFlashes: true,
        starChance: 0.18,
        groupedSalvos: true,
        secondaryCrackle: true,
      },
      show: {
        intensity: 2,
        openingSalvo: 12,
        launchInterval: 250,
        launchSpread: 0.8,
        angleRange: 26,
        angleStrength: 1.8,
        enabledTypes: "all",
        palettes: [
          ["#FF0055", "#FFCC00"],
          ["#00F2FE", "#4FACFE"],
          ["#FFD700", "#FFA500", "#FFFFFF"],
          ["#FF1744", "#FF5252", "#FF8A80", "#FFFFFF"],
          ["#AA00FF", "#D17FE0", "#EA80FC", "#FFFFFF"],
          ["#00E676", "#69F0AE", "#B9F6CA", "#FFFFFF"],
        ],
      },
    },
  };
  const COLOR_THEMES = {
    default: { label: "Default", palettes: "default" },
    iceBlue: {
      label: "Ice Blue",
      palettes: [
        ["#00BFFF", "#E0FFFF"],
        ["#1E90FF", "#87CEEB", "#FFFFFF"],
        ["#00CED1"],
        ["#4169E1", "#00BFFF", "#E0FFFF", "#FFFFFF"],
        ["#87CEFA", "#B0E0E6", "#F0F8FF"],
      ],
    },
    emberRed: {
      label: "Ember Red",
      palettes: [
        ["#FF4500", "#FFD700"],
        ["#DC143C", "#FF6347", "#FFFFFF"],
        ["#FF0000"],
        ["#8B0000", "#FF4500", "#FFD700", "#FFFFFF"],
        ["#FF6347", "#FF7F50", "#FFE4E1"],
      ],
    },
    neonGreen: {
      label: "Neon Green",
      palettes: [
        ["#00FF7F", "#7FFF00"],
        ["#32CD32", "#ADFF2F", "#FFFFFF"],
        ["#00FF00"],
        ["#006400", "#00FF7F", "#7FFF00", "#FFFFFF"],
        ["#7CFC00", "#98FB98", "#F0FFF0"],
      ],
    },
    goldenSun: {
      label: "Golden Sun",
      palettes: [
        ["#FFD700", "#FFA500"],
        ["#FFD700", "#FFFACD", "#FFFFFF"],
        ["#FFC125"],
        ["#B8860B", "#FFD700", "#FFE4B5", "#FFFFFF"],
        ["#F0E68C", "#FFF8DC", "#FAFAD2"],
      ],
    },
    royalPurple: {
      label: "Royal Purple",
      palettes: [
        ["#8A2BE2", "#DDA0DD"],
        ["#9400D3", "#BA55D3", "#FFFFFF"],
        ["#9932CC"],
        ["#4B0082", "#8A2BE2", "#DA70D6", "#FFFFFF"],
        ["#9370DB", "#D8BFD8", "#E6E6FA"],
      ],
    },
    festival: {
      label: "Festival Mix",
      palettes: [
        ["#FF0055", "#FFCC00"],
        ["#00F2FE", "#4FACFE"],
        ["#FFD700", "#FFA500", "#FFFFFF"],
        ["#FF1493", "#FF69B4", "#FFC0CB", "#FFFFFF"],
        ["#AA00FF", "#D17FE0", "#EA80FC", "#FFFFFF"],
      ],
    },
  };
  const DEFAULTS = {
    container: null,
    mode: "fullscreen",
    placement: "overlay",
    clip: true,
    zIndex: 9999,
    autoStart: false,
    baseStyle: "cinematic",
    // Global simulation rate. 0.8 runs every firework motion and effect at 80%.
    speedMultiplier: 1,
    mixedStyles: {
      classic: 15,
      oldSchool: 10,
      thin: 15,
      medium: 20,
      cinematic: 20,
      bold: 10,
      spectacle: 10,
    },
    colorTheme: "default",
    showFps: false,
    duration: 0,
    durationMode: "graceful",
    maxFinishTime: 5000,
    background: false,
    transition: {
      fadeIn: 500,
      fadeOut: 400,
      easing: "ease-out",
      clearOnHide: true,
    },
    renderer: {
      preferred: "auto",
      fallback: "canvas2d",
      preserveDrawingBuffer: "auto",
    },
    visuals: {
      opacity: 1,
      trails: true,
      trailFade: 0.115,
      bloom: 1.25,
      rocketExhaust: true,
      explosionFlashes: true,
      flashColor: null,
      flashScale: 1,
      flashAlpha: 0.34,
      flashLife: 420,
      flashBangChance: 0,
      flashBangAlpha: 0.55,
      flashBangDuration: 240,
      flashBangCooldown: 3000,
      burstVelocity: 1,
      shimmerChance: 0,
      sparkleChance: 0,
      pyroBurn: false,
      sphereBurst: false,
      windStrength: 0,
      starChance: 0.08,
      groupedSalvos: true,
      secondaryCrackle: true,
      // Viewport zoom: 1 = normal, < 1 = zoomed out (smaller, wider view),
      // > 1 = zoomed in (larger, closer view). Scales from screen center.
      zoom: 1,

    },
    sound: {
      enabled: false,
      volume: 1,
      ambience: 0.005,
      stereo: true,
      whistleChance: 0.03,
      // Boom character: mixed chooses a suitable variation per shell.
      boomStyle: "mixed",
      // Randomizes the selected boom's duration, gain, and tone by ± this amount.
      boomVariation: 0.25,
      // Multiplier applied only to shells staged in front of the viewer.
      // The master compressor keeps dramatic close booms from clipping.
      nearBoomMultiplier: 1,
      finaleRhythm: true,
      maxVoices: 36,
      tuning: {
        launchGain: 0.015,
        launchEnd: 1180,
        whistleStart: 4100,
        whistleEnd: 3500,
        whistleDuration: 0.75,
        whistleGain: 0.045,
        whistleWave: "sine",
        whistleWobbleRate: 7,
        whistleWobbleDepth: 0.1,
        boomDuration: 1.4,
        boomGain: 0.7,
        boomCutoff: 170,
        crackleGain: 0.045,
        cracklePitch: 1400,
        crackleCount: 12,
      },
    },
    performance: {
      preset: "high",
      adaptive: true,
      pauseWhenHidden: true,
      pauseWhenOffscreen: true,
      respectReducedMotion: true,
    },
    show: {
      intensity: 0.75,
      openingSalvo: 6,
      maxRockets: 6,
      maxParticles: null,
      launchInterval: null,
      launchSpread: 0.55,
      // Portion of regular shells deliberately staged near the viewer.
      closeShellChance: 0.25,
      // Per-shell apparent scale, independent of the global camera zoom.
      minShellScale: 1,
      maxShellScale: 1,
      // Chance that a normal automatic launch becomes one layered finale bomb.
      grandFinaleShellChance: 0,
      angleRange: 14,
      angleStrength: 1,
      textRocketAngle: 0,
      enabledTypes: "all",
      palettes: "default",
      // Total launch area in screen-width units. At zoom 1.0 the visible
      // area is 1 screen-width; launchHorizon determines how many
      // screen-widths of launchers exist. Zoom out to see more of them.
      launchHorizon: 1,
      // Per-shell depth drift. These make the staged horizon feel less flat
      // without changing the public 2D coordinate system.
      zAngleRange: 25,
      zAngleStrength: 0.8,
    },
    finale: {
      enabled: false,
      type: "super-grand-finale",
      triggers: ["stop", "duration"],
      trails: 10,
      trailFlight: 1100,
      trailSpread: 360,
      burstScale: 1,
      maxWaitBeforeLaunch: 3000,
      particleScale: 1,
      finishDelay: 800,
      maxDuration: 9000,
    },
    // A staged, branching finale built from the same carrier and satellite
    // primitives as launchFinale(). These are intentionally exposed so a
    // host can tune the spectacle without reimplementing the effect.
    worldEnder: {
      carrierX: 0.5,
      carrierFlightMs: 2350,
      carrierBurstHeight: 0.384,
      firstSplitCount: 8,
      firstSplitSpreadDegrees: 300,
      secondSplitDelayMs: 3000,
      secondSplitCount: 8,
      secondSplitSpeed: [130, 220],
      promotionChance: 0.02,
      recursionDurationMs: 20000,
      maxChainDepth: 8,
      maxParticles: Infinity,
      maxRockets: Infinity,
      soundBoost: 2.1,
      // Manual World Enders should layer into a live show by default. Set
      // true for an intentional, exclusive end-of-show sequence.
      stopAfter: false,
    },
    textFirework: {
      enabled: true,
      renderMode: "hybrid",
      maxCharacters: 72,
      maxCharactersPerLine: 24,
      maxLines: 3,
      overflow: "ellipsis",
      maxWidth: 0.82,
      verticalPosition: 0.42,
      // Where the block is centred, as a fraction of the width. Clamped so the block stays
      // on screen; narrow maxWidth to move it further off centre.
      horizontalPosition: 0.5,
      textAlign: "center",
      lineHeight: 1.15,
      fontFamily: "system-ui, sans-serif",
      fontWeight: 800,
      fontSize: 92,
      particleSpacing: 4,
      particleSize: 2.5,
      colors: ["#FFFFFF", "#FFD700", "#FF69B4"],
      revealDuration: 250,
      holdDuration: 1400,
      dissolveDuration: 900,
      dissolveStyle: "sparkle",
      fallDuration: 3200,
      gravity: 0.025,
      textGlow: 1,
      shimmer: true,
      synchronizeExplosions: true,
      exclusive: true,
    },
  };

  /* ========================================================================
   *  UTILITY FUNCTIONS
   *  Small, pure helpers used throughout the engine. Kept at module scope
   *  so they're cheap to call from hot paths.
   * ======================================================================== */

  // Clamps n between a (min) and b (max). Used everywhere for bounds safety.
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // Deep-merges two option objects. Nested plain objects are merged
  // recursively; arrays and primitives are replaced outright.
  // This is how user config, style presets, and DEFAULTS compose together.
  const merge = (a, b) => {
    const out = { ...a };
    Object.keys(b || {}).forEach((k) => {
      out[k] =
        a[k] &&
        typeof a[k] === "object" &&
        !Array.isArray(a[k]) &&
        typeof b[k] === "object" &&
        !Array.isArray(b[k])
          ? merge(a[k], b[k])
          : b[k];
    });
    return out;
  };
  // Converts a hex color string (e.g. "#FF0040" or "#F04") into a normalized
  // [r, g, b] array with values 0–1. Handles both 3-char and 6-char hex.
  // Used to feed color data into WebGL attributes and Canvas draw calls.
  const hex = (value) => {
    const h = value.replace("#", "");
    const n = parseInt(
      h.length === 3
        ? h
            .split("")
            .map((x) => x + x)
            .join("")
        : h,
      16,
    );
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  // Creates a smooth gradient of N hex colors between two endpoints.
  // Used by normalizePalette() to fill out sparse user color arrays.
  function createColorRamp(hex1, hex2, steps = 4) {
    const parse = (h) => {
      const clean = h.replace("#", "");
      const n = parseInt(
        clean.length === 3
          ? clean
              .split("")
              .map((x) => x + x)
              .join("")
          : clean,
        16,
      );
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    const [r1, g1, b1] = parse(hex1);
    const [r2, g2, b2] = parse(hex2);
    const ramp = [];

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.round(r1 + (r2 - r1) * t)
        .toString(16)
        .padStart(2, "0");
      const g = Math.round(g1 + (g2 - g1) * t)
        .toString(16)
        .padStart(2, "0");
      const b = Math.round(b1 + (b2 - b1) * t)
        .toString(16)
        .padStart(2, "0");
      ramp.push(`#${r}${g}${b}`);
    }
    return ramp;
  }

  // Normalizes any color array into exactly 4 colors — the engine's internal
  // format. 1 color → ramp to white, 2 → interpolated ramp, 3 → +white,
  // 4+ → truncated. This guarantees every shell always has 4 usable colors.
  function normalizePalette(colors) {
    if (!Array.isArray(colors) || colors.length === 0) return PALETTES[0];

    // 1 color -> Ramp from target color to White
    if (colors.length === 1) {
      return createColorRamp(colors[0], "#FFFFFF", 4);
    }

    // 2 colors (Pair) -> 4-step interpolated ramp between color 1 and color 2
    if (colors.length === 2) {
      return createColorRamp(colors[0], colors[1], 4);
    }

    // 3 colors -> Add white highlight for core sparkle
    if (colors.length === 3) {
      return [...colors, "#FFFFFF"];
    }

    // 4 or more colors -> Slice to 4
    return colors.slice(0, 4);
  }

  // One colour for the whole shell. normalizePalette deliberately ramps a single
  // colour toward white, so a solid break has to repeat its colour across all
  // four slots instead. Pass a colour to pin it, or omit it to draw one at
  // random from the built-in solid hues.
  function solidPalette(color) {
    const c =
      color || SOLID_COLORS[Math.floor(Math.random() * SOLID_COLORS.length)];
    return [c, c, c, c];
  }

  // Resolves a CSS selector string to a DOM element, or passes through an
  // existing element reference. Used for the container option.
  const cssTarget = (value) =>
    typeof value === "string" ? document.querySelector(value) : value;

  /* ========================================================================
   *  WEBGL RENDERER
   *  GPU-accelerated particle rendering via WebGL2. Uses a custom point
   *  sprite shader with radial falloff, star-shaped highlights, and an
   *  additive blending pass. A separate fade program handles trail decay
   *  without clearing the framebuffer.
   * ======================================================================== */

  class WebGLRenderer {
    // Creates a WebGL2 context with additive blending and a point-sprite
    // shader. onLost is called if the GPU context is lost (triggers fallback).
    constructor(canvas, onLost, options = {}) {
      this.canvas = canvas;
      const gl = canvas.getContext("webgl2", {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: Boolean(options.preserveDrawingBuffer),
        powerPreference: "high-performance",
      });
      if (!gl) throw new Error("WebGL 2 unavailable");
      this.gl = gl;
      this.onLost = onLost;
      this.capacity = 0;
      this._lost = (e) => {
        e.preventDefault();
        onLost("webgl-context-lost");
      };
      canvas.addEventListener("webglcontextlost", this._lost, false);
      this.program = this._program(
        `#version 300 es
        in vec2 a_position; in float a_size; in vec4 a_color; in float a_star;
        uniform vec2 u_resolution; uniform float u_zoom; out vec4 v_color; out float v_star;
        void main(){ vec2 p=(a_position/u_resolution)*u_zoom; vec2 clip=p*2.0-1.0; gl_Position=vec4(clip.x,-clip.y,0,1); gl_PointSize=a_size*u_zoom; v_color=a_color; v_star=a_star; }`,
        `#version 300 es
        precision mediump float; in vec4 v_color; in float v_star; out vec4 outColor;
        void main(){ vec2 q=(gl_PointCoord-vec2(.5))*2.0; float d=length(q); float edge=max(0.0,1.0-d); float halo=.85*pow(edge,3.0)+.15*pow(edge,1.2); float core=smoothstep(.25,0.0,d); float ray=max(smoothstep(.10,0.0,abs(q.x)),smoothstep(.10,0.0,abs(q.y)))*edge*v_star; float a=(halo*.72+core+ray*.8)*v_color.a; if(a<.012)discard; outColor=vec4(v_color.rgb*a,a); }`,
      );
      this.fadeProgram = this._program(
        `#version 300 es
        void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0,1);}`,
        `#version 300 es
        precision mediump float; uniform float u_fade; out vec4 outColor; void main(){outColor=vec4(0,0,0,u_fade);}`,
      );
      this.fadeUniform = gl.getUniformLocation(this.fadeProgram, "u_fade");
      this.buffer = gl.createBuffer();
      this.stride = 8;
      this.data = new Float32Array(0);
      this.aPos = gl.getAttribLocation(this.program, "a_position");
      this.aSize = gl.getAttribLocation(this.program, "a_size");
      this.aColor = gl.getAttribLocation(this.program, "a_color");
      this.aStar = gl.getAttribLocation(this.program, "a_star");
      this.uRes = gl.getUniformLocation(this.program, "u_resolution");
      this.uZoom = gl.getUniformLocation(this.program, "u_zoom");
      // Drivers cap the size of a GL_POINTS primitive, and the spec allows as
      // little as 1. Many mobile GPUs top out at 64, so ask the driver rather
      // than assuming 256. The raw limit is kept here; render() still applies
      // the historical 256 cap so desktop output is unchanged.
      const sizeRange = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
      this.maxPointSize = Math.max(2, Number(sizeRange && sizeRange[1]) || 256);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
    }
    _shader(type, src) {
      const g = this.gl,
        s = g.createShader(type);
      g.shaderSource(s, src);
      g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS))
        throw new Error(g.getShaderInfoLog(s));
      return s;
    }
    _program(v, f) {
      const g = this.gl,
        p = g.createProgram();
      g.attachShader(p, this._shader(g.VERTEX_SHADER, v));
      g.attachShader(p, this._shader(g.FRAGMENT_SHADER, f));
      g.linkProgram(p);
      if (!g.getProgramParameter(p, g.LINK_STATUS))
        throw new Error(g.getProgramInfoLog(p));
      return p;
    }
    resize(w, h, dpr) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.dpr = dpr;
    }
    // Fills a Float32Array with interleaved vertex attributes and uploads
    // them in a single draw call. Each particle = 8 floats:
    // [x, y, size, r, g, b, a, isStar]. The fade program draws a full-screen
    // quad to decay trails when trailFade < 1 (additive fade, no clear).
    render(items, w, h, trailFade, zoom = 1, beforeDraw = null) {
      const g = this.gl;
      // Trail decay without clearing: draw a full-screen black quad with
      // alpha = trailFade using ZERO/ONE_MINUS_SRC_ALPHA blend. This
      // darkens the previous frame instead of clearing it, preserving
      // the trail effect across frames.
      if (trailFade >= 1) {
        g.clearColor(0, 0, 0, 0);
        g.clear(g.COLOR_BUFFER_BIT);
      } else {
        g.useProgram(this.fadeProgram);
        g.uniform1f(this.fadeUniform, clamp(trailFade, 0, 1));
        g.blendFunc(g.ZERO, g.ONE_MINUS_SRC_ALPHA);
        g.drawArrays(g.TRIANGLES, 0, 3);
        g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      }
      // Host render pass (setRenderPass) composites its own scene here: after
      // the clear/trail-fade and before the engine's additive particles, so
      // host artwork sits behind the fireworks. The engine re-establishes its
      // state immediately below, so the callback may bind programs, VAOs and
      // textures freely without leaving anything behind for the points pass.
      if (beforeDraw) beforeDraw();
      g.useProgram(this.program);
      if (typeof g.bindVertexArray === "function") g.bindVertexArray(null);
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      g.disable(g.DEPTH_TEST);
      const need = items.length * this.stride;
      if (this.data.length < need)
        this.data = new Float32Array(Math.max(need, this.data.length * 2, 256));
      // The vertex shader multiplies the size by zoom, so the ceiling is divided
      // by zoom too. Otherwise zooming in would push the final gl_PointSize back
      // past the driver's limit even though the buffered value looked clamped.
      const ceiling = clamp(this.maxPointSize / (zoom || 1), 2, 256);
      let o = 0;
      for (const p of items) {
        this.data[o++] = p.x * this.dpr;
        this.data[o++] = p.y * this.dpr;
        this.data[o++] = clamp(
          (p.flash ? p.size : p.size * 6.2) * this.dpr,
          2,
          ceiling,
        );
        this.data[o++] = p.r;
        this.data[o++] = p.g;
        this.data[o++] = p.b;
        this.data[o++] = clamp(p.alpha, 0, 1);
        this.data[o++] = p.star ? 1 : 0;
      }
      g.useProgram(this.program);
      g.uniform2f(this.uRes, w * this.dpr, h * this.dpr);
      g.uniform1f(this.uZoom, zoom);
      g.bindBuffer(g.ARRAY_BUFFER, this.buffer);
      g.bufferData(g.ARRAY_BUFFER, this.data.subarray(0, o), g.DYNAMIC_DRAW);
      const s = this.stride * 4;
      g.enableVertexAttribArray(this.aPos);
      g.vertexAttribPointer(this.aPos, 2, g.FLOAT, false, s, 0);
      g.enableVertexAttribArray(this.aSize);
      g.vertexAttribPointer(this.aSize, 1, g.FLOAT, false, s, 8);
      g.enableVertexAttribArray(this.aColor);
      g.vertexAttribPointer(this.aColor, 4, g.FLOAT, false, s, 12);
      g.enableVertexAttribArray(this.aStar);
      g.vertexAttribPointer(this.aStar, 1, g.FLOAT, false, s, 28);
      g.drawArrays(g.POINTS, 0, items.length);
    }
    clear() {
      const g = this.gl;
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
    }
    destroy() {
      this.canvas.removeEventListener("webglcontextlost", this._lost);
      const g = this.gl;
      g.deleteBuffer(this.buffer);
      g.deleteProgram(this.program);
      g.deleteProgram(this.fadeProgram);
    }
  }

  /* ========================================================================
   *  CANVAS 2D FALLBACK RENDERER
   *  Software renderer used when WebGL2 is unavailable or the context is
   *  lost. Pre-renders radial-gradient sprites per color, caches them in
   *  a Map, and draws with lighter composite for additive blending.
   * ======================================================================== */

  class CanvasRenderer {
    // Creates a 2D context with desynchronized hint for off-main-thread
    // painting where supported.
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (!this.ctx) throw new Error("Canvas 2D unavailable");
      this.sprites = new Map();
    }
    resize(w, h, dpr) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      this.dpr = dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    // Builds (or retrieves from cache) a 64×64 radial-gradient sprite.
    // Sprites are keyed by a quantised [r,g,b]+star so identical colours share
    // a canvas. Quantisation is what keeps the cache bounded: pyroBurn drifts
    // each particle's colour continuously, so keying on the exact colour minted
    // a new canvas for nearly every frame of the ignition and ember phases —
    // around 12k live canvases (~184 MB) over a single show with the default
    // palettes. Sixteen levels per channel is indistinguishable inside a soft
    // additive glow and collapses that to a few hundred entries. Sizes are
    // entered in access order so the least recently used sprite is evicted first.
    // The star variant draws a 5-point star in the center for twinkle effects.
    _sprite(r, g, b, star = false) {
      const level = (v) =>
          Math.round(clamp(v, 0, 1) * (SPRITE_COLOR_LEVELS - 1)),
        ri = level(r),
        gi = level(g),
        bi = level(b),
        key = ri + "," + gi + "," + bi + (star ? "s" : "g"),
        cached = this.sprites.get(key);
      if (cached) {
        // Re-insert so a hit is the most recently used entry, not the next eviction.
        this.sprites.delete(key);
        this.sprites.set(key, cached);
        return cached;
      }
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const step = 255 / (SPRITE_COLOR_LEVELS - 1),
        rgb = [ri, gi, bi].map((v) => Math.round(v * step)),
        x = c.getContext("2d"),
        gr = x.createRadialGradient(32, 32, 0, 32, 32, 32),
        color = `rgb(${rgb.join(",")})`;
      gr.addColorStop(0, "white");
      gr.addColorStop(0.1, "white");
      gr.addColorStop(0.24, color);
      gr.addColorStop(0.56, `rgba(${rgb.join(",")},.42)`);
      gr.addColorStop(1, `rgba(${rgb.join(",")},0)`);
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      if (star) {
        x.globalCompositeOperation = "lighter";
        x.fillStyle = "white";
        x.beginPath();
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 ? 5 : 18,
            a = (i * Math.PI) / 5 - Math.PI / 2,
            px = 32 + Math.cos(a) * radius,
            py = 32 + Math.sin(a) * radius;
          i ? x.lineTo(px, py) : x.moveTo(px, py);
        }
        x.closePath();
        x.fill();
      }
      // Hard ceiling so a palette set with many distinct hues still cannot grow
      // the cache without bound. A 64×64 RGBA sprite is 16 KB, so the limit
      // corresponds to roughly 16 MB of canvas memory.
      if (this.sprites.size >= CanvasRenderer.SPRITE_CACHE_LIMIT)
        this.sprites.delete(this.sprites.keys().next().value);
      this.sprites.set(key, c);
      return c;
    }
    // Draws all particles with additive blending. Trail fade is handled
    // via destination-out composite — a semi-transparent black rectangle
    // is drawn over the previous frame to fade trails. Trail fade always
    // covers the full canvas regardless of zoom. Particles are drawn with
    // the zoom transform applied (scaled from screen center).
    render(items, w, h, fade, zoom = 1, beforeDraw = null) {
      const x = this.ctx;
      // Trail fade at full scale — always covers the entire canvas
      x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (fade >= 1) x.clearRect(0, 0, w, h);
      else {
        x.save();
        x.globalCompositeOperation = "destination-out";
        x.globalAlpha = clamp(fade, 0, 1);
        x.fillRect(0, 0, w, h);
        x.restore();
      }
      // Host render pass (setRenderPass) composites its own scene here, in
      // CSS-pixel space before the zoomed particle transform is applied, so
      // host artwork is never scaled by engine zoom and particles still draw
      // on top of it.
      if (beforeDraw) beforeDraw();
      // All engine positions live in a virtual world whose width grows as
      // zoom decreases. Scale that world from its origin; its calculated
      // centre remains at the physical canvas centre without an extra offset.
      x.setTransform(
        this.dpr * zoom,
        0,
        0,
        this.dpr * zoom,
        0,
        0,
      );
      x.globalCompositeOperation = "lighter";
      for (const p of items) {
        const z = p.flash ? p.size : Math.max(4.5, p.size * 5.2),
          s = this._sprite(p.r, p.g, p.b, Boolean(p.star));
        x.globalAlpha = clamp(p.alpha, 0, 1);
        x.drawImage(s, p.x - z, p.y - z, z * 2, z * 2);
      }
      x.globalAlpha = 1;
      x.globalCompositeOperation = "source-over";
    }
    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    destroy() {
      this.sprites.clear();
    }
  }

  // Sprite cache tuning for the Canvas fallback. Colours are quantised to this
  // many levels per channel before becoming cache keys, and the cache holds at
  // most SPRITE_CACHE_LIMIT sprites. See CanvasRenderer._sprite for the reasoning.
  const SPRITE_COLOR_LEVELS = 16;
  CanvasRenderer.SPRITE_CACHE_LIMIT = 1024;

  /* ========================================================================
   *  GRAND FIREWORKS ENGINE
   *  The main class — an EventTarget that manages the full fireworks
   *  lifecycle: rendering, particle physics, audio synthesis, text
   *  effects, adaptive performance, and the choreographed finale.
   * ======================================================================== */

  class GrandFireworks extends EventTarget {
    // Initializes all internal state, resolves the full options tree
    // (merging DEFAULTS → style → performance preset → user input),
    // builds the DOM layers, picks a renderer, and binds events.
    // If autoStart is true, kicks off on the next animation frame.
    constructor(options = {}) {
      super();
      this.userOptions = options;
      this.options = this._resolve(options);
      this.state = "idle";
      this.rockets = [];
      this.pendingRockets = [];
      this.particles = [];
      this.pool = [];
      this.flashes = [];
      // A show-wide breeze changes direction slowly. Individual particles
      // still retain their own ballistic path, so it reads as air movement.
      this.wind = { current: 0, target: 0, nextRetarget: 0 };
      this.textBlocks = [];
      this.textSequence = null;
      this.textSequenceId = 0;
      this.userPaused = false;
      this.autoPauseReasons = new Set();
      this.reducedMotion = false;
      this.quality = 1;
      this.zoom = this.options.visuals.zoom;
      this.worldWidth = this.width / this.zoom;
      this.contextLossCount = 0;
      this.finalePlayed = false;
      this.worldEnderTimers = new Set();
      // One record per running World Ender, so overlapping effects coexist rather
      // than cancelling each other.
      this.worldEnders = new Set();
      this.worldEnderSeq = 0;
      this.worldEnderPrevious = null;
      this.worldEnderListener = null;
      this.worldEnderResumeRequested = false;
      this.lastLaunch = 0;
      this.elapsed = 0;
      this.effectTime = performance.now();
      this.raf = 0;
      this.renderPass = null;
      this.stopPromise = null;
      this.resizePending = true;
      this.fps = 0;
      this.nextAdapt = 0;
      this.audioContext = null;
      this.audioMaster = null;
      this.audioAmbience = null;
      this.audioVoices = [];
      this.lastCrackleSound = 0;
      this.lastFlashBang = -Infinity;
      this.flashBangAnimation = null;
      this.container = cssTarget(this.options.container) || document.body;
      this._buildLayers();
      this._initRenderer();
      this._resize();
      this._bind();
      if (this.options.autoStart) requestAnimationFrame(() => this.start());
    }
    // Resolves the full configuration by layering:
    //   DEFAULTS → style preset → color theme → performance preset → user input
    // Clamps all numeric values to safe ranges and derives computed fields
    // like preserveDrawingBuffer from mode/trails.
    _resolve(input = {}) {
      const styleName = input.baseStyle || "cinematic",
        style = styleName === "mixed" ? STYLES.medium : STYLES[styleName] || STYLES.medium;
      // Whether the host asked for a specific particle budget, which decides later whether
      // the renderer's own accommodation is allowed to cut it.
      const explicitParticles =
        Boolean(input && input.show) &&
        input.show.maxParticles !== undefined &&
        input.show.maxParticles !== null;
      let o = merge(merge(DEFAULTS, style), input);
      const themeName = o.colorTheme || "default",
        theme = COLOR_THEMES[themeName];
      if (theme && theme.palettes !== "default")
        o.show.palettes = theme.palettes;
      const name = (o.performance && o.performance.preset) || "high",
        p = PRESETS[name] || PRESETS.high;
      o.performance = merge(
        {
          preset: name,
          adaptive: true,
          pauseWhenHidden: true,
          pauseWhenOffscreen: true,
          respectReducedMotion: true,
        },
        o.performance || {},
      );
      o.visuals.trailFade = clamp(
        Number(o.visuals.trailFade) || 0.115,
        0.03,
        1,
      );
      o.visuals.bloom = clamp(Number(o.visuals.bloom) || 1, 0.5, 10);
      o.visuals.flashScale = clamp(Number(o.visuals.flashScale) || 1, 0.5, 3);
      o.visuals.flashAlpha = clamp(Number(o.visuals.flashAlpha) || 0.34, 0.05, 1);
      o.visuals.flashLife = clamp(Number(o.visuals.flashLife) || 420, 80, 900);
      o.visuals.flashBangChance = clamp(
        Number(o.visuals.flashBangChance) || 0,
        0,
        1,
      );
      o.visuals.flashBangAlpha = clamp(
        Number(o.visuals.flashBangAlpha) || 0.55,
        0.1,
        1,
      );
      o.visuals.flashBangDuration = clamp(
        Number(o.visuals.flashBangDuration) || 240,
        100,
        700,
      );
      o.visuals.flashBangCooldown = clamp(
        Number(o.visuals.flashBangCooldown) || 3000,
        800,
        15000,
      );
      o.visuals.burstVelocity = clamp(Number(o.visuals.burstVelocity) || 1, 0.4, 2.5);
      o.visuals.shimmerChance = clamp(Number(o.visuals.shimmerChance) || 0, 0, 1);
      o.visuals.sparkleChance = clamp(Number(o.visuals.sparkleChance) || 0, 0, 1);
      o.visuals.windStrength = clamp(Number(o.visuals.windStrength) || 0, 0, 0.25);
      o.visuals.starChance = clamp(Number(o.visuals.starChance) || 0, 0, 0.3);
      o.visuals.zoom = clamp(Number(o.visuals.zoom ?? 1), 0.1, 4);
      o.speedMultiplier = clamp(Number(o.speedMultiplier) || 1, 0.1, 3);
      o.textFirework.textAlign = ["left", "center", "right"].includes(
        o.textFirework.textAlign,
      )
        ? o.textFirework.textAlign
        : "center";

      o.show.zAngleRange = clamp(Number(o.show.zAngleRange ?? 25), 0, 45);
      o.show.zAngleStrength = clamp(Number(o.show.zAngleStrength ?? 0.8), 0, 3);

      o.renderer.preserveDrawingBuffer =
        o.renderer.preserveDrawingBuffer === "auto"
          ? o.mode === "contained" || Boolean(o.visuals.trails)
          : Boolean(o.renderer.preserveDrawingBuffer);
      // No ceiling at all: a host that asks for a number gets that number, and may ask for
      // Infinity. The floor remains only so a zero or negative cannot switch the show off
      // by accident. Adaptive quality is the brake when a machine cannot keep up.
      o.show.maxParticles = Math.max(
        100,
        Number(o.show.maxParticles || p.maxParticles),
      );
      o.show.maxRockets = Math.max(
        1,
        Number(o.show.maxRockets || p.maxRockets),
      );
      o.show.launchInterval = Number(o.show.launchInterval || p.launchInterval);
      o.show.launchSpread = clamp(Number(o.show.launchSpread), 0, 1);
      o.show.closeShellChance = clamp(Number(o.show.closeShellChance ?? 0.25), 0, 0.8);
      o.show.minShellScale = clamp(Number(o.show.minShellScale) || 1, 0.25, 2);
      o.show.maxShellScale = clamp(Number(o.show.maxShellScale) || 1, 0.25, 2);
      o.show.grandFinaleShellChance = clamp(
        Number(o.show.grandFinaleShellChance) || 0,
        0,
        0.5,
      );
      if (o.show.minShellScale > o.show.maxShellScale)
        [o.show.minShellScale, o.show.maxShellScale] = [
          o.show.maxShellScale,
          o.show.minShellScale,
        ];
      o.sound.nearBoomMultiplier = clamp(Number(o.sound.nearBoomMultiplier ?? 1), 0.2, 10);
      o.sound.boomStyle = ["classic", "deep", "artillery", "double", "rolling", "mixed"].includes(
        o.sound.boomStyle,
      )
        ? o.sound.boomStyle
        : "mixed";
      o.sound.boomVariation = clamp(Number(o.sound.boomVariation ?? 0.25), 0, 0.5);
      o.show.angleRange = clamp(Number(o.show.angleRange), 0, 45);
      o.show.angleStrength = clamp(Number(o.show.angleStrength), 0, 3);
      o.show.textRocketAngle = clamp(Number(o.show.textRocketAngle), -45, 45);
      o.show.launchHorizon = clamp(Number(o.show.launchHorizon ?? 1), 0.5, 20);
      const fps = Number(o.performance.fps),
        dprCap = Number(o.performance.dprCap),
        particleScale = Number(o.performance.particleScale),
        secondary = Number(o.performance.secondary);
      o.performance.fps = fps > 0 ? fps : p.fps;
      o.performance.dprCap = dprCap > 0 ? dprCap : p.dprCap;
      o.performance.particleScale =
        particleScale > 0 ? particleScale : p.particleScale;
      o.performance.secondary = secondary >= 0 ? secondary : p.secondary;
      // The Canvas2D path gets half the particle budget, but only when the host did not
      // ask for a number itself. Silently halving an explicit 24000 to 12000 is exactly
      // the kind of invisible limit that costs an afternoon.
      if (
        !explicitParticles &&
        (o.renderer.preferred === "canvas2d" ||
          (o.renderer.preferred === "auto" && o.mode === "contained"))
      )
        o.show.maxParticles = Math.round(o.show.maxParticles / 2);
      o.finale.type =
        o.finale.type === "world-ender" || o.finale.type === "super-grand-finale"
          ? o.finale.type
          : "super-grand-finale";
      o.finale.trails = clamp(Math.round(Number(o.finale.trails) || 10), 3, 20);
      o.finale.trailFlight = Math.max(
        500,
        Number(o.finale.trailFlight) || 1100,
      );
      o.finale.trailSpread = clamp(Number(o.finale.trailSpread) || 360, 30, 360);
      o.finale.burstScale = clamp(Number(o.finale.burstScale) || 1, 0.4, 2);
      o.finale.maxWaitBeforeLaunch = Math.max(
        0,
        Number(o.finale.maxWaitBeforeLaunch) || 0,
      );
      o.finale.particleScale = clamp(
        Number(o.finale.particleScale) || 1,
        0.25,
        2,
      );
      o.finale.finishDelay = Math.max(0, Number(o.finale.finishDelay) || 0);
      o.finale.maxDuration = Math.max(
        1000,
        Number(o.finale.maxDuration) || 9000,
      );
      o.duration = Math.max(0, Number(o.duration) || 0);
      return o;
    }
    // Creates the DOM scaffolding: root container, optional backdrop,
    // the main render canvas, a separate text overlay canvas, and an
    // optional FPS counter. Inserts into the target container at the
    // correct z-index layer.
    _buildLayers() {
      const o = this.options,
        c = this.container;
      this.root = document.createElement("div");
      this.root.className = "grand-fireworks-root";
      Object.assign(this.root.style, {
        position: o.mode === "fullscreen" ? "fixed" : "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        overflow: o.clip ? "hidden" : "visible",
        pointerEvents: "none",
        isolation: "isolate",
        zIndex: String(o.placement === "background" ? 0 : o.zIndex),
        opacity: String(clamp(Number(o.visuals.opacity ?? 1), 0, 1)),
      });
      if (o.mode === "contained" && getComputedStyle(c).position === "static") {
        this.oldPosition = c.style.position;
        c.style.position = "relative";
      }
      this.backdrop = document.createElement("div");
      Object.assign(this.backdrop.style, {
        position: "absolute",
        inset: "0",
        opacity: "0",
        transition: `opacity ${o.transition.fadeIn}ms ${o.transition.easing}`,
      });
      if (o.background) {
        this.backdrop.style.background = o.background.value || "";
        this.backdrop.style.opacity = "0";
        if (o.background.className)
          this.backdrop.className = o.background.className;
      }
      this.canvas = this._canvas();
      this.textCanvas = this._canvas();
      this.textCanvas.className = "grand-fireworks-text-layer";
      this.textCanvas.style.display = "none";
      this.textCtx = this.textCanvas.getContext("2d", {
        alpha: true,
        desynchronized: true,
      });
      this.flashBangLayer = document.createElement("div");
      this.flashBangLayer.className = "grand-fireworks-flash-bang";
      Object.assign(this.flashBangLayer.style, {
        position: "absolute",
        inset: "0",
        background:
          "radial-gradient(circle at var(--flash-x, 50%) var(--flash-y, 50%), #fff 0%, #fff8dd 24%, rgba(255,244,207,.82) 48%, rgba(255,255,255,.18) 100%)",
        mixBlendMode: "screen",
        opacity: "0",
        pointerEvents: "none",
        willChange: "opacity",
      });
      this.root.append(
        this.backdrop,
        this.textCanvas,
        this.canvas,
        this.flashBangLayer,
      );
      if (o.placement === "background") c.insertBefore(this.root, c.firstChild);
      else c.appendChild(this.root);
      if (o.showFps) {
        this.fpsEl = document.createElement("div");
        Object.assign(this.fpsEl.style, {
          position: "fixed",
          zIndex: "2147483647",
          top: "8px",
          left: "8px",
          font: "600 13px/1 ui-monospace,monospace",
          color: "rgba(255,255,255,.6)",
          background: "rgba(0,0,0,.5)",
          padding: "4px 8px",
          borderRadius: "6px",
          pointerEvents: "none",
          userSelect: "none",
          backdropFilter: "blur(4px)",
        });
        document.body.appendChild(this.fpsEl);
      }
    }
    _canvas() {
      const c = document.createElement("canvas");
      Object.assign(c.style, {
        position: "absolute",
        inset: "0",
        display: "block",
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      });
      c.setAttribute("aria-hidden", "true");
      return c;
    }
    // Attempts WebGL2 first; falls back to Canvas2D on failure.
    // In contained mode, defaults to Canvas2D to avoid GPU contention.
    _initRenderer(force) {
      let pref = force || (this.options.renderer || {}).preferred || "auto";
      if (pref === "auto" && this.options.mode === "contained")
        pref = "canvas2d";
      try {
        if (pref !== "canvas2d") {
          this.renderer = new WebGLRenderer(
            this.canvas,
            (r) => this._fallback(r),
            this.options.renderer,
          );
          this.rendererType = "webgl2";
          return;
        }
      } catch (e) {}
      this.renderer = new CanvasRenderer(this.canvas);
      this.rendererType = "canvas2d";
    }
    // WebGL context attributes cannot be changed after creation. Replacing
    // the canvas lets live trail toggles update preserveDrawingBuffer without
    // restarting the show or discarding the active rockets and particles.
    _recreateRenderer(reason) {
      const previousType = this.rendererType;
      if (this.renderer) this.renderer.destroy();

      const oldCanvas = this.canvas;
      this.canvas = this._canvas();
      oldCanvas.replaceWith(this.canvas);
      this._initRenderer();
      this._resize();

      this.dispatchEvent(
        new CustomEvent("rendererchange", {
          detail: {
            from: previousType,
            to: this.rendererType,
            reason,
          },
        }),
      );
    }
    // Swaps the WebGL canvas for a new Canvas2D canvas and fires a
    // rendererchange event. Called on context loss or explicit fallback.
    _fallback(reason) {
      if (this.rendererType === "canvas2d") return;
      this.contextLossCount++;
      this.renderer.destroy();
      const old = this.canvas;
      this.canvas = this._canvas();
      old.replaceWith(this.canvas);
      this.renderer = new CanvasRenderer(this.canvas);
      this.rendererType = "canvas2d";
      this.resizePending = true;
      this.dispatchEvent(
        new CustomEvent("rendererchange", {
          detail: { from: "webgl2", to: "canvas2d", reason },
        }),
      );
    }
    // Stops listening for the gesture that unlocks audio. Called once the
    // AudioContext is actually running, or when sound is turned off.
    _detachAudioUnlock() {
      if (!this.onAudioUnlock) return;
      window.removeEventListener(
        "pointerdown",
        this.onAudioUnlock,
        this.audioUnlockOptions,
      );
      window.removeEventListener(
        "keydown",
        this.onAudioUnlock,
        this.audioUnlockOptions,
      );
      this.onAudioUnlock = null;
    }
    // Registers resize, visibility, intersection, and reduced-motion
    // listeners. Uses passive resize and IntersectionObserver for offscreen
    // pause detection.
    _bind() {
      this.onResize = () => (this.resizePending = true);
      this.onVisibility = () => {
        if (this.options.performance.pauseWhenHidden && document.hidden)
          this._pauseFor("hidden");
        else this._resumeFor("hidden");
      };
      window.addEventListener("resize", this.onResize, { passive: true });
      document.addEventListener("visibilitychange", this.onVisibility);
      // Browsers only allow an AudioContext to start from inside a user gesture,
      // so a show that enables sound through options (or through autoStart) stays
      // silent until the first interaction. Catch that interaction, unlock, and
      // stop listening, rather than leaving the context suspended forever.
      this.audioUnlockOptions = { passive: true, capture: true };
      this.onAudioUnlock = () => {
        if (!this.options.sound.enabled) return this._detachAudioUnlock();
        const ctx = this._audio(true);
        if (ctx && ctx.state === "running") this._detachAudioUnlock();
      };
      window.addEventListener(
        "pointerdown",
        this.onAudioUnlock,
        this.audioUnlockOptions,
      );
      window.addEventListener(
        "keydown",
        this.onAudioUnlock,
        this.audioUnlockOptions,
      );
      if (this.options.mode === "contained" && global.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(this.onResize);
        this.resizeObserver.observe(this.container);
      }
      if (global.IntersectionObserver) {
        this.intersectionObserver = new IntersectionObserver(
          (entries) => {
            const visible = entries.some(
              (entry) => entry.isIntersecting && entry.intersectionRatio > 0,
            );
            if (this.options.performance.pauseWhenOffscreen && !visible)
              this._pauseFor("offscreen");
            else this._resumeFor("offscreen");
          },
          { threshold: 0.01 },
        );
        this.intersectionObserver.observe(
          this.options.mode === "contained" ? this.container : this.root,
        );
      }
      if (global.matchMedia) {
        this.motionQuery = global.matchMedia(
          "(prefers-reduced-motion: reduce)",
        );
        this.reducedMotion = Boolean(this.motionQuery.matches);
        this.onMotionChange = (event) =>
          (this.reducedMotion = Boolean(event.matches));
        if (this.motionQuery.addEventListener)
          this.motionQuery.addEventListener("change", this.onMotionChange);
        else if (this.motionQuery.addListener)
          this.motionQuery.addListener(this.onMotionChange);
      }
    }
    /* ── Lifecycle ─────────────────────────────────────────────────── */

    /**
     * Starts the fireworks show. Fires an opening salvo, begins the
     * render loop, and fades in the backdrop. Returns `this` for chaining.
     * @param {Object} [run={}] - Runtime overrides (e.g. { duration: 5000 })
     * @returns {GrandFireworks}
     */
    start(run = {}) {
      if (this.state === "running") return this;
      clearTimeout(this.fadeTimer);
      this.runtimeDuration =
        run.duration === undefined
          ? this.options.duration
          : Math.max(0, Number(run.duration) || 0);
      this.elapsed = 0;
      this.accepting = true;
      this.finalePlayed = false;
      this.userPaused = false;
      this.state = "running";
      this.lastTime = performance.now();
      this.lastLaunch = this.effectTime;
      this.root.style.display = "block";
      this.root.style.opacity = String(
        clamp(Number(this.options.visuals.opacity ?? 1), 0, 1),
      );
      // Sound enabled through options has no gesture to unlock the AudioContext
      // with, so at least attempt the resume here; _bind()'s one-shot gesture
      // handler covers the case where this call is outside a user gesture.
      this._audio(Boolean(this.options.sound.enabled));
      requestAnimationFrame(() => {
        if (this.options.background)
          this.backdrop.style.opacity = String(
            this.options.background.opacity === undefined
              ? 1
              : this.options.background.opacity,
          );
      });
      const opening = this._motionReduced()
        ? Math.max(1, Math.round(this.options.show.openingSalvo * 0.35))
        : this.options.show.openingSalvo;
      for (let i = 0; i < opening; i++)
        this._queueRocket(this.effectTime + i * 180);
      if (this.autoPauseReasons.size) {
        this.pausedState = "running";
        this.state = "paused";
      } else this._loop();
      this.dispatchEvent(new Event("start"));
      return this;
    }
    _motionReduced() {
      return (
        this.options.performance.respectReducedMotion && this.reducedMotion
      );
    }
    _pauseEngine() {
      if (!["running", "finishing", "finale", "manual"].includes(this.state))
        return false;
      this.pausedState = this.state;
      this.state = "paused";
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return true;
    }
    _resumeEngine() {
      if (
        this.state !== "paused" ||
        this.userPaused ||
        this.autoPauseReasons.size
      )
        return false;
      this.state = this.pausedState || "running";
      this.lastTime = performance.now();
      if (!this.renderPass) this._loop();
      return true;
    }
    _pauseFor(reason) {
      this.autoPauseReasons.add(reason);
      this._pauseEngine();
      return this;
    }
    _resumeFor(reason) {
      this.autoPauseReasons.delete(reason);
      this._resumeEngine();
      return this;
    }
    /**
     * Pauses the show. Use internal=true for auto-pause reasons
     * (hidden tab, offscreen). Fires a 'pause' event.
     * @param {boolean|string} [internal=false]
     * @returns {GrandFireworks}
     */
    pause(internal = false) {
      if (internal)
        return this._pauseFor(
          typeof internal === "string" ? internal : "internal",
        );
      this.userPaused = true;
      const changed = this._pauseEngine();
      if (changed) this.dispatchEvent(new Event("pause"));
      return this;
    }
    /**
     * Resumes a previously paused show. Fires a 'resume' event.
     * @param {boolean|string} [internal=false]
     * @returns {GrandFireworks}
     */
    resume(internal = false) {
      if (internal)
        return this._resumeFor(
          typeof internal === "string" ? internal : "internal",
        );
      this.userPaused = false;
      const changed = this._resumeEngine();
      if (changed) this.dispatchEvent(new Event("resume"));
      return this;
    }
    /**
     * Gracefully stops the show. Enters the "finishing" state — lets
     * in-flight rockets complete, optionally triggers the finale, then
     * fades out. Use { immediate: true } to skip the wind-down.
     * @param {Object} [options={}]
     * @param {boolean} [options.immediate] - Skip finishing, fade immediately
     * @param {boolean} [options.finale] - Force or suppress the finale
     * @returns {Promise<GrandFireworks>}
     */
    stop(options = {}) {
      if (this.state === "stopped" || this.state === "idle")
        return Promise.resolve(this);
      if (this.stopPromise) return this.stopPromise;
      if (options.immediate) {
        this.accepting = false;
        return this._fade(true);
      }
      this.accepting = false;
      this.state = "finishing";
      this.finishStarted = performance.now();
      this.wantFinale =
        options.finale === undefined
          ? this._finaleTriggered("stop")
          : Boolean(options.finale);
      this.stopPromise = new Promise((resolve) => (this.stopResolve = resolve));
      if (!this.raf) {
        this.lastTime = performance.now();
        this._loop();
      }
      return this.stopPromise;
    }
    // Checks whether the finale should trigger for a given lifecycle event
    // ("stop" or "duration"). Respects the enabled flag and trigger list.
    _finaleTriggered(trigger) {
      return (
        this.options.finale.enabled &&
        (this.options.finale.triggers || []).includes(trigger) &&
        !this.finalePlayed
      );
    }
    /** Triggers stop() with finale forced on. */
    finalize() {
      return this.stop({ finale: true });
    }
    clear() {
      this.rockets.length =
        this.pendingRockets.length =
        this.particles.length =
        this.flashes.length =
        this.textBlocks.length =
          0;
      this.renderer.clear();
      if (this.textCtx)
        this.textCtx.clearRect(
          0,
          0,
          this.textCanvas.width,
          this.textCanvas.height,
        );
      return this;
    }
    destroy() {
      cancelAnimationFrame(this.raf);
      clearTimeout(this.fadeTimer);
      this.cancelTextSequence({ clear: false });
      this._clearWorldEnder();
      this._detachAudioUnlock();
      window.removeEventListener("resize", this.onResize);
      document.removeEventListener("visibilitychange", this.onVisibility);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.intersectionObserver) this.intersectionObserver.disconnect();
      if (this.motionQuery && this.onMotionChange) {
        if (this.motionQuery.removeEventListener)
          this.motionQuery.removeEventListener("change", this.onMotionChange);
        else if (this.motionQuery.removeListener)
          this.motionQuery.removeListener(this.onMotionChange);
      }
      if (this.flashBangAnimation) {
        this.flashBangAnimation.cancel();
        this.flashBangAnimation = null;
      }
      this.renderer.destroy();
      this.root.remove();
      if (this.fpsEl) {
        this.fpsEl.remove();
        this.fpsEl = null;
      }
      if (this.audioAmbience) {
        try {
          this.audioAmbience.source.stop();
        } catch (e) {}
        this.audioAmbience = null;
      }
      this.audioVoices.forEach((voice) => {
        try {
          voice.source.stop();
        } catch (e) {}
      });
      this.audioVoices.length = 0;
      if (this.audioContext && this.audioContext.state !== "closed") {
        const closing = this.audioContext.close();
        if (closing && closing.catch) closing.catch(() => {});
      }
      this.audioContext = null;
      this.audioMaster = null;
      if (this.oldPosition !== undefined)
        this.container.style.position = this.oldPosition;
      this.state = "destroyed";
    }
    // Transitions from idle/stopped to an active state (manual or finale),
    // re-enabling the render loop if needed. Used by launch(), launchText(),
    // and launchFinale() when called on an idle engine.
    _activateManual(state = "manual") {
      if (this.state === "destroyed" || this.state === "paused") return false;
      const inactive = ["idle", "stopped", "fading"].includes(this.state);
      if (!inactive) return false;
      clearTimeout(this.fadeTimer);
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.stopPromise = null;
      this.stopResolve = null;
      this.accepting = false;
      this.state = state;
      this.lastTime = performance.now();
      this.root.style.display = "block";
      this.root.style.opacity = String(
        clamp(Number(this.options.visuals.opacity ?? 1), 0, 1),
      );
      if (this.options.background)
        this.backdrop.style.opacity = String(
          this.options.background.opacity === undefined
            ? 1
            : this.options.background.opacity,
        );
      this.resizePending = true;
      if (this.autoPauseReasons.size) {
        this.pausedState = state;
        this.state = "paused";
      } else if (!this.renderPass) this._loop();
      // With a host render pass attached (setRenderPass) the host owns frame
      // pacing and drives the engine through renderFrame(dt), so the engine
      // must not start a competing requestAnimationFrame loop.
      return true;
    }
    /* ── Launch API ────────────────────────────────────────────────── */

    /**
     * Manually fires a single rocket with optional overrides.
     * @param {Object} [options={}] - Overrides: type, x, burstHeight, colors, angle
     * @returns {GrandFireworks}
     */
    launch(options = {}) {
      this._activateManual("manual");
      if (!["running", "finishing", "manual"].includes(this.state)) return this;
      this._createRocket(options);
      return this;
    }
    /**
     * Registers a host render pass — the engine lends its canvas, the host
     * draws the scene.
     *
     * The callback runs once per frame, after the canvas has been cleared (or
     * trail-faded) and before the engine's particles are drawn, so host artwork
     * sits behind the fireworks. It receives:
     *   { gl, ctx, canvas, width, height, dpr }
     * where `gl` is the WebGL2 context, or null when the Canvas2D fallback is
     * active, in which case `ctx` is the 2D context instead. `width`/`height`
     * are CSS pixels; `dpr` is the device pixel ratio. Hosts must use the
     * context they are given rather than creating their own canvas, and must
     * not clear the frame — the engine has already done that.
     *
     * Attaching a render pass makes the host responsible for frame pacing:
     * the engine stops starting its own requestAnimationFrame loop and expects
     * renderFrame(dt) to be called each frame. This is what lets a host drive
     * gameplay from a single loop while the engine supplies rendering,
     * explosions and audio.
     *
     * Pass null to detach the pass.
     *
     * @param {Function|null} [callback=null]
     * @returns {GrandFireworks}
     */
    setRenderPass(callback = null) {
      if (callback !== null && typeof callback !== "function")
        throw new TypeError("setRenderPass expects a function or null");
      this.renderPass = callback || null;
      // Built once rather than per frame: renderFrame hands the renderer a bare
      // callback, and this is what turns it into the documented frame
      // descriptor. Allocating a closure every frame would be pure garbage.
      this.hostPass = this.renderPass
        ? () => this.renderPass(this._renderPassFrame())
        : null;
      if (this.renderPass) {
        // The host now owns frame pacing; a running engine loop would step
        // the simulation twice per frame.
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        clearTimeout(this.fadeTimer);
        // A pass can be attached before the first show starts, and an earlier
        // fade may have hidden the root, so make the shared canvas visible.
        this.root.style.display = "block";
        this.root.style.opacity = String(
          clamp(Number(this.options.visuals.opacity ?? 1), 0, 1),
        );
      }
      return this;
    }
    /**
     * Advances the simulation by dt milliseconds and draws one frame.
     *
     * Intended for hosts that own the animation loop alongside a render pass.
     * dt is capped at 50ms internally, the same guard the engine's own loop
     * applies, so a backgrounded tab cannot teleport effects. Pass 0 to render
     * the current frame without advancing anything, which is how a host pauses
     * effects while keeping its scene on screen.
     *
     * @param {number} [dt=0] - Elapsed milliseconds since the previous frame.
     * @returns {GrandFireworks}
     */
    renderFrame(dt = 0) {
      if (this.state === "destroyed") return this;
      if (this.resizePending) this._resize();
      const realDt = Math.min(0.05, Math.max(0, Number(dt) || 0) / 1000),
        step = realDt * this.options.speedMultiplier,
        active = ![
          "paused",
          "idle",
          "stopped",
          "fading",
          "destroyed",
        ].includes(this.state);
      this.effectTime += step * 1000;
      const now = this.effectTime;
      if (active) {
        this.elapsed += realDt * 1000;
        this.fps += (1 / (realDt || 0.016) - this.fps) * 0.05;
        this._update(now, step);
      }
      const trailFade = this.options.visuals.trails
        ? 1 - Math.pow(1 - this.options.visuals.trailFade, realDt * 60)
        : 1;
      this.renderer.render(
        this._drawItems(now),
        this.width,
        this.height,
        trailFade,
        this.zoom,
        this.hostPass,
      );
      this._drawText(now);
      return this;
    }
    // The descriptor handed to a host render pass: which context to draw with,
    // how big the frame is, and the canvas that owns it. Exactly one of gl/ctx
    // is non-null, depending on which renderer the engine fell back to.
    _renderPassFrame() {
      const webgl = this.rendererType === "webgl2";
      return {
        gl: webgl ? this.renderer.gl || null : null,
        ctx: webgl ? null : this.renderer.ctx || null,
        canvas: this.renderer.canvas || this.canvas,
        width: this.width,
        height: this.height,
        dpr: this.dpr,
      };
    }
    /**
     * Detonates a shell immediately at a point — no rocket, no flight time.
     *
     * Positions are CSS pixels relative to the engine's container, which is
     * what pointer events and getBoundingClientRect() already give you. Pass
     * `element` (an element or a selector) to burst at that element's centre
     * instead, which is the common case for tying effects to page furniture or
     * clicks. Values are converted to world space through the current zoom, so
     * the burst lands where you aimed at any zoom level.
     *
     * `radius` is the on-screen radius in CSS pixels that the sparks are fitted
     * to. The burst is shaped by scaling particle velocity and gravity
     * together, so the firework keeps its form at any size; the fit targets the
     * rim of the break (the 90th percentile of star reach), so a few of the
     * fastest strays travel past the radius, exactly as a real break does. Omit
     * `radius` to keep the shell's natural size.
     *
     * @param {Object} [options={}]
     * @param {number} [options.x] - CSS pixels from the container's left edge.
     * @param {number} [options.y] - CSS pixels from the container's top edge.
     * @param {Element|string} [options.element] - Burst at this element's centre.
     * @param {number} [options.radius] - Target on-screen burst radius, CSS px.
     * @param {string} [options.type] - Shell type; defaults to grand_peony.
     * @param {string[]} [options.colors] - Palette for the burst.
     * @param {number} [options.density] - Spark multiplier (1 = normal).
     * @param {boolean} [options.sound] - false silences this burst only.
     * @returns {GrandFireworks}
     */
    placeburst(options = {}) {
      this._activateManual("manual");
      if (!["running", "finishing", "manual", "finale"].includes(this.state))
        return this;
      const point = this._burstPoint(options);
      if (!point) return this;
      this._explode(
        this._burstShell(point, options, this._burstRadius(options.radius)),
        this.effectTime,
      );
      return this;
    }
    /**
     * Flies a rocket from one point to another and bursts on arrival.
     *
     * This is the engine's normal rocket — trail, exhaust sparks, detonation
     * flash, burst and audio — but with the launch origin and the arrival time
     * supplied by the host instead of the engine's own horizon maths. A host
     * that already simulates a projectile (a launcher, a cannon, a cursor)
     * passes the same origin and travel time it is using for its own logic, so
     * the firework and the gameplay arrive together by construction.
     *
     * Coordinates are CSS pixels relative to the container, as with
     * placeburst(). The burst options (radius, type, colors, density, sound)
     * apply to the detonation on arrival.
     *
     * @param {Object} [options={}]
     * @param {number} options.x - Launch point, CSS px.
     * @param {number} options.y - Launch point, CSS px.
     * @param {number} options.targetX - Detonation point, CSS px.
     * @param {number} options.targetY - Detonation point, CSS px.
     * @param {number} [options.duration=600] - Flight time in milliseconds.
     * @param {number} [options.radius] - Target on-screen burst radius, CSS px.
     * @param {string} [options.type] - Shell type; defaults to grand_peony.
     * @param {string[]} [options.colors] - Palette for the rocket and burst.
     * @param {number} [options.density] - Spark multiplier (1 = normal).
     * @param {boolean} [options.sound] - false silences this rocket only.
     * @returns {GrandFireworks}
     */
    launchTo(options = {}) {
      this._activateManual("manual");
      if (!["running", "finishing", "manual", "finale"].includes(this.state))
        return this;
      const from = this._burstPoint(options),
        to = this._burstPoint({ x: options.targetX, y: options.targetY });
      if (!from || !to) return this;
      const duration = clamp(Number(options.duration) || 600, 16, 20000),
        seconds = duration / 1000,
        shell = this._burstShell(from, options, this._burstRadius(options.radius));
      // The public launch() always fires from the launch horizon, so a
      // host-supplied origin gets a purpose-built rocket: straight-line
      // velocity over the requested flight time, no gravity or depth drift to
      // pull it off target, and an explicit detonation time so it bursts
      // exactly where and when the host expects.
      this.rockets.push({
        ...shell,
        vx: (to.x - from.x) / seconds,
        vy: (to.y - from.y) / seconds,
        gravity: 0,
        vz: 0,
        burstFallSpeed: -Infinity,
        detonateAt: this.effectTime + duration,
        sparkClock: 0,
        hostLaunched: true,
      });
      return this;
    }
    // Resolves a burst position from either explicit CSS-pixel coordinates or
    // an element's centre, then converts screen space to the engine's world
    // space (the renderer scales the world by zoom, so world = screen / zoom).
    // Returns null when the caller supplied nothing usable.
    _burstPoint(options = {}) {
      const zoom = this.zoom || 1;
      let x, y;
      if (options.element) {
        const el = cssTarget(options.element);
        if (!el || typeof el.getBoundingClientRect !== "function") return null;
        const rect = el.getBoundingClientRect(),
          base =
            this.container && typeof this.container.getBoundingClientRect === "function"
              ? this.container.getBoundingClientRect()
              : null;
        x = (Number(rect.left) || 0) - (base ? Number(base.left) || 0 : 0) + (Number(rect.width) || 0) / 2;
        y = (Number(rect.top) || 0) - (base ? Number(base.top) || 0 : 0) + (Number(rect.height) || 0) / 2;
      } else {
        x = Number(options.x);
        y = Number(options.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      }
      return { x: x / zoom, y: y / zoom };
    }
    // Converts a requested on-screen radius into world units. Radius is the
    // only measurement a host knows in screen terms, so it is divided by zoom
    // like any other screen measurement.
    _burstRadius(radius) {
      if (radius === undefined || radius === null) return 0;
      const value = Number(radius);
      if (!Number.isFinite(value) || value <= 0) return 0;
      return value / (this.zoom || 1);
    }
    // Builds the pseudo-rocket that _explode() consumes for a host-placed
    // burst. It carries depth, scale and audio settings explicitly so a
    // point burst behaves like a normal shell break at the requested size.
    _burstShell(point, options, radiusWorld) {
      const silent = options.sound === false;
      return {
        x: point.x,
        y: point.y,
        z: 0,
        dof: 1,
        apparentScale: 1,
        styleScale: 1,
        angle: 0,
        type: this._burstType(options.type),
        // No colours asked for means the shell follows the style and theme the show is
        // already using, exactly as a scattered rocket would, rather than always coming
        // out in the first built-in palette.
        colors: options.colors ? normalizePalette(options.colors) : this._palette(),
        audioGain: silent ? 0 : 0.75,
        silent,
        density: clamp(Number(options.density) || 1, 0.05, 8),
        burstRadius: radiusWorld || 0,
        burstReachTime: Math.max(0, Number(options.reachTime) || 0),
        burstLifeScale: clamp(Number(options.lifeScale) || 1, 0.1, 4),
        burstGravityScale: clamp(Number(options.gravityScale) || 1, 0.01, 4),
      };
    }
    // Host-placed bursts only accept real pyrotechnic shell types. Structural
    // types (text, grand-finale-carrier, satellites) need plans and child
    // rockets that a bare point burst cannot supply, so they fall back to a
    // normal peony rather than exploding into nothing.
    _burstType(name) {
      const key = typeof name === "string" ? name.toLowerCase() : "";
      return TYPES.includes(key) ? key : "grand_peony";
    }
    /**
     * Launches the Super Grand Finale — a carrier shell that bursts into
     * satellite rockets, each producing its own multi-layered explosion.
     * @param {Object} [options={}]
     * @param {boolean} [options.stopAfter=false] - Stop automatic launches
     * after the finale; manual finales keep the show running by default.
     * @returns {GrandFireworks}
     */
    launchFinale(options = {}) {
      if (this.options.finale.type === "world-ender" && !options.forceSuper)
        return this.launchWorldEnder(options.worldEnder || {});
      const standalone = this._activateManual("finale");
      this.finalePlayed = true;
      this.finaleStarted = performance.now();
      this.finaleFinishedAt = 0;
      this.pendingRockets.length = 0;
      if (this.rockets.length >= this.options.show.maxRockets)
        this.rockets.length = 0;
      this._createRocket({
        type: "grand-finale-carrier",
        x: 0.5,
        burstHeight: 0.24,
        finale: true,
        colors: ["#FFFFFF", "#FFD700", "#00FFFF"],
      });
      if (standalone || options.stopAfter === true) {
        this.accepting = false;
        this.state = "finale";
      }
      this.dispatchEvent(
        new CustomEvent("finalestage", {
          detail: { stage: "carrier", type: this.options.finale.type },
        }),
      );
      return this;
    }
    // Schedules a World Ender step and tracks it so a new launch or destroy()
    // can cancel the effect cleanly.
    _scheduleWorldEnder(delay, callback) {
      const timer = window.setTimeout(() => {
        this.worldEnderTimers.delete(timer);
        callback();
      }, Math.max(0, Number(delay) || 0));
      this.worldEnderTimers.add(timer);
      return timer;
    }
    _clearWorldEnder() {
      for (const timer of this.worldEnderTimers) window.clearTimeout(timer);
      this.worldEnderTimers.clear();
      if (this.worldEnderListener) {
        this.removeEventListener("finalestage", this.worldEnderListener);
        this.worldEnderListener = null;
      }
      for (const effect of this.worldEnders)
        this.removeEventListener("finalestage", effect.listener);
      this.worldEnders.clear();
      this.worldEnderPrevious = null;
    }
    _worldEnderColors() {
      const palettes = this.options.show.palettes;
      if (Array.isArray(palettes) && palettes.length) {
        const colors = palettes[Math.floor(Math.random() * palettes.length)];
        if (Array.isArray(colors) && colors.length) return colors.slice();
      }
      return ["#FF1744", "#FF9100", "#FFD700", "#00E676", "#00B0FF", "#AA00FF", "#FFFFFF"];
    }
    _spawnWorldEnderShells(origin, count, options = {}) {
      const now = this.effectTime,
        colors = options.colors || this._worldEnderColors(),
        startAngle = options.startAngle ?? -Math.PI / 2,
        spread = options.spread ?? TAU,
        speed = options.speed || [130, 220],
        flight = options.flight || [3000, 3700];
      for (let i = 0; i < count; i++) {
        const angle = startAngle + (spread * i) / count + (Math.random() - 0.5) * (options.jitter ?? 0.08),
          velocity = speed[0] + Math.random() * (speed[1] - speed[0]),
          lifetime = flight[0] + Math.random() * (flight[1] - flight[0]),
          type = typeof options.type === "function" ? options.type(i) : options.type || "grand-finale-burst";
        this.rockets.push({
          x: origin.x, y: origin.y,
          vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
          type, colors, finale: true, satellite: true,
          detonateAt: now + lifetime, sparkClock: 0, angle,
          audioGain: options.audioGain || 1.1, soundType: "launch",
          worldEnderBranch: true,
          worldEnderDepth: options.worldEnderDepth || 0,
          worldEnderId: options.worldEnderId || 0,
        });
      }
    }
    /**
     * Launches the World Ender: one carrier splits into a radial group of
     * finale shells, then each shell becomes a mixed warhead. A small,
     * configurable chance allows a branch to repeat for a limited time.
     * @param {Object} [overrides={}] - Overrides for the `worldEnder` options.
     * @returns {GrandFireworks}
     */
    launchWorldEnder(overrides = {}) {
      const cfg = merge(this.options.worldEnder, overrides);
      // Deliberately does NOT clear a running effect: overlapping enders are allowed,
      // and each keeps its own chain listener and completion timer.
      const id = ++this.worldEnderSeq;
      this.worldEnderResumeRequested = false;
      // Capture the host's real options once. A second World Ender started before
      // the first has finished must not treat the first effect's own inflated
      // limits as the values to restore, or the caps ratchet down permanently with
      // every repeat.
      const previous = this.worldEnderPrevious || {
        accepting: this.accepting,
        finale: { ...this.options.finale },
        show: { ...this.options.show },
        sound: {
          volume: this.options.sound.volume,
          tuning: { ...this.options.sound.tuning },
        },
      };
      this.worldEnderPrevious = previous;
      // Applied to the live options rather than through setOptions(). Resolving
      // again would re-run the renderer's own adjustments — the Canvas2D path
      // halves the particle budget on every pass — so a restore could never put the
      // host back where it started. The engine's own ceilings are still enforced
      // here, exactly as the resolver would; only the renderer accommodation and
      // the write into the host's saved options are skipped.
      // Only a floor, no ceiling: whatever the host configured for the effect is what it
      // gets, and Infinity stays Infinity.
      const cap = (value, min) => Math.max(min, Number(value) || min);
      Object.assign(this.options.show, {
        maxParticles: cap(cfg.maxParticles, 100),
        maxRockets: cap(cfg.maxRockets, 1),
        enabledTypes: "all",
      });
      Object.assign(this.options.finale, {
        trails: cfg.firstSplitCount,
        trailFlight: cfg.secondSplitDelayMs,
        trailSpread: cfg.firstSplitSpreadDegrees,
        burstScale: 1.25,
        particleScale: 1.2,
      });
      this.options.sound.volume = 1;
      this.options.sound.tuning.launchGain =
        previous.sound.tuning.launchGain * cfg.soundBoost;
      // Keep the engine in its manually-launchable state for the carrier;
      // unlike launchFinale(), this effect manages its own completion timer.
      this._activateManual("manual");
      if (cfg.stopAfter !== false) this.accepting = false;
      // Queued automatic launches are dropped, but the rockets already in flight are
      // left alone: wiping them was what made one World Ender vanish the moment
      // another was fired.
      this.pendingRockets.length = 0;
      let primaryBursts = 0;
      const randomWarhead = () => Math.random() < 0.5 ? "thunder_clap" : TYPES[Math.floor(Math.random() * TYPES.length)];
      const onFinaleStage = (event) => {
        const detail = event.detail || {};
        if (detail.stage !== "secondary-burst") return;
        const source = detail.source || {};
        if (source.worldEnderBranch) {
          if (source.worldEnderId !== id) return;
          // Chaining stays exactly as it was: only promoted shells branch onward, even
          // though every branch now reports to the host.
          if (source.type !== "grand-finale-burst") return;
        } else if (this.worldEnders.size && [...this.worldEnders][0].id !== id) {
          // The carrier's own trails belong to the oldest live effect.
          return;
        }
        if (!source.worldEnderBranch && ++primaryBursts > cfg.firstSplitCount) return;
        const depth = source.worldEnderDepth || 0;
        this._spawnWorldEnderShells({ x: detail.x, y: detail.y }, cfg.secondSplitCount, {
          type: () => depth < cfg.maxChainDepth && Math.random() < cfg.promotionChance ? "grand-finale-burst" : randomWarhead(),
          spread: (cfg.firstSplitSpreadDegrees / 360) * TAU,
          speed: cfg.secondSplitSpeed,
          flight: [cfg.secondSplitDelayMs, cfg.secondSplitDelayMs + 700],
          worldEnderDepth: depth + 1,
          worldEnderId: id,
        });
      };
      const effect = { id, listener: onFinaleStage };
      this.worldEnders.add(effect);
      this.worldEnderListener = onFinaleStage;
      this.addEventListener("finalestage", onFinaleStage);
      this._scheduleWorldEnder(cfg.recursionDurationMs, () => {
        this.removeEventListener("finalestage", onFinaleStage);
        this.worldEnders.delete(effect);
        if (this.worldEnderListener === onFinaleStage) this.worldEnderListener = null;
        // Only the last one out restores the host's configuration, so a second ender
        // cannot drop the limits back down while the first is still running.
        if (this.worldEnders.size) return;
        this.worldEnderPrevious = null;
        Object.assign(this.options.show, previous.show);
        Object.assign(this.options.finale, previous.finale);
        this.options.sound.volume = previous.sound.volume;
        Object.assign(this.options.sound.tuning, previous.sound.tuning);
        this.accepting = this.worldEnderResumeRequested || previous.accepting;
      });
      this.launch({ type: "grand-finale-carrier", x: clamp(Number(cfg.carrierX), 0, 1), burstHeight: cfg.carrierBurstHeight, syncAt: this.effectTime + cfg.carrierFlightMs, audioGain: 1, finale: true, angle: 0 });
      return this;
    }
    /**
     * Rasterizes text to a hidden canvas, samples pixel data to generate
     * particle positions, then fires rockets that assemble into the text
     * shape mid-air. Supports multi-line wrapping, character limits, and
     * dissolve animations.
     * @param {string} text - The text to display
     * @param {Object} [overrides={}] - Text firework config overrides
     * @returns {Promise<string[]>} Resolves with the lines rendered
     */
    async launchText(text, overrides = {}) {
      const cfg = merge(this.options.textFirework, overrides);
      if (!cfg.enabled || !text) return [];
      // Rasterisation samples pixels immediately, so a webfont that has not
      // finished loading would be measured with fallback metrics and the text
      // particles would assemble into the wrong shape. Only wait while fonts are
      // actually loading, so the common case still launches synchronously.
      const fonts = global.document && global.document.fonts;
      if (fonts && fonts.status === "loading" && fonts.ready) {
        await fonts.ready;
        if (this.state === "destroyed") return [];
      }
      this._activateManual("manual");
      let value = String(text).trim();
      if (value.length > cfg.maxCharacters)
        value = value.slice(0, cfg.maxCharacters - 1) + "…";
      const lines = this._wrapText(value, cfg);
      if (cfg.exclusive) this.accepting = false;
      const now = this.effectTime,
        plans = this._textPlans(lines, cfg),
        sync = now + 1800,
        total = plans.reduce((n, p) => n + p.points.length, 0),
        reserved = Math.max(
          1,
          Math.floor(this.options.show.maxParticles * 0.9),
        ),
        stride = Math.max(1, Math.ceil(total / reserved));
      if (stride > 1)
        for (const plan of plans)
          plan.points = plan.points.filter((_, i) => i % stride === 0);
      const needed = plans.reduce((n, p) => n + p.points.length, 0),
        keep = Math.max(0, this.options.show.maxParticles - needed);
      while (this.particles.length > keep) {
        const removed = this.particles.shift();
        if (removed) this.pool.push(removed);
      }
      const latestSync =
        sync +
        (cfg.synchronizeExplosions ? 0 : Math.max(0, plans.length - 1) * 250);
      if (cfg.exclusive) {
        this.textReservedUntil =
          latestSync +
          cfg.revealDuration +
          cfg.holdDuration +
          cfg.dissolveDuration +
          cfg.fallDuration;
        this.textExclusiveUntil = this.textReservedUntil;
      }
      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i],
          syncAt = sync + (cfg.synchronizeExplosions ? 0 : i * 250),
          travel = (this.height + 30 - plan.y) / 0.62;
        this.pendingRockets.push({
          launchAt: syncAt - travel,
          textPlan: plan,
          type: "text",
          x: this.width / 2,
          y: this.height + 25,
          burstY: plan.y,
          syncAt,
          colors: cfg.colors,
          cfg,
        });
      }
      this.dispatchEvent(
        new CustomEvent("textlaunch", {
          detail: { text: value, lines, particles: needed },
        }),
      );
      return Promise.resolve(lines);
    }
    // Strips all text-specific rockets, particles, and text blocks.
    // Resets the exclusive reservation so normal fireworks can resume.
    _clearTextEffects() {
      this.pendingRockets = this.pendingRockets.filter((r) => !r.textPlan);
      this.rockets = this.rockets.filter((r) => r.type !== "text");
      for (let i = this.particles.length - 1; i >= 0; i--)
        if (this.particles[i].text)
          this.pool.push(this.particles.splice(i, 1)[0]);
      this.textBlocks.length = 0;
      this.textReservedUntil = 0;
      this.textExclusiveUntil = 0;
      if (this.state === "running") this.accepting = true;
      if (this.textCtx) {
        this.textCtx.clearRect(
          0,
          0,
          this.textCanvas.width,
          this.textCanvas.height,
        );
        this.textCanvas.style.display = "none";
      }
    }
    /**
     * Cancels the currently running text sequence.
     * @param {Object} [options={}]
     * @param {boolean} [options.clear=true] - Also clear text effects
     * @returns {boolean} True if a sequence was cancelled
     */
    cancelTextSequence(options = {}) {
      const sequence = this.textSequence;
      if (!sequence) return false;
      sequence.cancelled = true;
      clearTimeout(sequence.timer);
      this.textSequence = null;
      if (options.clear !== false) this._clearTextEffects();
      const result = {
        status: "cancelled",
        completed: sequence.completed,
        total: sequence.items.length,
      };
      sequence.resolve(result);
      this.dispatchEvent(
        new CustomEvent("textsequencecancel", { detail: result }),
      );
      return true;
    }
    /**
     * Plays a sequence of text fireworks with configurable timing.
     * Each item can be a string or { text, overrides, duration }.
     * Returns a promise that resolves when the sequence completes or is
     * cancelled.
     * @param {Array|string} messages - One or more text items
     * @param {Object} [options={}]
     * @param {number} [options.interval] - Time between items (ms)
     * @param {number} [options.startDelay] - Delay before first item (ms)
     * @param {boolean} [options.clearBetween] - Clear previous text between items
     * @param {boolean} [options.clearOnComplete] - Clear after sequence ends
     * @returns {Promise<{status:string, completed:number, total:number}>}
     */
    launchTextSequence(messages, options = {}) {
      const source = Array.isArray(messages) ? messages : [messages],
        items = source
          .map((item) =>
            typeof item === "object" && item !== null
              ? {
                  text: String(item.text || "").trim(),
                  overrides: merge(
                    options.overrides || {},
                    item.overrides || {},
                  ),
                  duration: Number(item.duration) || 0,
                }
              : {
                  text: String(item || "").trim(),
                  overrides: merge({}, options.overrides || {}),
                  duration: 0,
                },
          )
          .filter((item) => item.text);
      if (!items.length)
        return Promise.resolve({ status: "completed", completed: 0, total: 0 });
      const cancelled = this.cancelTextSequence({
        clear: options.clearExisting !== false,
      });
      if (!cancelled && options.clearExisting !== false)
        this._clearTextEffects();
      const sequence = {
        id: ++this.textSequenceId,
        items,
        completed: 0,
        cancelled: false,
        timer: 0,
        resolve: null,
      };
      this.textSequence = sequence;
      return new Promise((resolve) => {
        sequence.resolve = resolve;
        const finish = () => {
          if (sequence.cancelled) return;
          this.textSequence = null;
          if (options.clearOnComplete) this._clearTextEffects();
          const result = {
            status: "completed",
            completed: sequence.completed,
            total: items.length,
          };
          resolve(result);
          this.dispatchEvent(
            new CustomEvent("textsequenceend", { detail: result }),
          );
        };
        const next = () => {
          if (sequence.cancelled) return;
          if (sequence.completed >= items.length) {
            finish();
            return;
          }
          if (sequence.completed > 0 && options.clearBetween !== false)
            this._clearTextEffects();
          const index = sequence.completed,
            item = items[index],
            cfg = merge(this.options.textFirework, item.overrides);
          this.launchText(item.text, item.overrides);
          sequence.completed++;
          this.dispatchEvent(
            new CustomEvent("textsequenceitem", {
              detail: { index, total: items.length, text: item.text },
            }),
          );
          const stagger = cfg.synchronizeExplosions
              ? 0
              : Math.max(0, cfg.maxLines - 1) * 250,
            automatic =
              1800 +
              stagger +
              cfg.revealDuration +
              cfg.holdDuration +
              cfg.dissolveDuration +
              (Number(options.gap) || 0),
            delay = item.duration || Number(options.interval) || automatic;
          sequence.timer = setTimeout(next, Math.max(0, delay));
        };
        this.dispatchEvent(
          new CustomEvent("textsequencestart", {
            detail: { total: items.length },
          }),
        );
        const startDelay = Math.max(0, Number(options.startDelay) || 0);
        if (startDelay) sequence.timer = setTimeout(next, startDelay);
        else next();
      });
    }
    // Word-wrap algorithm: greedily packs words onto lines, respecting
    // maxCharactersPerLine. Adds ellipsis on overflow if configured.
    _wrapText(text, cfg) {
      const lines = [];
      const requestedLines = String(text).split(/\r?\n/);

      for (const requestedLine of requestedLines) {
        const words = requestedLine.trim().split(/\s+/).filter(Boolean);
        let line = "";

        for (const word of words) {
          const next = line ? line + " " + word : word;
          if (next.length <= cfg.maxCharactersPerLine) {
            line = next;
          } else {
            if (line) lines.push(line);
            line = word;
          }
          if (lines.length === cfg.maxLines) break;
        }

        if (lines.length < cfg.maxLines)
          lines.push(line);
        if (lines.length === cfg.maxLines) break;
      }

      const used = lines.join("\n").length;
      if (used < String(text).length && lines.length) {
        if (cfg.overflow === "ellipsis")
          lines[lines.length - 1] =
            lines[lines.length - 1].replace(/[.…]*$/, "") + "…";
      }
      return lines.slice(0, cfg.maxLines);
    }
    // Rasterizes each line of text to an off-screen canvas, then samples
    // pixel alpha at a configurable step interval. Each opaque pixel
    // becomes a target (x, y) coordinate for a text particle to animate to.
    _textPlans(lines, cfg) {
      const inset = 4,
        lineWidth = Math.max(280, Math.floor(this.width * cfg.maxWidth)),
        measure = document.createElement("canvas").getContext("2d");
      // fillText squeezes text that is wider than its maxWidth horizontally,
      // which makes long lines look tall and narrow on small screens. Shrink
      // the font for the whole block instead so every line keeps its shape.
      measure.font = `${cfg.fontWeight} ${cfg.fontSize}px ${cfg.fontFamily}`;
      const widest = Math.max(
          1,
          ...lines.map((line) => measure.measureText(line).width || 0),
        ),
        fontSize = Math.max(
          1,
          Math.floor(
            cfg.fontSize * Math.min(1, (lineWidth - inset * 2) / widest),
          ),
        );
      const plans = [],
        block = fontSize * cfg.lineHeight * lines.length,
        top = this.height * cfg.verticalPosition - block / 2,
        // The block is centred on the requested position, kept inside the canvas so a
        // position near an edge cannot push the text half off screen.
        halfBlock = lineWidth / 2,
        centreX = clamp(
          this.width * (cfg.horizontalPosition ?? 0.5),
          halfBlock,
          this.width - halfBlock,
        );
      lines.forEach((line, i) => {
        // Render the line to an off-screen canvas at the fitted font size
        const off = document.createElement("canvas"),
          x = off.getContext("2d");
        off.width = lineWidth;
        off.height = Math.ceil(fontSize * 1.45);
        x.fillStyle = "#fff";
        x.textAlign = ["left", "right"].includes(cfg.textAlign)
          ? cfg.textAlign
          : "center";
        x.textBaseline = "middle";
        x.font = `${cfg.fontWeight} ${fontSize}px ${cfg.fontFamily}`;
        const textX =
          x.textAlign === "left"
            ? inset
            : x.textAlign === "right"
              ? off.width - inset
              : off.width / 2;
        x.fillText(line, textX, off.height / 2, off.width - inset * 2);
        // Sample the image data: any pixel with alpha > 100 becomes a
        // particle target point. Step size is scaled by particleScale
        // so higher quality = more particles.
        const data = x.getImageData(0, 0, off.width, off.height).data,
          points = [],
          step = Math.max(
            2,
            Math.round(
              cfg.particleSpacing / this.options.performance.particleScale,
            ),
          );
        for (let py = 0; py < off.height; py += step)
          for (let px = 0; px < off.width; px += step)
            if (data[(py * off.width + px) * 4 + 3] > 100)
              points.push({
                x: centreX - off.width / 2 + px,
                y: top + i * fontSize * cfg.lineHeight + py,
              });
        plans.push({
          line,
          fontSize,
          points,
          x:
            x.textAlign === "left"
              ? centreX - off.width / 2
              : x.textAlign === "right"
                ? centreX + off.width / 2
                : centreX,
          y: top + i * fontSize * cfg.lineHeight + off.height / 2,
        });
      });
      return plans;
    }
    // Schedules a rocket for future launch. Used for the opening salvo
    // and grouped salvo follow-up shots.
    _queueRocket(time) {
      this.pendingRockets.push({ launchAt: time });
    }
    /* ── Sound ─────────────────────────────────────────────────────── */

    /** Enables procedural audio synthesis and fires up the AudioContext. */
    enableSound() {
      this.setOptions({ sound: { enabled: true } });
      this._audio(true);
      return this;
    }
    /** Suspends audio and tears down the ambience source. */
    disableSound() {
      this.setOptions({ sound: { enabled: false } });
      if (this.audioAmbience) {
        try { this.audioAmbience.source.stop(); } catch (e) {}
        this.audioAmbience = null;
      }
      this.audioVoices.forEach((voice) => {
        try { voice.source.stop(); } catch (e) {}
      });
      this.audioVoices.length = 0;
      if (this.audioContext && this.audioContext.state !== "closed") {
        try { this.audioContext.suspend(); } catch (e) {}
      }
      return this;
    }
    /** Sets master volume to 0 (muted) or restores previous level. */
    setMuted(muted = true) {
      return this.setOptions({
        sound: { volume: muted ? 0 : this.options.sound.volume || 0.3 },
      });
    }
    _syncAmbience(a) {
      const level = clamp(Number(this.options.sound.ambience), 0, 0.12);
      if (!level) {
        if (this.audioAmbience) {
          try {
            this.audioAmbience.source.stop();
          } catch (e) {}
          this.audioAmbience = null;
        }
        return;
      }
      if (!this.audioAmbience) {
        const source = this._noise(a, 5),
          filter = a.createBiquadFilter(),
          gain = a.createGain();
        source.loop = true;
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(950, a.currentTime);
        if (filter.Q) filter.Q.value = 0.35;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioMaster || a.destination);
        source.start();
        this.audioAmbience = { source, gain };
      }
      this.audioAmbience.gain.gain.setValueAtTime(level, a.currentTime);
    }
    _audio(unlock = false) {
      if (!this.options.sound.enabled) return null;
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return null;
      try {
        if (!this.audioContext || this.audioContext.state === "closed") {
          this.audioContext = new Audio();
          // iOS mutes Web Audio entirely while the hardware silent switch is on
          // unless the session is declared as playback (Safari 16.4+).
          if (global.navigator && global.navigator.audioSession)
            global.navigator.audioSession.type = "playback";
          this.audioMaster = this.audioContext.createGain();
          this.audioMaster.gain.setValueAtTime(
            clamp(Number(this.options.sound.volume), 0, 1),
            this.audioContext.currentTime,
          );
          const compressor =
            this.audioContext.createDynamicsCompressor &&
            this.audioContext.createDynamicsCompressor();
          if (compressor) {
            compressor.threshold.value = -18;
            compressor.knee.value = 18;
            compressor.ratio.value = 8;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.18;
            this.audioMaster.connect(compressor);
            compressor.connect(this.audioContext.destination);
          } else this.audioMaster.connect(this.audioContext.destination);
        }
        if (this.audioMaster)
          this.audioMaster.gain.setValueAtTime(
            clamp(Number(this.options.sound.volume), 0, 1),
            this.audioContext.currentTime,
          );
        this._syncAmbience(this.audioContext);
        if (unlock && this.audioContext.state === "suspended") {
          const resumed = this.audioContext.resume();
          if (resumed && resumed.catch) resumed.catch(() => {});
        }
        return this.audioContext;
      } catch (e) {
        return null;
      }
    }
    _soundOutput(a, position) {
      const gain = a.createGain(),
        pan = clamp(
          Number(position === undefined ? 0.5 : position) * 2 - 1,
          -1,
          1,
        );
      if (this.options.sound.stereo !== false && a.createStereoPanner) {
        const panner = a.createStereoPanner();
        panner.pan.setValueAtTime(pan, a.currentTime);
        gain.connect(panner);
        panner.connect(this.audioMaster || a.destination);
      } else gain.connect(this.audioMaster || a.destination);
      return gain;
    }
    _noise(a, duration) {
      const source = a.createBufferSource(),
        buffer = a.createBuffer(
          1,
          Math.max(1, Math.ceil(a.sampleRate * duration)),
          a.sampleRate,
        ),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      source.buffer = buffer;
      return source;
    }
    _trackVoice(source) {
      const voice = { source };
      this.audioVoices.push(voice);
      source.onended = () => {
        const i = this.audioVoices.indexOf(voice);
        if (i >= 0) this.audioVoices.splice(i, 1);
      };
      const limit = clamp(
        Math.round(Number(this.options.sound.maxVoices) || 36),
        4,
        96,
      );
      while (this.audioVoices.length > limit) {
        const oldest = this.audioVoices.shift();
        try {
          oldest.source.stop();
        } catch (e) {}
      }
    }
    // Generates a buffer of white noise and routes it through a
    // BiquadFilter for shaping. The filter type and frequency sweep
    // depend on the sound type:
    //   launch  → bandpass sweep down (whoosh)
    //   whistle → bandpass with wobble modulation (oscillating pitch)
    //   explode → lowpass sweep down (boom)
    //   crackle → bandpass at high frequency (snap/crackle)
    // Whistle sounds also layer a sine/triangle oscillator on top
    // of the noise for a tonal component.
    _playNoise(type, position, startDelay = 0, accent = 1, boomStyle = "classic") {
      const a = this._audio(false),
        vol = clamp(Number(this.options.sound.volume), 0, 1),
        t = this.options.sound.tuning || {};
      if (!a || !vol || a.state === "closed") return;
      const launchGain = clamp(Number(t.launchGain) || 0.055, 0.005, 0.2),
        launchEnd = clamp(Number(t.launchEnd) || 620, 120, 1800),
        whistleStart = clamp(Number(t.whistleStart) || 1300, 400, 5000),
        whistleEnd = clamp(Number(t.whistleEnd) || 4200, 800, 8000),
        whistleDuration = clamp(Number(t.whistleDuration) || 1.35, 0.3, 3),
        whistleGain = clamp(Number(t.whistleGain) || 0.045, 0.005, 0.15),
        whistleWobbleRate = clamp(
          Number(t.whistleWobbleRate) || 7,
          1,
          18,
        ),
        whistleWobbleDepth = clamp(
          Number(t.whistleWobbleDepth) || 0.1,
          0.01,
          0.35,
        ),
        whistleWave = ["sine", "triangle", "sawtooth", "square"].includes(
          t.whistleWave,
        )
          ? t.whistleWave
          : "sine",
        boomProfiles = {
          classic: { duration: 1, gain: 1, cutoff: 1, q: 0.7 },
          deep: { duration: 1.45, gain: 1.14, cutoff: 0.52, q: 0.48 },
          artillery: { duration: 0.58, gain: 1.28, cutoff: 1.9, q: 1.08 },
          double: { duration: 0.88, gain: 1.08, cutoff: 0.9, q: 0.78 },
          rolling: { duration: 1.85, gain: 0.88, cutoff: 0.68, q: 0.42 },
        },
        boomProfile = boomProfiles[boomStyle] || boomProfiles.classic,
        boomVariation =
          type === "explode"
            ? 1 + (Math.random() * 2 - 1) * this.options.sound.boomVariation
            : 1,
        boomDuration = clamp(
          (Number(t.boomDuration) || 1.08) * boomProfile.duration * boomVariation,
          0.25,
          3,
        ),
        boomGain = clamp(
          (Number(t.boomGain) || 0.42) * boomProfile.gain * boomVariation,
          0.05,
          1.25,
        ),
        boomCutoff = clamp(
          (Number(t.boomCutoff) || 230) * boomProfile.cutoff * boomVariation,
          60,
          700,
        ),
        crackleGain = clamp(Number(t.crackleGain) || 0.045, 0.005, 0.15),
        cracklePitch = clamp(Number(t.cracklePitch) || 1350, 400, 5000),
        at = a.currentTime + Math.max(0, startDelay),
        duration =
          type === "whistle"
            ? whistleDuration
            : type === "launch"
              ? 0.78
              : type === "crackle"
                ? 0.055
                : boomDuration,
        output = this._soundOutput(a, position),
        source = this._noise(a, duration),
        filter = a.createBiquadFilter(),
        gain = output.gain;
      filter.type =
        type === "crackle" || type === "whistle"
          ? "bandpass"
          : type === "launch"
            ? "bandpass"
            : "lowpass";
      filter.frequency.setValueAtTime(
        type === "whistle"
          ? whistleStart
          : type === "launch"
            ? 180
            : type === "crackle"
              ? cracklePitch
              : boomCutoff,
        at,
      );
      if (type === "whistle") {
        const wobbleSteps = Math.max(
          3,
          Math.round(duration * whistleWobbleRate * 2),
        );
        for (let step = 1; step <= wobbleSteps; step++) {
          const progress = step / wobbleSteps,
            base = whistleStart * Math.pow(whistleEnd / whistleStart, progress),
            wobble = step % 2 ? 1 + whistleWobbleDepth : 1 - whistleWobbleDepth;
          filter.frequency.setValueAtTime(base * wobble, at + duration * progress);
        }
      } else {
        filter.frequency.exponentialRampToValueAtTime(
          type === "launch"
            ? launchEnd
            : type === "crackle"
              ? 900
              : 28,
          at + duration * 0.82,
        );
      }
      if (filter.Q)
        filter.Q.value =
          type === "whistle"
            ? 5.2
            : type === "launch"
              ? 1.15
              : type === "crackle"
                ? 0.55
                : boomProfile.q;
      const level =
        vol *
        (type === "whistle"
          ? whistleGain
          : type === "launch"
            ? launchGain
            : type === "crackle"
              ? crackleGain
              : boomGain) *
        accent;
      gain.setValueAtTime(0.001, at);
      gain.exponentialRampToValueAtTime(
        Math.max(0.002, level),
        at + Math.min(0.1, duration * 0.22),
      );
      gain.exponentialRampToValueAtTime(0.001, at + duration);
      source.connect(filter);
      filter.connect(output);
      source.start(at);
      source.stop(at + duration + 0.02);
      this._trackVoice(source);
      if (type === "whistle" && a.createOscillator) {
        const tone = a.createOscillator(),
          toneGain = this._soundOutput(a, position);
        tone.type = whistleWave;
        const toneStart = whistleStart * (0.92 + Math.random() * 0.08),
          toneEnd = whistleEnd * (0.9 + Math.random() * 0.1),
          wobbleSteps = Math.max(
            3,
            Math.round(duration * whistleWobbleRate * 2),
          );
        tone.frequency.setValueAtTime(toneStart, at);
        for (let step = 1; step <= wobbleSteps; step++) {
          const progress = step / wobbleSteps,
            base = toneStart * Math.pow(toneEnd / toneStart, progress),
            wobble = step % 2 ? 1 + whistleWobbleDepth : 1 - whistleWobbleDepth;
          tone.frequency.setValueAtTime(base * wobble, at + duration * progress);
        }
        toneGain.gain.setValueAtTime(0.001, at);
        toneGain.gain.exponentialRampToValueAtTime(
          Math.max(0.001, vol * whistleGain * 0.3 * accent),
          at + 0.12,
        );
        toneGain.gain.exponentialRampToValueAtTime(0.001, at + duration);
        tone.connect(toneGain);
        tone.start(at);
        tone.stop(at + duration + 0.02);
        this._trackVoice(tone);
      }
    }
    _playSound(type, position = 0.5, accent = 1, delay = 0) {
      if (
        !this.options.sound.enabled ||
        clamp(Number(this.options.sound.volume), 0, 1) <= 0
      )
        return;
      if (type === "launch" || type === "whistle") {
        this._playNoise(type, position, delay, accent);
        return;
      }
      if (type === "crackle") {
        const now = performance.now();
        if (now - this.lastCrackleSound < 45) return;
        this.lastCrackleSound = now;
        this._playNoise("crackle", position, delay, accent);
        return;
      }
      if (type === "finale") {
        const style = this._pickBoomStyle();
        this._playBoom(style, position, delay, 1.2 * accent);
        return;
      }
      if (type === "explode") {
        const style = this._pickBoomStyle();
        this._playBoom(style, position, delay, accent);
        this._playNoise("crackle", position, delay + 0.012, 0.6 * accent);
      }
    }
    // Select a single boom character for this shell. Mixed shows off the
    // engine by rotating between natural, deep, artillery, double, and roll.
    _pickBoomStyle() {
      const style = this.options.sound.boomStyle;
      if (style !== "mixed") return style;
      const choices = ["classic", "deep", "artillery", "double", "rolling"];
      return choices[Math.floor(Math.random() * choices.length)];
    }
    _playBoom(style, position, delay, accent) {
      this._playNoise("explode", position, delay, accent, style);
      if (style === "double") {
        this._playNoise("explode", position, delay + 0.12, accent * 0.56, "deep");
      } else if (style === "rolling") {
        this._playNoise("explode", position, delay + 0.2, accent * 0.38, "deep");
        this._playNoise("explode", position, delay + 0.43, accent * 0.22, "deep");
      }
    }
    _scheduleFinaleRhythm(position) {
      if (this.options.sound.finaleRhythm === false) return;
      const beats = [0, 0.25, 0.43, 0.61, 0.96];
      for (let i = 0; i < beats.length; i++)
        this._playBoom(
          this._pickBoomStyle(),
          position,
          beats[i],
          i === beats.length - 1 ? 1.35 : 0.56 + i * 0.1,
        );
    }
    _worldPosition(x) {
      return clamp(x / Math.max(1, this.worldWidth), 0, 1);
    }
    _depthScale(z) {
      const depth = Math.max(1, this.worldWidth / 2);
      const safeZ = Number.isFinite(z) ? z : 0;
      return clamp(1 - (safeZ / depth) * 0.45, 0.3, 1.4);
    }
    _depthSoundDelay(z) {
      const safeZ = Number.isFinite(z) ? z : 0;
      return Math.max(0, safeZ / Math.max(1, this.worldWidth / 2)) * 0.12;
    }
    _mixedStyle() {
      const weights = this.options.mixedStyles || {};
      const choices = Object.keys(STYLES).map(name => [name, Math.max(0, Number(weights[name]) || 0)]);
      const total = choices.reduce((sum, [, weight]) => sum + weight, 0);
      if (!total) return "medium";
      let roll = Math.random() * total;
      for (const [name, weight] of choices) {
        roll -= weight;
        if (roll <= 0) return name;
      }
      return "medium";
    }
    /* ── Internal: Rocket & Particle Creation ───────────────────────── */

    // Creates a rocket with randomized or specified trajectory. Handles
    // both spontaneous launches and text-synced launches (where velocity
    // is calculated backward from the desired detonation time).
    _createRocket(o = {}) {
      if (this.rockets.length >= this.options.show.maxRockets) return;
      const mixedStyleName = this.options.baseStyle === "mixed" && !o.text && !o.finale ? this._mixedStyle() : null,
        mixedStyle = mixedStyleName ? STYLES[mixedStyleName] : null,
        show = mixedStyle ? merge(this.options.show, mixedStyle.show) : this.options.show,
        styleVisuals = mixedStyle ? mixedStyle.visuals : null,
        worldW = this.worldWidth,
        // Launch zone: the portion of the launch horizon currently visible.
        // At zoom 1.0 you see 1 screen-width; launchHorizon=3 means you see
        // the middle 1/3. Zoom out to see more (or all) of the horizon.
        launchHW = Math.min(show.launchHorizon * this.width, worldW) / 2,
        // Launch depth: rockets spawn at random Z distances from the viewer.
        // The depth range equals half the world width — so a rocket can be
        // up to half a screen closer or further, giving real 3D positioning.
        launchDepth = worldW / 2,
        colors = o.colors || this._palette(show.palettes),
        type = o.type || this._type(show.enabledTypes),
        // World-coordinate X: spread across the visible launch zone, centered
        x = o.x === undefined
            ? worldW / 2 + (Math.random() - 0.5) * launchHW * 2
            : o.x,
        // World-coordinate Z: a mix of close, middle, and distant shells.
        // Negative Z is closer to the viewer; positive Z is further away.
        z = (() => {
          if (o.z !== undefined) return o.z;
          const roll = Math.random();
          if (roll < show.closeShellChance) return -launchDepth * (0.25 + Math.random() * 0.3);
          if (roll < show.closeShellChance + 0.3) return 0;
          if (roll < show.closeShellChance + 0.55) return launchDepth * (0.45 + Math.random() * 0.35);
          return launchDepth * (1.05 + Math.random() * 0.35);
        })(),
        apparentScale =
          o.apparentScale === undefined
            ? o.textPlan || o.finale
              ? 1
              : show.minShellScale +
                Math.random() * (show.maxShellScale - show.minShellScale)
            : clamp(Number(o.apparentScale) || 1, 0.25, 2),
        // Depth scale is separate from viewport zoom, which the renderer
        // already applies. Closer shells become larger; distant ones smaller.
        dof =
          o.dof === undefined
            ? clamp(1 - (z / launchDepth) * 0.45, 0.3, 1.4) *
              apparentScale
            : o.dof,
        // World-coordinate Y: burst height scales with zoom and dof so
        // that closer rockets burst taller and further ones burst lower.
        worldH = this.height / this.zoom,
        burstHeightRatio =
          (o.burstHeight === undefined
            ? 0.12 + Math.random() * 0.38
            : o.burstHeight) * Math.pow(dof, 0.5),
        burstY = worldH * burstHeightRatio,
        startY = worldH + 24 / this.zoom,
        // Rocket velocity: scales with dof — closer rockets (bigger dof)
        // fly faster and burst higher, further rockets (smaller dof) are
        // slower and burst lower.
        styleScale = styleVisuals ? clamp(styleVisuals.bloom / 1.25, 0.5, 1.8) : 1,
        vyScale = o.syncAt ? 1 : Math.pow(dof, 0.5),
        remaining = o.syncAt
          ? Math.max(0.2, (o.syncAt - this.effectTime) / 1000)
          : 0,
        flightDistance = Math.max(1, startY - burstY),
        // Use a ballistic launch instead of a constant-speed climb. Rockets
        // now shed upward speed as they approach the burst height, tip into
        // a shallow arc, and detonate just after gravity wins.
        apexLead = o.syncAt ? Math.min(0.08, remaining * 0.2) : 0,
        apexTime = o.syncAt ? Math.max(0.12, remaining - apexLead) : 0,
        launchSpeed = o.syncAt
          ? (2 * flightDistance) / apexTime
          : ((560 + Math.random() * 180) / this.zoom) * vyScale,
        rocketGravity = o.syncAt
          ? launchSpeed / apexTime
          : (launchSpeed * launchSpeed) / (2 * flightDistance),
        vy = -launchSpeed,
        // Z-drift: each rocket has a configurable random Z-angle so it drifts
        // slightly toward/away from the viewer during flight. Creates
        // subtle 3D parallax — rockets aren't perfectly straight up.
        zAngle =
          o.syncAt
            ? 0
            : ((Math.random() * 2 - 1) * show.zAngleRange * Math.PI) / 180,
        vz = o.vz === undefined
          ? Math.tan(zAngle) * Math.abs(vy) * 0.08 * show.zAngleStrength
          : o.vz,
        range = o.finale ? 18 : show.angleRange,
        angle =
          o.angle === undefined
            ? o.syncAt
              ? show.textRocketAngle
              : (Math.random() * 2 - 1) * range
            : Number(o.angle) || 0,
        vx =
          Math.abs(vy) * Math.tan((angle * Math.PI) / 180) * show.angleStrength,
        position = clamp(x <= 1 ? x : x / worldW, 0, 1),
        // Audio volume: base random gain multiplied by distance falloff.
        // Rockets closer to viewer (negative z) sound louder, further
        // away (positive z) sound quieter. Maps Z range [-depth, +depth]
        // to a 0.3-1.0 multiplier on the base gain.
        zFalloff = clamp(1 - (z / launchDepth) * 0.5, 0.3, 1),
        depth = clamp(
          (o.audioGain === undefined
            ? o.finale
              ? 0.9
              : 0.5 + Math.random() * 0.45
            : clamp(Number(o.audioGain), 0.2, 1)) *
            zFalloff *
            apparentScale,
          0.2,
          1.5,
        ),
        soundType =
          !o.text &&
          !o.finale &&
          Math.random() < clamp(Number(this.options.sound.whistleChance), 0, 1)
            ? "whistle"
            : "launch";
      this._playSound(soundType, position, depth, Math.max(0, z / launchDepth) * 0.12);
      this.rockets.push({
        // x is in world coords; the renderer maps to screen via zoom
        x: x <= 1 ? worldW * x : x,
        y: startY,
        z,
        vx,
        vy,
        vz,
        burstY,
        gravity: rocketGravity,
        burstFallSpeed: o.syncAt ? 0 : 10 + Math.random() * 12,
        detonateAt: o.syncAt || null,
        dof,
        apparentScale,
        styleScale,
        styleName: mixedStyleName,
        type,
        colors,
        finale: o.finale,
        textPlan: o.textPlan,
        cfg: o.cfg,
        angle,
        sparkClock: 0,
        audioGain: depth,
        soundType,
      });
    }
    // Picks a random shell type from the enabled list.
    _type(enabledTypes = this.options.show.enabledTypes) {
      if (Math.random() < this.options.show.grandFinaleShellChance)
        return "grand-finale-bomb";
      const e = enabledTypes;
      const list = e === "all" ? TYPES : e;
      return list[Math.floor(Math.random() * list.length)];
    }
    // Selects a palette: either from the user-defined array (with
    // normalizePalette), from the built-in PALETTES list, or via a
    // user-supplied function that returns colors dynamically.
    _palette(p = this.options.show.palettes) {

      if (p === "default" || !p) {
        return PALETTES[Math.floor(Math.random() * PALETTES.length)];
      }

      // "single" makes every shell one solid colour, so a volley reads as a set
      // of distinct monochrome breaks instead of a wash of gradients.
      if (p === "single") {
        return solidPalette();
      }

      if (typeof p === "function") {
        return normalizePalette(p());
      }

      if (Array.isArray(p) && p.length > 0) {
        const chosen = p[Math.floor(Math.random() * p.length)];

        if (Array.isArray(chosen)) {
          return normalizePalette(chosen);
        }

        // A flat array of colour strings is a pool of solid shells: one colour
        // per break, never a ramp. Passing colours this way used to fall through
        // to PALETTES[0], which silently ignored them.
        if (typeof chosen === "string") {
          return solidPalette(chosen);
        }
      }

      return PALETTES[0];
    }
    /* ── Internal: Main Loop ───────────────────────────────────────── */

    // The rAF-driven game loop. On each frame it:
    //   1. Calculates dt (capped at 50ms to prevent spiral-of-death)
    //   2. Runs adaptive quality adjustments every 2 seconds
    //   3. Calls _update (physics), _drawItems (collect → render), _drawText
    //   4. Calls _finish (state machine for stopping/finale)
    // The trailFade value is frame-rate-normalized so trails look
    // consistent regardless of actual FPS.
    _loop() {
      if (
        this.raf ||
        ["stopped", "idle", "paused", "destroyed"].includes(this.state)
      )
        return;
      const frame = (now) => {
        this.raf = 0;
        if (["stopped", "paused", "destroyed"].includes(this.state)) return;
        if (this.resizePending) this._resize();
        const realDt = Math.min(
            0.05,
            (now - this.lastTime) / 1000 || 0.016,
          ),
          dt = realDt * this.options.speedMultiplier;
        this.lastTime = now;
        this.effectTime += dt * 1000;
        const effectNow = this.effectTime;
        this.fps += (1 / realDt - this.fps) * 0.05;
        if (this.state === "running") {
          this.elapsed += realDt * 1000;
          if (
            this.runtimeDuration > 0 &&
            this.elapsed >= this.runtimeDuration
          )
            this._durationReached(now);
        }
        // Adaptive quality: every 2 seconds, compare actual FPS to target.
        // If we're below 78% of target, dial quality down (fewer particles).
        // If above 93%, gradually dial back up. Hysteresis prevents flapping.
        if (this.options.performance.adaptive && now >= this.nextAdapt) {
          const target = this.options.performance.fps;
          this.nextAdapt = now + 2000;
          if (this.fps < target * 0.78)
            this.quality = Math.max(0.6, this.quality - 0.1);
          else if (this.fps > target * 0.93)
            this.quality = Math.min(1, this.quality + 0.05);
        }
        this._update(effectNow, dt);
      // Frame-rate-normalized trail fade. The pow() call ensures trails
      // look the same regardless of actual frame time — faster frames
      // fade less per frame, slower frames fade more.
      const trailFade = this.options.visuals.trails
          ? 1 - Math.pow(1 - this.options.visuals.trailFade, dt * 60)
          : 1;
        this.renderer.render(
          this._drawItems(effectNow),
          this.width,
          this.height,
          trailFade,
          this.zoom,
        );
        this._drawText(effectNow);
        if (this.fpsEl)
          this.fpsEl.textContent = `${Math.round(this.fps)} fps · ${this.particles.length} particles · ${this.rendererType}`;
        this._finish(now);
        this.raf = requestAnimationFrame(frame);
      };
      this.raf = requestAnimationFrame(frame);
    }
    // Called once the show's runtime duration has elapsed. "immediate" ends
    // the show at once; "graceful" (the default) winds down first so in-flight
    // shells can finish and the duration-triggered finale can still run.
    // This is the documented durationMode contract from index.d.ts.
    _durationReached(now) {
      this.accepting = false;
      if (this.options.durationMode === "immediate") return this._fade(false);
      this.state = "finishing";
      this.finishStarted = now;
      this.wantFinale = this._finaleTriggered("duration");
      this.stopPromise = new Promise((resolve) => (this.stopResolve = resolve));
    }
    // Recalculates canvas dimensions and DPR. Fires on window resize,
    // container resize (ResizeObserver), or DPR change.
    _resize() {
      this.resizePending = false;
      const r =
          this.options.mode === "fullscreen"
            ? { width: innerWidth, height: innerHeight }
            : this.container.getBoundingClientRect(),
        width = Math.max(1, r.width),
        height = Math.max(1, r.height),
        dpr = Math.min(devicePixelRatio || 1, this.options.performance.dprCap);
      // Safari fires resize for every step of the URL bar sliding away while the
      // viewport settles. Reallocating the drawing buffer and both text canvases
      // for a size that has not actually changed is pure waste, so bail out.
      if (
        this.renderer.dpr &&
        width === this.width &&
        height === this.height &&
        dpr === this.dpr
      )
        return;
      this.width = width;
      this.height = height;
      this.worldWidth = this.width / this.zoom;
      this.dpr = dpr;
      this.renderer.resize(this.width, this.height, this.dpr);
      this.textCanvas.width = Math.round(this.width * this.dpr);
      this.textCanvas.height = Math.round(this.height * this.dpr);
      this.textCanvas.style.width = this.width + "px";
      this.textCanvas.style.height = this.height + "px";
      this.textCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    /* ── Internal: Physics Update ──────────────────────────────────── */

    // The core update tick. Processes in this order:
    //   1. Release text-exclusive lock if the reservation has expired
    //   2. Spawn queued rockets whose launchAt time has arrived
    //   3. Auto-launch new rockets based on intensity and interval
    //   4. Move in-flight rockets, spawn exhaust particles, detect burst
    //   5. Update all particles (standard physics or text-animation modes)
    //   6. Age out dead/off-screen particles and expired flashes
    // All loops scan backward so splicing is safe.
    _update(now, dt) {
      // Retarget a subtle show-wide breeze every few seconds, then ease into
      // it. This avoids particles all drifting in a robotic fixed direction.
      if (now >= this.wind.nextRetarget) {
        this.wind.target =
          (Math.random() * 2 - 1) * this.options.visuals.windStrength;
        this.wind.nextRetarget = now + 4000 + Math.random() * 5000;
      }
      this.wind.current +=
        (this.wind.target - this.wind.current) * Math.min(1, dt * 0.3);
      const windDrift = this.wind.current * dt * 60;
      if (
        this.state === "running" &&
        this.textExclusiveUntil &&
        now >= this.textExclusiveUntil
      ) {
        this.textExclusiveUntil = 0;
        this.accepting = true;
      }
      for (let i = this.pendingRockets.length - 1; i >= 0; i--) {
        const q = this.pendingRockets[i];
        if (now >= q.launchAt) {
          this.pendingRockets.splice(i, 1);
          this._createRocket(
            q.textPlan
              ? {
                  type: "text",
                  x: 0.5,
                  burstHeight: q.textPlan.y / this.height,
                  colors: q.colors,
                  textPlan: q.textPlan,
                  cfg: q.cfg,
                  syncAt: q.syncAt,
                }
              : {},
          );
        }
      }
      const motionScale = this._motionReduced() ? 0.35 : 1;
      if (
        this.accepting &&
        now - this.lastLaunch >
          this.options.show.launchInterval /
            (this.options.show.intensity * motionScale)
      ) {
        const load =
            this.particles.length /
            Math.max(
              1,
              this.options.show.maxParticles * this.quality * motionScale,
            ),
          grouped =
            !this._motionReduced() && this.options.visuals.groupedSalvos,
          count =
            grouped && load < 0.58 ? 1 + Math.floor(Math.random() * 3) : 1;
        // Scale rocket count by visible launch horizon. When zoomed out,
        // the wider visible area needs proportionally more rockets to
        // maintain density. Capped by launchHorizon so empty edges don't
        // waste rockets when zoomed far out.
        const horizonScale = Math.min(
          this.options.show.launchHorizon,
          1 / this.zoom,
        );
        for (let i = 0; i < Math.max(1, Math.round(count * horizonScale)); i++)
          this._createRocket();
        if (grouped && load < 0.48 && Math.random() < 0.5) {
          this._queueRocket(now + 300 + Math.random() * 450);
          if (Math.random() < 0.45)
            this._queueRocket(now + 480 + Math.random() * 500);
        }
        this.lastLaunch = now;
      }
      for (let i = this.rockets.length - 1; i >= 0; i--) {
        const r = this.rockets[i];
        r.x += r.vx * dt + windDrift;
        r.y += r.vy * dt;
        // Explicit undefined check, not `|| 45`: a host-launched rocket sets
        // gravity to 0 on purpose so it flies straight to its target, and a
        // falsy fallback would silently bend it off course.
        r.vy +=
          (r.satellite ? 28 : r.gravity === undefined ? 45 : r.gravity) * dt;
        // Z-drift: rocket moves toward or away from viewer. Update Z
        // position and recalculate dof — closer = bigger, further = smaller.
        if (r.vz) r.z += r.vz * dt;
        r.dof = this._depthScale(r.z) * (r.apparentScale || 1);
        r.sparkClock += dt;
        // Rocket exhaust: spawn small trailing sparks behind the rocket.
        // Satellites produce exhaust more frequently and with larger particles.
        if (
          this.options.visuals.rocketExhaust &&
          r.type !== "text" &&
          r.sparkClock >= (r.satellite ? 0.018 : 0.032)
        ) {
          r.sparkClock = 0;
          this._spawn({
            x: r.x + (Math.random() - 0.5) * 4,
            y: r.y + (r.satellite ? 0 : 6),
            vx: -r.vx * 0.002 + (Math.random() - 0.5) * 0.8,
            vy: -r.vy * 0.002 + 1 + Math.random() * 2,
            color: r.colors[0],
            size: (r.satellite ? 1.3 : 0.8) + Math.random() * 1.8,
            life: 520 + Math.random() * 480,
            gravity: 0.045,
            friction: 0.965,
            z: r.z,
            vz: r.vz || 0,
            dof: r.dof,
            depthScale: r.apparentScale || 1,
            sparkle: true,
            star: r.satellite && Math.random() < 0.12,
            exhaust: true,
          });
        }
        if (
          (r.detonateAt && now >= r.detonateAt) ||
          (!r.satellite && !r.detonateAt && r.vy >= r.burstFallSpeed)
        ) {
          this._explode(r, now);
          this.rockets.splice(i, 1);
        }
      }
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i],
          age = now - p.birth;
        if (p.crackleDelay && !p.crackled && age >= p.crackleDelay) {
          p.crackled = true;
          for (let n = 0; n < 6; n++) {
            const a = Math.random() * TAU,
              s = 0.4 + Math.random() * 2;
            this._spawn({
              x: p.x,
              y: p.y,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              color: "#FFFFFF",
              size: 0.5 + Math.random(),
              life: 280 + Math.random() * 420,
              gravity: 0.06,
              friction: 0.94,
              sparkle: true,
            });
          }
        }
        // Text particles use cubic ease-out to fly from burst point to
        // their target position in the text shape, with sine-wave spiral
        // decoration during the flight for visual flair.
        if (p.text && p.hybrid) {
          if (now < p.releaseAt) {
            p.x = p.tx;
            p.y = p.ty;
            p.alpha = 0;
          } else {
            const released = now - p.releaseAt;
            p.vy += p.gravity * dt * 60;
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.alpha =
              clamp(1 - released / p.fall, 0, 1) *
              (p.twinkle ? 0.55 + 0.45 * Math.sin(p.phase + age * 0.02) : 1);
          }
        // Non-hybrid text particles: cubic ease-out from burst to target,
        // hold in place with subtle shimmer, then gravity drop.
        } else if (p.text) {
          if (age < p.assemble) {
            const t = 1 - Math.pow(1 - age / p.assemble, 3);
            p.x =
              p.sx +
              (p.tx - p.sx) * t +
              Math.sin(p.phase + age * 0.02) * (1 - t) * 20;
            p.y =
              p.sy +
              (p.ty - p.sy) * t +
              Math.cos(p.phase + age * 0.017) * (1 - t) * 20;
          } else if (age < p.assemble + p.hold) {
            p.x = p.tx + Math.sin(p.phase + age * 0.012) * 1.2;
            p.y = p.ty + Math.cos(p.phase + age * 0.01) * 1.2;
          } else {
            p.vy += p.gravity * dt * 60;
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
          }
          p.alpha =
            clamp(1 - age / p.life, 0, 1) *
            (p.twinkle ? 0.55 + 0.45 * Math.sin(p.phase + age * 0.02) : 1);
        } else {
          // Standard particle physics — gravity pulls down, friction slows
          // velocity each frame. Special particle types override gravity
          // and friction for distinctive visual behaviors.
          let gravity = p.gravity,
            friction = p.friction;
          // Willow: very light, drifts slowly downward like a weeping willow
          if (p.type === "willow") {
            gravity *= 0.2;
            friction = 0.997;
          // Palm: medium-light, spreads outward in a palm-frond shape
          } else if (p.type === "palm") {
            gravity *= 0.6;
            friction = 0.995;
          // Horsetail: heavy, falls fast in a tight column
          } else if (p.type === "horsetail") {
            gravity *= 1.5;
            friction = 0.98;
          // Fish: sinusoidal swimming motion via oscillating velocity
          // Fish: sinusoidal swimming motion via oscillating velocity
          } else if (p.type === "fish") {
            p.vx += Math.sin(now * 0.01 + p.x * 0.01) * 0.3 * dt * 60;
            p.vy += Math.cos(now * 0.01 + p.y * 0.01) * 0.3 * dt * 60;
          // Spiral: gravitational pull toward the burst center point
          } else if (p.type === "spiral") {
            const dx = p.centerX - p.x,
              dy = p.centerY - p.y,
              d = 1 / (Math.hypot(dx, dy) || 1);
            p.vx += dx * d * 0.05 * dt * 60;
            p.vy += dy * d * 0.05 * dt * 60;
          }
          p.vy += gravity * dt * 60;
          p.vx *= Math.pow(friction, dt * 60);
          p.vy *= Math.pow(friction, dt * 60);
          p.x += p.vx * dt * 60 + windDrift;
          p.y += p.vy * dt * 60;
          p.z += p.vz * dt * 60;
          p.dof = this._depthScale(p.z) * (p.depthScale || 1);
          const sparkPulse =
            p.sparkle &&
            Math.sin(now * 0.052 + p.phase * 2.3) > 0.82
              ? 1.48
              : 1;
          p.size = p.baseSize * p.dof * sparkPulse;
          const lifetime = clamp(age / p.life, 0, 1);
          if (p.pyroBurn) {
            // Firework chemistry has a distinct life cycle: an almost-white
            // ignition, a steady emitter colour, then a warm fading ember.
            const hot = clamp(1 - lifetime / 0.1, 0, 1);
            const ember = clamp((lifetime - 0.72) / 0.28, 0, 1);
            p.r = (p.baseR + (1 - p.baseR) * hot * 0.9) * (1 - ember * 0.35) + ember * 0.35;
            p.g = (p.baseG + (1 - p.baseG) * hot * 0.9) * (1 - ember * 0.78) + ember * 0.075;
            p.b = (p.baseB + (1 - p.baseB) * hot * 0.9) * (1 - ember * 0.96) + ember * 0.015;
            const flicker =
              Math.abs(Math.sin(now * 0.037 + p.phase) * Math.sin(now * 0.023 + p.phase * 1.7));
            const shimmer = p.twinkle ? 0.74 + flicker * 0.26 : 1;
            const spark = sparkPulse > 1 ? 1.18 : 1;
            const fadeProgress = clamp(
              (lifetime - p.fadeStart) / Math.max(0.01, 1 - p.fadeStart),
              0,
              1,
            );
            const individualFade =
              1 - Math.pow(fadeProgress, p.fadePower);
            p.alpha =
              individualFade * p.burnStrength * shimmer * spark;
          } else {
            p.alpha =
              (1 - lifetime) *
              (p.twinkle ? 0.5 + 0.5 * Math.sin(p.phase + age * 0.02) : 1);
          }
        }
        if (
          age >= p.life ||
          p.y > this.height / this.zoom + 120 ||
          p.x < -120 ||
          p.x > this.worldWidth + 120
        ) {
          this.pool.push(p);
          this.particles.splice(i, 1);
        }
      }
      for (let i = this.flashes.length - 1; i >= 0; i--)
        if (now - this.flashes[i].birth >= this.flashes[i].life)
          this.flashes.splice(i, 1);
    }
    // Pulls a particle from the object pool (or creates a new one),
    // assigns all properties, converts hex color to RGB, and pushes
    // onto the active particles array. Returns false if the particle
    // limit is reached (unless it's a text particle, which gets priority).
    _spawn(o) {
      // Record how far this star was launched, against the explosion that owns it. A burst
      // the particle cap throttles to a handful of stars still knows what size it was
      // built for, and because this happens here it covers every shell type — including
      // the ones that spawn particles directly rather than through _burst().
      const owner = this._burstOwner;
      if (owner) {
        const speed = Math.hypot(Number(o.vx) || 0, Number(o.vy) || 0);
        if (speed > 0) {
          const reach = speed / (1 - this._dragFor(o.type, o.friction));
          if (!(owner.plannedReach >= reach)) owner.plannedReach = reach;
        }
      }
      const textPriority = Boolean(o.text),
        motionScale = this._motionReduced() ? 0.4 : 1,
        limit = textPriority
          ? this.options.show.maxParticles
          : this.options.show.maxParticles * this.quality * motionScale;
      if (
        !textPriority &&
        this.textReservedUntil &&
        this.effectTime < this.textReservedUntil
      )
        return false;
      if (this.particles.length >= limit) return false;
      const p = this.pool.pop() || {};
      Object.assign(p, o);
      const c = hex(o.color || "#fff");
      p.r = c[0];
      p.g = c[1];
      p.b = c[2];
      p.baseR = c[0];
      p.baseG = c[1];
      p.baseB = c[2];
      p.birth = o.birth || this.effectTime;
      p.alpha = 1;
      p.phase = Math.random() * TAU;
      p.friction = o.friction || 0.985;
      p.gravity = o.gravity === undefined ? 0.12 : o.gravity;
      p.life = o.life || 2200;
      p.baseSize =
        (o.size || 2) *
        this.options.performance.particleScale *
        this.options.visuals.bloom;
      p.z = Number(o.z) || 0;
      p.vz = Number(o.vz) || 0;
      p.depthScale = Number(o.depthScale) || 1;
      p.dof =
        o.dof === undefined
          ? this._depthScale(p.z) * p.depthScale
          : o.dof;
      p.size = p.baseSize * p.dof;
      p.text = Boolean(o.text);
      p.hybrid = Boolean(o.hybrid);
      // Cinematic-style shimmer is applied per particle, so the bright points
      // blink independently rather than pulsing together as one flat burst.
      p.twinkle = Boolean(o.twinkle) || Math.random() < this.options.visuals.shimmerChance;
      p.sparkle = Boolean(o.sparkle) || Math.random() < this.options.visuals.sparkleChance;
      p.pyroBurn = Boolean(o.pyroBurn) || this.options.visuals.pyroBurn;
      // Real stars do not burn uniformly. Some exhaust their composition
      // quickly, while denser stars remain bright well into the falling arc.
      p.burnStrength = p.pyroBurn ? 0.72 + Math.random() * 0.42 : 1;
      p.fadeStart = p.pyroBurn ? 0.42 + Math.random() * 0.4 : 0;
      p.fadePower = p.pyroBurn ? 0.75 + Math.random() * 1.5 : 1;
      p.star =
        o.star === undefined
          ? (o.size || 2) > 3 && Math.random() < this.options.visuals.starChance
          : Boolean(o.star);
      p.type = o.type || "normal";
      p.crackled = false;
      p.crackleDelay = o.crackleDelay || 0;
      this.particles.push(p);
      return true;
    }
    /* ── Internal: Shell Burst Algorithms ───────────────────────────── */

    // Workhorse burst function. Spawns `count` particles in a ring (or
    // random directions if opts.randomAngles). Each particle gets a
    // velocity vector, color from the rocket's palette, size jitter,
    // and optional crackle delay. Particle types (willow, palm, fish,
    // spiral) affect gravity and drag in _update().
    _burst(r, count, min, max, opts = {}) {
      count = Math.max(
        1,
        Math.floor(
          count *
            this.options.performance.secondary *
            (Number(r.density) || 1),
        ),
      );
      if (opts.crackle && !r.silent) {
        const origin = this._worldPosition(r.x),
          crackles = Math.max(
            1,
            Math.round(
              clamp(
                Number((this.options.sound.tuning || {}).crackleCount) || 5,
                1,
                12,
              ) * this.options.performance.secondary,
            ),
          );
        for (let i = 0; i < crackles; i++)
          this._playNoise(
            "crackle",
            clamp(origin + (Math.random() - 0.5) * 0.18, 0, 1),
            0.68 + Math.random() * 1.55,
            0.3 + Math.random() * 0.35,
          );
      }
      const dof = (r.dof || 1) * (r.styleScale || 1);
      for (let i = 0; i < count; i++) {
        const a = opts.randomAngles
            ? Math.random() * TAU
            : (i / count) * TAU +
              (Math.random() - 0.5) *
                (opts.jitter === undefined ? 0.16 : opts.jitter),
          // Project a uniformly sampled 3D sphere onto the screen. Stars
          // near the camera axis land close to the centre; the broad rim gets
          // the dense silhouette that makes real shell breaks feel spherical.
          sphereZ = this.options.visuals.sphereBurst
            ? Math.random() * 2 - 1
            : 0,
          sphereScale = this.options.visuals.sphereBurst
            ? Math.sqrt(Math.max(0, 1 - sphereZ * sphereZ))
            : 1,
          s =
            (min + Math.random() * (max - min)) *
            this.options.visuals.burstVelocity *
            sphereScale *
            clamp(dof, 0.35, 2);
        if (
          !this._spawn({
            x: r.x,
            y: r.y,
            vx: Math.cos(a) * s,
            vy:
              Math.sin(a) * s * (opts.yScale === undefined ? 1 : opts.yScale) +
              (opts.yBias || 0),
            color: r.colors[i % r.colors.length],
            size:
              (opts.minSize || opts.size || 1.2) +
              Math.random() *
                ((opts.maxSize || 4) - (opts.minSize || opts.size || 1.2)),
            dof,
            depthScale:
              (r.apparentScale || 1) * (r.styleScale || 1),
            z: r.z + sphereZ * max * 7,
            vz:
              (Math.random() - 0.5) * Math.max(0.08, max * 0.025) +
              sphereZ * 0.025,
            life: opts.life || 2200,
            gravity: opts.gravity,
            friction: opts.friction,
            twinkle: opts.twinkle,
            sparkle: opts.sparkle,
            star: opts.star,
            type: opts.type,
            centerX: r.x,
            centerY: r.y,
            crackleDelay: opts.crackle ? 700 + Math.random() * 900 : 0,
          })
        )
          break;
      }
    }
    // Creates a brief radial flash at the explosion point. Styles can tune
    // its colour, size, opacity, and duration independently of the stars.
    _flash(r, now, size = 130) {
      if (!this.options.visuals.explosionFlashes) return;
      const v = this.options.visuals,
        c = hex(v.flashColor || r.colors[0]);
      this.flashes.push({
        x: r.x,
        y: r.y,
        r: c[0],
        g: c[1],
        b: c[2],
        size: size * v.bloom * v.flashScale * (r.dof || 1),
        birth: now,
        life: v.flashLife,
        alpha: v.flashAlpha,
        flash: true,
        star: true,
      });
    }
    // A rare full-scene flash for shells bright enough to overwhelm the
    // virtual camera. A cooldown prevents finales and chains becoming a strobe.
    _flashBang(r, now) {
      const v = this.options.visuals;
      if (
        !this.flashBangLayer ||
        v.flashBangChance <= 0 ||
        Math.random() >= v.flashBangChance ||
        now - this.lastFlashBang < v.flashBangCooldown
      )
        return;

      this.lastFlashBang = now;
      const screenX = clamp((r.x * this.zoom) / this.width, 0, 1) * 100,
        screenY = clamp((r.y * this.zoom) / this.height, 0, 1) * 100,
        reduced = this.reducedMotion,
        peak = reduced ? Math.min(v.flashBangAlpha, 0.4) : v.flashBangAlpha;
      if (typeof this.flashBangLayer.style.setProperty === "function") {
        this.flashBangLayer.style.setProperty("--flash-x", `${screenX}%`);
        this.flashBangLayer.style.setProperty("--flash-y", `${screenY}%`);
      }
      if (this.flashBangAnimation) this.flashBangAnimation.cancel();
      if (typeof this.flashBangLayer.animate !== "function") {
        this.flashBangLayer.style.opacity = String(peak);
        window.setTimeout(() => {
          if (this.flashBangLayer) this.flashBangLayer.style.opacity = "0";
        }, v.flashBangDuration / this.options.speedMultiplier);
        return;
      }
      this.flashBangAnimation = this.flashBangLayer.animate(
        reduced
          ? [
              { opacity: 0 },
              { opacity: peak, offset: 0.12 },
              { opacity: 0 },
            ]
          : [
              { opacity: 0 },
              { opacity: peak, offset: 0.07 },
              { opacity: peak * 0.1, offset: 0.28 },
              { opacity: peak * 0.48, offset: 0.43 },
              { opacity: 0 },
            ],
        {
          duration: v.flashBangDuration / this.options.speedMultiplier,
          easing: "linear",
          fill: "none",
        },
      );
    }
    // Crossette: a shell that splits into smaller "stars" mid-flight.
    // Creates 28+ arms, each splitting into 6 sub-particles in a tight
    // fan pattern. Produces the classic grid-like crossette break.
    _crossette(r) {
      const arms = Math.max(
        8,
        Math.floor(
          28 * this.options.performance.secondary * (Number(r.density) || 1),
        ),
      );
      for (let arm = 0; arm < arms; arm++) {
        const base = (arm * TAU) / arms,
          speed = 4 + Math.random() * 6;
        for (let split = 0; split < 6; split++) {
          const a = base + (split - 2.5) * 0.12 + (Math.random() - 0.5) * 0.12;
          if (
            !this._spawn({
              x: r.x,
              y: r.y,
              vx: Math.cos(a) * speed * (0.55 + Math.random() * 0.45),
              vy: Math.sin(a) * speed * (0.55 + Math.random() * 0.45),
              color: r.colors[(arm + split) % r.colors.length],
              size: 1.2 + Math.random() * 3.8,
              life: 1500 + Math.random() * 900,
              gravity: 0.11,
              friction: 0.985,
              sparkle: true,
              crackleDelay: this.options.visuals.secondaryCrackle
                ? 750 + Math.random() * 650
                : 0,
            })
          )
            return;
        }
      }
    }
    // Starburst: bright arms radiating from center. Each arm has a gradient
    // of speeds (inner slow → outer fast) creating the classic star pattern.
    _starburst(r) {
      const arms = 8 + Math.floor(Math.random() * 4),
        per = Math.max(
          10,
          Math.floor(
            38 * this.options.performance.secondary * (Number(r.density) || 1),
          ),
        );
      for (let arm = 0; arm < arms; arm++) {
        const base = (arm * TAU) / arms;
        for (let i = 0; i < per; i++) {
          const speed = (i / per) * 10 + Math.random() * 2.5,
            a = base + (Math.random() - 0.5) * 0.22;
          if (
            !this._spawn({
              x: r.x,
              y: r.y,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              color: r.colors[i % r.colors.length],
              size: 1.2 + Math.random() * 3.2,
              life: 1800 + Math.random() * 1200,
              gravity: 0.1,
              friction: 0.985,
              star: i % 13 === 0,
            })
          )
            return;
        }
      }
    }
    // Crown Jewel: 5-pronged crown shape pointing upward, with a white
    // diamond at the center. Each prong has a tight angular spread.
    _crown(r) {
      const per = Math.max(
        10,
        Math.floor(
          32 * this.options.performance.secondary * (Number(r.density) || 1),
        ),
      );
      for (let point = 0; point < 5; point++) {
        const base = (point * TAU) / 5 - Math.PI / 2;
        for (let i = 0; i < per; i++) {
          const a = base + (Math.random() - 0.5) * 0.38,
            s = 4 + Math.random() * 5;
          if (
            !this._spawn({
              x: r.x,
              y: r.y,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              color: r.colors[point % r.colors.length],
              size: 1.8 + Math.random() * 3.4,
              life: 2100 + Math.random() * 1300,
              gravity: 0.09,
              friction: 0.987,
              twinkle: true,
              star: i % 11 === 0,
            })
          )
            return;
        }
      }
      this._burst({ ...r, colors: ["#FFFFFF"] }, 24, 0.3, 3, {
        life: 900,
        twinkle: true,
        star: true,
        randomAngles: true,
      });
    }
    // Galactic Spiral: 4 interleaved spiral arms radiating outward.
    // Speed increases with distance from center (i/loop * 8).
    // Particles are type "spiral" so they're gravitationally attracted
    // back to center in _update(), creating the spiral arm effect.
    _spiral(r) {
      const per = Math.max(
        20,
        Math.floor(
          74 * this.options.performance.secondary * (Number(r.density) || 1),
        ),
      );
      for (let spiral = 0; spiral < 4; spiral++) {
        const offset = (spiral * TAU) / 4;
        for (let i = 0; i < per; i++) {
          const a = (i / per) * Math.PI * 4 + offset,
            s = (i / per) * 8 + 1;
          if (
            !this._spawn({
              x: r.x,
              y: r.y,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              color: r.colors[i % r.colors.length],
              size: 1.2 + Math.random() * 3.3,
              life: 2300 + Math.random() * 1200,
              gravity: 0.04,
              friction: 0.993,
              type: "spiral",
              centerX: r.x,
              centerY: r.y,
              twinkle: i % 7 === 0,
            })
          )
            return;
        }
      }
    }
    // Launches satellite rockets from the finale carrier in a radial
    // pattern. Each satellite has its own trajectory and detonates
    // independently, creating a layered multi-burst effect.
    _launchFinaleTrails(r, now) {
      this._scheduleFinaleRhythm(this._worldPosition(r.x));
      const cfg = this.options.finale,
        count = clamp(Math.round(cfg.trails || 10), 3, 20),
        flight = Math.max(500, Number(cfg.trailFlight) || 1100);
      for (let i = 0; i < count; i++) {
        const a =
            -Math.PI / 2 +
            (i / count) * ((cfg.trailSpread / 360) * TAU) +
            (Math.random() - 0.5) * 0.08,
          s = 155 + Math.random() * 95,
          colors = PALETTES[i % PALETTES.length];
        this.rockets.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          type: "grand-finale-burst",
          colors,
          finale: true,
          satellite: true,
          detonateAt: now + flight * (0.84 + Math.random() * 0.3),
          sparkClock: 0,
          angle: a,
        });
      }
      this.dispatchEvent(
        new CustomEvent("finalestage", { detail: { stage: "trails", count } }),
      );
    }
    // Each satellite rocket produces a multi-layered burst: a dense inner
    // ring, a smaller white diamond ring, and a willow trail for hang-time.
    _grandFinaleBurst(r, now, dispatchStage = true) {
      const scale =
        this.options.finale.burstScale * this.options.finale.particleScale;
      // Measured before the bursts so the report below can state how big this break
      // actually was.
      const particlesFrom = this.particles.length;
      this._flash(r, now, 175);
      this._burst(r, Math.round(92 * scale), 3.5, 11, {
        life: 3300,
        twinkle: true,
        sparkle: true,
        minSize: 1.4,
        maxSize: 4.8,
        crackle: this.options.visuals.secondaryCrackle,
      });
      this._burst(
        { ...r, colors: ["#FFFFFF", r.colors[0]] },
        Math.round(30 * scale),
        10.5,
        11.2,
        { life: 2100, jitter: 0.018, minSize: 2.2, maxSize: 5.4, star: true },
      );
      this._burst(r, Math.round(24 * scale), 1.5, 5.5, {
        life: 3900,
        gravity: 0.025,
        yScale: 0.3,
        yBias: -1.2,
        twinkle: true,
        type: "willow",
        randomAngles: true,
      });
      if (dispatchStage)
        this.dispatchEvent(
          new CustomEvent("finalestage", {
            detail: {
              stage: "secondary-burst",
              x: r.x,
              y: r.y,
              // The blast's own reach in world units, so a host can size its damage to
              // what the player can actually see rather than to a guess.
              radius: this._reportRadius(r, particlesFrom),
              source: r,
            },
          }),
        );
    }
    // Wraps the type dispatcher so a host-placed burst can be size-matched to
    // the radius it asked for. Recording the array lengths first is what makes
    // the fit universal — it catches every star the shell spawns, including the
    // shell types that create particles directly instead of via _burst().
    _explode(r, now) {
      const particlesFrom = this.particles.length,
        flashesFrom = this.flashes.length;
      // Every star spawned during this explosion belongs to r, and _spawn records how far
      // each one was launched. That gives the burst a size in its own terms even when the
      // particle cap throttles it, whatever shell type it is.
      const previousOwner = this._burstOwner;
      r.plannedReach = 0;
      this._burstOwner = r;
      this._explodeType(r, now);
      this._burstOwner = previousOwner;
      // Every World Ender branch reports where it broke and how big it was, whatever
      // type it is. Only the finale-burst type used to report, and that is a minority
      // of the chained generations — the rest are warheads, which burst with no report
      // at all, so a host listening for them saw nothing to attribute damage to.
      if (r.worldEnderBranch)
        this.dispatchEvent(
          new CustomEvent("finalestage", {
            detail: {
              stage: "secondary-burst",
              x: r.x,
              y: r.y,
              radius: this._reportRadius(r, particlesFrom),
              source: r,
            },
          }),
        );
      this._fitBurst(r, particlesFrom, flashesFrom);
    }
    // Fits a just-created burst to r.burstRadius (world units). Called after the
    // shell has spawned, so it works by measuring what was actually created
    // rather than guessing from the shell's name.
    //
    // Each star's reach is its launch speed divided by its per-frame drag, which
    // is the distance it would coast to. How far a star actually coasts depends
    // only on the drag it is given, so scaling every velocity by k scales every
    // reach by exactly k — the fit is linear, not an approximation. Gravity is
    // scaled by the same k so the break keeps its shape instead of flattening
    // into a puff at small sizes and ballooning at large ones.
    // The drag a star of this type actually sheds per frame. _update() overrides it for
    // three drifting types, so anything estimating reach has to use the same values the
    // integrator will.
    _dragFor(type, friction) {
      return type === "willow"
        ? 0.997
        : type === "palm"
          ? 0.995
          : type === "horsetail"
            ? 0.98
            : friction || 0.985;
    }
    _particleDrag(p) {
      return this._dragFor(p.type, p.friction);
    }
    // The visible rim of the stars created since index `from`: the 90th percentile of
    // how far each one would coast. Shared by the radius fit and the finalestage
    // reports so a host's damage and the engine's fire can never disagree about how
    // big a break was.
    _burstReach(from) {
      const reaches = [];
      for (let i = from; i < this.particles.length; i++) {
        const p = this.particles[i],
          speed = Math.hypot(p.vx || 0, p.vy || 0);
        if (speed > 0) reaches.push(speed / (1 - this._particleDrag(p)));
      }
      if (!reaches.length) return 0;
      reaches.sort((a, b) => a - b);
      return reaches[Math.min(reaches.length - 1, Math.floor(reaches.length * 0.9))];
    }
    // The radius to report for a burst that has just gone off. Measured from the stars it
    // actually made — but only when there are enough of them to mean anything. A burst
    // throttled by the particle cap spawns a handful, and the 90th percentile of three
    // samples says nothing about how big the break was, so below a real sample the reach
    // it was built for is reported instead. That also keeps the reported size stable from
    // burst to burst under load, which is what a host needs to size its damage.
    _reportRadius(r, particlesFrom) {
      const sampled = this.particles.length - particlesFrom;
      const reach =
        sampled < 20
          ? r.plannedReach || this._burstReach(particlesFrom)
          : this._burstReach(particlesFrom) || r.plannedReach || 0;
      // A willow's stars barely shed speed, so its reach works out several times the size
      // of the screen. A blast larger than the viewport is indistinguishable from a screen
      // clear, which reads to a player as enemies vanishing for no reason, so the report is
      // bounded by the world's own diagonal.
      const limit = Math.hypot(this.width, this.height) / (this.zoom || 1);
      return Math.min(reach, limit);
    }
    _fitBurst(r, particlesFrom, flashesFrom) {
      // A host can shorten how long its sparks linger, so a game's fire fades as it
      // falls instead of hanging around for the shell's whole lifetime.
      const lifeScale = clamp(Number(r.burstLifeScale) || 1, 0.1, 4);
      if (lifeScale !== 1)
        for (let i = particlesFrom; i < this.particles.length; i++)
          this.particles[i].life *= lifeScale;
      // A host can also slow the descent, so a break drifts down instead of
      // dropping. Applied after the radius fit, which already compensates gravity
      // for the drag it introduces, so this is purely the host's preference.
      const gravityScale = clamp(Number(r.burstGravityScale) || 1, 0.01, 4);
      if (gravityScale !== 1)
        for (let i = particlesFrom; i < this.particles.length; i++) {
          const p = this.particles[i];
          if (p.gravity) p.gravity *= gravityScale;
        }
      const target = Number(r.burstRadius) || 0;
      if (target <= 0) return;
      const fitted = [];
      for (let i = particlesFrom; i < this.particles.length; i++) {
        const p = this.particles[i],
          speed = Math.hypot(p.vx || 0, p.vy || 0);
        if (speed > 0) fitted.push({ p, reach: speed / (1 - this._particleDrag(p)) });
      }
      if (!fitted.length) return;
      fitted.sort((a, b) => a.reach - b.reach);
      // The 90th percentile is the visible rim of the break. Targeting the
      // single fastest star would shrink the whole shell to stop a handful of
      // strays from passing the radius, which reads as a stingy explosion.
      const natural =
        fitted[Math.min(fitted.length - 1, Math.floor(fitted.length * 0.9))]
          .reach;
      if (!(natural > 0)) return;
      const k = clamp(target / natural, 0.05, 4);
      for (const entry of fitted) {
        entry.p.vx *= k;
        entry.p.vy *= k;
        if (entry.p.gravity) entry.p.gravity *= k;
      }
      // A host that has to justify its own hit detection can ask for the rim to
      // arrive on a schedule. Without this the fitted reach is the *asymptotic*
      // distance: stars coast outward for well over a second, so a game whose
      // blast is lethal straight away kills things the visible explosion has not
      // reached yet. Retuning drag and speed per star puts the rim where it was
      // asked for, when it was asked for, while preserving each star's relative
      // distance so the break keeps its density profile rather than collapsing
      // into a thin ring.
      const reachTime = Number(r.burstReachTime) || 0;
      if (reachTime > 0) {
        const settled = 0.95,
          frames = clamp(reachTime / (1000 / 60), 2, 900),
          friction = Math.pow(1 - settled, 1 / frames);
        for (const entry of fitted) {
          const p = entry.p;
          // These three star types hard-override their own drag in _update(), so a
          // requested schedule cannot be honoured for them. They keep the
          // asymptotic fit rather than arriving late and looking broken.
          if (p.type === "willow" || p.type === "palm" || p.type === "horsetail")
            continue;
          // Targetting target/settled as the asymptotic reach means the star is
          // exactly at the requested radius once reachTime has elapsed.
          const share = entry.reach / natural,
            speed = ((target * share) / settled) * (1 - friction),
            current = Math.hypot(p.vx, p.vy) || 1,
            // Stronger drag would damp gravity too, leaving the stars hanging
            // motionless instead of raining down. Scaling gravity by the change in
            // drag keeps the terminal fall speed identical, so only the expansion
            // gets faster.
            priorDrag = 1 - (p.friction || 0.985),
            dragRatio = priorDrag > 0 ? (1 - friction) / priorDrag : 1;
          p.vx = (p.vx / current) * speed;
          p.vy = (p.vy / current) * speed;
          if (p.gravity) p.gravity *= dragRatio;
          p.friction = friction;
        }
      }
      // The detonation flash is sized in absolute pixels, so the default 130px
      // flash would swamp a small break. Scale it with the burst, but keep a
      // floor so an accurately small burst still flashes.
      const flashScale = clamp(k, 0.25, 1.6);
      for (let i = flashesFrom; i < this.flashes.length; i++)
        this.flashes[i].size *= flashScale;
    }
    // The main explosion dispatcher. Routes to the correct burst algorithm
    // based on the rocket's type. Handles special cases:
    //   - text rockets → rasterized particle assembly
    //   - grand-finale-carrier → flash + trail satellite launch
    //   - grand-finale-burst → satellite multi-burst
    //   - sovereign-crown → finale crown burst
    //   - all 15 named types → their specific burst pattern
    _explodeType(r, now) {
      if (!r.silent)
        this._playSound(
          r.finale ? "finale" : "explode",
          this._worldPosition(r.x),
          (r.audioGain || 0.75) *
            (r.soundType === "whistle" ? 1.35 : 1) *
            (r.z < 0 ? this.options.sound.nearBoomMultiplier : 1),
          this._depthSoundDelay(r.z || 0),
        );
      if (r.type === "text") {
        const cfg = r.cfg,
          hybrid = cfg.renderMode !== "particles";
        if (cfg.renderMode !== "particles")
          this.textBlocks.push({
            text: r.textPlan.line,
            fontSize: r.textPlan.fontSize,
            x: r.textPlan.x,
            y: r.textPlan.y,
            birth: now,
            cfg,
          });
        if (cfg.renderMode !== "crisp")
          for (let i = 0; i < r.textPlan.points.length; i++) {
            const q = r.textPlan.points[i],
              // Text plans are sampled in screen pixels, while particles are
              // rendered through the zoomed world camera. Invert that camera
              // transform so the assembled text stays locked to its intended
              // screen position at any viewport zoom.
              textX = q.x / this.zoom,
              textY = q.y / this.zoom,
              releaseStart = now + cfg.revealDuration + cfg.holdDuration,
              fraction =
                cfg.dissolveStyle === "left-to-right"
                  ? clamp(q.x / this.width, 0, 1)
                  : cfg.dissolveStyle === "top-down"
                    ? clamp(q.y / this.height, 0, 1)
                    : cfg.dissolveStyle === "random" ||
                        cfg.dissolveStyle === "sparkle"
                      ? Math.random()
                      : i / r.textPlan.points.length,
              releaseAt = releaseStart + fraction * cfg.dissolveDuration;
            if (
              !this._spawn({
                x: textX,
                y: textY,
                sx: r.x,
                sy: r.y,
                tx: textX,
                ty: textY,
                vx: (Math.random() - 0.5) * 0.32,
                vy: -0.08 - Math.random() * 0.18,
                color: cfg.colors[i % cfg.colors.length],
                size: cfg.particleSize,
                life: hybrid
                  ? cfg.revealDuration +
                    cfg.holdDuration +
                    cfg.dissolveDuration +
                    cfg.fallDuration
                  : 500 + cfg.holdDuration + cfg.fallDuration,
                text: true,
                hybrid,
                assemble: 500,
                hold: cfg.holdDuration,
                releaseAt,
                fall: cfg.fallDuration,
                gravity: cfg.gravity,
                birth: now,
                twinkle: cfg.shimmer,
              })
            )
              break;
          }
        return;
      }
      if (r.type === "grand-finale-carrier") {
        this._flash(r, now, 190);
        this._burst(
          { ...r, colors: ["#FFFFFF", "#FFD700"] },
          Math.round(64 * this.options.finale.particleScale),
          2,
          5.5,
          {
            life: 1300,
            twinkle: true,
            sparkle: true,
            randomAngles: true,
            minSize: 1,
            maxSize: 3.4,
          },
        );
        this._launchFinaleTrails(r, now);
        return;
      }
      if (r.type === "grand-finale-burst") {
        // A World Ender branch is reported once by the _explode wrapper, so suppressing
        // the inner dispatch here avoids double-reporting the same break.
        this._grandFinaleBurst(r, now, !r.worldEnderBranch);
        return;
      }
      if (r.type === "grand-finale-bomb") {
        // Standalone spectacle only. It deliberately does not emit finale
        // stage events, launch children, stop the show, or involve World Ender.
        this._grandFinaleBurst(r, now, false);
        return;
      }
      if (r.type === "sovereign-crown") {
        this._flash(r, now, 220);
        this._burst(r, 360, 3, 10, {
          life: 3600,
          twinkle: true,
          sparkle: true,
        });
        this._burst(r, 180, 8, 11, {
          life: 2500,
          minSize: 2.4,
          maxSize: 4.8,
          jitter: 0.015,
        });
        this._burst({ ...r, colors: ["#FFFFFF", "#FFD700"] }, 240, 1, 6, {
          life: 4800,
          gravity: 0.035,
          yScale: 0.35,
          yBias: -2,
          twinkle: true,
          type: "willow",
        });
        return;
      }
      this._flash(r, now, r.type === "thunder_clap" ? 210 : 130);
      this._flashBang(r, now);
      switch (r.type) {
        case "crossette_supreme":
          this._crossette(r);
          break;
        case "starburst":
          this._starburst(r);
          break;
        case "crown_jewel":
          this._crown(r);
          break;
        case "galactic_spiral":
          this._spiral(r);
          break;
        case "royal_palm":
          this._burst(r, 32, 5, 13, {
            life: 2600,
            yScale: 0.25,
            yBias: -5,
            type: "palm",
            minSize: 1.6,
            maxSize: 3.4,
          });
          this._burst({ ...r, y: r.y - 30 }, 135, 4, 9, {
            life: 3000,
            yScale: 0.6,
            yBias: 2,
            type: "palm",
            randomAngles: true,
          });
          break;
        case "majestic_comet":
          this._spawn({
            x: r.x,
            y: r.y,
            vx: 0,
            vy: 0,
            color: "#FFFFFF",
            size: 12,
            life: 700,
            gravity: 0,
            friction: 1,
            star: true,
          });
          this._burst(r, 55, 1, 3, {
            life: 1500,
            yScale: 0.3,
            yBias: 1.5,
            randomAngles: true,
            star: true,
          });
          break;
        case "thunder_clap":
          this._burst({ ...r, colors: ["#FFFFFF"] }, 105, 11, 25, {
            life: 650,
            minSize: 2.5,
            maxSize: 7,
            randomAngles: true,
            star: true,
          });
          this._burst(r, 210, 5, 15, {
            life: 1500,
            randomAngles: true,
            crackle: true,
          });
          break;
        case "weeping_willow":
          this._burst(r, 145, 2, 6, {
            life: 4400,
            gravity: 0.025,
            yScale: 0.24,
            yBias: -2.2,
            twinkle: true,
            sparkle: true,
            type: "willow",
            randomAngles: true,
          });
          break;
        case "cascading_horsetail":
          this._burst(r, 95, 2, 5, {
            life: 3500,
            gravity: 0.18,
            yScale: 0.18,
            yBias: 3,
            type: "horsetail",
            randomAngles: true,
          });
          break;
        case "dragon_fish":
          this._burst(r, 75, 3, 10, {
            life: 2700,
            type: "fish",
            randomAngles: true,
            minSize: 1.8,
            maxSize: 5.5,
          });
          break;
        case "golden_brocade":
          this._burst(r, 310, 1, 7, {
            life: 4000,
            twinkle: true,
            sparkle: true,
            randomAngles: true,
            minSize: 0.55,
            maxSize: 2.5,
            crackle: this.options.visuals.secondaryCrackle,
          });
          break;
        case "glitter_nova":
          this._burst(r, 410, 0.2, 8.5, {
            life: 3600,
            twinkle: true,
            sparkle: true,
            randomAngles: true,
            minSize: 0.45,
            maxSize: 1.8,
            crackle: this.options.visuals.secondaryCrackle,
          });
          break;
        case "diamond_ring":
          this._burst(r, 125, 7, 7.4, {
            life: 2600,
            jitter: 0.015,
            twinkle: true,
            minSize: 2,
            maxSize: 4.6,
          });
          break;
        case "imperial_chrysanthemum":
          this._burst(r, 230, 3, 9, {
            life: 3200,
            twinkle: true,
            minSize: 1.2,
            maxSize: 3.8,
          });
          break;
        default:
          this._burst(r, 170, 3, 8, { life: 2500, minSize: 1.7, maxSize: 4.7 });
      }
    }
    /* ── Internal: Text Rendering ──────────────────────────────────── */

    // Draws the crisp text overlay on the separate text canvas layer.
    // Each text block goes through reveal → hold → dissolve phases.
    // Uses shadowBlur for glow and a semi-transparent stroke for legibility.
    _drawText(now) {
      const x = this.textCtx;
      if (!this.textBlocks.length) {
        if (this.textCanvas.style.display !== "none") {
          x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
          x.clearRect(0, 0, this.width, this.height);
          this.textCanvas.style.display = "none";
        }
        return;
      }
      this.textCanvas.style.display = "block";
      x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      x.clearRect(0, 0, this.width, this.height);
      for (let i = this.textBlocks.length - 1; i >= 0; i--) {
        const b = this.textBlocks[i],
          c = b.cfg,
          age = now - b.birth,
          total = c.revealDuration + c.holdDuration + c.dissolveDuration;
        if (age >= total) {
          this.textBlocks.splice(i, 1);
          continue;
        }
        let alpha;
        if (age < c.revealDuration) alpha = age / c.revealDuration;
        else if (age < c.revealDuration + c.holdDuration) alpha = 1;
        else
          alpha =
            1 - (age - c.revealDuration - c.holdDuration) / c.dissolveDuration;
        x.save();
        x.globalAlpha = clamp(alpha, 0, 1);
        x.font = `${c.fontWeight} ${b.fontSize || c.fontSize}px ${c.fontFamily}`;
        x.textAlign = ["left", "right"].includes(c.textAlign)
          ? c.textAlign
          : "center";
        x.textBaseline = "middle";
        x.fillStyle = c.colors[0] || "#FFFFFF";
        x.shadowColor = c.colors[1] || c.colors[0] || "#FFFFFF";
        x.shadowBlur = 18 * (c.textGlow || 1);
        // Same width as the particle plan, so the fitted font is never squeezed.
        const fit = Math.max(280, Math.floor(this.width * c.maxWidth)) - 8;
        x.fillText(b.text, b.x, b.y, fit);
        x.globalAlpha *= 0.55;
        x.lineWidth = 1.2;
        x.strokeStyle = "#FFFFFF";
        x.strokeText(b.text, b.x, b.y, fit);
        x.restore();
      }
      if (!this.textBlocks.length) this.textCanvas.style.display = "none";
    }
    // Collects all drawable items into a flat array for the renderer:
    // flashes (fading), rocket heads (bright stars at the tip), and
    // all active particles.
    _drawItems(now = this.effectTime) {
      const a = [];
      for (const f of this.flashes) {
        const t = clamp(1 - (now - f.birth) / f.life, 0, 1);
        // A strong detonation flash falls away rapidly, leaving the moving
        // stars to carry the eye through the rest of the explosion.
        a.push({ ...f, alpha: t * t * f.alpha, size: f.size * (1.12 - t * 0.12) });
      }
      for (const r of this.rockets) {
        const c = hex(r.colors[0]);
        a.push({
          x: r.x,
          y: r.y,
          size: 4.6 * this.options.visuals.bloom * (r.dof || 1),
          alpha: 1,
          r: c[0],
          g: c[1],
          b: c[2],
          star: true,
        });
      }
      for (const p of this.particles) a.push(p);
      return a;
    }
    /* ── Internal: State Machine ───────────────────────────────────── */

    // Checks whether the show is finished. Handles three terminal states:
    //   finishing → wait for drain or timeout, optionally launch finale
    //   finale    → wait for all bursts to complete, then fade
    //   manual    → fade as soon as all effects are done
    _finish(now) {
      if (!["finishing", "finale", "manual"].includes(this.state)) return;
      if (this.state === "finishing") {
        const drained =
            !this.rockets.length &&
            !this.pendingRockets.length &&
            !this.particles.length &&
            !this.textBlocks.length,
          waitLimit = this.wantFinale
            ? Math.min(
                this.options.maxFinishTime,
                this.options.finale.maxWaitBeforeLaunch,
              )
            : this.options.maxFinishTime,
          timeout = now - this.finishStarted >= waitLimit;
        if (drained || timeout) {
          if (timeout) {
            this.rockets.length = 0;
            this.pendingRockets.length = 0;
            this.particles.length = 0;
            this.flashes.length = 0;
            this.textBlocks.length = 0;
          }
          if (this.wantFinale && !this.finalePlayed) {
            this.state = "finale";
            this.launchFinale({ stopAfter: true });
            this.finaleStarted = now;
          } else this._fade(false);
        }
      } else if (this.state === "finale") {
        const done =
            !this.rockets.length &&
            !this.pendingRockets.length &&
            !this.particles.length &&
            !this.flashes.length &&
            !this.textBlocks.length,
          timeout =
            now - (this.finaleStarted || now) > this.options.finale.maxDuration;
        if (timeout) this._fade(false);
        else if (done) {
          if (!this.finaleFinishedAt) this.finaleFinishedAt = now;
          if (now - this.finaleFinishedAt >= this.options.finale.finishDelay)
            this._fade(false);
        } else this.finaleFinishedAt = 0;
      } else if (this.state === "manual") {
        const done =
          !this.rockets.length &&
          !this.pendingRockets.length &&
          !this.particles.length &&
          !this.flashes.length &&
          !this.textBlocks.length;
        if (done) this._fade(false);
      }
    }
    // Initiates the fade-out transition. Sets the backdrop opacity to 0
    // via CSS transition, then after the duration: clears the canvas,
    // hides the root, resolves the stop promise, and fires 'stop'.
    _fade(clear) {
      if (this.state === "fading")
        return this.stopPromise || Promise.resolve(this);
      this.state = "fading";
      this.accepting = false;
      const duration = clear ? 0 : this.options.transition.fadeOut;
      this.backdrop.style.transition = `opacity ${duration}ms ${this.options.transition.easing}`;
      this.backdrop.style.opacity = "0";
      const promise =
        this.stopPromise ||
        new Promise((resolve) => (this.stopResolve = resolve));
      this.stopPromise = promise;
      this.fadeTimer = setTimeout(() => {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        if (clear || this.options.transition.clearOnHide) this.clear();
        this.root.style.display = "none";
        this.state = "stopped";
        const resolve = this.stopResolve;
        this.stopResolve = null;
        this.stopPromise = null;
        if (resolve) resolve(this);
        this.dispatchEvent(new Event("stop"));
      }, duration);
      return promise;
    }
    /* ── Configuration ─────────────────────────────────────────────── */

    /**
     * Merges partial options into the current configuration and re-resolves.
     * Updates DOM opacity and triggers resize if DPR cap changed.
     * @param {Object} [partial={}] - Options to merge
     * @returns {GrandFireworks}
     */
    setOptions(partial = {}) {
      const previous = this.options;
      const previousZoom = this.zoom || (previous && previous.visuals && previous.visuals.zoom) || 1;
      this.userOptions = merge(this.userOptions, partial);
      this.options = this._resolve(this.userOptions);
      this.zoom = this.options.visuals.zoom;
      if (previous && previousZoom !== this.zoom)
        this._recenterActiveWorld(previousZoom, this.zoom);
      this.worldWidth = this.width / this.zoom;
      if (this.root)
        this.root.style.opacity = String(
          clamp(Number(this.options.visuals.opacity ?? 1), 0, 1),
        );
      if (
        previous &&
        previous.performance.dprCap !== this.options.performance.dprCap &&
        this.renderer &&
        this.state !== "destroyed"
      )
        this._resize();
      if (
        previous &&
        this.rendererType === "webgl2" &&
        previous.renderer.preserveDrawingBuffer !==
          this.options.renderer.preserveDrawingBuffer
      )
        this._recreateRenderer("trail-buffer-setting-changed");
      if (!this.options.performance.pauseWhenHidden) this._resumeFor("hidden");
      if (!this.options.performance.pauseWhenOffscreen)
        this._resumeFor("offscreen");
      return this;
    }
    // Zoom changes alter the size of the virtual world. Shift all active
    // world-space coordinates by the centre delta so in-flight rockets and
    // particles continue to orbit the visual centre instead of sliding left.
    _recenterActiveWorld(fromZoom, toZoom) {
      const dx = this.width / (2 * toZoom) - this.width / (2 * fromZoom),
        dy = this.height / (2 * toZoom) - this.height / (2 * fromZoom),
        shift = (item) => {
          if (!item) return;
          if (Number.isFinite(item.x)) item.x += dx;
          if (Number.isFinite(item.y)) item.y += dy;
          if (Number.isFinite(item.sx)) item.sx += dx;
          if (Number.isFinite(item.sy)) item.sy += dy;
          if (Number.isFinite(item.tx)) item.tx += dx;
          if (Number.isFinite(item.ty)) item.ty += dy;
          if (Number.isFinite(item.centerX)) item.centerX += dx;
          if (Number.isFinite(item.centerY)) item.centerY += dy;
          if (Number.isFinite(item.burstY)) item.burstY += dy;
        };
      this.rockets.forEach(shift);
      this.pendingRockets.forEach(shift);
      this.particles.forEach(shift);
      this.flashes.forEach(shift);
    }
    /**
     * Sets the overall opacity of the fireworks layer.
     * @param {number} level - 0 to 1
     * @returns {GrandFireworks}
     */
    setOpacity(level) {
      return this.setOptions({
        visuals: { opacity: clamp(Number(level), 0, 1) },
      });
    }
    /**
     * Sets the viewport zoom level, scaling from the screen center.
     * < 1 = zoomed out (smaller fireworks, wider field of view).
     * > 1 = zoomed in (larger fireworks, closer look).
     * @param {number} level - 0.1 to 4 (default 1)
     * @returns {GrandFireworks}
     */
    setZoom(level) {
      const z = clamp(Number(level), 0.1, 4);
      return this.setOptions({ visuals: { zoom: z } });
    }
    /**
     * Switches to a named visual style preset (e.g. "bold", "spectacle").
     * @param {string} name - Style key from STYLES
     * @returns {GrandFireworks}
     */
    setStyle(name) {
      if (name !== "mixed" && !STYLES[name]) return this;

      // Style presets own only the keys they declare. Remove every style-owned
      // key from the accumulated user options before resolving the new style.
      // Without this reset, cinematic-only effects such as shimmer and wind
      // could survive a later switch back to bold, classic, or another preset.
      const cleanOptions = merge({}, this.userOptions);
      const styleSections = ["performance", "visuals", "show"];

      for (const section of styleSections) {
        if (!cleanOptions[section]) continue;

        for (const style of Object.values(STYLES)) {
          const styleValues = style[section];
          if (!styleValues) continue;

          for (const key of Object.keys(styleValues)) {
            delete cleanOptions[section][key];
          }
        }
      }

      this.userOptions = cleanOptions;
      return this.setOptions({ baseStyle: name });
    }
    /**
     * Switches to a named color theme and recolorizes all existing
     * particles and rockets in-flight.
     * @param {string} name - Theme key from COLOR_THEMES
     * @returns {GrandFireworks}
     */
    setColorTheme(name) {
      const t = COLOR_THEMES[name];
      if (!t) return this;
      const style = STYLES[this.options.baseStyle] || STYLES.medium,
        palettes = t.palettes === "default" ? style.show.palettes : t.palettes;
      this.setOptions({ colorTheme: name, show: { palettes } });
      const palette = this._palette();
      if (palette && palette.length) {
        const colors = palette.map((h) => {
          const c = h.replace("#", "");
          const n = parseInt(
            c.length === 3
              ? c
                  .split("")
                  .map((x) => x + x)
                  .join("")
              : c,
            16,
          );
          return [
            ((n >> 16) & 255) / 255,
            ((n >> 8) & 255) / 255,
            (n & 255) / 255,
          ];
        });
        this.particles.forEach((p, i) => {
          const c = colors[i % colors.length];
          p.r = c[0];
          p.g = c[1];
          p.b = c[2];
        });
        this.rockets.forEach((r) => {
          r.colors = palette;
        });
      }
      return this;
    }
    // Generates a random visual configuration and applies it live
    /**
     * Randomizes the visual configuration for a fresh, unpredictable show.
     * Picks random palettes, performance presets, trail/bloom settings,
     * and optionally a background gradient. Recolors existing particles.
     * @returns {Object} The generated configuration
     */
    feelingLucky() {
      const PALETTE_POOL = [
        ["#FF0055", "#FFCC00"],
        ["#00F2FE", "#4FACFE"],
        ["#FF0055"],
        ["#FFD700", "#FFA500", "#FFFFFF"],
        ["#FF1744", "#FF5252", "#FF8A80", "#FFFFFF"],
        ["#2962FF", "#4D96FF", "#89CFF0", "#FFFFFF"],
        ["#00E676", "#69F0AE", "#B9F6CA", "#FFFFFF"],
        ["#AA00FF", "#D17FE0", "#EA80FC", "#FFFFFF"],
        ["#FF1493", "#FF69B4", "#FFC0CB", "#FFFFFF"],
        ["#00CED1", "#40E0D0", "#7FFFD4", "#FFFFFF"],
        ["#FF4500", "#FFD700"],
        ["#8A2BE2", "#FF69B4", "#FFFFFF"],
        ["#FFD700"],
        ["#FF6347", "#FFD700", "#7FFF00"],
        ["#00BFFF", "#1E90FF", "#FFFFFF"],
        ["#FF69B4", "#FFFFFF"],
      ];
      const PRESETS = ["low", "medium", "high", "ultra"];
      const rand = (min, max) => min + Math.random() * (max - min);
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const unit = (n) => Math.max(0, Math.min(1, n));
      const currentTheme = this.options.colorTheme || "default";
      const cfg = {
        colorTheme: currentTheme,
        visuals: {
          opacity: unit(rand(0.15, 0.6)),
          trails: Math.random() < 0.85,
          trailFade: rand(0.06, 0.2),
          bloom: rand(0.7, 1.8),
          rocketExhaust: Math.random() < 0.8,
          explosionFlashes: Math.random() < 0.85,
          starChance: rand(0.02, 0.2),
          groupedSalvos: Math.random() < 0.7,
          secondaryCrackle: Math.random() < 0.65,
        },
        performance: {
          preset: pick(PRESETS),
          adaptive: true,
          pauseWhenHidden: true,
          pauseWhenOffscreen: true,
          respectReducedMotion: true,
        },
        show: {
          intensity: rand(0.4, 2),
          openingSalvo: Math.floor(rand(2, 10)),
          launchInterval: Math.floor(rand(300, 1400)),
          launchSpread: unit(rand(0.2, 0.9)),
          angleRange: rand(2, 30),
          angleStrength: rand(0.2, 2.5),
          enabledTypes:
            Math.random() < 0.7
              ? pick([
                  [
                    "grand_peony",
                    "imperial_chrysanthemum",
                    "starburst",
                    "glitter_nova",
                  ],
                  [
                    "weeping_willow",
                    "cascading_horsetail",
                    "royal_palm",
                    "golden_brocade",
                  ],
                  [
                    "crossette_supreme",
                    "diamond_ring",
                    "crown_jewel",
                    "thunder_clap",
                  ],
                  ["dragon_fish", "majestic_comet", "galactic_spiral"],
                ])
              : "all",
        },
        transition: {
          fadeIn: Math.floor(rand(200, 1200)),
          fadeOut: Math.floor(rand(200, 1000)),
          easing: pick(["ease-out", "ease", "linear", "ease-in-out"]),
          clearOnHide: true,
        },
      };
      if (currentTheme === "default")
        cfg.show.palettes = [
          pick(PALETTE_POOL),
          pick(PALETTE_POOL),
          pick(PALETTE_POOL),
          pick(PALETTE_POOL),
        ];
      if (Math.random() < 0.35)
        cfg.background = {
          value: pick([
            "radial-gradient(circle at center, rgba(8,12,40,.65), #000 82%)",
            "linear-gradient(135deg, #1a0a2e, #040714)",
            "linear-gradient(180deg, #101a4b, #040714)",
            "radial-gradient(circle at 50% 35%, #38175e, #080312 72%)",
          ]),
          opacity: unit(rand(0.6, 1)),
        };
      this.setOptions(cfg);
      if (this.root)
        this.root.style.opacity = String(
          clamp(Number(cfg.visuals.opacity ?? 1), 0, 1),
        );
      // Recolor existing mid-air particles
      const palette = this._palette();
      if (palette && palette.length) {
        const colors = palette.map((h) => {
          const c = h.replace("#", "");
          const n = parseInt(
            c.length === 3
              ? c
                  .split("")
                  .map((x) => x + x)
                  .join("")
              : c,
            16,
          );
          return [
            ((n >> 16) & 255) / 255,
            ((n >> 8) & 255) / 255,
            (n & 255) / 255,
          ];
        });
        this.particles.forEach((p, i) => {
          const c = colors[i % colors.length];
          p.r = c[0];
          p.g = c[1];
          p.b = c[2];
        });
        this.rockets.forEach((r) => {
          r.colors = palette;
        });
      }
      return cfg;
    }
    /** @returns {Object} Deep-cloned snapshot of current options */
    getOptions() {
      return JSON.parse(JSON.stringify(this.options));
    }
    /**
     * @returns {{renderer:string, fallbackActive:boolean, contextLossCount:number,
     *   state:string, particles:number, rockets:number, fps:number,
     *   durationRemaining:number|null, quality:number}}
     */
    getStats() {
      return {
        renderer: this.rendererType,
        fallbackActive:
          this.rendererType === "canvas2d" &&
          this.options.renderer.preferred !== "canvas2d",
        contextLossCount: this.contextLossCount,
        state: this.state,
        particles: this.particles.length,
        rockets: this.rockets.length,
        fps: Math.round(this.fps),
        durationRemaining: this.runtimeDuration
          ? Math.max(0, Math.round(this.runtimeDuration - this.elapsed))
          : null,
        quality: this.quality,
      };
    }
  }

  /* ========================================================================
   *  EXPORT
   *  Attaches static constants and exposes GrandFireworks globally
   *  (browser) and via module.exports (Node/CommonJS).
   * ======================================================================== */

  GrandFireworks.VERSION = "1.8.0";
  GrandFireworks.DEFAULTS = DEFAULTS;
  GrandFireworks.PRESETS = PRESETS;
  GrandFireworks.TYPES = TYPES;
  GrandFireworks.STYLES = STYLES;
  GrandFireworks.COLOR_THEMES = COLOR_THEMES;
  global.GrandFireworks = GrandFireworks;
  if (typeof module !== "undefined" && module.exports)
    module.exports = GrandFireworks;
})(typeof window !== "undefined" ? window : globalThis);
