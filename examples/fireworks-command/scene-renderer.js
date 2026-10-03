/**
 * Game-owned artwork, not an engine feature. No game Canvas2D is attached to
 * the DOM: detached canvases cache the terrain and paint the dynamic scene.
 * The generic engine render pass composites that scene before its particles.
 * WebGL2: one premultiplied RGBA texture upload + one fullscreen triangle/frame.
 * Canvas fallback: drawImage in CSS pixels, independent of engine zoom.
 * Trade-off: full-frame texture bandwidth in exchange for portable, rich 2D
 * artwork with no geometry dependency. Static terrain is cached; DPR caps at 2.
 * No player shots, collision circles, or explosions are painted here.
 */
(() => {
  "use strict";
  const TAU = Math.PI * 2;
  class FireworksCommandScene {
    constructor() {
      this.art = document.createElement("canvas");
      this.ctx = this.art.getContext("2d");
      this.terrain = document.createElement("canvas");
      this.terrainCtx = this.terrain.getContext("2d");
      this.width = this.height = this.dpr = 0;
      this.gl = this.program = this.texture = this.vao = null;
      this.canvas = null;
      this.textureWidth = this.textureHeight = 0;
      this.lastSignature = null;
      this.dirty = true;
      this.onLost = () => this.releaseGPU();
      this.onRestored = () => {
        this.releaseGPU();
        this.width = 0; // Rebuild artwork caches as well as GL handles.
      };
    }
    ellipse(ctx, x, y, rx, ry, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
      ctx.fill();
    }
    polygon(ctx, points, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      ctx.fill();
    }
    resize(width, height, dpr) {
      dpr = Math.min(dpr || 1, 2);
      if (width === this.width && height === this.height && dpr === this.dpr) return false;
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      for (const canvas of [this.art, this.terrain]) {
        canvas.width = Math.max(1, Math.round(width * dpr));
        canvas.height = Math.max(1, Math.round(height * dpr));
      }
      this.terrainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.paintTerrain();
      // The cached frame and the uploaded texture are both invalid now.
      this.lastSignature = null;
      this.dirty = true;
      return true;
    }
    paintTerrain() {
      const ctx = this.terrainCtx, w = this.width, h = this.height;
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#080b21");
      sky.addColorStop(0.58, "#321a32");
      sky.addColorStop(0.9, "#aa4d39");
      sky.addColorStop(1, "#d48350");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // Deterministic stars and rocks: resize never consumes gameplay randomness.
      for (let i = 0; i < 100; i++) {
        const x = ((i * 137.508) % 997) / 997 * w;
        const y = ((i * 73.31) % 613) / 613 * h * 0.7;
        ctx.fillStyle = i % 4 ? "#c2cce06b" : "#fff0d6b0";
        ctx.fillRect(x, y, i % 9 ? 1 : 2, 1);
      }
      const planet = ctx.createRadialGradient(w * 0.83, h * 0.2, 2, w * 0.84, h * 0.22, 30);
      planet.addColorStop(0, "#ffddb1");
      planet.addColorStop(1, "#806e84");
      this.ellipse(ctx, w * 0.84, h * 0.22, 28, 28, planet);
      this.ellipse(ctx, w * 0.85, h * 0.215, 25, 27, "#211c32");
      for (let layer = 0; layer < 3; layer++) {
        const base = h - 90 - (2 - layer) * h * 0.06;
        const points = [[0, h]];
        for (let i = 0; i <= 24; i++) {
          points.push([w * i / 24, base - (Math.sin(i * 1.9 + layer) + 1) * (18 + layer * 7)]);
        }
        points.push([w, h]);
        this.polygon(ctx, points, ["#4b293b", "#5f3039", "#793b39"][layer]);
      }
      const ground = ctx.createLinearGradient(0, h - 65, 0, h);
      ground.addColorStop(0, "#452c36");
      ground.addColorStop(1, "#130f20");
      ctx.fillStyle = ground;
      ctx.fillRect(0, h - 52, w, 52);
      ctx.strokeStyle = "#da886840";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - 52);
      ctx.lineTo(w, h - 52);
      ctx.stroke();
      for (let i = 0; i < 75; i++) {
        const x = ((i * 57.19) % 503) / 503 * w;
        const y = h - 47 + ((i * 13.41) % 37);
        this.ellipse(ctx, x, y, 1 + i % 4, 1, i % 2 ? "#8b55443b" : "#c77f4933");
      }
    }
    paintCity(c, index, upgrades) {
      const ctx = this.ctx, h = this.height;
      const scale = Math.min(1.2, this.width / 680);
      ctx.save();
      ctx.translate(c.x, h - 58);
      ctx.scale(scale, 1);
      this.ellipse(ctx, 0, 6, 37, 7, "#0d1429a0");
      if (!c.alive) {
        this.polygon(ctx, [[-31, 0], [-25, -8], [-18, -4], [-9, -15], [-4, -5], [12, -10], [27, -4], [33, 0]], "#352333");
        ctx.fillStyle = "#a85b48";
        ctx.fillRect(-18, -4, 9, 2);
        ctx.fillRect(7, -7, 4, 2);
        ctx.restore();
        return;
      }
      ctx.fillStyle = "#54758c";
      ctx.fillRect(-33, -2, 66, 6);
      ctx.fillStyle = "#b8d2de";
      ctx.fillRect(-32, -2, 64, 1);
      for (let j = 0; j < 5; j++) {
        const x = -29 + j * 12, bh = 14 + (j * 7 + index * 11) % 22;
        const wall = ctx.createLinearGradient(x, 0, x + 10, 0);
        wall.addColorStop(0, "#91b8cd");
        wall.addColorStop(0.45, "#547c97");
        wall.addColorStop(1, "#233d59");
        ctx.fillStyle = wall;
        ctx.fillRect(x, -bh, 10, bh);
        ctx.fillStyle = "#d6e6e8";
        ctx.fillRect(x, -bh, 10, 2);
        ctx.fillStyle = index % 2 ? "#83e1eb" : "#ffd896";
        for (let row = 0; row < Math.floor((bh - 6) / 6); row++) {
          for (let col = 0; col < 2; col++) {
            if ((row + col + j + index) % 4) ctx.fillRect(x + 2 + col * 4, -bh + 5 + row * 6, 2, 3);
          }
        }
      }
      // Colony dome and its structural ribs, distinct from collision circles.
      const dome = ctx.createLinearGradient(0, -18, 0, 0);
      dome.addColorStop(0, "#a6f3ffbb");
      dome.addColorStop(1, "#245275ee");
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 18, 0, Math.PI, TAU);
      ctx.closePath();
      ctx.fillStyle = dome;
      ctx.fill();
      ctx.strokeStyle = "#b9edff";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 18, 0, Math.PI, TAU);
      ctx.moveTo(-14, -7);
      ctx.lineTo(14, -7);
      ctx.stroke();
      ctx.fillStyle = "#c8ebf7";
      ctx.fillRect(-1, -47, 2, 12);
      this.ellipse(ctx, 0, -48, 2, 2, "#ff7c70");
      if (c.hp > 1) {
        ctx.strokeStyle = "#75e4ee80";
        ctx.beginPath();
        ctx.ellipse(0, 0, 37, 54, 0, Math.PI, TAU);
        ctx.stroke();
        ctx.fillStyle = "#62e2e8";
        ctx.fillRect(-18, -58, 36 * c.hp / (1 + upgrades.shield), 2);
      }
      ctx.restore();
    }
    paintCannon(b, aim, cannonTip) {
      const ctx = this.ctx, h = this.height, tip = cannonTip(b, aim.x, aim.y);
      ctx.save();
      ctx.translate(b.x, h - 64);
      this.ellipse(ctx, 0, 18, 35, 9, "#060b1dc0");
      this.polygon(ctx, [[-30, 20], [-24, 7], [24, 7], [30, 20]], b.alive ? "#45617a" : "#392b35");
      ctx.fillStyle = "#172c46";
      ctx.fillRect(-24, 12, 48, 8);
      ctx.fillStyle = "#6e96ad";
      ctx.fillRect(-23, 9, 46, 2);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = "#1b2c42";
        ctx.fillRect(-20 + i * 9, 14, 5, 4);
      }
      if (b.alive) {
        ctx.save();
        ctx.rotate(tip.theta);
        const ready = !b.cooldown && b.ammo > 0;
        ctx.fillStyle = ready ? "#b7d8e8" : "#678597";
        ctx.fillRect(0, -4, 20, 8);
        ctx.fillStyle = "#3f5d78";
        ctx.fillRect(3, 1, 16, 3);
        ctx.fillStyle = ready ? "#82ecff" : "#79929a";
        ctx.fillRect(17, -5, 3, 10);
        ctx.restore();
        const metal = ctx.createLinearGradient(0, -10, 0, 9);
        metal.addColorStop(0, "#b2cddd");
        metal.addColorStop(1, "#3b5878");
        this.ellipse(ctx, 0, 2, 12, 11, metal);
        this.ellipse(ctx, 0, 2, 5, 5, "#233b55");
        this.ellipse(ctx, 0, 2, 2, 2, ready ? "#8ef2ff" : "#fbba76");
        ctx.fillStyle = "#102036";
        ctx.fillRect(-22, 29, 44, 3);
        ctx.fillStyle = b.ammo ? "#69d9e4" : "#e26b74";
        ctx.fillRect(-22, 29, 44 * Math.max(0, 1 - b.cooldown / 780), 3);
        ctx.font = "700 10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = b.ammo ? "#d3edf6" : "#ff9090";
        ctx.fillText(String(b.ammo).padStart(2, "0"), 0, -22);
      }
      ctx.restore();
    }
    paintEnemy(m, wave) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(m.x, m.y);
      if (m.kind === "harasser") {
        const hull = ctx.createLinearGradient(0, -9, 0, 12);
        hull.addColorStop(0, "#e1c1ff");
        hull.addColorStop(0.4, "#8862ae");
        hull.addColorStop(1, "#30253f");
        this.ellipse(ctx, 0, 3, 31, 9, hull);
        this.ellipse(ctx, 0, -3, 13, 10, "#713c82");
        this.ellipse(ctx, -3, -5, 9, 6, "#bbedeccc");
        ctx.strokeStyle = "#edd6ff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 1, 30, 5, 0, 0, Math.PI);
        ctx.stroke();
        for (let i = -2; i <= 2; i++) this.ellipse(ctx, i * 10, 6, 2, 1.5, i % 2 ? "#ffae72" : "#7df6db");
        ctx.fillStyle = "#221728";
        ctx.fillRect(-22, -21, 44, 3);
        ctx.fillStyle = "#ffc877";
        ctx.fillRect(-22, -21, 44 * Math.max(0, m.hp / (5 + (wave - 1) * 2)), 3);
      } else {
        // Enemy bodies are game artwork, not simulated firework particles.
        ctx.rotate(Math.atan2(m.ty - m.y, m.tx - m.x) - Math.PI / 2);
        const big = m.kind === "bomb";
        const r = big ? 7 : 5;
        this.polygon(ctx, [[-r, -4], [-r - 3, -12], [0, -9], [r + 3, -12], [r, -4]], "#b1625e");
        const body = ctx.createLinearGradient(-r, 0, r, 0);
        body.addColorStop(0, "#ffbc8c");
        body.addColorStop(0.35, "#e86163");
        body.addColorStop(1, "#7a294b");
        this.ellipse(ctx, 0, 0, r, r * 1.35, body);
        ctx.strokeStyle = "#ffdca0";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-r + 1, 0);
        ctx.lineTo(r - 1, 0);
        ctx.stroke();
        this.ellipse(ctx, -2, -3, 1.5, 1.5, "#ffe2b6");
      }
      ctx.restore();
    }
    // Deterministic generator so a crack keeps one shape for its whole life. A
    // fresh Math.random() per frame would make every crack crawl and flicker.
    seeded(seed) {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    paintDomeCrack(crack, geo) {
      const ctx = this.ctx, rand = this.seeded(crack.seed),
        unit = Math.min(this.width, this.height) * 0.018;
      ctx.save();
      ctx.translate(crack.x, crack.y);
      // Local +x points inward, toward the middle of the shield, so the arms grow
      // into the glass. Orienting them along the outward normal made a break look
      // like it was spraying off the outside of the dome.
      ctx.rotate(Math.atan2(crack.y - geo.cy, crack.x - geo.cx) + Math.PI);
      ctx.strokeStyle = "rgba(226,246,255,.5)";
      ctx.lineWidth = 1;
      const arms = 4 + Math.floor(rand() * 3);
      for (let i = 0; i < arms; i++) {
        // Fanned wide across the impact so the break reads as spreading through the
        // glass rather than a neat set of spokes.
        let px = 0, py = 0, a = (i / Math.max(1, arms - 1) - 0.5) * 2.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const legs = 2 + Math.floor(rand() * 2);
        for (let leg = 0; leg < legs; leg++) {
          const len = unit * (0.5 + rand() * 1.1);
          a += (rand() - 0.5) * 0.5;
          px += Math.cos(a) * len;
          py += Math.sin(a) * len;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    paintDome(dome) {
      if (!dome) return;
      // A failed field vanishes completely, cracks and all. Leaving the scars over
      // the cities made it look as though something was still protecting them.
      if (dome.hp <= 0) return;
      const ctx = this.ctx, { cx, cy, r, baseY } = dome.geo,
        // The arc runs from where the dome meets the left edge to the right edge,
        // passing over the crown.
        from = Math.atan2(baseY - cy, -cx),
        to = Math.atan2(baseY - cy, this.width - cx),
        health = dome.maxHp ? dome.hp / dome.maxHp : 0;

      ctx.save();
      // The glassy body: a faint sheen, strongest toward the crown.
      ctx.beginPath();
      ctx.arc(cx, cy, r, from, to);
      ctx.closePath();
      const sheen = ctx.createLinearGradient(0, baseY - r * .1, 0, baseY);
      sheen.addColorStop(0, `rgba(150,220,255,${0.03 + 0.1 * health})`);
      sheen.addColorStop(1, "rgba(120,180,255,0.015)");
      ctx.fillStyle = sheen;
      ctx.fill();
      // The rim brightens as the field weakens, as though energy is arcing through
      // the damage.
      ctx.beginPath();
      ctx.arc(cx, cy, r, from, to);
      ctx.strokeStyle = `rgba(190,240,255,${0.16 + 0.16 * (1 - health)})`;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // A specular band up one side, like a reflection on curved glass.
      ctx.beginPath();
      ctx.arc(cx, cy, r * .985, from + (to - from) * .12, from + (to - from) * .34);
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.lineWidth = 3;
      ctx.stroke();
      for (const crack of dome.cracks)
        this.paintDomeCrack(crack, dome.geo);
      ctx.restore();
    }
    paint(state) {
      const ctx = this.ctx, w = this.width, h = this.height;
      this.dirty = true;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(this.terrain, 0, 0, w, h);
      state.cities.forEach((c, i) => this.paintCity(c, i, state.upgrades));
      state.bunkers.forEach((b) => this.paintCannon(b, state.aim, state.cannonTip));
      // The dome sits over the cities it protects, and under the incoming fire.
      this.paintDome(state.dome);
      state.enemy.forEach((m) => this.paintEnemy(m, state.wave));
      // The blast radius ring: a very light outline of what the explosion is
      // actually lethal to right now. It is drawn under the engine's particles, so
      // it reads as a faint rim beneath the fire rather than competing with it —
      // and it means a kill is never a mystery.
      for (const s of state.shots || []) {
        if (!s.bursting || s.r <= 0) continue;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.strokeStyle = "#cfe9ff2e";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const { x, y } = state.aim;
      ctx.strokeStyle = state.paused ? "#ffca8a" : "#a7e7efb0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
        ctx.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13);
      }
      ctx.stroke();
      ctx.strokeRect(x - 3, y - 3, 6, 6);
      if (state.paused) {
        ctx.fillStyle = "#10182bd9";
        ctx.fillRect(w / 2 - 110, 108, 220, 38);
        ctx.fillStyle = "#ffe0ad";
        ctx.textAlign = "center";
        ctx.font = "600 13px ui-monospace, monospace";
        ctx.fillText("PAUSED · P TO RESUME", w / 2, 132);
      }
    }
    watchCanvas(canvas) {
      if (this.canvas === canvas) return;
      this.unwatchCanvas();
      this.releaseGPU();
      this.canvas = canvas;
      canvas.addEventListener("webglcontextlost", this.onLost);
      canvas.addEventListener("webglcontextrestored", this.onRestored);
    }
    unwatchCanvas() {
      if (!this.canvas) return;
      this.canvas.removeEventListener("webglcontextlost", this.onLost);
      this.canvas.removeEventListener("webglcontextrestored", this.onRestored);
      this.canvas = null;
    }
    initGPU(gl) {
      this.releaseGPU();
      this.gl = gl;
      const shaders = [];
      try {
        const shader = (type, source) => {
          const s = gl.createShader(type);
          shaders.push(s);
          gl.shaderSource(s, source);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
          return s;
        };
        this.program = gl.createProgram();
        gl.attachShader(this.program, shader(gl.VERTEX_SHADER, `#version 300 es
          out vec2 uv;
          void main() {
            vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
            uv = vec2(p.x, 1.0 - p.y);
            gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
          }`));
        gl.attachShader(this.program, shader(gl.FRAGMENT_SHADER, `#version 300 es
          precision mediump float;
          in vec2 uv;
          uniform sampler2D scene;
          out vec4 color;
          void main() { color = texture(scene, uv); }`));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program));
        this.sampler = gl.getUniformLocation(this.program, "scene");
        this.vao = gl.createVertexArray();
        this.texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } catch (error) {
        this.releaseGPU();
        throw error;
      } finally {
        shaders.forEach((s) => gl.deleteShader(s));
      }
    }
    compositeGL(gl, canvas) {
      if (gl.isContextLost()) return;
      if (this.gl !== gl || !this.program) this.initGPU(gl);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.SCISSOR_TEST);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.colorMask(true, true, true, true);
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(this.program);
      gl.bindVertexArray(this.vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      const flip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
      const premultiplied = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      try {
        // Only when the artwork actually changed, which is the whole point of the
        // signature check above.
        if (this.dirty) {
          if (this.textureWidth !== this.art.width || this.textureHeight !== this.art.height) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.art);
            this.textureWidth = this.art.width;
            this.textureHeight = this.art.height;
          } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.art);
          this.dirty = false;
        }
      } finally {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiplied);
      }
      gl.uniform1i(this.sampler, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
      // The engine establishes its own GL state after this callback.
    }
    // The artwork is a pure function of the game state, so an identical state means an
    // identical frame. Repainting and re-uploading the whole scene texture costs
    // viewport × dpr × 4 bytes of bus traffic every frame — about 33 MB at 1080p with
    // DPR 2, near 2 GB/s at 60fps — so an unchanged frame is neither redrawn nor
    // uploaded. Menus, pauses and quiet moments then cost nothing but one draw call.
    // Every field paint() reads is in here: miss one and a frame would freeze.
    frameSignature(state) {
      const parts = [
        this.width, this.height, this.dpr,
        state.paused ? 1 : 0, state.wave,
        state.aim.x, state.aim.y,
        state.upgrades ? state.upgrades.shield : 0,
      ];
      for (const c of state.cities) parts.push(c.x, c.alive ? 1 : 0, c.hp);
      for (const b of state.bunkers)
        parts.push(b.x, b.alive ? 1 : 0, b.cooldown, b.ammo);
      for (const m of state.enemy)
        parts.push(m.kind, m.x, m.y, m.hp || 0, m.tx || 0, m.ty || 0);
      for (const s of state.shots || [])
        parts.push(s.bursting ? 1 : 0, s.x, s.y, s.r);
      const dome = state.dome;
      if (dome) {
        parts.push(dome.hp, dome.cracks.length);
        for (const crack of dome.cracks) parts.push(crack.x, crack.y, crack.seed);
      }
      return parts.join(",");
    }
    render(frame, state) {
      const { gl, ctx, canvas, width, height, dpr } = frame;
      this.watchCanvas(canvas);
      const resized = this.resize(width, height, dpr),
        signature = this.frameSignature(state);
      if (resized || signature !== this.lastSignature) {
        this.lastSignature = signature;
        this.paint(state);
        this.dirty = true;
      }
      // The composite always runs: the engine clears the canvas each frame, so a
      // skipped blit would leave the scene missing entirely. Only the repaint and the
      // texture upload are skipped.
      if (gl) this.compositeGL(gl, canvas);
      else if (ctx) {
        this.releaseGPU();
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(this.art, 0, 0, width, height);
        ctx.restore();
      }
    }
    releaseGPU() {
      const gl = this.gl;
      if (gl && !gl.isContextLost()) {
        if (this.texture) gl.deleteTexture(this.texture);
        if (this.program) gl.deleteProgram(this.program);
        if (this.vao) gl.deleteVertexArray(this.vao);
      }
      this.gl = this.program = this.texture = this.vao = null;
      this.textureWidth = this.textureHeight = 0;
      // The texture is gone, so the artwork has to go up again.
      this.dirty = true;
    }
    destroy() {
      this.unwatchCanvas();
      this.releaseGPU();
      this.art.width = this.art.height = 1;
      this.terrain.width = this.terrain.height = 1;
    }
  }
  window.FireworksCommandScene = FireworksCommandScene;
})();