'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const tests = [];
const test = (name, run) => tests.push({ name, run });

function createRuntime({ reducedMotion = false, audio = false } = {}) {
  let now = 1000;
  let rafId = 0;
  const observers = [];
  const audioStats = { contexts: 0, resumes: 0, sources: 0, closes: 0 };

  const noop = () => {};
  const parameter = () => ({ value: 0, setValueAtTime: noop, exponentialRampToValueAtTime: noop });
  const context2d = new Proxy({
    getImageData: () => ({ data: new Uint8ClampedArray(320 * 140 * 4) }),
    measureText: text => ({ width: String(text).length * 10 }),
    // The Canvas fallback builds radial-gradient sprites, so the mock context
    // has to hand back a gradient object with addColorStop.
    createRadialGradient: () => ({ addColorStop: noop })
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
    getContext(type) { return type === '2d' ? context2d : null; }
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
