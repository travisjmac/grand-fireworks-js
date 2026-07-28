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
  const canvas = document.querySelector("#game"),
    ctx = canvas.getContext("2d"),
    panel = document.querySelector("#panel"),
    scoreEl = document.querySelector("#score"),
    waveEl = document.querySelector("#wave"),
    music = document.querySelector("#game-music"),
    supernovaButton = document.querySelector("#supernova"),
    nextButton = document.querySelector("#start-music"),
    settings = { sound: true, palette: "rainbow", effect: "arcade" },
    upgrades = { shield: 0, reload: 0, blast: 0, chain: 0, payload: 0 };
  let w = 0,
    h = 0,
    dpr = 1,
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
    roundWon = false,
    supernovas = 1,
    selectedUpgrade = "",
    aim = { x: 0, y: 0 },
    audioCtx;
  // Canvas lifecycle and persistent round state.
  music.volume = 0.38;
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
    if (!aim.x) {
      aim = { x: w * 0.5, y: h * 0.35 };
    }
  }
  addEventListener("resize", resize);
  resize();
  function start(fresh = true) {
    playing = true;
    paused = false;
    roundWon = false;
    panel.classList.remove("round-next");
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
      resize();
    } else
      for (const b of bunkers)
        if (b.alive) b.ammo = Math.min(b.maxAmmo, b.ammo + 18);
    enemy = [];
    shots = [];
    bursts = [];
    supernovas = 1;
    supernovaButton.disabled = false;
    supernovaButton.textContent = "Use SuperNova";
    panel.hidden = true;
    if (settings.sound) music.play().catch(() => {});
    last = performance.now();
    roundStart = last;
    nextEnemy = last + 700;
    nextHarasser = last + 9000;
    requestAnimationFrame(loop);
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
  // Lightweight synthesized effects keep the example dependency-free.
  function sound(type) {
    if (!settings.sound) return;
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
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.connect(g).connect(audioCtx.destination);
    if (type === "pew") {
      o.type = "square";
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(155, t + 0.12);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    } else {
      const heavy = type === "bomb";
      o.type = heavy ? "sawtooth" : "triangle";
      o.frequency.setValueAtTime(heavy ? 95 : 180, t);
      o.frequency.exponentialRampToValueAtTime(
        heavy ? 30 : 55,
        t + (heavy ? 0.4 : 0.24),
      );
      g.gain.setValueAtTime(heavy ? 0.16 : 0.1, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.48 : 0.3));
    }
    o.start(t);
    o.stop(t + 0.55);
  }
  // Pick the nearest live bunker, then launch a player interceptor.
  function launch(x, y) {
    if (!playing) return;
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
    sound("pew");
    shots.push({
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
      trail: [],
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
      trail: [],
    });
  }
  function explodeEnemy(m) {
    score += m.kind === "harasser" ? 1000 : 100;
    bursts.push({ x: m.x, y: m.y, life: 0 });
    if (upgrades.chain && Math.random() < Math.min(0.6, upgrades.chain * 0.12))
      shots.push({
        x: m.x,
        y: m.y,
        sx: m.x,
        sy: m.y,
        tx: m.x,
        ty: m.y,
        r: 0,
        max: Math.min(w, h) * 0.42,
        life: 0,
        flight: 0,
        bursting: true,
      });
    sound(m.kind === "harasser" ? "bomb" : "enemy");
  }
  function supernova() {
    if (!playing || !supernovas) return;
    supernovas = 0;
    supernovaButton.disabled = true;
    supernovaButton.textContent = "SuperNova used";
    sound("victory");
    for (const m of enemy) {
      score += m.kind === "harasser" ? 1000 : 100;
      bursts.push({ x: m.x, y: m.y, life: -Math.random() * 260 });
    }
    for (let i = 0; i < 24; i++)
      bursts.push({
        x: w * (0.08 + Math.random() * 0.84),
        y: h * (0.06 + Math.random() * 0.72),
        life: -Math.random() * 420,
      });
    enemy = [];
  }
  function loseCity(x, type) {
    const c = cities.reduce(
      (best, c) => (Math.abs(c.x - x) < Math.abs(best.x - x) ? c : best),
      cities[0],
    );
    c.hp--;
    bursts.push({ x: c.x, y: h - 64, life: 0 });
    sound(type === "bomb" ? "bomb" : "enemy");
    if (c.hp <= 0) c.alive = false;
    if (!cities.some((c) => c.alive)) {
      playing = false;
      roundWon = false;
      panel.hidden = false;
      panel.querySelector("h1").textContent = "Cities lost";
      panel.querySelector("p").textContent =
        `Final score: ${score}. The horizon needs another defender.`;
      nextButton.textContent = "Try again with music";
      document.querySelector("#start-muted").textContent = "Try again muted";
    }
  }
  function celebrate(now, until) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      bursts[i].life += 16;
      if (bursts[i].life > 440) bursts.splice(i, 1);
    }
    draw();
    if (now < until) requestAnimationFrame((t) => celebrate(t, until));
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
    for (let i = 0; i < 16; i++)
      bursts.push({
        x: w * (0.2 + Math.random() * 0.6),
        y: h * (0.12 + Math.random() * 0.48),
        life: -Math.random() * 380,
      });
    panel.classList.add("round-next");
    panel.hidden = false;
    nextButton.textContent = "Choose an upgrade";
    requestAnimationFrame((t) => celebrate(t, t + 2600));
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
    for (let i = bursts.length - 1; i >= 0; i--) {
      bursts[i].life += dt;
      if (bursts[i].life > 440) bursts.splice(i, 1);
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
      } else s.r = Math.min(s.max, s.r + dt * 0.26);
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
              trail: [],
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
        m.trail.push([m.x, m.y]);
        if (m.trail.length > 18) m.trail.shift();
      }
      let hit = false;
      for (const s of shots)
        if (s.bursting && Math.hypot(m.x - s.x, m.y - s.y) < s.r) {
          if (m.kind === "harasser") {
            m.hp--;
            bursts.push({ x: m.x, y: m.y, life: 0 });
            sound("enemy");
            if (m.hp <= 0) {
              explodeEnemy(m);
              enemy.splice(i, 1);
            }
          } else {
            explodeEnemy(m);
            enemy.splice(i, 1);
          }
          hit = true;
          break;
        }
      if (hit) continue;
      if (m.kind !== "harasser" && m.y >= m.ty) {
        loseCity(m.tx, m.kind);
        enemy.splice(i, 1);
      }
    }
    if (assaultOver && enemy.length === 0) {
      finishRound();
      return;
    }
    scoreEl.textContent = String(score).padStart(6, "0");
    waveEl.textContent = `${wave} · ${cities.filter((c) => c.alive).length} · ${assaultOver ? "CLEAR!" : Math.ceil(left / 1000) + "s"}`;
  }
  // Render the Mars battlefield, city defenses, and transient blast effects.
  function draw() {
    const palette = upgrades.payload
      ? ["#ff5d73", "#ffcf58", "#66e6bd", "#53a8ff", "#bd7aff"]
      : settings.palette === "redblue"
        ? ["#ff4d5f", "#53a8ff", "#fff"]
        : ["#ff5d73", "#ffcf58", "#66e6bd"];
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#06101e";
    ctx.fillRect(0, h - 52, w, 52);
    for (const c of cities) {
      ctx.fillStyle = c.alive ? "#7fb5d9" : "#3a2732";
      ctx.fillRect(c.x - 20, h - 58, 40, 6);
      ctx.fillRect(c.x - 14, h - 70, 28, 12);
      if (c.alive) {
        ctx.fillStyle = "#ffd56c";
        for (let j = 0; j < 3; j++)
          ctx.fillRect(c.x - 10 + j * 8, h - 66, 3, 4);
        if (c.hp > 1) {
          ctx.fillStyle = "#7de8ff";
          ctx.fillRect(
            c.x - 15,
            h - 77,
            30 * (c.hp / (1 + upgrades.shield)),
            3,
          );
        }
      }
    }
    for (const m of enemy) {
      if (m.kind === "harasser") {
        ctx.fillStyle = "#ad5cff";
        ctx.beginPath();
        ctx.moveTo(m.x - 25, m.y + 7);
        ctx.lineTo(m.x - 9, m.y - 7);
        ctx.lineTo(m.x + 20, m.y);
        ctx.lineTo(m.x - 9, m.y + 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffd66f";
        ctx.fillRect(m.x - 17, m.y - 15, 34 * (m.hp / (5 + (wave - 1) * 2)), 3);
        continue;
      }
      ctx.beginPath();
      m.trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = m.kind === "bomb" ? palette[1] + "aa" : "#ff596e99";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = m.kind === "bomb" ? palette[0] : "#fff1d5";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.kind === "bomb" ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const s of shots) {
      if (!s.bursting) {
        ctx.fillStyle = "#d9f6ff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      const a = 1 - s.r / s.max;
      ctx.strokeStyle = `rgba(104,216,255,${a * 0.9})`;
      ctx.lineWidth = settings.effect === "bold" ? 7 : 3;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const b of bursts) {
      if (b.life < 0) continue;
      const p = b.life / 440,
        r =
          (settings.effect === "bold" ? 1.45 : 1) *
          (8 + p * 34) *
          (1 + upgrades.payload * 0.08);
      ctx.fillStyle = palette[((b.life / 70) | 0) % palette.length];
      ctx.globalAlpha = 1 - p;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette[((b.life / 110) | (0 + 1)) % palette.length];
      ctx.lineWidth = settings.effect === "bold" ? 5 : 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const b of bunkers) {
      ctx.fillStyle = b.alive ? "#182a42" : "#37232d";
      ctx.fillRect(b.x - 26, h - 50, 52, 13);
      if (!b.alive) continue;
      const tip = cannonTip(b, aim.x, aim.y);
      ctx.strokeStyle = b.cooldown || !b.ammo ? "#58728b" : "#d6efff";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x, h - 64);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.fillStyle = "#86bde0";
      ctx.fillRect(b.x - 8, h - 64, 16, 18);
      ctx.fillStyle = "#0b1422";
      ctx.fillRect(b.x - 22, h - 34, 44, 4);
      ctx.fillStyle = "#6ee7ff";
      ctx.fillRect(b.x - 22, h - 34, 44 * (1 - b.cooldown / 780), 4);
      ctx.fillStyle = b.ammo ? "#e7f7ff" : "#ff7884";
      ctx.font = "700 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(b.ammo, b.x, h - 82);
    }
  }
  function loop(now) {
    if (!playing) return;
    if (paused) {
      last = now;
      draw();
      requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(40, now - last);
    last = now;
    update(now, dt);
    draw();
    requestAnimationFrame(loop);
  }
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    aim = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  canvas.addEventListener("pointerdown", (e) => {
    const r = canvas.getBoundingClientRect();
    aim = { x: e.clientX - r.left, y: e.clientY - r.top };
    launch(aim.x, aim.y);
  });
  // Menu controls intentionally stay separate from the render loop.
  const settingsPanel = document.querySelector("#settings"),
    settingsButton = document.querySelector("#settings-toggle"),
    soundButton = document.querySelector("#sound-toggle");
  function setSound(on) {
    settings.sound = on;
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
    nextButton.textContent = "Next round";
  }
  function begin(withMusic) {
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
        music.pause();
      } else {
        roundStart += performance.now() - pauseAt;
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
})();
