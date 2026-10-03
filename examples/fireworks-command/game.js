/**
 * Fireworks Command
 * Created by Travis MacDonald — powered by Grand Fireworks JS
 *
 * A self-contained arcade showcase for the engine. Keep gameplay state and
 * rendering here so this example can be copied into a project as one unit.
 * Controls: mouse / Ctrl / Space fire, P pause, M mute, N use SuperNova.
 */
(() => {
  "use strict";
  const surface = document.querySelector("#game"),
    panel = document.querySelector("#panel"),
    status = document.querySelector("#round-status"),
    statusTitle = document.querySelector("#status-title"),
    statusMessage = document.querySelector("#status-message"),
    scoreEl = document.querySelector("#score"),
    waveEl = document.querySelector("#wave"),
    music = document.querySelector("#game-music"),
    supernovaButton = document.querySelector("#supernova"),
    nextButton = document.querySelector("#start-music"),
    settings = { sound: false, palette: "rainbow", effect: "arcade" },
    upgrades = { shield: 0, reload: 0, blast: 0, chain: 0, payload: 0 },
    scene = new FireworksCommandScene(),
    engine = new GrandFireworks({
      container: "#game",
      mode: "contained",
      zIndex: 0,
      renderer: { preferred: "webgl2", fallback: "canvas2d" },
      visuals: { zoom: 0.55, windStrength: 0, trails: false, flashBangChance: 0 },
      performance: { preset: "high", adaptive: true, secondary: 2 },
      show: { maxParticles: 30000 },
      sound: { enabled: false },
    });
  // ── Shield dome ─────────────────────────────────────────────────────────────
  // A glassy force field arcing edge to edge over the cities. It absorbs four hits
  // before it fails, and every hit leaves a crack exactly where it landed.
  const DOME_HITS = 4;
  const DOME_RISE = 0.22;
  let w = 0,
    h = 0,
    playing = false,
    paused = false,
    score = 0,
    wave = 1,
    cities = [],
    bunkers = [],
    enemy = [],
    shots = [],
    bursts = [],
    nextEnemy = 0,
    nextHarasser = 0,
    last = 0,
    roundStart = 0,
    pauseAt = 0,
    raf = 0,
    disposed = false,
    roundWon = false,
    supernovas = 1,
    dome = { hp: DOME_HITS, cracks: [] },
    worldBlasts = [],
    selectedUpgrade = "",
    aim = { x: 0, y: 0 },
    audioCtx;
  // One visible canvas, owned by the engine. The scene owns only detached
  // Canvas2D artwork; its render pass uploads that artwork to the shared GL
  // context (or uses drawImage in the engine's Canvas2D fallback).
  music.volume = 0.38;
  function resetDefenses() {
    cities = Array.from({ length: 6 }, (_, i) => ({
      x: w * (0.12 + i * 0.152),
      alive: true,
      hp: 1 + upgrades.shield,
    }));
    bunkers = [0.18, 0.5, 0.82].map((p) => ({
      x: w * p,
      y: h - 38,
      alive: true,
      cooldown: 0,
      ammo: 45,
      maxAmmo: 45,
    }));
  }
  function resize(width = surface.clientWidth, height = surface.clientHeight) {
    w = width;
    h = height;
    if (!cities.length) resetDefenses();
    else {
      cities.forEach((c, i) => (c.x = w * (0.12 + i * 0.152)));
      bunkers.forEach((b, i) => {
        b.x = w * [0.18, 0.5, 0.82][i];
        b.y = h - 38;
      });
    }
    if (!aim.x) {
      aim = { x: w * 0.5, y: h * 0.35 };
    }
  }
  const onResize = () => resize();
  addEventListener("resize", onResize);
  resize();
  engine.setRenderPass((frame) => {
    if (frame.width !== w || frame.height !== h) resize(frame.width, frame.height);
    scene.render(frame, {
      cities, bunkers, enemy, shots, aim, upgrades, wave, paused, cannonTip,
      dome: {
        hp: dome.hp,
        maxHp: DOME_HITS,
        geo: domeGeometry(),
        // Projected here so the scene never has to re-derive the dome's curve.
        cracks: dome.cracks.map((c) => ({
          x: c.t * w,
          y: domeYAt(c.t * w),
          seed: c.seed,
        })),
      },
    });
  });
  function start(fresh = true) {
    engine.clear();
    engine.resume();
    playing = true;
    paused = false;
    roundWon = false;
    panel.classList.remove("round-next");
    panel.classList.remove("round-lost");
    status.hidden = true;
    nextButton.disabled = false;
    if (fresh) {
      score = 0;
      wave = 1;
      Object.assign(upgrades, {
        shield: 0,
        reload: 0,
        blast: 0,
        chain: 0,
        payload: 0,
      });
      resetDefenses();
    } else
      for (const b of bunkers)
        if (b.alive) b.ammo = Math.min(b.maxAmmo, b.ammo + 18);
    enemy = [];
    shots = [];
    bursts = [];
    dome = { hp: DOME_HITS, cracks: [] };
    worldBlasts = [];
    supernovas = 1;
    supernovaButton.disabled = false;
    supernovaButton.textContent = "Use SuperNova";
    panel.hidden = true;
    if (settings.sound) music.play().catch(() => {});
    last = performance.now();
    roundStart = last;
    nextEnemy = last + 700;
    nextHarasser = last + 9000;
  }
  function cannonTip(bunker, x, y) {
    const pivotY = h - 64,
      theta = Math.max(
        -Math.PI + 0.18,
        Math.min(-0.18, Math.atan2(y - pivotY, x - bunker.x)),
      );
    return {
      x: bunker.x + Math.cos(theta) * 20,
      y: pivotY + Math.sin(theta) * 20,
      theta,
    };
  }
  // The dome is the circular arc that passes through both edges of the screen and
  // its own crown, so it is derived from w and h and survives a resize. Cracks are
  // stored as a fraction across the dome for the same reason.
  function domeGeometry() {
    const baseY = h - 60,
      rise = h * DOME_RISE,
      half = w / 2,
      r = (half * half + rise * rise) / (2 * rise);
    return { baseY, rise, r, cx: half, cy: baseY - rise + r };
  }
  function domeYAt(x) {
    const { r, cx, cy, baseY } = domeGeometry(),
      inner = r * r - (x - cx) * (x - cx);
    return inner <= 0 ? baseY : cy - Math.sqrt(inner);
  }
  function hitDome(m) {
    const x = Math.min(w, Math.max(0, m.x)),
      y = domeYAt(x);
    dome.hp--;
    dome.cracks.push({ t: x / w, seed: (Math.random() * 1e6) | 0 });
    bursts.push({ x, y, life: 0, radius: Math.min(w, h) * 0.12, destructive: true });
    if (dome.hp <= 0) {
      // The field is gone, so its cracks go with it, all along its length.
      dome.cracks.length = 0;
      for (let i = 0; i < 7; i++) {
        const bx = w * (0.08 + i * 0.13);
        bursts.push({
          x: bx,
          y: domeYAt(bx),
          life: -i * 40,
          radius: Math.min(w, h) * 0.17,
          type: "thunder_clap",
        });
      }
    }
  }
  // Only the victory cue is game-owned; rocket/boom/crackle audio is the engine's.
  function sound(type) {
    if (!settings.sound || type !== "victory") return;
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    if (type === "victory") {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const o = audioCtx.createOscillator(),
          g = audioCtx.createGain();
        o.connect(g).connect(audioCtx.destination);
        o.type = "square";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.07, t + i * 0.11);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.11 + 0.18);
        o.start(t + i * 0.11);
        o.stop(t + i * 0.11 + 0.2);
      });
      return;
    }
  }
  // Solid hues for the "One colour each" palette: every shell breaks in a single
  // colour instead of a ramp, so one volley shows several distinct colours.
  const SOLID_PALETTE = [
    "#ff3b30",
    "#ff9500",
    "#ffd60a",
    "#34c759",
    "#00e5c0",
    "#0a84ff",
    "#5e5ce6",
    "#ff2d92",
  ];
  // The engine's palettes ramp a single colour toward white, so a solid shell
  // repeats its colour across all four entries.
  const solidColors = (index) => {
    const c = SOLID_PALETTE[index % SOLID_PALETTE.length];
    return [c, c, c, c];
  };
  let solidCursor = 0;
  function colors() {
    // Each successive shell takes the next hue, so two bursts in the same volley
    // never share a colour. This runs once per burst, never per frame.
    if (settings.palette === "single") return solidColors(solidCursor++);
    return settings.palette === "redblue"
      ? ["#ff4d5f", "#53a8ff", "#ffffff"]
      : ["#ff5d73", "#ffcf58", "#66e6bd", "#53a8ff", "#bd7aff"];
  }
  // The blast's hit circle grows at BLAST_RISE_RATE pixels per millisecond. The
  // visible explosion is drawn BLAST_OVERSHOOT times larger than that circle, and
  // reaches full size in BLAST_LEAD of the time the circle takes to go lethal, so
  // the fire is always ahead of the damage. Without both, the hit circle outruns
  // the fire and enemies die in empty space next to a slowly swelling puff.
  const BLAST_RISE_RATE = 0.26;
  const BLAST_OVERSHOOT = 1.15;
  const BLAST_LEAD = 0.6;
  // Every burst snaps open instead of swelling slowly, which is what made the
  // explosion look like it was crawling toward the enemy it had already killed.
  // Bursts that carry a hit circle pass their own schedule so the fire leads the
  // damage.
  const DEFAULT_BURST_REACH = 260;
  // The sparks fade out over the fall rather than hanging in the sky for the
  // shell's full lifetime, which kept the screen full of old explosions.
  const BURST_LIFE_SCALE = 0.55;
  // And they drift down at a tenth of the usual rate, so a break hangs and settles
  // instead of dropping like a stone.
  const BURST_GRAVITY_SCALE = 0.1;
  // The size of a hit marker: the small puff that confirms an enemy died. It has
  // no collision meaning, so it stays deliberately compact. Spectacle bursts
  // (SuperNova, round clear) must pass their own radius instead of landing here,
  // or a screen-filling celebration becomes 40 tiny puffs.
  const HIT_MARKER_RADIUS = 48;
  // Showy but non-destructive shells, used where the game wants variety rather
  // than the player's selected effect.
  const CELEBRATION_TYPES = [
    "grand_peony",
    "glitter_nova",
    "crown_jewel",
    "imperial_chrysanthemum",
    "diamond_ring",
    "galactic_spiral",
  ];
  const celebrationType = () =>
    CELEBRATION_TYPES[(Math.random() * CELEBRATION_TYPES.length) | 0];
  function burstOptions(radius, destructive = false, extras = {}) {
    return {
      radius,
      type:
        extras.type ||
        (destructive
          ? "thunder_clap"
          : settings.effect === "bold"
            ? "glitter_nova"
            : "grand_peony"),
      colors:
        extras.colors ||
        (destructive ? ["#ffffff", "#ff9b36", "#ff382b"] : colors()),
      density: (settings.effect === "bold" ? 1.4 : 1) * (1 + upgrades.payload * 0.12),
      sound: settings.sound,
      reachTime: extras.reachTime || DEFAULT_BURST_REACH,
      lifeScale: BURST_LIFE_SCALE,
      gravityScale: BURST_GRAVITY_SCALE,
    };
  }
  // Timers remain game-owned. Emit exactly once when a queued timer crosses zero;
  // there are no drawn collision circles or legacy burst sprites.
  function updateBursts(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.life += dt;
      if (!b.emitted && b.life >= 0) {
        b.emitted = true;
        engine.placeburst({
          x: b.x,
          y: b.y,
          ...burstOptions(b.radius || HIT_MARKER_RADIUS, b.destructive, {
            type: b.type,
            colors: b.colors,
          }),
        });
      }
      if (b.emitted && b.life > 440) bursts.splice(i, 1);
    }
  }
  // Pick the nearest live bunker, then launch a player interceptor.
  function launch(x, y) {
    if (!playing || paused) return;
    const available = bunkers.filter(
        (b) => b.alive && !b.cooldown && b.ammo > 0,
      ),
      bunker = available.reduce(
        (best, b) => (Math.abs(b.x - x) < Math.abs(best.x - x) ? b : best),
        available[0],
      );
    if (!bunker) return;
    const tip = cannonTip(bunker, x, y);
    bunker.ammo--;
    bunker.cooldown = Math.max(220, 780 * (1 - upgrades.reload * 0.16));
    const shot = {
      x: tip.x,
      y: tip.y,
      sx: tip.x,
      sy: tip.y,
      tx: x,
      ty: y,
      r: 0,
      max: Math.max(65, Math.min(145, w * 0.13)) * (1 + upgrades.blast * 0.18),
      life: 0,
      flight: Math.max(
        180,
        Math.min(520, Math.hypot(x - tip.x, y - tip.y) * 0.65),
      ),
      bursting: false,
    };
    shots.push(shot);
    // Schedule before the next game step: shot.life and the engine effect clock
    // then advance by the identical capped dt. Arrival bursts are engine-owned.
    engine.launchTo({
      x: tip.x,
      y: tip.y,
      targetX: x,
      targetY: y,
      duration: shot.flight,
      ...burstOptions(shot.max * BLAST_OVERSHOOT, false, {
        // The fire leads the damage: it is oversized, and reaches full size before
        // the hit circle has finished growing, so every kill is visibly inside the
        // explosion that caused it.
        reachTime: (shot.max / BLAST_RISE_RATE) * BLAST_LEAD,
      }),
    });
  }
  function spawn() {
    const targets = cities.filter((c) => c.alive);
    if (!targets.length) return;
    const target = targets[(Math.random() * targets.length) | 0],
      x = 28 + Math.random() * (w - 56),
      speed = (55 + wave * 10) * (1 + (wave - 1) * 0.1);
    enemy.push({
      kind: "missile",
      x,
      y: -12,
      tx: target.x,
      ty: h - 62,
      speed,
    });
  }
  function spawnHarasser() {
    const fromLeft = Math.random() < 0.5;
    enemy.push({
      kind: "harasser",
      x: fromLeft ? -55 : w + 55,
      y: 72 + Math.random() * h * 0.2,
      vx: (fromLeft ? 1 : -1) * (42 + wave * 4),
      hp: 5 + (wave - 1) * 2,
      nextDrop: performance.now() + 650,
    });
  }
  function explodeEnemy(m) {
    score += m.kind === "harasser" ? 1000 : 100;
    bursts.push({ x: m.x, y: m.y, life: 0, radius: HIT_MARKER_RADIUS });
    if (upgrades.chain && Math.random() < Math.min(0.6, upgrades.chain * 0.12)) {
      // The chain burst is lethal in its own right, so it gets the same treatment
      // as an interceptor: oversized fire on the hit circle's own schedule.
      const chainMax = Math.min(w, h) * 0.42;
      shots.push({
        x: m.x,
        y: m.y,
        sx: m.x,
        sy: m.y,
        tx: m.x,
        ty: m.y,
        r: 0,
        max: chainMax,
        life: 0,
        flight: 0,
        bursting: true,
      });
      engine.placeburst({
        x: m.x,
        y: m.y,
        ...burstOptions(chainMax * BLAST_OVERSHOOT, false, {
          reachTime: (chainMax / BLAST_RISE_RATE) * BLAST_LEAD,
        }),
      });
    }
  }
  // ── World Ender ─────────────────────────────────────────────────────────────
  // The engine's staged apocalypse: a carrier splits into a radial volley, and
  // every one of those shells bursts again, and those can branch too. Each
  // secondary explosion reports its own position, so damage here is positional
  // rather than a free screen clear — what dies is what the fire actually
  // covered, which is the interesting part of the effect.
  // Every secondary explosion reports how far its own break reaches, in world units,
  // so the damage matches the fire the player can see. The floor covers a shell that
  // reports nothing at all, and WORLD_ENDER_MIN_BLAST is only ever a fallback.
  const WORLD_ENDER_MIN_BLAST = 0.12;
  // A secondary explosion stays lethal for as long as its fire is still burning. It
  // used to hit once, at the instant it detonated, so anything that flew into the
  // blaze a moment later sat there unharmed inside a visible explosion.
  const WORLD_ENDER_BURN = 1500;
  const WORLD_ENDER_LIMITS = {
    // Asked for with no cap: the engine's own limits come off for the duration and nothing
    // is substituted in their place, so the full volley spawns every star it wants. This is
    // the effect's whole point and also the way it can hang a tab — adaptive quality is the
    // only brake left, so if frames collapse, drop these numbers rather than the effect.
    maxParticles: Infinity,
    maxRockets: Infinity,
    firstSplitCount: 12,
    secondSplitCount: 6,
    promotionChance: 0.03,
    maxChainDepth: 2,
    recursionDurationMs: 9000,
  };
  // Scores a kill without queueing a burst: the World Ender is already wall-to-wall
  // explosions, and a hit marker per kill would only add noise.
  function worldEnderDamage(x, y, radius) {
    for (let i = enemy.length - 1; i >= 0; i--) {
      const m = enemy[i];
      if (Math.hypot(m.x - x, m.y - y) > radius) continue;
      // The saucer takes a beating rather than popping on the first blast.
      if (m.kind === "harasser") {
        m.hp -= 3;
        if (m.hp > 0) continue;
      }
      score += m.kind === "harasser" ? 1000 : 100;
      enemy.splice(i, 1);
    }
  }
  // Secondary explosions arrive in the engine's world space, so they are scaled back to
  // screen pixels through the zoom, exactly as the launcher does. The engine reports the
  // size each break was built for even when the particle cap throttled it, so there is no
  // need to remember an earlier blast: doing that made a throttled burst lethal across
  // half the screen and enemies vanished well outside any fire.
  engine.addEventListener("finalestage", (event) => {
    const detail = event.detail || {};
    if (detail.stage !== "secondary-burst") return;
    const source = detail.source || {},
      scale = (Number(source.dof) || 1) * (Number(source.styleScale) || 1),
      measured = (Number(detail.radius) || 0) * engine.zoom,
      radius = Math.max(
        measured,
        Math.min(w, h) * WORLD_ENDER_MIN_BLAST * Math.min(2, Math.max(0.6, scale)),
      );
    // Registered rather than applied once: update() keeps it lethal while it burns.
    worldBlasts.push({
      x: detail.x * engine.zoom,
      y: detail.y * engine.zoom,
      radius,
      until: performance.now() + WORLD_ENDER_BURN,
    });
  });
  function worldEnder() {
    if (!playing || paused) return;
    sound("victory");
    engine.launchWorldEnder(WORLD_ENDER_LIMITS);
  }
  function supernova() {
    if (!playing || paused || !supernovas) return;
    supernovas = 0;
    supernovaButton.disabled = true;
    supernovaButton.textContent = "SuperNova used";
    sound("victory");
    // SuperNova is pure spectacle, so every burst is sized to the screen and
    // picks a shell at random rather than reusing the player's effect choice.
    const nova = Math.min(w, h) * 0.2;
    for (const m of enemy) {
      score += m.kind === "harasser" ? 1000 : 100;
      bursts.push({
        x: m.x,
        y: m.y,
        life: -Math.random() * 260,
        radius: nova,
        type: celebrationType(),
      });
    }
    for (let i = 0; i < 20; i++)
      bursts.push({
        x: w * (0.08 + Math.random() * 0.84),
        y: h * (0.06 + Math.random() * 0.72),
        life: -Math.random() * 420,
        radius: nova,
        type: celebrationType(),
      });
    enemy = [];
  }
  function loseCity(x, type) {
    const c = cities.reduce(
      (best, c) => (Math.abs(c.x - x) < Math.abs(best.x - x) ? c : best),
      cities[0],
    );
    c.hp--;
    bursts.push({ x: c.x, y: h - 64, life: 0, radius: type === "bomb" ? 95 : 75, destructive: true });
    if (c.hp <= 0) c.alive = false;
    if (!cities.some((c) => c.alive)) {
      playing = false;
      roundWon = false;
      panel.hidden = false;
      panel.classList.add("round-lost");
      status.hidden = false;
      statusTitle.textContent = "Cities lost";
      statusMessage.textContent =
        `Final score: ${score}. The horizon needs another defender.`;
      nextButton.textContent = "Try again with music";
      document.querySelector("#start-muted").textContent = "Try again muted";
    }
  }
  function finishRound() {
    playing = false;
    roundWon = true;
    selectedUpgrade = "";
    document
      .querySelectorAll("[data-upgrade]")
      .forEach((b) => b.classList.remove("selected"));
    nextButton.disabled = true;
    sound("victory");
    const fanfare = Math.min(w, h) * 0.16;
    for (let i = 0; i < 16; i++)
      bursts.push({
        x: w * (0.2 + Math.random() * 0.6),
        y: h * (0.12 + Math.random() * 0.48),
        life: -Math.random() * 380,
        radius: fanfare,
        type: celebrationType(),
      });
    panel.classList.add("round-next");
    status.hidden = false;
    statusTitle.textContent = "Colony defended";
    statusMessage.textContent = `Round ${wave} cleared · ${score} points. Choose one upgrade for the next assault.`;
    panel.hidden = false;
    nextButton.textContent = "Choose an upgrade";
  }
  // Simulation: movement, collision checks, round timer, and wave spawning.
  function update(now, dt) {
    const left = Math.max(0, 60000 - (now - roundStart)),
      assaultOver = left === 0,
      pressure = 1 + (wave - 1) * 0.28;
    if (!assaultOver && now > nextEnemy) {
      spawn();
      nextEnemy = now + Math.max(480, 1200 / pressure) + Math.random() * 260;
    }
    if (!assaultOver && now > nextHarasser) {
      spawnHarasser();
      nextHarasser = now + Math.max(8000, 16000 / (1 + (wave - 1) * 0.2));
    }
    for (const b of bunkers) b.cooldown = Math.max(0, b.cooldown - dt);
    // Active World Ender blasts burn for a while, so anything crossing the fire is
    // caught by it. This is the same model the interceptor blasts already use: a
    // live entry checked every frame, not a single hit.
    for (let i = worldBlasts.length - 1; i >= 0; i--) {
      const blast = worldBlasts[i];
      if (now > blast.until) {
        worldBlasts.splice(i, 1);
        continue;
      }
      worldEnderDamage(blast.x, blast.y, blast.radius);
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life += dt;
      if (!s.bursting) {
        const t = Math.min(1, s.life / s.flight);
        s.x = s.sx + (s.tx - s.sx) * t;
        s.y = s.sy + (s.ty - s.sy) * t;
        if (t === 1) {
          s.bursting = true;
          s.life = 0;
          s.x = s.tx;
          s.y = s.ty;
        }
      } else s.r = Math.min(s.max, s.r + dt * BLAST_RISE_RATE);
      if (s.bursting && s.life > 680) shots.splice(i, 1);
    }
    for (let i = enemy.length - 1; i >= 0; i--) {
      const m = enemy[i];
      if (m.kind === "harasser") {
        m.x += (m.vx * dt) / 1000;
        if (!assaultOver && now > m.nextDrop) {
          const targets = cities.filter((c) => c.alive);
          if (targets.length) {
            const target = targets[(Math.random() * targets.length) | 0];
            enemy.push({
              kind: "bomb",
              x: m.x,
              y: m.y + 12,
              tx: target.x,
              ty: h - 62,
              speed: (92 + wave * 7) * (1 + (wave - 1) * 0.1),
            });
          }
          m.nextDrop = now + Math.max(500, 900 / (1 + (wave - 1) * 0.15));
        }
        if (m.x < -70 || m.x > w + 70) {
          enemy.splice(i, 1);
          continue;
        }
      } else {
        const dx = m.tx - m.x,
          dy = m.ty - m.y,
          len = Math.hypot(dx, dy) || 1;
        m.x += ((dx / len) * m.speed * dt) / 1000;
        m.y += ((dy / len) * m.speed * dt) / 1000;
      }
      let hit = false;
      for (const s of shots)
        if (s.bursting && Math.hypot(m.x - s.x, m.y - s.y) < s.r) {
          if (m.kind === "harasser") {
            m.hp--;
            if (m.hp <= 0) {
              explodeEnemy(m);
              enemy.splice(i, 1);
            } else
              bursts.push({
                x: m.x,
                y: m.y,
                life: 0,
                radius: HIT_MARKER_RADIUS,
              });
          } else {
            explodeEnemy(m);
            enemy.splice(i, 1);
          }
          hit = true;
          break;
        }
      if (hit) continue;
      // The dome takes the hit long before anything reaches a city. While it holds,
      // the cities are untouchable; once it fails, they are exposed.
      if (dome.hp > 0 && m.y >= domeYAt(m.x)) {
        hitDome(m);
        enemy.splice(i, 1);
        continue;
      }
      if (m.kind !== "harasser" && m.y >= m.ty) {
        loseCity(m.tx, m.kind);
        enemy.splice(i, 1);
      }
    }
    if (playing && assaultOver && enemy.length === 0) {
      finishRound();
      return;
    }
    scoreEl.textContent = String(score).padStart(6, "0");
    waveEl.textContent = `${wave} · ${cities.filter((c) => c.alive).length} · ${assaultOver ? "CLEAR!" : Math.ceil(left / 1000) + "s"}`;
  }
  // The only RAF drives gameplay, queued celebration effects, and rendering.
  // Menus keep the scene alive; paused frames render without advancing effects.
  function loop(now) {
    if (disposed) return;
    const dt = paused ? 0 : Math.max(0, Math.min(40, now - (last || now)));
    last = now;
    if (playing && !paused) update(now, dt);
    if (!paused) updateBursts(dt);
    engine.renderFrame(dt);
    raf = requestAnimationFrame(loop);
  }
  surface.addEventListener("pointermove", (e) => {
    const r = surface.getBoundingClientRect();
    aim = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  surface.addEventListener("pointerdown", (e) => {
    const r = surface.getBoundingClientRect();
    aim = { x: e.clientX - r.left, y: e.clientY - r.top };
    launch(aim.x, aim.y);
  });
  // Right-click is the World Ender. The browser menu has to be suppressed or it
  // interrupts the game with a context menu every time.
  surface.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    worldEnder();
  });
  // Menu controls intentionally stay separate from the render loop.
  const settingsPanel = document.querySelector("#settings"),
    settingsButton = document.querySelector("#settings-toggle"),
    soundButton = document.querySelector("#sound-toggle");
  function setSound(on) {
    settings.sound = on;
    if (on) engine.enableSound();
    else {
      engine.disableSound();
      if (audioCtx && audioCtx.state === "running") audioCtx.suspend().catch(() => {});
    }
    if (on && audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    soundButton.textContent = on ? "On" : "Off";
    soundButton.setAttribute("aria-pressed", String(on));
    if (on && playing && !paused) music.play().catch(() => {});
    else music.pause();
  }
  function chooseUpgrade(name) {
    selectedUpgrade = name;
    document
      .querySelectorAll("[data-upgrade]")
      .forEach((b) =>
        b.classList.toggle("selected", b.dataset.upgrade === name),
      );
    nextButton.disabled = false;
    nextButton.textContent = devChoosing ? "Apply and continue" : "Next round";
  }
  function begin(withMusic) {
    // The dev picker borrows the round-end panel, so choosing there applies the
    // package and resumes the same wave instead of starting the next round.
    if (devChoosing) {
      if (!selectedUpgrade) return;
      upgrades[selectedUpgrade]++;
      if (selectedUpgrade === "shield")
        for (const c of cities) if (c.alive) c.hp++;
      return devResume();
    }
    setSound(withMusic);
    if (roundWon) {
      if (!selectedUpgrade) return;
      upgrades[selectedUpgrade]++;
      if (selectedUpgrade === "shield")
        for (const c of cities) if (c.alive) c.hp++;
      wave++;
      start(false);
    } else start(true);
  }
  document
    .querySelectorAll("[data-upgrade]")
    .forEach((b) =>
      b.addEventListener("click", () => chooseUpgrade(b.dataset.upgrade)),
    );
  // ── Dev shortcuts ───────────────────────────────────────────────────────────
  // Testing wave 4 should not mean playing to wave 4. 1-9 jump straight to a wave
  // with a full defence, U pauses and opens the upgrade picker, and R goes back to a
  // clean wave 1. Announced in the console rather than the on-screen hint, which is
  // already crowded on a phone.
  let devChoosing = false;
  function devJumpTo(nextWave) {
    wave = Math.max(1, Math.min(9, Math.round(nextWave) || 1));
    roundWon = false;
    selectedUpgrade = "";
    devChoosing = false;
    panel.classList.remove("round-next");
    panel.classList.remove("round-lost");
    status.hidden = true;
    // A full defence, so the wave is judged on the upgrade rather than on the damage
    // left over from the last one.
    resetDefenses();
    start(false);
  }
  // Opens the real upgrade panel over a frozen game. It borrows the round-end panel
  // rather than granting anything itself, so the choice is the player's and every
  // package the panel offers is on the table.
  function devUpgradeMenu() {
    if (devChoosing || !playing) return;
    devChoosing = true;
    if (!paused) {
      paused = true;
      pauseAt = performance.now();
      engine.pause();
      music.pause();
    }
    selectedUpgrade = "";
    panel.hidden = false;
    panel.classList.add("round-next");
    status.hidden = false;
    statusTitle.textContent = `Dev: pick an upgrade for wave ${wave}`;
    statusMessage.textContent =
      "The wave carries on from where it is once you choose.";
    nextButton.disabled = true;
    nextButton.textContent = "Choose an upgrade";
  }
  // Unpauses where the wave left off, shifting the timers by the pause so the round
  // clock does not count the time spent deciding.
  function devResume() {
    devChoosing = false;
    panel.hidden = true;
    status.hidden = true;
    panel.classList.remove("round-next");
    selectedUpgrade = "";
    if (!paused) return;
    const pauseDuration = performance.now() - pauseAt;
    roundStart += pauseDuration;
    nextEnemy += pauseDuration;
    nextHarasser += pauseDuration;
    for (const m of enemy) if (m.kind === "harasser") m.nextDrop += pauseDuration;
    last = performance.now();
    paused = false;
    engine.resume();
    if (settings.sound) music.play().catch(() => {});
  }
  function devReset() {
    devChoosing = false;
    start(true);
  }
  console.info(
    "Fireworks Command dev keys — 1-9: jump to wave · U: pick an upgrade · R: reset to wave 1",
  );
  document
    .querySelector("#start-music")
    .addEventListener("click", () => begin(roundWon ? settings.sound : true));
  document
    .querySelector("#start-muted")
    .addEventListener("click", () => begin(false));
  supernovaButton.addEventListener("click", supernova);
  addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === "p") {
      if (!playing) return;
      paused = !paused;
      if (paused) {
        pauseAt = performance.now();
        engine.pause();
        music.pause();
      } else {
        const pauseDuration = performance.now() - pauseAt;
        roundStart += pauseDuration;
        nextEnemy += pauseDuration;
        nextHarasser += pauseDuration;
        for (const m of enemy) if (m.kind === "harasser") m.nextDrop += pauseDuration;
        last = performance.now();
        engine.resume();
        if (settings.sound) music.play().catch(() => {});
      }
      return;
    }
    if (key === "m") {
      setSound(!settings.sound);
      return;
    }
    if (key === "n") {
      e.preventDefault();
      supernova();
      return;
    }
    // Dev shortcuts. Digits jump waves, U walks the upgrade packages, R starts over.
    if (key >= "1" && key <= "9") {
      devJumpTo(Number(key));
      return;
    }
    if (key === "u") {
      devUpgradeMenu();
      return;
    }
    if (key === "r") {
      devReset();
      return;
    }
    if (e.key === "Control" || e.code === "Space") {
      e.preventDefault();
      if (playing && !paused) launch(aim.x, aim.y);
    }
  });
  settingsButton.addEventListener("click", () => {
    settingsPanel.hidden = !settingsPanel.hidden;
    settingsButton.setAttribute("aria-expanded", String(!settingsPanel.hidden));
  });
  soundButton.addEventListener("click", () => setSound(!settings.sound));
  document
    .querySelector("#palette")
    .addEventListener("change", (e) => (settings.palette = e.target.value));
  document
    .querySelector("#effect")
    .addEventListener("change", (e) => (settings.effect = e.target.value));
  addEventListener("unload", () => {
    disposed = true;
    cancelAnimationFrame(raf);
    removeEventListener("resize", onResize);
    scene.destroy();
    engine.destroy();
    music.pause();
    if (audioCtx) audioCtx.close().catch(() => {});
  }, { once: true });
  raf = requestAnimationFrame(loop);
})();
