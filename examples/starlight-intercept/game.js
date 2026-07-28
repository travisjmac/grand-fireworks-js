/**
 * Starlight Intercept
 * Created by Travis MacDonald — powered by Grand Fireworks JS
 *
 * A compact space-action showcase: steer with W/A/S/D or arrow keys, fire
 * with Space, and press P to preview the cinematic warp ending.
 */
(() => {
  "use strict";
  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.querySelector("#score");
  const msg = document.querySelector("#message");
  const music = document.querySelector("#game-music");
  const P_R = 13,
    FLAP = -245,
    SCROLL = 105;
  let stars = [],
    obstacles = [],
    asteroids = [],
    saucers = [],
    enemyShots = [],
    powerups = [],
    shots = [],
    blueBursts = [],
    playerX = 0,
    playerY = 0,
    playerVX = 0,
    playerVY = 0,
    score = 0,
    state = "ready",
    spawnIn = 2.6,
    asteroidIn = 5,
    saucerIn = 9,
    boostUntil = 0,
    warpTime = 0,
    last = performance.now(),
    controls = { up: false, down: false, left: false, right: false };
  let audioCtx;
  music.volume = 0.32;

  // Synthesized effects avoid extra sound files and begin only after input.
  function sfx(type) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    const t = audioCtx.currentTime,
      o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.connect(g).connect(audioCtx.destination);
    if (type === "laser") {
      o.type = "square";
      o.frequency.setValueAtTime(760, t);
      o.frequency.exponentialRampToValueAtTime(220, t + 0.12);
      g.gain.setValueAtTime(0.055, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    } else if (type === "pickup") {
      o.type = "sine";
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(1040, t + 0.22);
      g.gain.setValueAtTime(0.08, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    } else {
      o.type = type === "torpedo" ? "sawtooth" : "triangle";
      o.frequency.setValueAtTime(type === "torpedo" ? 170 : 120, t);
      o.frequency.exponentialRampToValueAtTime(35, t + 0.28);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    }
    o.start(t);
    o.stop(t + 0.34);
  }

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    stars = Array.from({ length: Math.max(70, (innerWidth / 12) | 0) }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: Math.random() * 1.4 + 0.25,
    }));
    if (!playerY) {
      playerX = innerWidth * 0.17;
      playerY = innerHeight / 2;
    }
  }
  addEventListener("resize", resize);
  resize();

  function show(title, copy, hint) {
    msg.style.display = "";
    msg.querySelector("h1").textContent = title;
    msg.querySelectorAll("p")[0].textContent = copy;
    msg.querySelector(".hint").textContent = hint;
  }
  // A fresh flight resets the world while preserving the loaded audio choice.
  function reset() {
    obstacles = [];
    asteroids = [];
    saucers = [];
    enemyShots = [];
    powerups = [];
    shots = [];
    blueBursts = [];
    playerX = innerWidth * 0.17;
    playerY = innerHeight / 2;
    playerVX = playerVY = 0;
    score = 0;
    spawnIn = 2.8;
    asteroidIn = 5;
    saucerIn = 9;
    boostUntil = 0;
    state = "play";
    scoreEl.textContent = "0";
    msg.style.display = "none";
    music.play().catch(() => {});
    last = performance.now();
  }
  function flap() {
    if (state === "dead" || state === "ready") reset();
    else if (state === "play") playerVY = FLAP;
  }
  function dive() {
    if (state === "play") playerVY = 245;
  }
  addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".back-row")) flap();
  });
  function fire() {
    if (state === "play") {
      shots.push({ y: playerY, life: 0.22 });
      sfx("laser");
    }
  }
  addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "p") {
      e.preventDefault();
      beginWarp();
    } else if (key === "w" || e.code === "ArrowUp") {
      e.preventDefault();
      if (state === "ready" || state === "dead" || state === "complete")
        reset();
      controls.up = true;
    } else if (key === "s" || e.code === "ArrowDown") {
      e.preventDefault();
      if (state === "ready" || state === "dead" || state === "complete")
        reset();
      controls.down = true;
    } else if (key === "a" || e.code === "ArrowLeft") {
      e.preventDefault();
      controls.left = true;
    } else if (key === "d" || e.code === "ArrowRight") {
      e.preventDefault();
      controls.right = true;
    } else if (e.code === "Space") {
      e.preventDefault();
      if (state === "ready" || state === "dead" || state === "complete")
        reset();
      else fire();
    }
  });
  addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();
    if (key === "w" || e.code === "ArrowUp") controls.up = false;
    if (key === "s" || e.code === "ArrowDown") controls.down = false;
    if (key === "a" || e.code === "ArrowLeft") controls.left = false;
    if (key === "d" || e.code === "ArrowRight") controls.right = false;
  });

  // Fireworks generate the moving ember corridors the ship must navigate.
  function spawn() {
    const margin = Math.min(180, canvas.height * 0.24);
    const y = margin + Math.random() * (canvas.height - margin * 2);
    const fromTop = Math.random() < 0.5;
    obstacles.push({
      x: -34,
      y: fromTop ? -28 : canvas.height + 28,
      sx: -34,
      sy: fromTop ? -28 : canvas.height + 28,
      tx: playerX + 390 + Math.random() * 180,
      ty: y,
      age: 0,
      phase: "rocket",
      radius: 0,
      integrity: 1,
      embers: [],
    });
  }
  function burst(o) {
    o.phase = "burst";
    o.radius = 20;
    for (let i = 0; i < 34; i++) {
      const a = (Math.PI * 2 * i) / 34 + (Math.random() - 0.5) * 0.2;
      const speed = 24 + Math.random() * 62;
      o.embers.push({
        x: o.x,
        y: o.y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 3.2 + Math.random() * 0.8,
      });
    }
  }
  function dropPowerup(x, y) {
    if (Math.random() < 0.7) powerups.push({ x, y, life: 7, r: 11 });
  }
  function spawnAsteroid() {
    const r = 24 + Math.random() * 28;
    asteroids.push({
      x: canvas.width + r + 40,
      y: r + 45 + Math.random() * (canvas.height - r * 2 - 90),
      r,
      integrity: 1,
      spin: Math.random() * 6.28,
      vx: 55 + Math.random() * 35,
    });
  }
  function spawnSaucer() {
    saucers.push({
      x: canvas.width + 65,
      y: 90 + Math.random() * (canvas.height - 180),
      integrity: 1,
      wobble: Math.random() * 6.28,
      fire: 1.4 + Math.random(),
    });
  }
  function hit(x, y, r) {
    return Math.hypot(x - playerX, y - playerY) < r + P_R;
  }
  function die() {
    state = "dead";
    show("💥 Singed!", `Score: ${score}`, "Press W / ↑ or Space to try again");
  }
  function beginWarp() {
    state = "warp";
    warpTime = 0;
    obstacles = [];
    asteroids = [];
    saucers = [];
    enemyShots = [];
    powerups = [];
    shots = [];
    msg.style.display = "none";
  }

  // Simulation updates player steering, hazards, power-ups, and enemies.
  function update(dt, now) {
    const verticalThrust = (controls.down ? 1 : 0) - (controls.up ? 1 : 0),
      horizontalThrust = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    playerVX = Math.max(
      -285,
      Math.min(285, playerVX + horizontalThrust * 620 * dt),
    );
    playerVY = Math.max(
      -285,
      Math.min(285, playerVY + verticalThrust * 620 * dt),
    );
    playerVX *= Math.pow(0.08, dt);
    playerVY *= Math.pow(0.08, dt);
    playerX = Math.max(
      canvas.width * 0.07,
      Math.min(canvas.width * 0.31, playerX + playerVX * dt),
    );
    playerY += playerVY * dt;
    spawnIn -= dt;
    if (spawnIn <= 0) {
      spawn();
      spawnIn = 2.65 + Math.random() * 0.7;
    }
    asteroidIn -= dt;
    if (asteroidIn <= 0) {
      spawnAsteroid();
      asteroidIn = 5 + Math.random() * 3;
    }
    saucerIn -= dt;
    if (saucerIn <= 0) {
      spawnSaucer();
      saucerIn = 10 + Math.random() * 5;
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      shots[i].life -= dt;
      if (shots[i].life <= 0) shots.splice(i, 1);
    }
    for (let i = blueBursts.length - 1; i >= 0; i--) {
      blueBursts[i].life -= dt;
      if (blueBursts[i].life <= 0) blueBursts.splice(i, 1);
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.age += dt;
      if (o.phase === "rocket") {
        const t = Math.min(1, o.age / 1.15);
        o.x = o.sx + (o.tx - o.sx) * t;
        o.y = o.sy + (o.ty - o.sy) * t;
        if (t === 1) burst(o);
      } else o.x -= SCROLL * dt;
      if (
        o.phase === "burst" &&
        shots.some((s) => Math.abs(s.y - o.y) < o.radius * o.integrity + 14)
      ) {
        o.integrity -= dt * 3 * (performance.now() < boostUntil ? 2 : 1);
        blueBursts.push({ x: o.x, y: o.y, life: 0.12 });
        if (o.integrity <= 0) {
          score += 12;
          sfx("boom");
          dropPowerup(o.x, o.y);
          obstacles.splice(i, 1);
          continue;
        }
      }
      if (o.phase === "burst") {
        o.radius = Math.min(70, o.radius + 43 * dt);
        if (hit(o.x, o.y, o.radius * o.integrity * 0.72)) return die();
      }
      for (let j = o.embers.length - 1; j >= 0; j--) {
        const e = o.embers[j];
        e.life -= dt;
        e.x += (e.vx - SCROLL) * dt;
        e.y += e.vy * dt;
        e.vy += 17 * dt;
        const shot = shots.find(
          (s) => e.x >= playerX && Math.abs(s.y - e.y) < 19,
        );
        if (shot) {
          blueBursts.push({ x: e.x, y: e.y, life: 0.32 });
          for (const field of obstacles)
            for (let k = field.embers.length - 1; k >= 0; k--)
              if (
                Math.hypot(field.embers[k].x - e.x, field.embers[k].y - e.y) <
                82
              ) {
                field.embers.splice(k, 1);
                score += 2;
              }
          break;
        }
        if (hit(e.x, e.y, 5)) return die();
        if (e.life <= 0 || e.x < -40) o.embers.splice(j, 1);
      }
      if (o.x < -130 && !o.embers.length) obstacles.splice(i, 1);
    }
    for (let i = asteroids.length - 1; i >= 0; i--) {
      const a = asteroids[i];
      a.x -= (SCROLL + a.vx) * dt;
      a.spin += dt;
      if (hit(a.x, a.y, a.r)) return die();
      if (shots.some((s) => a.x >= playerX && Math.abs(s.y - a.y) < a.r + 12)) {
        a.integrity -= dt * 3 * (performance.now() < boostUntil ? 2 : 1);
        blueBursts.push({ x: a.x, y: a.y, life: 0.12 });
        if (a.integrity <= 0) {
          for (let n = 0; n < 8; n++)
            blueBursts.push({
              x: a.x + (Math.random() - 0.5) * a.r,
              y: a.y + (Math.random() - 0.5) * a.r,
              life: 0.25,
            });
          sfx("boom");
          dropPowerup(a.x, a.y);
          score += 20;
          asteroids.splice(i, 1);
          continue;
        }
      }
      if (a.x < -a.r - 20) asteroids.splice(i, 1);
    }
    for (let i = saucers.length - 1; i >= 0; i--) {
      const s = saucers[i];
      s.x -= (SCROLL + 42) * dt;
      s.y += Math.sin(now * 0.003 + s.wobble) * 22 * dt;
      s.fire -= dt;
      if (hit(s.x, s.y, 25)) return die();
      if (shots.some((l) => s.x >= playerX && Math.abs(l.y - s.y) < 28)) {
        s.integrity -= dt * 3 * (performance.now() < boostUntil ? 2 : 1);
        blueBursts.push({ x: s.x, y: s.y, life: 0.12 });
        if (s.integrity <= 0) {
          sfx("boom");
          dropPowerup(s.x, s.y);
          score += 35;
          saucers.splice(i, 1);
          continue;
        }
      }
      if (s.fire <= 0) {
        const dx = playerX - s.x,
          dy = playerY - s.y,
          len = Math.hypot(dx, dy) || 1;
        enemyShots.push({
          x: s.x - 18,
          y: s.y,
          vx: (dx / len) * 86,
          vy: (dy / len) * 86,
          life: 7,
        });
        sfx("torpedo");
        s.fire = 2.8 + Math.random() * 1.8;
      }
      if (s.x < -75) saucers.splice(i, 1);
    }
    for (let i = enemyShots.length - 1; i >= 0; i--) {
      const p = enemyShots[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (hit(p.x, p.y, 7)) return die();
      if (p.life <= 0 || p.x < -30 || p.y < -30 || p.y > canvas.height + 30)
        enemyShots.splice(i, 1);
    }
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.x -= SCROLL * 0.65 * dt;
      p.life -= dt;
      if (hit(p.x, p.y, p.r + 5)) {
        sfx("pickup");
        boostUntil = performance.now() + 6500;
        score += 25;
        powerups.splice(i, 1);
        continue;
      }
      if (p.life <= 0 || p.x < -30) powerups.splice(i, 1);
    }
    if (playerY < -25 || playerY > canvas.height + 25) return die();
    score += dt * 10;
    scoreEl.textContent = Math.floor(score);
  }
  function glow(x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,245,180,${a})`);
    g.addColorStop(0.35, `rgba(255,90,15,${a * 0.7})`);
    g.addColorStop(1, "rgba(255,30,0,0)");
    return g;
  }
  // The draw pass layers deep-space, hazards, laser effects, and the ship.
  function draw(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      const warp =
        state === "warp" ? Math.max(0, Math.min(1, (warpTime - 1.6) / 1.2)) : 0;
      ctx.strokeStyle = `rgba(180,215,255,${0.35 + 0.45 * Math.sin(now * 0.001 + s.x)})`;
      ctx.lineWidth = s.r;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - warp * (100 + s.r * 140), s.y);
      ctx.stroke();
    }
    for (const o of obstacles) {
      if (o.phase === "rocket") {
        const dx = o.tx - o.sx,
          dy = o.ty - o.sy,
          len = Math.hypot(dx, dy) || 1,
          tail = Math.min(105, o.age * 110);
        const bx = o.x - (dx / len) * tail,
          by = o.y - (dy / len) * tail;
        const g = ctx.createLinearGradient(bx, by, o.x, o.y);
        g.addColorStop(0, "rgba(255,70,0,0)");
        g.addColorStop(0.72, "rgba(255,130,15,.72)");
        g.addColorStop(1, "#fff3b0");
        ctx.strokeStyle = g;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(o.x, o.y);
        ctx.stroke();
        ctx.fillStyle = "#fff5cf";
        ctx.beginPath();
        ctx.arc(o.x, o.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const r = o.radius * o.integrity;
        ctx.fillStyle = glow(o.x, o.y, r * 1.35, 0.85);
        ctx.beginPath();
        ctx.arc(o.x, o.y, r * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,207,82,.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const e of o.embers) {
        const a = Math.max(0, e.life / 4);
        ctx.fillStyle = `rgba(255,${90 + a * 130},20,${a})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 2.6 * a + 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const a of asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.spin);
      ctx.fillStyle = "#596077";
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2,
          rr = a.r * (0.72 + (i % 3) * 0.12);
        i
          ? ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
          : ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#a5acc1";
      ctx.stroke();
      ctx.fillStyle = "#30384d";
      ctx.beginPath();
      ctx.arc(-a.r * 0.2, -a.r * 0.1, a.r * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const s of saucers) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.fillStyle = "#b87cff";
      ctx.beginPath();
      ctx.ellipse(0, 5, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#72eaff";
      ctx.beginPath();
      ctx.ellipse(0, -3, 13, 8, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#f9d75d";
      ctx.fillRect(-16, 7, 32 * s.integrity, 3);
      ctx.restore();
    }
    for (const p of enemyShots) {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.fillStyle = "#ff6d9e";
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe7f1";
      ctx.beginPath();
      ctx.arc(7, 0, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const p of powerups) {
      const pulse = 0.7 + 0.3 * Math.sin(now * 0.008 + p.x);
      ctx.fillStyle = `rgba(73,220,255,${pulse})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(p.x - 2, p.y - 7, 4, 14);
      ctx.fillRect(p.x - 7, p.y - 2, 14, 4);
    }
    for (const s of shots) {
      const a = s.life / 0.22;
      const g = ctx.createLinearGradient(playerX - 8, s.y, canvas.width, s.y);
      g.addColorStop(0, "rgba(65,190,255,0)");
      g.addColorStop(0.08, `rgba(120,225,255,${a})`);
      g.addColorStop(0.55, `rgba(48,164,255,${a * 0.7})`);
      g.addColorStop(1, "rgba(40,130,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(playerX - 8, s.y);
      ctx.lineTo(canvas.width, s.y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(235,255,255,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playerX, s.y);
      ctx.lineTo(canvas.width, s.y);
      ctx.stroke();
    }
    for (const b of blueBursts) {
      const p = 1 - b.life / 0.32,
        r = 10 + p * 48;
      ctx.strokeStyle = `rgba(85,210,255,${1 - p})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    const tilt = Math.max(-0.42, Math.min(0.52, playerVY / 620));
    const cinematicScale =
      state === "warp"
        ? warpTime > 2.05
          ? 0
          : 1 + Math.min(28, Math.pow(warpTime * 1.2, 3))
        : 1;
    ctx.save();
    ctx.translate(playerX, playerY);
    ctx.scale(cinematicScale, cinematicScale);
    ctx.rotate(tilt);
    const engine = 14 + Math.min(16, Math.abs(playerVY) * 0.035);
    const flame = ctx.createLinearGradient(-engine - 9, 0, -3, 0);
    flame.addColorStop(0, "rgba(40,150,255,0)");
    flame.addColorStop(0.5, "#48c8ff");
    flame.addColorStop(1, "#fff6b8");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.lineTo(-engine - 9, 0);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7ca9d5";
    ctx.beginPath();
    ctx.moveTo(-12, -9);
    ctx.lineTo(14, 0);
    ctx.lineTo(-12, 9);
    ctx.lineTo(-7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#dcecff";
    ctx.beginPath();
    ctx.moveTo(-8, -7);
    ctx.lineTo(16, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#386fc0";
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(-15, -15);
    ctx.lineTo(-11, -2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, 8);
    ctx.lineTo(-15, 15);
    ctx.lineTo(-11, 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#49d9ff";
    ctx.beginPath();
    ctx.arc(5, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
  function loop(now) {
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    if (state === "play") update(dt, now);
    if (state === "warp") {
      warpTime += dt;
      playerX += (canvas.width * 0.5 - playerX) * Math.min(1, dt * 1.45);
      playerY += (canvas.height * 0.5 - playerY) * Math.min(1, dt * 1.45);
      if (warpTime > 4.7) {
        state = "complete";
        show(
          "✨ Starlight Intercept",
          "Warp complete.",
          "Press Space to start a new run",
        );
      }
    }
    draw(now);
    requestAnimationFrame(loop);
  }
  show(
    "Starlight Intercept",
    "Dodge rockets, bursts, and burning embers.",
    "W / ↑ thrust · S / ↓ dive · A / D move · Space fire",
  );
  requestAnimationFrame(loop);
})();
