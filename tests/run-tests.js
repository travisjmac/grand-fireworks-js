'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const tests = [];
const test = (name, run) => tests.push({ name, run });

// A minimal WebGL2 stand-in. Uppercase properties resolve to stable, distinct
// numbers so a test can tell the engine's POINTS draw apart from a host's
// TRIANGLES draw, and the interesting calls are recorded in order so the
// clear → host composite → engine points sequence can be asserted.
function createGLMock(calls) {
  const constants = new Map();
  let nextConstant = 4096;
  let nextAttribute = 0;
  const constant = name => {
    if (!constants.has(name)) constants.set(name, nextConstant++);
    return constants.get(name);
  };
  const object = tag => ({ __glObject: tag });
  const record = op => (...args) => { calls.push({ op, args }); };
  const methods = {
    // The engine asks the driver for its point-size ceiling; report a real range.
    getParameter: p => (p === constant('ALIASED_POINT_SIZE_RANGE') ? [1, 256] : true),
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    getShaderInfoLog: () => '',
    getProgramInfoLog: () => '',
    getUniformLocation: () => object('uniform'),
    getAttribLocation: () => nextAttribute++,
    createShader: () => object('shader'),
    createProgram: () => object('program'),
    createBuffer: () => object('buffer'),
    createTexture: () => object('texture'),
    createVertexArray: () => object('vao'),
    isContextLost: () => false,
    clear: record('clear'),
    drawArrays: record('drawArrays'),
    useProgram: record('useProgram'),
    bindVertexArray: record('bindVertexArray'),
    blendFunc: record('blendFunc'),
    bindFramebuffer: record('bindFramebuffer'),
    pixelStorei: record('pixelStorei'),
    texImage2D: record('texImage2D'),
    texSubImage2D: record('texSubImage2D')
  };
  return new Proxy({ canvas: null }, {
    get(target, property) {
      if (property in target) return target[property];
      if (typeof property !== 'string') return undefined;
      // Constants are SCREAMING_CASE; methods are lowerCamelCase; anything
      // else (then, toJSON) stays undefined so the proxy behaves itself.
      if (/^[A-Z][A-Z0-9_]*$/.test(property)) return constant(property);
      if (property in methods) return methods[property];
      return /^[a-z]/.test(property) ? () => {} : undefined;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

function createRuntime({ reducedMotion = false, audio = false, webgl = false } = {}) {
  let now = 1000;
  let rafId = 0;
  const observers = [];
  const audioStats = { contexts: 0, resumes: 0, sources: 0, closes: 0 };
  const glCalls = [];
  const glMock = webgl ? createGLMock(glCalls) : null;
  // Flipped by a test to simulate a driver that will not hand back a context,
  // which is what a real context loss looks like on the way back out.
  let webglAvailable = webgl;

  const noop = () => {};
  const parameter = () => ({ value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop });
  const context2d = new Proxy({
    getImageData: () => ({ data: new Uint8ClampedArray(320 * 140 * 4) }),
    measureText: text => ({ width: String(text).length * 10 }),
    // The Canvas fallback builds radial-gradient sprites, and the Fireworks
    // Command artwork builds linear gradients, so the mock context has to hand
    // back a gradient object with addColorStop for both.
    createRadialGradient: () => ({ addColorStop: noop }),
    createLinearGradient: () => ({ addColorStop: noop })
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return noop;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });

  class MockElement extends EventTarget {
    constructor(tagName = 'div') {
      super();
      this.tagName = tagName.toUpperCase();
      this.style = {};
      this.children = [];
      this.parentNode = null;
      this.width = 0;
      this.height = 0;
      this.textContent = '';
    }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    insertBefore(child) { child.parentNode = this; this.children.unshift(child); return child; }
    replaceWith(replacement) {
      if (!this.parentNode) return;
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) this.parentNode.children[index] = replacement;
      replacement.parentNode = this.parentNode;
    }
    remove() {
      if (!this.parentNode) return;
      this.parentNode.children = this.parentNode.children.filter(child => child !== this);
      this.parentNode = null;
    }
    setAttribute() {}
    getBoundingClientRect() { return { width: 800, height: 600 }; }
    getContext(type) {
      if (type === '2d') return context2d;
      if (glMock && webglAvailable && (type === 'webgl2' || type === 'webgl')) return glMock;
      return null;
    }
  }

  class MockIntersectionObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    trigger(visible) {
      this.callback([{ target: this.target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]);
    }
  }

  class MockAudioContext {
    constructor() {
      audioStats.contexts++;
      this.state = 'suspended';
      this.currentTime = 0;
      this.sampleRate = 100;
      this.destination = {};
    }
    resume() { audioStats.resumes++; this.state = 'running'; return Promise.resolve(); }
    close() { audioStats.closes++; this.state = 'closed'; return Promise.resolve(); }
    createGain() { return { gain: parameter(), connect: noop }; }
    createBiquadFilter() { return { type: '', frequency: parameter(), Q: parameter(), connect: noop }; }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() { audioStats.sources++; return { buffer: null, connect: noop, start: noop, stop: noop }; }
  }

  class MockCustomEvent extends Event {
    constructor(type, options = {}) { super(type); this.detail = options.detail; }
  }

  const body = new MockElement('body');
  const document = new EventTarget();
  document.body = body;
  document.hidden = false;
  document.createElement = tag => new MockElement(tag);
  document.querySelector = selector => selector === '#stage' ? stage : null;
  const stage = new MockElement('div');
  body.appendChild(stage);

  // window-level listeners are captured so tests can drive the gesture handlers
  // the engine registers, such as the one-shot audio unlock.
  const windowListeners = new Map();
  const addWindowListener = (type, fn) => {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(fn);
  };
  const removeWindowListener = (type, fn) => {
    const list = windowListeners.get(type);
    if (list) windowListeners.set(type, list.filter(entry => entry !== fn));
  };

  const sandbox = {
    console,
    Event,
    EventTarget,
    CustomEvent: MockCustomEvent,
    Uint8ClampedArray,
    Float32Array,
    Math,
    JSON,
    Promise,
    Set,
    Array,
    Object,
    Number,
    String,
    Boolean,
    Date,
    document,
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 2,
    performance: { now: () => now },
    requestAnimationFrame: () => ++rafId,
    cancelAnimationFrame: noop,
    setTimeout,
    clearTimeout,
    getComputedStyle: () => ({ position: 'relative' }),
    ResizeObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: MockIntersectionObserver,
    matchMedia: () => ({ matches: reducedMotion, addEventListener: noop, removeEventListener: noop }),
    addEventListener: addWindowListener,
    removeEventListener: removeWindowListener
  };
  if (audio) sandbox.AudioContext = MockAudioContext;
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(__dirname, '..', 'GrandFireworks.js'), 'utf8');
  vm.runInContext(source, sandbox, { filename: 'GrandFireworks.js' });

  return {
    GrandFireworks: sandbox.GrandFireworks,
    document,
    observers,
    audioStats,
    glCalls,
    sandbox,
    disableWebgl() { webglAvailable = false; },
    setNow(value) { now = value; },
    gesture(type) {
      (windowListeners.get(type) || []).slice().forEach(fn => fn({ type }));
    }
  };
}

test('initializes dimensions before standalone effects', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  assert.equal(fireworks.width, 1024);
  assert.equal(fireworks.height, 768);
  fireworks.launch();
  assert.equal(fireworks.rockets.length, 1);
  fireworks.destroy();
});

test('honors explicit performance and live visual options', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    performance: { preset: 'low', fps: 48, dprCap: .5, particleScale: .75, secondary: 0 }
  });
  assert.deepEqual(
    [fireworks.options.performance.fps, fireworks.options.performance.dprCap, fireworks.options.performance.particleScale, fireworks.options.performance.secondary],
    [48, .5, .75, 0]
  );
  assert.equal(fireworks.dpr, .5);
  fireworks.setOptions({ performance: { dprCap: 1 } });
  assert.equal(fireworks.dpr, 1);
  fireworks.setOpacity(.25);
  fireworks.setOptions({
    show: { launchSpread: .4 },
    speedMultiplier: .8,
    visuals: { bloom: 8, trails: false }
  });
  assert.equal(fireworks.options.visuals.opacity, .25);
  assert.equal(fireworks.options.speedMultiplier, .8);
  assert.equal(fireworks.options.visuals.bloom, 8);
  assert.equal(fireworks.options.renderer.preserveDrawingBuffer, false);
  fireworks.setOptions({ visuals: { trails: true } });
  assert.equal(fireworks.options.renderer.preserveDrawingBuffer, true);
  fireworks.setOptions({ sound: { boomStyle: 'artillery', boomVariation: .4 } });
  assert.equal(fireworks.options.sound.boomStyle, 'artillery');
  assert.equal(fireworks.options.sound.boomVariation, .4);
  fireworks.setOptions({ sound: { boomStyle: 'not-a-boom' } });
  assert.equal(fireworks.options.sound.boomStyle, 'mixed');
  assert.equal(Number(fireworks.root.style.opacity), .25);
  fireworks.destroy();
});

test('resets style-owned settings when switching styles', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    container: '#stage',
    baseStyle: 'bold',
    colorTheme: 'iceBlue',
    visuals: { zoom: .75 },
    sound: { volume: .4 }
  });

  fireworks.setStyle('cinematic');
  assert.equal(fireworks.options.visuals.shimmerChance, .82);
  assert.equal(fireworks.options.visuals.trails, false);

  fireworks.setStyle('bold');
  assert.equal(fireworks.options.visuals.shimmerChance, 0);
  assert.equal(fireworks.options.visuals.sparkleChance, 0);
  assert.equal(fireworks.options.visuals.windStrength, 0);
  assert.equal(fireworks.options.visuals.sphereBurst, false);
  assert.equal(fireworks.options.visuals.trails, true);
  assert.equal(fireworks.options.visuals.bloom, 1.9);
  assert.equal(fireworks.options.show.intensity, 1.6);

  // Settings unrelated to the selected visual style remain untouched.
  assert.equal(fireworks.options.colorTheme, 'iceBlue');
  assert.equal(fireworks.options.visuals.zoom, .75);
  assert.equal(fireworks.options.sound.volume, .4);

  fireworks.setStyle('mixed');
  assert.equal(fireworks.options.baseStyle, 'mixed');
  assert.equal(fireworks.options.mixedStyles.cinematic, 20);
  assert.equal(
    Object.values(fireworks.options.mixedStyles)
      .reduce((total, ratio) => total + ratio, 0),
    100
  );
});

test('keeps one apparent scale across a rocket and its burst', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    show: { minShellScale: .5, maxShellScale: 1.5, grandFinaleShellChance: .05 }
  });
  assert.equal(fireworks.options.show.grandFinaleShellChance, .05);
  fireworks._createRocket({ apparentScale: .5 });
  assert.equal(fireworks.rockets[0].apparentScale, .5);
  fireworks._burst(fireworks.rockets[0], 1, 3, 3);
  assert.equal(fireworks.particles[0].depthScale, .5);
  fireworks.destroy();
});

test('uses a ballistic rocket arc before bursting', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' }
  });

  fireworks._createRocket({ x: .5, burstHeight: .25, apparentScale: 1 });
  const rocket = fireworks.rockets[0];
  const flightDistance = rocket.y - rocket.burstY;
  const predictedApexDistance =
    (rocket.vy * rocket.vy) / (2 * rocket.gravity);

  assert.ok(rocket.gravity > 0);
  assert.ok(rocket.burstFallSpeed > 0);
  assert.ok(Math.abs(predictedApexDistance - flightDistance) < .001);
  fireworks.destroy();
});

test('reuses audio context and preserves zero volume', () => {
  const { GrandFireworks, audioStats } = createRuntime({ audio: true });
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' }, sound: { enabled: true, volume: .4, ambience: 0, boomStyle: 'classic' } });
  fireworks._playSound('launch');
  fireworks._playSound('explode');
  assert.equal(audioStats.contexts, 1);
  assert.equal(audioStats.sources, 3);
  fireworks.setOptions({ sound: { volume: 0 } });
  fireworks._playSound('launch');
  assert.equal(audioStats.sources, 3);
  fireworks.destroy();
  assert.equal(audioStats.closes, 1);
});

test('keeps sound opt-in and unlocks it through the public control', () => {
  const { GrandFireworks, audioStats } = createRuntime({ audio: true });
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' }, sound: { ambience: 0 } });
  fireworks._playSound('launch');
  assert.equal(audioStats.contexts, 0);
  fireworks.enableSound();
  assert.equal(fireworks.options.sound.enabled, true);
  assert.equal(audioStats.contexts, 1);
  assert.equal(audioStats.resumes, 1);
  fireworks.setMuted(true);
  fireworks._playSound('explode');
  assert.equal(audioStats.sources, 0);
  fireworks.destroy();
});

test('runs and cancels text sequences and supports staggered lines', async () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' }, textFirework: { maxCharactersPerLine: 3, maxLines: 2, synchronizeExplosions: false } });
  assert.equal(
    JSON.stringify(fireworks._wrapText('ONE\nTWO', fireworks.options.textFirework)),
    JSON.stringify(['ONE', 'TWO'])
  );
  fireworks.setOptions({ textFirework: { textAlign: 'left' } });
  const leftPlan = fireworks._textPlans(['ONE'], fireworks.options.textFirework)[0];
  assert.ok(leftPlan.x < fireworks.width / 2);
  await fireworks.launchText('ONE TWO');
  const rockets = fireworks.pendingRockets.filter(rocket => rocket.textPlan).sort((a, b) => a.syncAt - b.syncAt);
  assert.equal(rockets[1].syncAt - rockets[0].syncAt, 250);
  const completed = await fireworks.launchTextSequence(['ONE', 'TWO'], { interval: 1, clearOnComplete: true });
  assert.equal(JSON.stringify(completed), JSON.stringify({ status: 'completed', completed: 2, total: 2 }));
  const pending = fireworks.launchTextSequence(['THREE'], { startDelay: 50 });
  assert.equal(fireworks.cancelTextSequence(), true);
  assert.equal(JSON.stringify(await pending), JSON.stringify({ status: 'cancelled', completed: 0, total: 1 }));
  fireworks.destroy();
});

test('text that is too wide shrinks its font instead of being squeezed', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  const cfg = fireworks.options.textFirework;
  const available = Math.max(280, Math.floor(fireworks.width * cfg.maxWidth)) - 8;
  // The mock measures 10px per character at any font size.
  assert.equal(fireworks._textPlans(['HI'], cfg)[0].fontSize, cfg.fontSize, 'short text keeps its size');
  const long = 'W'.repeat(Math.ceil(available / 10) * 2);
  const plans = fireworks._textPlans([long, 'HI'], cfg);
  assert.ok(plans[0].fontSize < cfg.fontSize, 'a too-wide line should use a smaller font');
  assert.ok(plans[0].fontSize * long.length * 10 / cfg.fontSize <= available, 'the fitted line should fit the width');
  assert.equal(plans[1].fontSize, plans[0].fontSize, 'every line in the block shares one size');
  fireworks.destroy();
});

test('keeps user pause separate from automatic pause reasons', () => {
  const { GrandFireworks, observers } = createRuntime({ reducedMotion: true });
  const fireworks = new GrandFireworks({ container: '#stage', mode: 'contained', renderer: { preferred: 'canvas2d' }, show: { openingSalvo: 6 } });
  fireworks.start();
  assert.equal(fireworks.pendingRockets.length, 2);
  fireworks.pause();
  fireworks._pauseFor('hidden');
  fireworks._resumeFor('hidden');
  assert.equal(fireworks.state, 'paused');
  fireworks.resume();
  assert.equal(fireworks.state, 'running');
  observers[0].trigger(false);
  assert.equal(fireworks.state, 'paused');
  observers[0].trigger(true);
  assert.equal(fireworks.state, 'running');
  fireworks.destroy();
});

test('applies finale wait, density, and finish delay', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' }, maxFinishTime: 5000, finale: { enabled: true, burstScale: 2, particleScale: 1.5, maxWaitBeforeLaunch: 100, finishDelay: 200 } });
  const counts = [];
  fireworks._flash = () => {};
  fireworks._burst = (rocket, count) => counts.push(count);
  fireworks._grandFinaleBurst({ x: 0, y: 0, colors: ['#fff'] }, 1000);
  assert.deepEqual(counts, [276, 90, 72]);
  fireworks.state = 'finishing';
  fireworks.finishStarted = 1000;
  fireworks.wantFinale = true;
  fireworks.finalePlayed = false;
  fireworks.particles = [{}];
  fireworks._finish(1099);
  assert.equal(fireworks.state, 'finishing');
  fireworks._finish(1100);
  assert.equal(fireworks.state, 'finale');
  fireworks.rockets.length = fireworks.pendingRockets.length = fireworks.particles.length = fireworks.flashes.length = fireworks.textBlocks.length = 0;
  fireworks.finaleStarted = 1000;
  fireworks.finaleFinishedAt = 0;
  fireworks._finish(1100);
  fireworks._finish(1299);
  assert.equal(fireworks.state, 'finale');
  fireworks._finish(1300);
  assert.equal(fireworks.state, 'fading');
  fireworks.destroy();
});

test('honors the documented durationMode values when the duration elapses', () => {
  const { GrandFireworks } = createRuntime();

  // 'immediate' must bypass the graceful wind-down and fade at once.
  const immediate = new GrandFireworks({ renderer: { preferred: 'canvas2d' }, durationMode: 'immediate' });
  assert.equal(immediate.options.durationMode, 'immediate');
  immediate.state = 'running';
  immediate._durationReached(1000);
  assert.equal(immediate.state, 'fading');
  assert.equal(immediate.accepting, false);
  immediate.destroy();

  // 'graceful' must enter the finishing state so in-flight shells can land.
  const graceful = new GrandFireworks({ renderer: { preferred: 'canvas2d' }, durationMode: 'graceful' });
  graceful.state = 'running';
  graceful._durationReached(1000);
  assert.equal(graceful.state, 'finishing');
  assert.equal(graceful.finishStarted, 1000);
  graceful.destroy();
});

test('bounds the Canvas2D sprite cache while still reusing sprites', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  const renderer = fireworks.renderer;
  const limit = renderer.constructor.SPRITE_CACHE_LIMIT;
  assert.ok(limit > 0);

  // Identical colours must share one cached sprite instead of accumulating.
  renderer._sprite(1, 0.5, 0.25);
  const afterFirst = renderer.sprites.size;
  for (let i = 0; i < 200; i++) renderer._sprite(1, 0.5, 0.25);
  assert.equal(renderer.sprites.size, afterFirst);

  // A drifting colour, the pyroBurn pattern, must not grow the cache per frame.
  const driftingBefore = renderer.sprites.size;
  for (let i = 0; i < 20000; i++) {
    const t = i / 20000;
    renderer._sprite(t, 1 - t * 0.6, 0.2 + t * 0.3, i % 2 === 0);
  }
  assert.ok(
    renderer.sprites.size < limit,
    `drifting colours should stay well under the ceiling, got ${renderer.sprites.size}`,
  );
  assert.ok(renderer.sprites.size >= driftingBefore);

  // Far more distinct colours than the ceiling must evict rather than grow.
  for (let ri = 0; ri < 16; ri++)
    for (let gi = 0; gi < 16; gi++)
      for (let bi = 0; bi < 16; bi++)
        renderer._sprite(ri / 15, gi / 15, bi / 15, bi % 2 === 0);
  assert.equal(renderer.sprites.size, limit);

  fireworks.destroy();
});

test('attempts to unlock audio when sound is enabled through options', () => {
  const { GrandFireworks, audioStats, gesture } = createRuntime({ audio: true });
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' }, sound: { enabled: true, ambience: 0 } });
  fireworks.start();
  // Previously a context was created and never resumed, leaving the show silent.
  assert.equal(audioStats.contexts, 1);
  assert.equal(audioStats.resumes, 1);
  // The gesture fallback stays registered until a real interaction unlocks audio.
  assert.equal(typeof fireworks.onAudioUnlock, 'function');
  gesture('pointerdown');
  assert.equal(fireworks.onAudioUnlock, null);
  fireworks.destroy();
});

test('skips redundant fullscreen resizes', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  let reallocations = 0;
  const realResize = fireworks.renderer.resize.bind(fireworks.renderer);
  fireworks.renderer.resize = (...args) => {
    reallocations++;
    return realResize(...args);
  };
  // The constructor already sized the canvas, so an unchanged viewport must not
  // reallocate the drawing buffer or the text canvases.
  fireworks._resize();
  assert.equal(reallocations, 0);
  fireworks.destroy();
});

test('launchText waits only while fonts load and not past destroy', async () => {
  const { GrandFireworks, document } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });

  // Fonts settled: the launch happens synchronously, as it did before.
  document.fonts = { status: 'loaded', ready: Promise.resolve() };
  const settled = fireworks.launchText('HI');
  assert.ok(fireworks.pendingRockets.length > 0);
  await settled;

  // Fonts loading: nothing is launched until ready resolves.
  fireworks.pendingRockets.length = 0;
  let release;
  document.fonts = { status: 'loading', ready: new Promise(resolve => (release = resolve)) };
  const waiting = fireworks.launchText('HI');
  assert.equal(fireworks.pendingRockets.length, 0);
  release();
  await waiting;
  assert.ok(fireworks.pendingRockets.length > 0);

  // Destroyed while waiting: the late launch must not touch the dead instance.
  fireworks.pendingRockets.length = 0;
  document.fonts = { status: 'loading', ready: new Promise(resolve => (release = resolve)) };
  const orphan = fireworks.launchText('HI');
  fireworks.destroy();
  release();
  assert.equal((await orphan).length, 0);
  assert.equal(fireworks.pendingRockets.length, 0);
});

test('a host render pass draws behind the particles and stops the engine loop', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  const order = [];
  const ctx = fireworks.renderer.ctx;
  const drawImage = ctx.drawImage;
  ctx.drawImage = (...args) => { order.push('particle'); return drawImage(...args); };

  let frame = null;
  fireworks.setRenderPass(f => { order.push('scene'); frame = f; });

  fireworks.placeburst({ x: 300, y: 200, radius: 60, sound: false });
  // A host that drives frames must not also have the engine running its own loop.
  assert.equal(fireworks.raf, 0, 'engine must not start its own rAF loop');
  assert.equal(order.length, 0, 'nothing is drawn until renderFrame runs');

  fireworks.renderFrame(16);
  assert.equal(order[0], 'scene', 'the host scene must be composited first');
  assert.ok(order.length > 1, 'the particles must still be drawn');
  assert.deepEqual(
    [...new Set(order.slice(1))],
    ['particle'],
    'host artwork must be drawn before every particle',
  );

  assert.equal(frame.width, fireworks.width);
  assert.equal(frame.height, fireworks.height);
  assert.equal(frame.dpr, fireworks.dpr);
  assert.equal(frame.gl, null, 'the canvas2d fallback supplies ctx, not gl');
  assert.ok(frame.ctx);
  assert.ok(frame.canvas);

  fireworks.setRenderPass(null);
  assert.equal(fireworks.renderPass, null);
  // Match the message rather than the constructor: the engine runs inside a vm
  // realm, so its TypeError is not the test realm's TypeError.
  assert.throws(() => fireworks.setRenderPass('not-a-function'), /setRenderPass expects/);
  fireworks.destroy();
});

test('placeburst places a burst at a point and fits it to the requested radius', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    visuals: { zoom: .5 }
  });
  // The reach of a star is its speed divided by its per-frame drag.
  const rim = () => {
    const reaches = fireworks.particles
      .map(p => Math.hypot(p.vx, p.vy) / (1 - (p.friction || .985)))
      .sort((a, b) => a - b);
    return reaches[Math.min(reaches.length - 1, Math.floor(reaches.length * .9))];
  };

  fireworks.placeburst({ x: 400, y: 300, radius: 100, colors: ['#ff0000'], sound: false });
  // Positions arrive in screen pixels, so zoom .5 doubles them in world space.
  assert.equal(fireworks.particles[0].x, 800);
  assert.equal(fireworks.particles[0].y, 600);
  const hundred = rim();
  assert.ok(
    Math.abs(hundred - 200) / 200 < .05,
    `radius 100px at zoom .5 should reach ~200 world px, got ${hundred.toFixed(1)}`,
  );

  fireworks.clear();
  fireworks.placeburst({ x: 400, y: 300, radius: 200, colors: ['#ff0000'], sound: false });
  assert.ok(
    rim() > hundred * 1.8,
    'doubling the requested radius must roughly double the spread',
  );

  // A burst with no radius keeps the shell's natural size.
  fireworks.clear();
  fireworks.placeburst({ x: 400, y: 300, colors: ['#ff0000'], sound: false });
  assert.ok(rim() > hundred, 'an unfitted burst is larger than a deliberately small one');
  fireworks.destroy();
});

test('placeburst can target an element centre and an unknown type falls back', () => {
  const { GrandFireworks, document } = createRuntime();
  const fireworks = new GrandFireworks({ container: '#stage', renderer: { preferred: 'canvas2d' } });
  const target = document.createElement('button');
  target.getBoundingClientRect = () => ({ left: 100, top: 50, width: 40, height: 20 });
  document.querySelector = selector => (selector === '#thing' ? target : null);

  fireworks.placeburst({ element: '#thing', type: 'not_a_real_shell', sound: false });
  assert.ok(fireworks.particles.length > 0);
  // The mock container has no offset, so the centre lands at 120,60 in world space.
  assert.equal(fireworks.particles[0].x, 120);
  assert.equal(fireworks.particles[0].y, 60);

  fireworks.clear();
  fireworks.placeburst({ x: 5, y: 5, type: 'grand-finale-carrier', sound: false });
  assert.ok(
    fireworks.rockets.length === 0,
    'structural shell types must not be launched as a point burst',
  );
  assert.ok(fireworks.particles.length > 0, 'an unsupported type still bursts normally');

  // Coordinates that are not numbers are ignored rather than bursting at NaN.
  const before = fireworks.particles.length;
  fireworks.placeburst({ x: 'left', y: null, sound: false });
  assert.equal(fireworks.particles.length, before);
  fireworks.destroy();
});

test('launchTo flies a rocket from a given point and detonates on arrival', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  // The game always supplies a render pass, so the engine never self-drives.
  fireworks.setRenderPass(() => {});
  fireworks.launchTo({
    x: 100, y: 700, targetX: 500, targetY: 200,
    duration: 400, radius: 80, colors: ['#00ff00'], sound: false
  });

  assert.equal(fireworks.rockets.length, 1);
  const rocket = fireworks.rockets[0];
  assert.equal(rocket.x, 100, 'the rocket starts exactly where the host fired from');
  assert.equal(rocket.y, 700);
  assert.equal(rocket.gravity, 0);
  assert.equal(fireworks.raf, 0, 'the engine loop stays out of the way');

  // The engine steps at most 50ms per frame, so 400ms is eight steps.
  for (let i = 0; i < 8; i++) fireworks.renderFrame(50);
  assert.equal(fireworks.rockets.length, 0, 'the rocket must detonate on arrival');
  // The trail's exhaust sparks are particles too, so read the detonation point
  // from the flash the break creates rather than from the first particle.
  assert.ok(fireworks.flashes.length > 0, 'the arrival must produce a detonation flash');
  const detonation = fireworks.flashes[0];
  assert.ok(Math.abs(detonation.x - 500) < 5, `burst x was ${detonation.x}`);
  assert.ok(Math.abs(detonation.y - 200) < 5, `burst y was ${detonation.y}`);
  assert.ok(
    fireworks.particles.length > 0,
    'the rocket leaves a trail and breaks into stars',
  );
  fireworks.destroy();
});

test('renderFrame does not advance effects while paused', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  fireworks.placeburst({ x: 100, y: 100, radius: 90, sound: false });
  fireworks.pause();
  const frozen = fireworks.particles.map(p => [p.x, p.y]);
  for (let i = 0; i < 4; i++) fireworks.renderFrame(50);
  assert.deepEqual(
    fireworks.particles.map(p => [p.x, p.y]),
    frozen,
    'a paused engine renders its current frame without stepping physics',
  );
  fireworks.destroy();
});

test('a burst can be silenced per call without touching the engine sound setting', () => {
  const { GrandFireworks } = createRuntime({ audio: true });
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });

  // Watch the engine's own audio entry point rather than the synth internals, so
  // this asserts the documented contract: sound:false skips this burst's audio.
  let played = 0;
  const playSound = fireworks._playSound.bind(fireworks);
  fireworks._playSound = (...args) => { played++; return playSound(...args); };
  fireworks.enableSound();

  fireworks.placeburst({ x: 100, y: 100, radius: 60, sound: false });
  fireworks.launchTo({ x: 10, y: 10, targetX: 200, targetY: 200, duration: 100, sound: false });
  for (let i = 0; i < 3; i++) fireworks.renderFrame(50);
  assert.equal(played, 0, 'a silent burst must not reach the audio engine at all');
  assert.equal(
    fireworks.options.sound.enabled,
    true,
    'silencing one burst must not change the engine sound setting',
  );

  fireworks.placeburst({ x: 100, y: 100, radius: 60, sound: true });
  assert.ok(played > 0, 'a burst with sound on must still play');
  fireworks.destroy();
});

test('wind stays a library preset and is only switched off per instance', () => {
  const { GrandFireworks } = createRuntime();
  const cinematic = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    baseStyle: 'cinematic'
  });
  assert.equal(
    cinematic.options.visuals.windStrength,
    .06,
    'the cinematic preset keeps its breeze — wind is a library feature',
  );
  cinematic.destroy();

  const game = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    visuals: { windStrength: 0 }
  });
  assert.equal(game.options.visuals.windStrength, 0);
  // A later setOptions merge must not resurrect the preset's breeze.
  game.setOptions({ speedMultiplier: .9 });
  assert.equal(game.options.visuals.windStrength, 0);
  game.destroy();
});

test('the Fireworks Command integration runs on the documented host contract', () => {
  const { GrandFireworks } = createRuntime();
  // Exactly the configuration game.js constructs.
  const engine = new GrandFireworks({
    container: '#stage',
    mode: 'contained',
    zIndex: 0,
    renderer: { preferred: 'webgl2', fallback: 'canvas2d' },
    visuals: { zoom: .55, windStrength: 0, trails: false, flashBangChance: 0 },
    performance: { preset: 'high', adaptive: true, secondary: 2 },
    show: { maxParticles: 10000 },
    sound: { enabled: false },
  });
  assert.equal(engine.options.visuals.zoom, .55);
  assert.equal(engine.options.visuals.windStrength, 0, 'the game runs without wind');
  assert.equal(engine.rendererType, 'canvas2d', 'no WebGL in the harness, so it falls back');

  let passes = 0, lastFrame = null;
  engine.setRenderPass(frame => { passes++; lastFrame = frame; });
  engine.clear();
  engine.resume();
  assert.equal(engine.raf, 0, 'the host owns frame pacing');

  // A wave: interceptors from the launchers plus a ground impact.
  for (let i = 0; i < 3; i++)
    engine.launchTo({
      x: 180 + i * 180, y: 700, targetX: 260 + i * 120, targetY: 240,
      duration: 320, radius: 90, type: 'grand_peony',
      colors: ['#ff5d73', '#ffcf58'], density: 1.2, sound: false
    });
  engine.placeburst({
    x: 400, y: 640, radius: 120, type: 'thunder_clap',
    colors: ['#ffffff', '#ff9b36'], density: 1, sound: false
  });

  for (let i = 0; i < 60; i++) engine.renderFrame(16);
  assert.equal(passes, 60, 'the render pass runs exactly once per frame');
  assert.equal(engine.rockets.length, 0, 'every interceptor must have detonated');
  assert.ok(engine.particles.length > 0, 'the bursts must leave stars behind');
  assert.ok(lastFrame.width > 0 && lastFrame.height > 0);
  assert.ok(lastFrame.ctx, 'the frame descriptor must carry a drawing context');
  assert.ok(
    engine.particles.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)),
    'physics must never produce NaN',
  );
  engine.destroy();
});

test('the Fireworks Command page provides every element the game queries', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'examples', 'fireworks-command', 'index.html'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'examples', 'fireworks-command', 'game.js'), 'utf8');

  const ids = [...game.matchAll(/querySelector\("#([\w-]+)"\)/g)].map(m => m[1]);
  assert.ok(ids.length, 'the game should query its HUD elements');
  for (const id of new Set(ids))
    assert.ok(
      new RegExp(`id="${id}"`).test(html),
      `index.html is missing #${id}, which game.js queries`,
    );

  // Load order matters: the engine defines GrandFireworks, the scene defines
  // FireworksCommandScene, and only then can the game construct both.
  const engineAt = html.indexOf('GrandFireworks.js'),
    sceneAt = html.indexOf('scene-renderer.js'),
    gameAt = html.indexOf('game.js');
  assert.ok(engineAt >= 0 && sceneAt >= 0 && gameAt >= 0, 'all three scripts must be loaded');
  assert.ok(engineAt < sceneAt && sceneAt < gameAt, 'scripts must load engine, scene, then game');

  const upgrades = [...new Set([...html.matchAll(/data-upgrade="(\w+)"/g)].map(m => m[1]))];
  assert.ok(upgrades.length, 'the panel should offer upgrades');
  for (const name of upgrades)
    assert.ok(
      new RegExp(`\\b${name}\\b`).test(game),
      `the game has no handling for the "${name}" upgrade`,
    );

  const effects = [...new Set([...html.matchAll(/<option value="(\w+)"/g)].map(m => m[1]))];
  for (const effect of effects)
    assert.ok(
      game.includes(`"${effect}"`) || game.includes(`'${effect}'`),
      `the game does not read the "${effect}" setting it offers`,
    );

  // The game drives the engine through the documented host API only.
  for (const method of ['setRenderPass', 'renderFrame', 'placeburst', 'launchTo', 'clear', 'resume', 'pause', 'destroy'])
    assert.ok(
      new RegExp(`engine\\.${method}\\(`).test(game),
      `game.js should drive the engine through ${method}()`,
    );
  assert.ok(
    /windStrength:\s*0/.test(game),
    'the game disables wind on its own instance rather than changing the library',
  );
});

test('the engine hosts a WebGL render pass and restores its own GL state', () => {
  const { GrandFireworks, glCalls } = createRuntime({ webgl: true });
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'webgl2' },
    visuals: { trails: false }
  });
  assert.equal(fireworks.rendererType, 'webgl2', 'the engine must use WebGL when it is available');

  let frame = null;
  fireworks.setRenderPass(f => { frame = f; glCalls.push({ op: 'host', args: [] }); });
  fireworks.placeburst({ x: 400, y: 300, radius: 120, sound: false });
  glCalls.length = 0;
  fireworks.renderFrame(16);

  assert.ok(frame.gl, 'a WebGL host receives the gl context');
  assert.equal(frame.ctx, null, 'a WebGL host must not also receive a 2d context');
  assert.equal(frame.canvas, fireworks.canvas);

  const { POINTS, ONE, ONE_MINUS_SRC_ALPHA } = frame.gl;
  const ops = glCalls.map(c => c.op);
  const hostAt = ops.indexOf('host');
  assert.ok(ops.includes('clear'), 'the frame is cleared');
  assert.ok(ops.indexOf('clear') < hostAt, 'the canvas must be cleared before the host draws');

  const pointsAt = glCalls.findIndex(c => c.op === 'drawArrays' && c.args[0] === POINTS);
  assert.ok(pointsAt > hostAt, 'the fireworks are drawn after the host scene');

  // Everything between the host composite and the points draw is the engine
  // rebuilding the state a host may have changed.
  const between = glCalls.slice(hostAt, pointsAt);
  const vaoReset = between.find(c => c.op === 'bindVertexArray');
  assert.ok(vaoReset, 'the engine must unbind any VAO the host left bound');
  assert.equal(vaoReset.args[0], null);
  const blend = between.find(c => c.op === 'blendFunc');
  assert.ok(blend, 'the engine must restore its additive blend function');
  assert.deepEqual(blend.args, [ONE, ONE_MINUS_SRC_ALPHA]);
  assert.ok(
    between.some(c => c.op === 'useProgram'),
    'the engine must re-select its own program after the host draws',
  );

  // Detaching leaves the engine rendering as normal.
  fireworks.setRenderPass(null);
  glCalls.length = 0;
  fireworks.renderFrame(16);
  assert.ok(
    !glCalls.some(c => c.op === 'host'),
    'a detached pass must not be called again',
  );
  assert.ok(
    glCalls.some(c => c.op === 'drawArrays' && c.args[0] === POINTS),
    'the engine keeps drawing its own fireworks',
  );
  fireworks.destroy();
});

test('the game scene composites through whichever context the engine provides', () => {
  const sceneSource = fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'fireworks-command', 'scene-renderer.js'),
    'utf8',
  );
  // The scene is game-owned artwork, so it is loaded as the browser would load it.
  const load = useWebgl => {
    const runtime = createRuntime({ webgl: useWebgl });
    vm.runInContext(sceneSource, runtime.sandbox, { filename: 'scene-renderer.js' });
    assert.equal(
      typeof runtime.sandbox.FireworksCommandScene,
      'function',
      'scene-renderer.js must export FireworksCommandScene',
    );
    return runtime;
  };
  const state = {
    cities: [
      { x: 120, alive: true, hp: 1 },
      { x: 300, alive: false, hp: 1 },
    ],
    bunkers: [{ x: 180, y: 700, alive: true, cooldown: 0, ammo: 45, maxAmmo: 45 }],
    enemy: [
      { kind: 'missile', x: 200, y: 100, tx: 120, ty: 700 },
      { kind: 'harasser', x: 400, y: 90, hp: 5 },
    ],
    aim: { x: 300, y: 250 },
    upgrades: { shield: 0, payload: 0 },
    wave: 2,
    paused: false,
    cannonTip: (b, x, y) => ({ x: b.x + 10, y: b.y - 10, theta: -1 }),
  };

  // WebGL: the artwork goes up as one texture and one fullscreen triangle.
  const glRuntime = load(true);
  const glEngine = new glRuntime.GrandFireworks({
    container: '#stage',
    mode: 'contained',
    renderer: { preferred: 'webgl2' },
    visuals: { trails: false, windStrength: 0 },
  });
  assert.equal(glEngine.rendererType, 'webgl2');
  const sceneA = new glRuntime.sandbox.FireworksCommandScene();
  let glFrame = null;
  glEngine.setRenderPass(frame => { glFrame = frame; sceneA.render(frame, state); });
  glRuntime.glCalls.length = 0;
  glEngine.renderFrame(16);

  const glOps = glRuntime.glCalls;
  assert.ok(
    glOps.some(c => c.op === 'texImage2D'),
    'the scene uploads its artwork as a texture',
  );
  assert.ok(
    glOps.some(c => c.op === 'drawArrays' && c.args[0] === glFrame.gl.TRIANGLES),
    'the scene composites with a fullscreen triangle',
  );
  assert.ok(
    glOps.some(c => c.op === 'drawArrays' && c.args[0] === glFrame.gl.POINTS),
    'the engine still draws its fireworks over the scene',
  );
  // The upload must restore the caller's pixel-store flags rather than leaving
  // them flipped for the next texture upload.
  const flips = glOps.filter(
    c => c.op === 'pixelStorei' && c.args[0] === glFrame.gl.UNPACK_FLIP_Y_WEBGL,
  );
  assert.equal(flips.length, 2, 'flip-y must be set and then restored');
  assert.equal(flips[0].args[1], false);
  glEngine.destroy();

  // Canvas fallback: the same scene paints with drawImage instead.
  const canvasRuntime = load(false);
  const canvasEngine = new canvasRuntime.GrandFireworks({
    container: '#stage',
    mode: 'contained',
    renderer: { preferred: 'canvas2d' },
    visuals: { trails: false, windStrength: 0 },
  });
  assert.equal(canvasEngine.rendererType, 'canvas2d');
  let blits = 0;
  const ctx2d = canvasEngine.renderer.ctx;
  const realDrawImage = ctx2d.drawImage;
  ctx2d.drawImage = (...args) => { blits++; return realDrawImage(...args); };
  const sceneB = new canvasRuntime.sandbox.FireworksCommandScene();
  let canvasFrame = null;
  canvasEngine.setRenderPass(frame => { canvasFrame = frame; sceneB.render(frame, state); });
  canvasEngine.renderFrame(16);
  assert.equal(canvasFrame.gl, null, 'the canvas fallback must not claim a gl context');
  assert.ok(canvasFrame.ctx, 'the canvas fallback supplies the 2d context');
  assert.ok(blits > 0, 'the scene composites through drawImage in the canvas fallback');
  sceneB.destroy();
  canvasEngine.destroy();
  sceneA.destroy();
});

test('the game gives every burst an explicit size and can vary its shell', () => {
  const game = fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'fireworks-command', 'game.js'),
    'utf8',
  );

  // The emit path must forward the queued radius, destructive flag and type —
  // otherwise a celebration burst silently becomes a 48px hit marker.
  assert.ok(
    /burstOptions\(b\.radius \|\| HIT_MARKER_RADIUS, b\.destructive, \{[\s\S]*?type: b\.type,[\s\S]*?colors: b\.colors,/.test(game),
    'updateBursts must forward the queued radius, destructive flag, type and colours',
  );

  // Every queued burst states its own size, so nothing relies on a default that
  // only makes sense for a hit marker.
  const queued = [...game.matchAll(/bursts\.push\(\{([\s\S]*?)\}\)/g)].map(m => m[1]);
  assert.ok(queued.length >= 5, `expected several burst kinds, found ${queued.length}`);
  for (const body of queued)
    assert.ok(
      /radius:/.test(body),
      `every queued burst must declare its radius, got: ${body.replace(/\s+/g, ' ').trim().slice(0, 80)}`,
    );

  // The two screen-filling spectacles are sized to the viewport, not to a hit.
  assert.ok(/const nova = Math\.min\(w, h\) \* 0\.2/.test(game), 'SuperNova bursts scale with the screen');
  assert.ok(/radius: nova/.test(game), 'SuperNova bursts declare their radius');
  assert.ok(/const fanfare = Math\.min\(w, h\) \* 0\.16/.test(game), 'round-clear bursts scale with the screen');
  assert.ok(/radius: fanfare/.test(game), 'round-clear bursts declare their radius');
});

test('a lost WebGL context keeps a host render pass alive on the canvas fallback', () => {
  const runtime = createRuntime({ webgl: true });
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, '..', 'examples', 'fireworks-command', 'scene-renderer.js'),
      'utf8',
    ),
    runtime.sandbox,
    { filename: 'scene-renderer.js' },
  );
  const engine = new runtime.GrandFireworks({
    container: '#stage',
    mode: 'contained',
    renderer: { preferred: 'webgl2' },
    visuals: { trails: false, windStrength: 0 },
  });
  assert.equal(engine.rendererType, 'webgl2');

  const state = {
    cities: [{ x: 120, alive: true, hp: 1 }],
    bunkers: [{ x: 180, y: 700, alive: true, cooldown: 0, ammo: 45, maxAmmo: 45 }],
    enemy: [],
    aim: { x: 300, y: 250 },
    upgrades: { shield: 0 },
    wave: 1,
    paused: false,
    cannonTip: b => ({ x: b.x, y: b.y - 10, theta: -1 }),
  };
  const scene = new runtime.sandbox.FireworksCommandScene();
  const seen = [];
  engine.setRenderPass(frame => {
    seen.push({ gl: Boolean(frame.gl), ctx: Boolean(frame.ctx) });
    scene.render(frame, state);
  });

  engine.renderFrame(16);
  assert.deepEqual(seen[seen.length - 1], { gl: true, ctx: false });

  // The GPU goes away and the driver will not hand a context back — the shape of
  // a real context loss. The engine must degrade rather than go dark, and the
  // host has to be told to draw with the other context on the very next frame.
  runtime.disableWebgl();
  engine.canvas.dispatchEvent(new runtime.sandbox.Event('webglcontextlost'));
  assert.equal(engine.rendererType, 'canvas2d', 'the engine must fall back, not stop');
  assert.equal(engine.contextLossCount, 1);

  engine.renderFrame(16);
  assert.deepEqual(
    seen[seen.length - 1],
    { gl: false, ctx: true },
    'the host must receive the canvas context after the fallback',
  );
  // The replacement canvas has to be sized, or the fallback draws nothing.
  assert.ok(engine.width > 0 && engine.height > 0);
  assert.ok(engine.dpr > 0, 'the fallback canvas needs a device pixel ratio');

  const frames = seen.length;
  engine.renderFrame(16);
  assert.equal(seen.length, frames + 1, 'the pass keeps running every frame afterwards');
  scene.destroy();
  engine.destroy();
});

test('the single palette gives every shell one solid colour', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    show: { palettes: 'single' }
  });

  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const palette = fireworks._palette();
    assert.equal(palette.length, 4, 'every shell still gets four palette entries');
    assert.equal(
      new Set(palette).size,
      1,
      `a solid shell must use one colour, got ${palette.join(', ')}`,
    );
    seen.add(palette[0]);
  }
  assert.ok(seen.size > 1, 'successive shells must not all be the same colour');
  fireworks.destroy();
});

test('a flat colour array is a pool of solid shells, a nested array still ramps', () => {
  const { GrandFireworks } = createRuntime();
  const pool = ['#FF3B30', '#0A84FF'];
  const flat = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    show: { palettes: pool }
  });
  for (let i = 0; i < 24; i++) {
    const palette = flat._palette();
    assert.equal(new Set(palette).size, 1, 'a flat pool means one solid colour per shell');
    assert.ok(pool.includes(palette[0]), `${palette[0]} is not from the supplied pool`);
  }
  flat.destroy();

  // The documented nested form is unchanged: each inner array is a full palette.
  const nested = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    show: { palettes: [['#FF0000', '#FFFF00']] }
  });
  const ramped = nested._palette();
  assert.equal(ramped.length, 4);
  assert.ok(
    new Set(ramped).size > 1,
    'a two-colour inner array must still ramp rather than collapse to a solid',
  );
  nested.destroy();
});

test('the config builder can reach every palette mode the engine accepts', () => {
  const builder = fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'configuration-builder.js'),
    'utf8',
  );
  const entry = builder.match(/"show\.palettes",[\s\S]*?\[([^\]]*)\]/);
  assert.ok(entry, 'the builder should expose the show.palettes control');
  const choices = [...entry[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
  // The engine resolves these two strings, so the tool must offer both or the
  // solid-colour mode is unreachable from the UI.
  for (const value of ['default', 'single'])
    assert.ok(
      choices.includes(value),
      `the builder palette select is missing "${value}"`,
    );
});

test('reachTime puts the sparks at the radius on schedule, not eventually', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  const radius = 120,
    reachTime = 300,
    steps = Math.round(reachTime / (1000 / 60));
  // The rim of the break: the same 90th-percentile measure the fit targets.
  const rim = () => {
    const spread = fireworks.particles
      .map(p => Math.hypot(p.x - 400, p.y - 300))
      .sort((a, b) => a - b);
    return spread[Math.min(spread.length - 1, Math.floor(spread.length * .9))];
  };

  fireworks.placeburst({ x: 400, y: 300, radius, reachTime, colors: ['#0af'], sound: false });
  for (let i = 0; i < steps; i++) fireworks.renderFrame(1000 / 60);
  const arrived = rim();
  assert.ok(
    Math.abs(arrived - radius) / radius < .25,
    `with reachTime ${reachTime}ms the rim should be near ${radius}px, got ${arrived.toFixed(0)}`,
  );

  // Without a schedule the same burst is still crawling: this is the defect that
  // let enemies die outside the visible fire, so it is asserted directly.
  fireworks.clear();
  fireworks.placeburst({ x: 400, y: 300, radius, colors: ['#0af'], sound: false });
  for (let i = 0; i < steps; i++) fireworks.renderFrame(1000 / 60);
  const crawling = rim();
  assert.ok(
    crawling < radius * .7,
    `an unscheduled burst is expected to lag well behind its radius, got ${crawling.toFixed(0)}`,
  );
  fireworks.destroy();
});

test('reachTime speeds up the expansion without changing how the sparks fall', () => {
  const { GrandFireworks } = createRuntime();
  // flashBangChance draws a random number conditionally, keyed off a cooldown that
  // differs between the two bursts below, which would desync the seeded sequence.
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    visuals: { flashBangChance: 0 }
  });
  // Terminal fall speed is gravity divided by the drag the star sheds per frame.
  const terminal = p => (p.gravity || 0) / (1 - p.friction);

  // Each burst measures its own natural reach, so gravity scales by a slightly
  // different k every time. Seeding the shared Math object makes the two bursts
  // below draw identical stars, which is what lets this compare like with like.
  const random = Math.random;
  const seed = () => {
    let state = 12345;
    Math.random = () => {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
  };
  try {
    seed();
    fireworks.placeburst({ x: 400, y: 300, radius: 140, colors: ['#0af'], sound: false });
    const withoutSchedule = fireworks.particles.map(terminal);
    fireworks.clear();

    seed();
    fireworks.placeburst({ x: 400, y: 300, radius: 140, reachTime: 200, colors: ['#0af'], sound: false });
    const withSchedule = fireworks.particles.map(terminal);

    assert.equal(withSchedule.length, withoutSchedule.length);
    for (let i = 0; i < withSchedule.length; i++)
      assert.ok(
        Math.abs(withSchedule[i] - withoutSchedule[i]) < 1e-9,
        `star ${i} falls at ${withSchedule[i]} instead of ${withoutSchedule[i]}: stronger drag must be compensated in gravity or the stars hang instead of raining down`,
      );

    // And the drag really is retuned: 95% of the reach inside the requested time
    // needs far stronger drag than the asymptotic default of 0.985.
    const expectedDrag = Math.pow(1 - .95, 1 / (200 / (1000 / 60)));
    assert.ok(expectedDrag < .8, 'sanity: the schedule above needs strong drag');
    assert.ok(
      fireworks.particles.every(p => Math.abs(p.friction - expectedDrag) < 1e-9),
      `a scheduled burst should carry drag for the requested time (${expectedDrag.toFixed(3)}), not the asymptotic default`,
    );
  } finally {
    Math.random = random;
  }
  fireworks.destroy();
});

test('the game leads its damage with the fire, from one shared rise rate', () => {
  const game = fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'fireworks-command', 'game.js'),
    'utf8',
  );
  // The hit circle and the visual schedule must be driven by the same constant,
  // or they silently drift apart again.
  assert.ok(
    /s\.r = Math\.min\(s\.max, s\.r \+ dt \* BLAST_RISE_RATE\)/.test(game),
    'the hit circle must grow at BLAST_RISE_RATE',
  );
  const schedules = [...game.matchAll(/reachTime: \(([A-Za-z]+)(?:\.max)? /g)];
  assert.ok(schedules.length >= 2, 'both lethal bursts should schedule their expansion');
  assert.ok(
    /BLAST_RISE_RATE\) \* BLAST_LEAD/.test(game),
    'the visual schedule must derive from the same rise rate and lead the damage',
  );
  // Oversized fire, so the blast always covers the circle that does the killing.
  assert.ok(/BLAST_OVERSHOOT = 1\.[0-9]/.test(game), 'the fire must be drawn larger than the hit circle');
  assert.ok(/BLAST_LEAD = 0\.[0-9]/.test(game), 'the fire must arrive before the blast goes lethal');
  // No lethal burst may fall back to the unhurried default.
  assert.ok(
    /reachTime: extras\.reachTime \|\| DEFAULT_BURST_REACH/.test(game),
    'every queued burst should snap open rather than swell slowly',
  );
});

test('the World Ender reports every secondary explosion with its position', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    container: '#stage',
    renderer: { preferred: 'canvas2d' },
    visuals: { trails: false },
  });
  // Secondary explosions are the only hook a game has for attributing damage to
  // this effect, so their payload is a contract, not an implementation detail.
  const reported = [];
  fireworks.addEventListener('finalestage', event => {
    if (event.detail && event.detail.stage === 'secondary-burst') reported.push(event.detail);
  });
  fireworks.setRenderPass(() => {});
  fireworks.launchWorldEnder({
    // The engine uncaps its own limits for this effect, so a host that cares about
    // frame rate has to supply finite ones.
    maxParticles: 6000,
    maxRockets: 200,
    firstSplitCount: 2,
    secondSplitCount: 2,
    secondSplitDelayMs: 100,
    recursionDurationMs: 400,
    maxChainDepth: 0,
    promotionChance: 0,
  });
  for (let i = 0; i < 200; i++) fireworks.renderFrame(50);

  assert.ok(reported.length >= 2, `expected secondary explosions, saw ${reported.length}`);
  for (const burst of reported) {
    assert.ok(Number.isFinite(burst.x) && Number.isFinite(burst.y), 'each report needs a position');
    assert.ok(burst.source, 'each report needs its source shell so scale can be read');
    // Without this a host has to guess the blast size, and a guess smaller than the
    // fire leaves enemies standing inside an explosion that visibly engulfed them.
    assert.ok(
      burst.radius > 0 && Number.isFinite(burst.radius),
      `each report needs its blast radius in world units, got ${burst.radius}`,
    );
  }
  fireworks.destroy();
});

test('the game fires a World Ender on right-click and attributes its damage', () => {
  const root = path.join(__dirname, '..');
  const game = fs.readFileSync(path.join(root, 'examples', 'fireworks-command', 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'examples', 'fireworks-command', 'index.html'), 'utf8');

  assert.ok(/addEventListener\("contextmenu"/.test(game), 'right-click must be bound to the World Ender');
  assert.ok(/e\.preventDefault\(\)/.test(game), 'the browser context menu must be suppressed');
  assert.ok(/engine\.launchWorldEnder\(/.test(game), 'the trigger must ask the engine for the effect');
  assert.ok(/addEventListener\("finalestage"/.test(game), 'the game must listen for secondary explosions');
  assert.ok(
    /detail\.stage !== "secondary-burst"/.test(game),
    'only secondary explosions should be lethal',
  );
  assert.ok(
    /detail\.x \* engine\.zoom/.test(game),
    'world coordinates must be converted to screen pixels before comparing with enemies',
  );
  // Unlimited by request: right-click keeps working with no charge to spend.
  assert.ok(!/worldEnders/.test(game), 'the World Ender must not be rationed');
  assert.ok(
    /function worldEnder\(\) \{[\s\S]{0,80}if \(!playing \|\| paused\) return;/.test(game),
    'it must still refuse to fire while paused or between rounds',
  );
  // Uncapped by explicit request: the engine's own limits come off for the effect and
  // nothing is substituted in their place, so this documents a decision rather than an
  // oversight — along with the risk, which is why the comment has to say so.
  assert.ok(/maxParticles: Infinity/.test(game), 'the World Ender runs uncapped by choice');
  assert.ok(/maxRockets: Infinity/.test(game), 'and with no rocket ceiling either');
  assert.ok(
    /only brake/.test(game),
    'the risk of running uncapped must be recorded beside the setting',
  );
  assert.ok(/Right-click/.test(html), 'the on-screen hint must mention the World Ender');
});

test('the game fades its sparks sooner and shows the blast radius', () => {
  const root = path.join(__dirname, '..');
  const game = fs.readFileSync(path.join(root, 'examples', 'fireworks-command', 'game.js'), 'utf8');
  const scene = fs.readFileSync(
    path.join(root, 'examples', 'fireworks-command', 'scene-renderer.js'),
    'utf8',
  );

  // Abandoned fire used to hang in the sky for the shell's full lifetime.
  const scale = game.match(/const BURST_LIFE_SCALE = (0\.[0-9]+)/);
  assert.ok(scale, 'the game should shorten how long its sparks live');
  assert.ok(Number(scale[1]) < 1, 'the shortened life must actually be shorter');
  assert.ok(/lifeScale: BURST_LIFE_SCALE/.test(game), 'every burst must carry the shortened life');

  // The radius ring needs the live shots, which is new for the scene.
  assert.ok(/shots,\s*aim,/.test(game), 'the shots must reach the scene so it can draw the ring');
  assert.ok(
    /for \(const s of state\.shots \|\| \[\]\)/.test(scene),
    'the scene must walk the live shots',
  );
  assert.ok(
    /ctx\.arc\(s\.x, s\.y, s\.r, 0, TAU\)/.test(scene),
    'the ring must follow the live lethal radius, not a decoration of its own',
  );
  const ring = scene.match(
    /ctx\.arc\(s\.x, s\.y, s\.r, 0, TAU\);\s*ctx\.strokeStyle = "#([0-9a-f]{8})"/i,
  );
  assert.ok(ring, 'the ring must set its own colour');
  assert.ok(
    parseInt(ring[1].slice(6), 16) < 0x60,
    'the ring has to be very light so it sits under the fire without competing with it',
  );
});

test('lifeScale fades the sparks sooner without touching anything else', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    visuals: { flashBangChance: 0 }
  });
  fireworks.placeburst({ x: 400, y: 300, radius: 120, colors: ['#0af'], sound: false });
  const plain = fireworks.particles.map(p => p.life);
  fireworks.clear();

  fireworks.placeburst({
    x: 400, y: 300, radius: 120, reachTime: 260, lifeScale: .5,
    colors: ['#0af'], sound: false
  });
  const faded = fireworks.particles.map(p => p.life);
  assert.equal(faded.length, plain.length);
  for (let i = 0; i < faded.length; i++)
    assert.ok(
      Math.abs(faded[i] - plain[i] / 2) < 1e-9,
      `spark ${i} lives ${faded[i]}ms instead of ${plain[i] / 2}ms`,
    );
  fireworks.destroy();
});

test('repeated World Enders do not ratchet the host limits down', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    visuals: { trails: false },
    show: { maxParticles: 10000, maxRockets: 20 },
  });
  fireworks.setRenderPass(() => {});
  // An explicitly configured budget is honoured as-is, so a constructor 10000 is 10000
  // even on the Canvas2D path: the renderer's halving applies only to preset defaults.
  const hostParticles = fireworks.options.show.maxParticles,
    hostRockets = fireworks.options.show.maxRockets;
  assert.equal(hostParticles, 10000, 'an explicit particle budget must be honoured');
  assert.equal(hostRockets, 20);

  const caps = { maxParticles: 6000, maxRockets: 200, recursionDurationMs: 400 };
  fireworks.launchWorldEnder({ ...caps });
  // The effect gets exactly what the host asked for, up to the engine's own
  // ceilings — the renderer's fallback halving does not apply a second time.
  const duringParticles = 6000,
    duringRockets = 200;
  assert.equal(fireworks.options.show.maxParticles, duringParticles, 'the effect raises the cap while it runs');
  assert.equal(fireworks.options.show.maxRockets, duringRockets);
  // Starting a second one before the first finishes is what used to capture the
  // inflated limits as the values to restore, permanently lowering the budget.
  fireworks.launchWorldEnder({ ...caps });
  assert.equal(fireworks.options.show.maxParticles, duringParticles);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        assert.equal(
          fireworks.options.show.maxParticles,
          hostParticles,
          'the host particle limit must survive repeated launches',
        );
        assert.equal(
          fireworks.options.show.maxRockets,
          hostRockets,
          'the host rocket limit must survive repeated launches',
        );
        fireworks.destroy();
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 600);
  });
});

test('World Ender coordinates are world-space, so a host conversion lands correctly', () => {
  const { GrandFireworks } = createRuntime();
  const zoom = .5;
  const fireworks = new GrandFireworks({
    container: '#stage',
    renderer: { preferred: 'canvas2d' },
    visuals: { trails: false, zoom },
  });
  const reported = [];
  fireworks.addEventListener('finalestage', event => {
    if (event.detail && event.detail.stage === 'secondary-burst') reported.push(event.detail);
  });
  fireworks.setRenderPass(() => {});
  fireworks.launchWorldEnder({
    maxParticles: 6000,
    maxRockets: 200,
    carrierX: .5,
    firstSplitCount: 2,
    secondSplitCount: 2,
    secondSplitDelayMs: 100,
    recursionDurationMs: 400,
    maxChainDepth: 0,
    promotionChance: 0,
  });
  for (let i = 0; i < 200; i++) fireworks.renderFrame(50);
  assert.ok(reported.length >= 2, 'the run should have produced secondary explosions');

  // The engine hands out world coordinates and a host converts them with `x * zoom`,
  // which is how the game places its damage. Getting that space wrong would put the
  // whole blast at half the intended distance, so pin it down: the converted
  // positions must land where the carrier actually is, at the middle of the canvas.
  const worldWidth = fireworks.width / zoom;
  assert.ok(
    reported.every(b => b.x >= 0 && b.x <= worldWidth),
    'world coordinates must sit inside the world, not inside the viewport',
  );
  const converted = reported.map(b => b.x * zoom),
    centre = converted.reduce((total, v) => total + v, 0) / converted.length;
  assert.ok(
    Math.abs(centre - fireworks.width / 2) < fireworks.width * .2,
    `converted blasts should cluster near the canvas centre, got ${centre.toFixed(0)} of ${fireworks.width}`,
  );
  // And the reported radius is the real blast, not a small stand-in: converted to
  // screen pixels it dwarfs the fraction-of-the-screen guess it replaced.
  const blasts = reported.map(b => b.radius * zoom).sort((a, b) => a - b),
    median = blasts[Math.floor(blasts.length / 2)];
  assert.ok(
    median > Math.min(fireworks.width, fireworks.height) * .2,
    `a secondary blast should cover a large area, got ${median.toFixed(0)}px`,
  );
  fireworks.destroy();
});

test('gravityScale slows the spark fall by exactly the factor asked for', () => {
  const { GrandFireworks } = createRuntime();
  // flashBangChance draws conditionally on a cooldown, which would desync the
  // seeded sequence between the two bursts below.
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    visuals: { flashBangChance: 0 }
  });
  const random = Math.random;
  const seed = () => {
    let state = 987654;
    Math.random = () => {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };
  };
  try {
    seed();
    fireworks.placeburst({
      x: 400, y: 300, radius: 120, reachTime: 260, colors: ['#0af'], sound: false
    });
    const normal = fireworks.particles.map(p => p.gravity);
    fireworks.clear();

    seed();
    fireworks.placeburst({
      x: 400, y: 300, radius: 120, reachTime: 260, gravityScale: .1,
      colors: ['#0af'], sound: false
    });
    const slowed = fireworks.particles.map(p => p.gravity);

    assert.equal(slowed.length, normal.length);
    for (let i = 0; i < slowed.length; i++)
      assert.ok(
        Math.abs(slowed[i] - normal[i] * .1) < 1e-9,
        `spark ${i} falls at ${slowed[i]} instead of ${normal[i] * .1}`,
      );
  } finally {
    Math.random = random;
  }
  fireworks.destroy();
});

test('the dome takes four hits before it fails and cracks where it is struck', () => {
  const root = path.join(__dirname, '..');
  const game = fs.readFileSync(path.join(root, 'examples', 'fireworks-command', 'game.js'), 'utf8');
  const scene = fs.readFileSync(
    path.join(root, 'examples', 'fireworks-command', 'scene-renderer.js'),
    'utf8',
  );

  assert.ok(/const DOME_HITS = 4/.test(game), 'the dome should take four hits');
  // Cracks are stored as a fraction across the dome, so they survive a resize and
  // are projected back into screen space when handed to the scene.
  assert.ok(
    /dome\.cracks\.push\(\{ t: x \/ w, seed: \(Math\.random\(\) \* 1e6\) \| 0 \}\)/.test(game),
    'each hit must record a crack at the point it landed',
  );
  assert.ok(
    /cracks: dome\.cracks\.map\(\(c\) => \(\{[\s\S]{0,120}x: c\.t \* w,/.test(game),
    'cracks must be projected to the dome surface for the scene',
  );
  // The dome intercepts fire before the cities are ever reached, and only while it
  // still has health.
  assert.ok(
    /if \(dome\.hp > 0 && m\.y >= domeYAt\(m\.x\)\) \{[\s\S]{0,120}hitDome\(m\);/.test(game),
    'incoming fire must hit the dome first while it holds',
  );
  const domeCheck = game.indexOf('m.y >= domeYAt(m.x)'),
    cityCheck = game.indexOf('loseCity(m.tx, m.kind)');
  assert.ok(domeCheck > -1 && cityCheck > domeCheck, 'the dome must be tested before the city');
  // A fresh round restores the field.
  assert.ok(/dome = \{ hp: DOME_HITS, cracks: \[\] \};/.test(game), 'the dome must reset each round');

  // The scene draws it, with the arcing seam and the localised cracks.
  assert.ok(/this\.paintDome\(state\.dome\)/.test(scene), 'the scene must draw the dome');
  assert.ok(/ctx\.arc\(cx, cy, r, from, to\)/.test(scene), 'the dome must be a real arc');
  assert.ok(/paintDomeCrack\(crack, dome\.geo\)/.test(scene), 'cracks must be localised per hit');
  assert.ok(
    /this\.seeded\(crack\.seed\)/.test(scene),
    'crack shapes must be deterministic, or they flicker every frame',
  );
  // Cracks grow inward into the glass, not outward off the dome, and a failed field
  // takes its cracks with it.
  assert.ok(
    /Math\.atan2\(crack\.y - geo\.cy, crack\.x - geo\.cx\) \+ Math\.PI/.test(scene),
    'cracks must point into the shield, not out of it',
  );
  assert.ok(
    /if \(dome\.hp <= 0\) return;/.test(scene),
    'a failed dome must vanish entirely, cracks included',
  );
  assert.ok(
    !/paintDomeCrack\(crack, dome\.geo, 0\.22\)/.test(scene),
    'nothing of the failed dome may be left drawn over the cities',
  );
  assert.ok(/dome\.cracks\.length = 0;/.test(game), 'the cracks must go with the field');
  // Drawn over the cities it protects, under the incoming fire.
  const cannonAt = scene.indexOf('paintCannon(b, state.aim, state.cannonTip)');
  const domeAt = scene.indexOf('this.paintDome(state.dome)');
  const enemyAt = scene.indexOf('state.enemy.forEach');
  assert.ok(cannonAt < domeAt && domeAt < enemyAt, 'the dome belongs between the cities and the enemy');
});

test('the scene skips repainting and re-uploading an unchanged frame', () => {
  const sceneSource = fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'fireworks-command', 'scene-renderer.js'),
    'utf8',
  );
  const state = {
    cities: [{ x: 120, alive: true, hp: 1 }],
    bunkers: [{ x: 180, y: 700, alive: true, cooldown: 0, ammo: 45, maxAmmo: 45 }],
    enemy: [{ kind: 'missile', x: 200, y: 100, tx: 120, ty: 700 }],
    shots: [],
    dome: null,
    aim: { x: 300, y: 250 },
    upgrades: { shield: 0 },
    wave: 1,
    paused: false,
    cannonTip: b => ({ x: b.x, y: b.y - 10, theta: -1 }),
  };

  const runtime = createRuntime({ webgl: true });
  vm.runInContext(sceneSource, runtime.sandbox, { filename: 'scene-renderer.js' });
  const engine = new runtime.GrandFireworks({
    container: '#stage',
    mode: 'contained',
    renderer: { preferred: 'webgl2' },
    visuals: { trails: false, windStrength: 0 },
  });
  const scene = new runtime.sandbox.FireworksCommandScene();
  let frame = null;
  engine.setRenderPass(f => { frame = f; scene.render(f, state); });
  const uploads = () =>
    runtime.glCalls.filter(c => c.op === 'texImage2D' || c.op === 'texSubImage2D').length;
  const composites = () =>
    runtime.glCalls.filter(c => c.op === 'drawArrays' && c.args[0] === frame.gl.TRIANGLES).length;

  engine.renderFrame(16);
  const first = uploads();
  assert.equal(first, 1, `the first frame uploads its artwork once, got ${first}`);

  // An unchanged frame must not upload the whole texture again — that upload is the
  // entire cost being avoided.
  engine.renderFrame(16);
  assert.equal(uploads(), first, 'an unchanged frame must not re-upload the scene');
  // But it must still composite: the engine clears the canvas every frame, so a
  // skipped blit would leave the scene missing.
  assert.equal(composites(), 2, 'every frame composites, cached or not');

  // Anything the artwork depends on has to invalidate the cache.
  state.enemy[0].x += 5;
  engine.renderFrame(16);
  assert.equal(uploads(), first + 1, 'a changed frame must re-upload');
  assert.equal(composites(), 3);
  state.paused = true;
  engine.renderFrame(16);
  assert.equal(uploads(), first + 2, 'a state change the artwork shows must invalidate the cache');

  scene.destroy();
  engine.destroy();

  // The Canvas fallback blits the cached artwork every frame for the same reason.
  const canvasRuntime = createRuntime();
  vm.runInContext(sceneSource, canvasRuntime.sandbox, { filename: 'scene-renderer.js' });
  const canvasEngine = new canvasRuntime.GrandFireworks({
    container: '#stage',
    mode: 'contained',
    renderer: { preferred: 'canvas2d' },
    visuals: { trails: false, windStrength: 0 },
  });
  let blits = 0;
  const ctx2d = canvasEngine.renderer.ctx;
  const realDrawImage = ctx2d.drawImage;
  ctx2d.drawImage = (...args) => { blits++; return realDrawImage(...args); };
  const canvasScene = new canvasRuntime.sandbox.FireworksCommandScene();
  canvasEngine.setRenderPass(f => canvasScene.render(f, state));
  canvasEngine.renderFrame(16);
  // Measured as an increment: painting the artwork blits the cached terrain too, so
  // the absolute count is not the thing being asserted here.
  const afterFirstCanvasFrame = blits;
  canvasEngine.renderFrame(16);
  assert.equal(
    blits,
    afterFirstCanvasFrame + 1,
    'the fallback must blit the cached artwork on every frame, cached or not',
  );
  canvasScene.destroy();
  canvasEngine.destroy();
});

test('a second World Ender does not cancel the one already running', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    container: '#stage',
    renderer: { preferred: 'canvas2d' },
    visuals: { trails: false },
  });
  fireworks.setRenderPass(() => {});
  let secondaries = 0;
  fireworks.addEventListener('finalestage', event => {
    if (event.detail && event.detail.stage === 'secondary-burst') secondaries++;
  });
  const caps = {
    maxParticles: 6000,
    maxRockets: 25,
    firstSplitCount: 2,
    secondSplitCount: 2,
    secondSplitDelayMs: 100,
    recursionDurationMs: 30000,
    maxChainDepth: 0,
    promotionChance: 0,
  };

  fireworks.launchWorldEnder({ ...caps });
  const firstCarrier = fireworks.rockets.length;
  assert.ok(firstCarrier > 0, 'the first ender puts a carrier in the air');

  fireworks.launchWorldEnder({ ...caps });
  // The first carrier must still be flying. Wiping this.rockets is exactly what used
  // to make an existing World Ender vanish the moment another was fired.
  assert.ok(
    fireworks.rockets.length > firstCarrier,
    `both enders should be aloft, saw ${fireworks.rockets.length}`,
  );
  assert.equal(fireworks.worldEnders.size, 2, 'both effects must stay registered');

  // And both keep chaining: two carriers splitting into two trails each is four
  // secondary bursts before any of them branch again. Sampled during the run, since
  // ten seconds of effect time is long enough for every spark to have burned out.
  let peak = 0;
  for (let i = 0; i < 200; i++) {
    fireworks.renderFrame(50);
    if (fireworks.particles.length > peak) peak = fireworks.particles.length;
  }
  assert.ok(
    secondaries >= 4,
    `both enders should have burst, saw ${secondaries} secondary explosions`,
  );
  assert.ok(peak > 0, 'the overlapping enders must keep producing fire');

  assert.equal(fireworks.worldEnders.size, 2, 'the effects outlive the frames');
  fireworks.destroy();
  assert.equal(fireworks.worldEnders.size, 0, 'destroy clears every running effect');
});

test('the reported blast radius is the same measurement the fit uses', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    visuals: { flashBangChance: 0 }
  });
  const from = fireworks.particles.length;
  fireworks.placeburst({ x: 400, y: 300, radius: 150, colors: ['#0af'], sound: false });
  // The fit targets the 90th-percentile reach of the stars it created, and the
  // finalestage report is measured with the same helper. They have to agree, or a
  // host's damage and the engine's fire are describing different explosions.
  const reported = fireworks._burstReach(from);
  assert.ok(
    Math.abs(reported - 150) < 1,
    `the reported rim should match the fitted radius, got ${reported}`,
  );
  fireworks.destroy();
});

test('the game exposes dev shortcuts for reaching any wave and upgrade package', () => {
  const root = path.join(__dirname, '..');
  const game = fs.readFileSync(path.join(root, 'examples', 'fireworks-command', 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'examples', 'fireworks-command', 'index.html'), 'utf8');

  // Digits jump waves, clamped, so a stray key cannot walk the run off the end.
  assert.ok(/key >= "1" && key <= "9"/.test(game), 'digit keys must jump waves');
  assert.ok(/devJumpTo\(Number\(key\)\)/.test(game), 'the digit must select the wave');
  assert.ok(
    /wave = Math\.max\(1, Math\.min\(9, Math\.round\(nextWave\) \|\| 1\)\)/.test(game),
    'the requested wave must be clamped',
  );
  // A jumped wave gets a full defence, so the upgrade under test is what is being
  // judged rather than damage carried over from the previous round.
  assert.ok(
    /function devJumpTo\(nextWave\) \{[\s\S]{0,460}resetDefenses\(\);[\s\S]{0,40}start\(false\);/.test(game),
    'jumping must restore the defence and start the wave',
  );

  // U opens the picker on a frozen game rather than granting anything itself.
  assert.ok(
    /if \(key === "u"\) \{[\s\S]{0,40}devUpgradeMenu\(\)/.test(game),
    'U must open the upgrade picker',
  );
  assert.ok(!/devGrantUpgrade/.test(game), 'U must not grant an upgrade outright');
  assert.ok(
    /function devUpgradeMenu\(\) \{[\s\S]{0,420}engine\.pause\(\);[\s\S]{0,420}panel\.hidden = false;/.test(game),
    'the picker must pause the game and show the panel',
  );
  assert.ok(
    /if \(devChoosing\) \{[\s\S]{0,260}return devResume\(\);/.test(game),
    'choosing from the dev picker must apply the package and resume',
  );
  assert.ok(
    /function devResume\(\) \{[\s\S]{0,520}paused = false;[\s\S]{0,80}engine\.resume\(\);/.test(game),
    'resuming must restart the engine exactly as unpausing does',
  );
  // The real panel buttons are what the picker shows, so every package stays
  // available and adding one to the panel needs no change here.
  assert.ok(!/DEV_UPGRADES/.test(game), 'the picker must not keep its own package list');
  assert.ok(/function devReset\(\) \{[\s\S]{0,60}start\(true\)/.test(game), 'R must give a clean wave 1');
  // And they announce themselves somewhere a developer will look.
  assert.ok(/console\.info\(/.test(game), 'the shortcuts must be discoverable');
});

test('no function declaration in the game files is joined onto another statement', () => {
  const root = path.join(__dirname, '..');
  // The guard has to actually reject the pattern it exists for, or it proves nothing.
  const joined = '  });  function worldEnder() {';
  assert.ok(
    /function [A-Za-z]/.test(joined) && !/^\s*function [A-Za-z]/.test(joined),
    'the check must reject a declaration joined onto another statement',
  );
  for (const name of ['game.js', 'scene-renderer.js']) {
    const source = fs.readFileSync(
      path.join(root, 'examples', 'fireworks-command', name),
      'utf8',
    );
    source.split(/\r?\n/).forEach((line, index) => {
      if (!/function [A-Za-z]/.test(line)) return;
      // A comment may mention a function mid-sentence.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      // Anything else must start the line: a declaration glued onto the previous
      // statement is still valid JavaScript, so only this check catches it.
      assert.ok(
        /^\s*function [A-Za-z]/.test(line),
        `${name}:${index + 1} has a function declaration joined onto another statement: ${line.trim().slice(0, 70)}`,
      );
    });
  }
});

test('every World Ender branch reports to the host, whatever its shell type', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    container: '#stage',
    renderer: { preferred: 'canvas2d' },
    visuals: { trails: false, zoom: .55, burstVelocity: 1.25 },
  });
  const reported = [];
  fireworks.addEventListener('finalestage', event => {
    const detail = event.detail || {};
    if (detail.stage !== 'secondary-burst') return;
    reported.push({ radius: detail.radius, depth: detail.source && detail.source.worldEnderDepth });
  });
  fireworks.setRenderPass(() => {});
  // Every branch promoted, and a depth of three, so the chained generations are
  // guaranteed to exist rather than turning on a 3% roll.
  fireworks.launchWorldEnder({
    maxParticles: 6000,
    maxRockets: 25,
    firstSplitCount: 2,
    secondSplitCount: 2,
    promotionChance: 1,
    maxChainDepth: 3,
    recursionDurationMs: 60000,
  });
  for (let i = 0; i < 300; i++) fireworks.renderFrame(50);

  const depths = reported.map(r => r.depth);
  assert.ok(reported.length > 4, `expected a chain of bursts, saw ${reported.length}`);
  assert.ok(depths.includes(1), 'the first chained generation must report');
  assert.ok(
    depths.includes(2),
    'deeper chained generations must report: warheads used to burst with no report at all',
  );
  // The chain must still stop where it always did, even though every branch now
  // reports: only promoted shells are allowed to branch onward. The carrier's own
  // trails carry no depth, so only branch depths are bounded here.
  const branchDepths = depths.filter(depth => typeof depth === 'number');
  assert.ok(branchDepths.length > 0, 'branches must report their depth');
  assert.ok(
    branchDepths.every(depth => depth <= 3),
    `the chain must stop at maxChainDepth, saw depth ${Math.max(...branchDepths)}`,
  );
  // Positions are what the host attributes damage from, so every report needs one.
  for (const report of reported) assert.ok(Number.isFinite(report.radius));
  fireworks.destroy();
});

test('a throttled World Ender still reports a consistent blast radius', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    container: '#stage',
    renderer: { preferred: 'canvas2d' },
    visuals: { trails: false, zoom: .55, burstVelocity: 1.25 },
  });
  const radii = [];
  fireworks.addEventListener('finalestage', event => {
    const detail = event.detail || {};
    if (detail.stage === 'secondary-burst') radii.push(detail.radius);
  });
  fireworks.setRenderPass(() => {});
  // A cap far below what this volley wants, so most bursts are throttled and have no
  // stars of their own to measure.
  fireworks.launchWorldEnder({
    maxParticles: 300,
    maxRockets: 25,
    firstSplitCount: 4,
    secondSplitCount: 3,
    promotionChance: 1,
    maxChainDepth: 2,
    recursionDurationMs: 60000,
  });
  for (let i = 0; i < 300; i++) fireworks.renderFrame(50);

  assert.ok(radii.length > 4, `expected several reports, saw ${radii.length}`);
  assert.ok(
    radii.every(radius => radius > 0),
    `a throttled burst must still report the size it was built for, saw ${JSON.stringify(radii.slice(0, 8))}`,
  );
  // A blast cannot be larger than the world it sits in. Different shell types genuinely
  // reach differently, but a report past the viewport's own diagonal would be a screen
  // clear in disguise, which is what makes enemies vanish with no fire near them.
  const diagonal = Math.hypot(fireworks.width, fireworks.height) / fireworks.zoom;
  assert.ok(
    radii.every(radius => radius <= diagonal),
    `no blast may exceed the world diagonal (${diagonal.toFixed(0)}), saw ${Math.max(...radii).toFixed(0)}`,
  );
  fireworks.destroy();
});

test('the homepage detonates a shell where the page is clicked', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(
    /document\.addEventListener\('pointerdown', event => \{[\s\S]{0,400}fireworks\.placeburst\(\{ x: event\.clientX, y: event\.clientY \}\)/.test(html),
    'a click on the page must detonate a shell at that point',
  );
  // Viewport coordinates are only correct because the canvas is a fixed overlay covering
  // it, so the burst must not be offset by anything.
  assert.ok(
    !/placeburst\(\{ x: event\.clientX - /.test(html),
    'the canvas is a fixed overlay, so no offset may be subtracted',
  );
  // The controls keep their own clicks, and dragging the control bar must not fire.
  assert.ok(/event\.target\.closest\(PAGE_CONTROLS\)/.test(html), 'controls must be excluded');
  assert.ok(/if \(panelDrag\) return;/.test(html), 'a drag must not detonate a shell');
  assert.ok(/if \(event\.button\) return;/.test(html), 'only the primary button or a touch');
  assert.ok(/Click for fireworks/.test(html), 'the page should say that clicking works');
});

test('a placed burst with no colours follows the configured palette', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    show: { palettes: 'single' }
  });
  // With no colours asked for, the shell takes the palette the show is already using. It
  // used to fall through to the first built-in ramp whatever the page was configured with.
  fireworks.placeburst({ x: 10, y: 10, sound: false });
  const colours = new Set(fireworks.particles.map(p => `${p.r},${p.g},${p.b}`));
  assert.equal(
    colours.size,
    1,
    `a solid single palette should give one colour, got ${colours.size}`,
  );
  fireworks.destroy();
});

test('text fireworks can be placed off-centre, and default to centred', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });

  const centred = fireworks._textPlans(['BOOM'], fireworks.options.textFirework);
  assert.equal(centred[0].x, fireworks.width / 2, 'centred by default, as it always was');

  const quarter = fireworks._textPlans(['BOOM'], {
    ...fireworks.options.textFirework,
    horizontalPosition: .25
  });
  assert.ok(quarter[0].x < centred[0].x, 'a quarter across must sit left of centre');

  // The block is kept on screen: a position hard against the edge is pulled in by half the
  // block, so text can never be half off the canvas.
  const extreme = fireworks._textPlans(['BOOM'], {
    ...fireworks.options.textFirework,
    horizontalPosition: 0
  });
  assert.ok(extreme[0].x > 0, 'the block must not be pushed off the left edge');
  assert.ok(
    extreme[0].points.every(p => p.x >= 0),
    'no sampled point may land off the canvas',
  );
  fireworks.destroy();
});

test('text can be shown without halting the rest of the show', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ show: { maxParticles: 4000 } });
  fireworks.start();
  assert.equal(fireworks.accepting, true, 'a running show accepts launches to begin with');

  // `exclusive: false` is the homepage's setting: the ambient show has to keep launching
  // while the words assemble, so the engine must not take the lock or reserve the budget.
  return fireworks
    .launchText('BOOM', { exclusive: false })
    .then(() => {
      assert.equal(fireworks.accepting, true, 'a non-exclusive text launch must not stop the show');
      assert.ok(
        !(fireworks.textReservedUntil > 0),
        'and must not reserve the particle budget away from other shells',
      );
      // The default is unchanged: a deliberate message still takes the show over.
      return fireworks.launchText('BOOM');
    })
    .then(() => {
      assert.equal(fireworks.accepting, false, 'the exclusive default still halts new launches');
      assert.ok(fireworks.textReservedUntil > 0, 'and still reserves the budget');
      fireworks.destroy();
    });
});

test('text shrinks with the camera when the view pulls back', () => {
  const { GrandFireworks } = createRuntime();
  const near = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  const far = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    visuals: { zoom: 0.5 },
  });

  const atOne = near._textPlans(['BOOM'], near.options.textFirework)[0];
  const pulled = far._textPlans(['BOOM'], far.options.textFirework)[0];

  // Text plans are sampled in screen pixels and then divided by the zoom, so drawing the
  // block at the configured size made the words immune to the camera: pulling back left
  // them full size. They have to follow the perspective like everything else.
  assert.ok(pulled.fontSize < atOne.fontSize, 'zooming out must shrink the block');
  assert.equal(pulled.fontSize, Math.round(atOne.fontSize / 2), 'and by the zoom factor');
  // Only the size changes - the requested position must not drift sideways.
  assert.equal(pulled.x, atOne.x, 'the block must not move sideways with the zoom');
  near.destroy();
  far.destroy();
});

test('start and stop leave frame pacing to a host render pass', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    transition: { fadeOut: 0 },
  });
  fireworks.setRenderPass(() => {});

  // A host that attached a render pass is already calling renderFrame() every frame. An
  // engine loop on top of that would step the whole simulation twice per frame.
  fireworks.start();
  assert.equal(fireworks.state, 'running');
  assert.equal(fireworks.raf, 0, 'start() must not start an engine loop under a render pass');
  for (let i = 0; i < 20; i++) fireworks.renderFrame(50);

  const stopped = fireworks.stop({ finale: false });
  assert.equal(fireworks.raf, 0, 'neither may stop()');
  // The wind-down is driven by the host's frames, so it has to finish without any
  // engine loop at all, and resolve the promise the host is waiting on.
  for (let i = 0; i < 2000 && fireworks.state === 'finishing'; i++) fireworks.renderFrame(50);
  assert.notEqual(fireworks.state, 'finishing', 'renderFrame must carry out the wind-down');

  return stopped.then(() => {
    assert.equal(fireworks.state, 'stopped');
    assert.notEqual(
      fireworks.root.style.display,
      'none',
      'the shared canvas must stay visible, because the host draws its scene on it',
    );

    // A show with a duration ends on schedule under a render pass too.
    fireworks.start({ duration: 500 });
    for (let i = 0; i < 12; i++) fireworks.renderFrame(50);
    assert.notEqual(fireworks.state, 'running', 'the duration must end the show');
    assert.equal(fireworks.raf, 0);
    fireworks.destroy();
  });
});

test('overlapping World Enders each chain from their own carrier', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    container: '#stage',
    renderer: { preferred: 'canvas2d' },
    visuals: { trails: false },
  });
  fireworks.setRenderPass(() => {});
  // Count the follow-up shells each effect spawns, by the effect that spawned them.
  const spawned = {};
  const spawn = fireworks._spawnWorldEnderShells.bind(fireworks);
  fireworks._spawnWorldEnderShells = (point, count, options) => {
    spawned[options.worldEnderId] = (spawned[options.worldEnderId] || 0) + count;
    return spawn(point, count, options);
  };
  const caps = {
    maxParticles: 6000,
    maxRockets: 25,
    firstSplitCount: 3,
    secondSplitCount: 2,
    secondSplitDelayMs: 100,
    recursionDurationMs: 30000,
    maxChainDepth: 0,
    promotionChance: 0,
  };
  fireworks.launchWorldEnder({ ...caps });
  fireworks.launchWorldEnder({ ...caps });
  for (let i = 0; i < 200; i++) fireworks.renderFrame(50);

  // Three trails per carrier, two shells per trail. The second carrier's trails used to
  // be handed to the first effect, which had already used up its three, so the second
  // ender went off without chaining at all.
  assert.deepEqual(
    { ...spawned },
    { 1: 6, 2: 6 },
    'each ender must chain from its own three trails',
  );
  fireworks.destroy();
});

test('options changed during a World Ender survive its restore', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({
    renderer: { preferred: 'canvas2d' },
    show: { launchHorizon: 1, maxParticles: 5000 },
  });
  fireworks.setRenderPass(() => {});
  fireworks.launchWorldEnder({ maxParticles: 9000, recursionDurationMs: 20 });

  // The homepage zoom slider does exactly this while an ender is running.
  fireworks.setOptions({ show: { launchHorizon: 2, maxParticles: 3000 } });
  assert.equal(
    fireworks.options.show.maxParticles,
    9000,
    'rebuilding the options must not drop the running effect\'s budget',
  );
  assert.equal(fireworks.options.show.launchHorizon, 2, 'unrelated changes apply at once');

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        assert.equal(
          fireworks.options.show.launchHorizon,
          2,
          'the restore must not undo an option the effect never touched',
        );
        assert.equal(
          fireworks.options.show.maxParticles,
          3000,
          'and must restore what the host asked for most recently',
        );
        fireworks.destroy();
        resolve();
      } catch (error) {
        reject(error);
      }
    }, 80);
  });
});

test('text stays centred on a screen narrower than its block', () => {
  const { GrandFireworks, sandbox } = createRuntime();
  // The block is never narrower than 280px, so on a smaller screen it cannot fit either
  // way. Clamping it against both edges used to pin it to the left one instead.
  sandbox.innerWidth = 250;
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  assert.equal(fireworks.width, 250);
  for (const horizontalPosition of [0, 0.5, 1]) {
    const [plan] = fireworks._textPlans(['BOOM'], {
      ...fireworks.options.textFirework,
      horizontalPosition,
    });
    assert.equal(plan.x, 125, `position ${horizontalPosition} must centre the block`);
  }
  fireworks.destroy();
});

test('tilted text turns as one block about its centre and stays on screen', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  // The mock canvas reads back as fully transparent, which samples no points at all.
  // Read every pixel back as opaque, so each line samples its whole box.
  fireworks.renderer.ctx.getImageData = (x, y, w, h) => ({
    data: new Uint8ClampedArray(w * h * 4).fill(255),
  });
  const base = { ...fireworks.options.textFirework, horizontalPosition: 0.5, verticalPosition: 0.5 };
  const lines = ['GRAND', 'FIREWORKS'];

  // No tilt by default, and an untilted block is laid out exactly as before.
  const flat = fireworks._textPlans(lines, base);
  assert.equal(fireworks.options.textFirework.tilt, 0, 'tilt must default to none');
  assert.equal(flat[0].angle, 0);
  assert.equal(flat[0].burstY, flat[0].y, 'an untilted line bursts where it always did');
  assert.ok(flat[0].points.length > 0, 'the opaque read-back must sample points');

  // A fixed tilt rotates every point of every line about one shared centre, so the
  // lines turn together rather than as separately rotated strips.
  const tilted = fireworks._textPlans(lines, { ...base, tilt: 20 });
  const angle = (20 * Math.PI) / 180;
  for (let line = 0; line < lines.length; line++) {
    const plan = tilted[line];
    assert.ok(Math.abs(plan.angle - angle) < 1e-12, 'the angle is given in degrees');
    assert.equal(plan.pivotX, fireworks.width / 2, 'one pivot for the whole block');
    assert.equal(plan.pivotY, fireworks.height / 2);
    assert.equal(plan.points.length, flat[line].points.length);
    plan.points.forEach((point, i) => {
      const dx = flat[line].points[i].x - plan.pivotX,
        dy = flat[line].points[i].y - plan.pivotY;
      assert.ok(
        Math.abs(point.x - (plan.pivotX + dx * Math.cos(angle) - dy * Math.sin(angle))) < 1e-6 &&
          Math.abs(point.y - (plan.pivotY + dx * Math.sin(angle) + dy * Math.cos(angle))) < 1e-6,
        'every point must be the flat point turned about the pivot',
      );
    });
    // The rocket has to climb to where the line now sits, not where it would have.
    assert.ok(
      Math.abs(plan.burstY - (plan.pivotY + (plan.y - plan.pivotY) * Math.cos(angle))) < 1e-9,
      'each line must burst at its tilted height',
    );
  }

  // A range picks a fresh angle for each launch, and either way is allowed.
  const angles = Array.from({ length: 50 }, () =>
    fireworks._textPlans(['BOOM'], { ...base, tilt: [-30, 30] })[0].angle,
  );
  const limit = (30 * Math.PI) / 180 + 1e-12;
  assert.ok(angles.every(a => Math.abs(a) <= limit), 'a range must stay inside its bounds');
  assert.ok(angles.some(a => a < 0) && angles.some(a => a > 0), 'and tilt both ways');

  // Held to 45 degrees, so a message can never be turned on its side.
  assert.ok(
    Math.abs(fireworks._textPlans(['BOOM'], { ...base, tilt: 90 })[0].angle - Math.PI / 4) < 1e-12,
    'a tilt past 45 degrees must be limited to 45',
  );

  // Hard in a corner and fully tilted, every sampled point must still be on the canvas.
  const cornered = fireworks._textPlans(['BOOM'], {
    ...base,
    tilt: -45,
    horizontalPosition: 0,
    verticalPosition: 0,
  })[0];
  assert.ok(
    cornered.points.every(
      p => p.x >= 0 && p.x <= fireworks.width && p.y >= 0 && p.y <= fireworks.height,
    ),
    'a tilted block must be kept on screen, corners and all',
  );
  fireworks.destroy();
});

test('tilted text draws its crisp layer at the same angle as its sparks', () => {
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  const calls = [];
  const ctx = fireworks.textCtx;
  ctx.rotate = angle => calls.push(['rotate', angle]);
  ctx.translate = (x, y) => calls.push(['translate', x, y]);
  ctx.fillText = () => calls.push(['fillText']);
  const angle = (15 * Math.PI) / 180;
  fireworks.textBlocks.push({
    text: 'BOOM', fontSize: 40, x: 500, y: 300, angle, pivotX: 512, pivotY: 384,
    birth: fireworks.effectTime, cfg: fireworks.options.textFirework,
  });
  fireworks._drawText(fireworks.effectTime + 100);
  assert.deepEqual(
    calls.slice(0, 4),
    [['translate', 512, 384], ['rotate', angle], ['translate', -512, -384], ['fillText']],
    'the crisp text must be turned about the block pivot before it is drawn',
  );

  // An untilted block draws exactly as before, with no transform at all.
  calls.length = 0;
  fireworks.textBlocks.length = 0;
  fireworks.textBlocks.push({
    text: 'BOOM', fontSize: 40, x: 500, y: 300, angle: 0, pivotX: 512, pivotY: 384,
    birth: fireworks.effectTime, cfg: fireworks.options.textFirework,
  });
  fireworks._drawText(fireworks.effectTime + 100);
  assert.deepEqual(calls[0], ['fillText'], 'no rotation for untilted text');
  fireworks.destroy();
});

test('the homepage can choose which firework types it fires', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // A Types button in the top bar beside Slim/Full, and one in the panel for the page view.
  const bar = html.match(/<div id="hero-drag-handle"[\s\S]*?<\/div>/);
  assert.ok(bar, 'the handle bar must exist');
  assert.ok(bar[0].includes('id="panel-types"'), 'the bar needs a Types button');
  assert.ok(
    bar[0].indexOf('panel-types') > bar[0].indexOf('panel-collapse'),
    'it belongs beside the Slim/Full button',
  );
  assert.ok(html.includes('id="types-btn"'), 'the panel needs its own Types button');
  assert.ok(
    /document\.querySelector\('#panel-types'\), document\.querySelector\('#types-btn'\)/.test(html),
    'both buttons must open the same picker',
  );

  // The dialog must offer exactly what the engine can fire, or the boxes drift from reality.
  assert.ok(/<dialog id="types-dialog"/.test(html), 'the picker dialog must exist');
  const catalogue = html.match(/const SHELL_CATALOGUE = \[([\s\S]*?)\];/);
  assert.ok(catalogue, 'the shell catalogue must be declared');
  const listed = [...catalogue[1].matchAll(/\['([a-z_]+)',/g)].map(match => match[1]);
  const { GrandFireworks } = createRuntime();
  assert.equal(listed.length, GrandFireworks.TYPES.length, 'every shell type must be offered');
  for (const type of GrandFireworks.TYPES)
    assert.ok(listed.includes(type), `the picker is missing ${type}`);

  // Ticking a box has to reach the live engine, and must never leave it with nothing to fire.
  assert.ok(
    /fireworks\.setOptions\(\{ show: \{ enabledTypes: chosen \} \}\)/.test(html),
    'the picker must set enabledTypes on the engine',
  );
  assert.ok(
    /const chosen = list\.length \? list : \[SHELL_CATALOGUE\[0\]\[0\]\]/.test(html),
    'an empty selection must not be handed to the engine',
  );

  // And the page must read the engine's current set when it opens, not a remembered one.
  assert.ok(
    /current === 'all' \? SHELL_CATALOGUE\.map/.test(html),
    'the dialog must reflect what is actually enabled',
  );
});

test('the homepage can switch the random text messages off', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // The switch must exist and default to on, or the messages stop for everyone on load.
  const control = html.match(/<input id="auto-text" type="checkbox"([^>]*)>/);
  assert.ok(control, 'the Auto text switch must exist');
  assert.ok(/\bchecked\b/.test(control[1]), 'and be on by default');

  assert.ok(
    /autoTextControl\.addEventListener\('change'/.test(html),
    'the switch must be wired to a change handler',
  );
  assert.ok(
    /textFireworksOn = autoTextControl\.checked/.test(html),
    'which has to set the flag the firers read',
  );

  // The point of the switch: the firers must consult the flag, or it does nothing at all.
  const loop = html.match(/function textFireworkLoop\(\)[\s\S]*?\n  \}/);
  assert.ok(loop, 'the text firer must exist');
  assert.ok(
    /if \(textFireworksOn\) shootTextFirework\(\)/.test(loop[0]),
    'and the firer must honour the switch',
  );
});

test('the homepage control panel closes before the rest of the page', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const from = html.indexOf('<div id="hero-playground"');
  const to = html.indexOf('<div class="pill-row"');
  assert.ok(from > -1 && to > from, 'the panel and what follows it must both be findable');

  // Removing the "More controls" row from this region once took a closing </div> with it, so
  // the panel never closed and everything after it — the version pills, the lead paragraphs,
  // the links — rendered inside the control box. Balance is the thing that catches that.
  const region = html.slice(from, to);
  const opens = (region.match(/<div\b/g) || []).length;
  const closes = (region.match(/<\/div>/g) || []).length;
  assert.equal(closes, opens, `the panel region has ${opens} <div> but ${closes} </div>`);
});

test('the homepage holds the launch band at a fixed share of the viewport', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // The band has to scale with the zoom, or a wider field of view leaves the fire short of
  // the edges. It used to be a bare 1 / zoom, which pinned the launchers to the exact edges
  // at every zoom; it is now a named share of the viewport so bursts have room to expand into
  // and the same share is held whether the camera is pulled back or pushed in.
  const band = html.match(/const LAUNCH_BAND = ([\d.]+)/);
  assert.ok(band, 'the band share must be a named constant');
  const share = Number(band[1]);
  assert.ok(share > 0 && share <= 1, `a share of the viewport, got ${share}`);
  assert.ok(
    /launchHorizon: LAUNCH_BAND \/ zoom/.test(html),
    'the horizon must be that share of the visible width',
  );

  // The engine floors launchHorizon at 0.5. Above that floor the share is held exactly; below
  // it the floor takes over and the band stops holding. Checked against the real slider
  // maximum rather than a copied number, so widening the slider fails here instead of
  // silently changing what the page looks like.
  const slider = html.match(/id="zoom-control"[^>]*max="([\d.]+)"/);
  assert.ok(slider, 'the zoom slider must be findable');
  const maxZoom = Number(slider[1]);
  assert.ok(maxZoom > 1, 'the slider must be able to zoom in');
  assert.ok(
    share / maxZoom >= 0.5,
    `at zoom ${maxZoom} a share of ${share} falls to ${(share / maxZoom).toFixed(3)}, under the engine floor of 0.5`,
  );

  assert.ok(/function applyZoom\(zoom\)/.test(html), 'applied through a single helper');

  // Both camera controls have to go through that helper, or the horizon drifts out of step
  // with the zoom: the slider changes it directly, and a style preset can change it too.
  const uses = html.match(/applyZoom\(/g) || [];
  assert.ok(uses.length >= 3, 'the helper must be defined and used by the slider and styles');
  assert.ok(
    /zoomControl\.addEventListener\('input'[\s\S]{0,200}?applyZoom\(zoom\)/.test(html),
    'the zoom slider must set both together',
  );
  assert.ok(
    /applyZoom\(options\.visuals\.zoom\)/.test(html),
    'and a style change must re-apply the horizon',
  );
});

test('the homepage fires text from two independent random intervals', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Around ten phrases, and a different one chosen each time.
  const declared = html.match(/const TEXT_PHRASES = \[([\s\S]*?)\];/);
  assert.ok(declared, 'the phrases must be a declared list');
  const phrases = declared[1].match(/'[^']*'/g) || [];
  assert.ok(
    phrases.length >= 8 && phrases.length <= 12,
    `expected about ten phrases, found ${phrases.length}`,
  );
  assert.ok(/fireworks\.launchText\(randomFrom\(TEXT_PHRASES\)/.test(html), 'each launch picks one at random');

  // Two firers, each re-arming itself somewhere in the next one to ten seconds. A fixed
  // period would make every gap identical, which is the opposite of what was asked for.
  assert.ok(/const TEXT_FIRERS = 2/.test(html), 'there must be two firers');
  assert.ok(
    /setTimeout\(textFireworkLoop, 1000 \+ Math\.random\(\) \* 9000\)/.test(html),
    'each firer must re-arm itself between one and ten seconds later',
  );
  assert.ok(
    /for \(let i = 0; i < TEXT_FIRERS; i\+\+\)/.test(html),
    'both firers must be started',
  );
  const firing = html.slice(
    html.indexOf('function textFireworkLoop'),
    html.indexOf('// Sound toggle'),
  );
  assert.ok(firing.length > 0, 'the firing loop must be locatable');
  assert.ok(!/setInterval\(/.test(firing), 'the firers must not fall back on a fixed interval');
});

test('the homepage walks a set series of areas for text, without stopping the show', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  assert.ok(/fireworks\.launchText\(randomFrom\(TEXT_PHRASES\)/.test(html), 'the page must launch text');
  assert.ok(
    /setTimeout\(textFireworkLoop, 1000 \+ Math\.random\(\) \* 9000\)/.test(html),
    'and keep doing it',
  );
  assert.ok(/BOOM/.test(html) && /Grand Fireworks/.test(html), 'the phrases must include the ones asked for');

  // The spot is drawn from a declared series of areas, stepped in order, so every area is
  // used and each message lands somewhere deliberate. Each area is a range on both axes.
  assert.ok(/const TEXT_AREAS = \[/.test(html), 'the areas must be a declared series');
  assert.ok(/textAreaIndex\+\+ % TEXT_AREAS\.length/.test(html), 'and be walked in order');
  const areas = html.match(/\{ x: \[[\d.]+, [\d.]+\], y: \[[\d.]+, [\d.]+\] \}/g) || [];
  assert.ok(areas.length >= 3, 'the series must define several areas, one per axis range');
  assert.ok(/horizontalPosition: within\(area\.x\)/.test(html), 'the horizontal spot must come from the area');
  assert.ok(/verticalPosition: within\(area\.y\)/.test(html), 'as must the vertical one');
  assert.ok(/tilt: \[-30, 30\]/.test(html), 'each message must take a fresh tilt of up to 30 degrees');

  // A wide block could not be placed off-centre, so the page narrows it first.
  assert.ok(/maxWidth: 0\.45/.test(html), 'the block must be narrow enough to move around');

  // The whole point of this test: text must not halt the ambient show. `exclusive` is the
  // engine option that stops new launches for the text's whole lifecycle, so the page must
  // switch it off in config and must not force it back on in the launcher.
  assert.ok(
    /textFirework: \{ exclusive: false \}/.test(html),
    'the page must keep the show running while text is up',
  );
  const launcher = html.slice(
    html.indexOf('function shootTextFirework'),
    html.indexOf('const TEXT_FIRERS'),
  );
  assert.ok(launcher.length > 0, 'the launcher must exist');
  // Match the option assignment, not the word: the launcher's comment explains why
  // `exclusive` is absent, and a bare /exclusive/ would flag its own explanation.
  assert.ok(!/exclusive\s*:/.test(launcher), 'the launcher must not re-impose the exclusive lock');
});

test('the homepage timed-show demo fires its cues in order, and can be cancelled', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const script = html.match(/<script type="module" id="timed-demo-script">([\s\S]*?)<\/script>/);
  assert.ok(script, 'the demo script must be declared with an id so its source can be shown');
  const body = script[1];

  // The displayed source has to be the live script, or the code shown drifts from
  // the code that runs and the demo stops teaching the right thing.
  assert.ok(
    /getElementById\('timed-demo-script'\)\.textContent/.test(html),
    'the source panel must read the script element itself',
  );

  // Cues carry a time and something to fire, and ascend, since they are scheduled
  // as delays rather than absolute times.
  const cues = body.match(/\{ at: (\d+),\s+fire:/g) || [];
  assert.ok(cues.length >= 6, `expected several cues, found ${cues.length}`);
  const times = cues.map(cue => Number(cue.match(/\d+/)[0]));
  assert.deepEqual(times, [...times].sort((a, b) => a - b), 'cues must be in time order');

  // Its own instance, drawn inside the box, with nothing launching on its own.
  assert.ok(/mode: 'contained'/.test(body), 'the demo must render contained');
  assert.ok(/container: stage/.test(body), 'and draw inside the stage');
  assert.ok(/autoStart: false/.test(body), 'so that only the cues fire');

  // Text is fired by a cue, and the words need the rockets to arrive first.
  assert.ok(/show\.launchText\(/.test(body), 'cues must be able to fire text');
  assert.ok(/show\.launchFinale\(/.test(body), 'and the finale');

  // Replaying without cancelling first would stack a second set of timers on the
  // first, so every cue would fire twice.
  assert.ok(/timers\.forEach\(clearTimeout\)/.test(body), 'pending cues must be cancellable');

  // The demo owns its own clicks: the page's click-to-burst must not fire inside it.
  assert.ok(
    /PAGE_CONTROLS = '[^']*#timed-demo/.test(html),
    'the demo box must be excluded from click-to-burst',
  );
});

test('the slim control bar fires a budgeted World Ender beside Random', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  const bar = html.match(/<div id="hero-drag-handle"[\s\S]*?<\/div>/);
  assert.ok(bar, 'the handle bar must exist');
  assert.ok(bar[0].includes('id="panel-random"'), 'Random must stay in the bar');
  assert.ok(bar[0].includes('id="panel-ender"'), 'and the World Ender button must be there');
  assert.ok(
    bar[0].indexOf('panel-ender') > bar[0].indexOf('panel-random'),
    'the World Ender button must sit straight after Random',
  );
  // Order the user asked for: Full/Slim, Random, World Ender, sound, Exit.
  assert.ok(
    bar[0].indexOf('panel-ender') < bar[0].indexOf('panel-sound'),
    'and before the sound toggle',
  );

  const wiring = html.match(/panelEnderBtn = document\.querySelector\('([^']+)'\)/);
  assert.ok(wiring, 'the button must be looked up');
  // The captured selector carries its leading "#"; the markup carries the bare id.
  assert.ok(
    html.includes(`id="${wiring[1].replace(/^#/, '')}"`),
    'and that id must exist in the markup',
  );

  const handler = html.match(/panelEnderBtn\.addEventListener\('click',[\s\S]*?\n  \}\);/);
  assert.ok(handler, 'the button must be wired to a click handler');
  assert.ok(
    /fireworks\.launchWorldEnder\(/.test(handler[0]),
    'the handler must fire the World Ender',
  );

  // The engine's own defaults are Infinity particles and rockets chaining for twenty
  // seconds. One tap on a public page must not be able to ask for that, so the page
  // has to pass its own ceilings.
  assert.ok(/maxParticles:/.test(handler[0]), 'particles must be capped');
  assert.ok(/maxRockets:/.test(handler[0]), 'rockets must be capped');
  assert.ok(/recursionDurationMs:/.test(handler[0]), 'and the chain window bounded');
  assert.ok(!/Infinity/.test(handler[0]), 'nothing may be left unlimited');
});

test('the builder import accepts every shape a config gets pasted in', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'examples', 'guided-builder.html'), 'utf8');
  const match = source.match(/function parseConfigText[\s\S]*?\n\}/);
  assert.ok(match, 'parseConfigText should exist in the guided builder');
  // Exercise the real function, extracted from the page.
  const parseConfigText = new Function('return (' + match[0] + ')')();

  // Strict JSON.
  assert.deepEqual(parseConfigText('{"show":{"intensity":0.5}}'), { show: { intensity: 0.5 } });

  // The paste-ready statement Copy Config puts on the clipboard.
  const snippet = 'const fireworks = new GrandFireworks({\n  "show": {\n    "intensity": 0.5\n  }\n});';
  assert.deepEqual(parseConfigText(snippet), { show: { intensity: 0.5 } });

  // A JavaScript object literal as the docs show it: unquoted keys, single
  // quotes, trailing commas and a comment. This is the shape that produced
  // "Expected double-quoted property name".
  assert.deepEqual(
    parseConfigText(`{
      // a show
      show: { intensity: 0.5, maxRockets: 8, },
      visuals: { flashColor: null, pyroBurn: true },
      sound: { boomStyle: 'mixed', volume: 1 },
    }`),
    {
      show: { intensity: 0.5, maxRockets: 8 },
      visuals: { flashColor: null, pyroBurn: true },
      sound: { boomStyle: 'mixed', volume: 1 },
    },
  );

  // JS-only literal values that strict JSON cannot express.
  assert.deepEqual(
    parseConfigText('{worldEnder:{maxParticles:Infinity,stopAfter:false}}'),
    { worldEnder: { maxParticles: Infinity, stopAfter: false } },
  );

  // Quotes, apostrophes and a // inside a value must all survive untouched.
  assert.deepEqual(
    parseConfigText(`{ note: "I'm fine", q: 'say "hi"', url: 'https://example.com' }`),
    { note: "I'm fine", q: 'say "hi"', url: 'https://example.com' },
  );

  // Surrounding whitespace and a trailing semicolon must not matter.
  assert.deepEqual(parseConfigText('\n  {"a":1}\n  ;\n'), { a: 1 });

  // An escaped apostrophe inside a double-quoted string is valid JS.
  assert.deepEqual(parseConfigText(`{ note: "it\\'s" }`), { note: "it's" });

  // Prototype-bearing keys are dropped rather than carried into a deep merge.
  const hostile = parseConfigText('{"__proto__":{"polluted":true},"visuals":{"constructor":{"prototype":{"x":1}},"bloom":2}}');
  assert.equal(Object.prototype.hasOwnProperty.call(hostile, '__proto__'), false);
  assert.deepEqual(Object.keys(hostile.visuals), ['bloom']);
  assert.equal({}.polluted, undefined);

  // Nonsense is still rejected rather than silently accepted.
  assert.throws(() => parseConfigText('not a config'));
  assert.throws(() => parseConfigText(''));
});

test('the builder import accepts every option the engine ships', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'examples', 'guided-builder.html'), 'utf8');

  // The accepted-key list must be derived from the engine rather than duplicated
  // as a literal, otherwise adding an engine option silently starts rejecting
  // valid configs as containing unrecognised keys.
  assert.ok(
    /Object\.keys\(GrandFireworks\.DEFAULTS\)/.test(source),
    'the import validator should derive its accepted keys from GrandFireworks.DEFAULTS',
  );
  assert.ok(
    !/const known = \['baseStyle'/.test(source),
    'the accepted keys should not be a hardcoded duplicate of the engine option list',
  );

  // Prove the derivation really does cover everything the engine resolves, so a
  // config exporting every section round-trips without being rejected.
  const { GrandFireworks } = createRuntime();
  const accepted = Object.keys(GrandFireworks.DEFAULTS);
  const instance = new GrandFireworks({ renderer: { preferred: 'canvas2d' } });
  const resolved = Object.keys(instance.options);
  const rejected = resolved.filter(key => key !== 'container' && !accepted.includes(key));
  assert.deepEqual(rejected, [], `import would reject: ${rejected.join(', ')}`);
  // Every section the engine exposes must be present in one place or the other.
  const expected = ['visuals', 'sound', 'performance', 'show', 'finale', 'worldEnder', 'textFirework', 'transition', 'renderer', 'background'];
  const unreachable = expected.filter(key => !accepted.includes(key) && !resolved.includes(key));
  assert.deepEqual(unreachable, [], `engine exposes section(s) the import cannot accept: ${unreachable.join(', ')}`);
  instance.destroy();
});

test('the Workbench Text tab exposes text position and tilt', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'examples', 'guided-builder.html'), 'utf8');
  for (const id of ['textFirework.horizontalPosition', 'textFirework.verticalPosition', 'textFirework.tiltFrom', 'textFirework.tiltTo'])
    assert.ok(source.includes(`id: '${id}'`), `the Text tab is missing ${id}`);

  // Exercise the real tilt helpers, extracted from the page with the two
  // utilities they lean on.
  const pick = name => {
    const found = source.match(new RegExp(`function ${name}[\\s\\S]*?\\n\\}`));
    assert.ok(found, `${name} should exist in the Workbench`);
    return found[0];
  };
  const { textTiltRange, applyTextTilt } = new Function(
    [pick('deepMerge'), pick('getDeep'), pick('textTiltRange'), pick('applyTextTilt')].join('\n') +
      '\nreturn { textTiltRange, applyTextTilt };',
  )();

  // Either shape the engine accepts reads back as a from/to pair.
  assert.deepEqual(textTiltRange({}), [0, 0]);
  assert.deepEqual(textTiltRange({ textFirework: { tilt: 12 } }), [12, 12]);
  assert.deepEqual(textTiltRange({ textFirework: { tilt: [-30, 30] } }), [-30, 30]);

  // Moving one slider keeps the other end, and a matching pair collapses to a number.
  const sent = [];
  const fw = { setOptions: options => sent.push(options) };
  const config = { textFirework: { fontSize: 60 } };
  applyTextTilt(config, 0, -30, fw);
  applyTextTilt(config, 1, 30, fw);
  assert.deepEqual(config.textFirework, { fontSize: 60, tilt: [-30, 30] });
  assert.deepEqual(sent.at(-1), { textFirework: { tilt: [-30, 30] } });
  applyTextTilt(config, 0, 30, fw);
  assert.equal(config.textFirework.tilt, 30);

  // The engine takes the range live rather than merging it into the old one.
  const { GrandFireworks } = createRuntime();
  const fireworks = new GrandFireworks({ renderer: { preferred: 'canvas2d' }, textFirework: { tilt: [-10, 10] } });
  fireworks.setOptions({ textFirework: { tilt: [-30, 30] } });
  assert.deepEqual(fireworks.options.textFirework.tilt, [-30, 30]);
  fireworks.destroy();
});

test('the builder style picker offers every engine style under its real name', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'examples', 'guided-builder.html'), 'utf8');
  const line = source.match(/\{ id: 'style',[\s\S]*?choices: (\[[^\n]*?\])\.map/);
  assert.ok(line, 'the Guided style option should exist');
  const values = [...line[1].matchAll(/,'([A-Za-z]+)'\]/g)].map(m => m[1]);
  const { GrandFireworks } = createRuntime();
  // Every value must be a real style (or mixed); an unknown name falls back to Medium.
  for (const value of values)
    assert.ok(value === 'mixed' || value in GrandFireworks.STYLES, `unknown style value: ${value}`);
  // And every engine style must be offered.
  for (const style of Object.keys(GrandFireworks.STYLES))
    assert.ok(values.includes(style), `style picker is missing ${style}`);
});

test('Lucky example performs one randomization per click path', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'examples', 'lucky.html'), 'utf8');
  const clickHandler = source.match(/#lucky-btn'[\s\S]*?addEventListener\('click',[\s\S]*?\n  \}\);/);
  assert.ok(clickHandler);
  assert.equal((clickHandler[0].match(/feelingLucky\(\)/g) || []).length, 1);
});

test('TypeScript declarations describe the full public API and are published', () => {
  const root = path.join(__dirname, '..');
  const declarationPath = path.join(root, 'index.d.ts');
  const declaration = fs.readFileSync(declarationPath, 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

  // The declaration file must exist and be wired into package exports.
  assert.ok(declaration.includes('export class GrandFireworks'));
  assert.ok(declaration.includes('export default GrandFireworks'));
  assert.equal(pkg.types, './index.d.ts');
  assert.equal(pkg.exports['.'].types, './index.d.ts');
  assert.ok(pkg.files.includes('index.d.ts'));

  // Every documented primary public method must be declared.
  const methods = [
    'start', 'stop', 'pause', 'resume', 'clear', 'destroy', 'launch',
    'launchText', 'launchTextSequence', 'cancelTextSequence', 'launchFinale',
    'launchWorldEnder', 'finalize', 'setOptions', 'setOpacity', 'setZoom',
    'setStyle', 'setColorTheme', 'enableSound', 'disableSound', 'setMuted',
    'feelingLucky', 'getOptions', 'getStats',
    // Host-driven rendering: the engine lends its canvas, the host draws.
    'setRenderPass', 'renderFrame', 'placeburst', 'launchTo',
  ];
  for (const method of methods) {
    assert.ok(
      new RegExp(`\\b${method}\\(`).test(declaration),
      `index.d.ts is missing the public method ${method}()`,
    );
  }

  // Every top-level DEFAULTS section must be typed as an options interface.
  const sections = {
    transition: 'TransitionOptions',
    renderer: 'RendererOptions',
    visuals: 'VisualOptions',
    sound: 'SoundOptions',
    performance: 'PerformanceOptions',
    show: 'ShowOptions',
    finale: 'FinaleOptions',
    worldEnder: 'WorldEnderOptions',
    textFirework: 'TextFireworkOptions',
  };
  for (const [section, interfaceName] of Object.entries(sections)) {
    assert.ok(
      declaration.includes(`interface ${interfaceName}`),
      `index.d.ts is missing the options interface "${interfaceName}" for "${section}"`,
    );
  }
});

(async () => {
  let failed = 0;
  for (const { name, run } of tests) {
    try {
      await run();
      console.log(`✓ ${name}`);
    } catch (error) {
      failed++;
      console.error(`✗ ${name}`);
      console.error(error.stack || error);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} tests passed`);
  if (failed) process.exitCode = 1;
})();
