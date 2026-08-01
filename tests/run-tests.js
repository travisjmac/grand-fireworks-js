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
    measureText: text => ({ width: String(text).length * 10 })
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
    addEventListener: noop,
    removeEventListener: noop
  };
  if (audio) sandbox.AudioContext = MockAudioContext;
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(__dirname, '..', 'GrandFireworks.js'), 'utf8');
  vm.runInContext(source, sandbox, { filename: 'GrandFireworks.js' });

  return {
    GrandFireworks: sandbox.GrandFireworks,
    observers,
    audioStats,
    setNow(value) { now = value; }
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

test('Lucky example performs one randomization per click path', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'examples', 'lucky.html'), 'utf8');
  const clickHandler = source.match(/#lucky-btn'[\s\S]*?addEventListener\('click',[\s\S]*?\n  \}\);/);
  assert.ok(clickHandler);
  assert.equal((clickHandler[0].match(/feelingLucky\(\)/g) || []).length, 1);
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
