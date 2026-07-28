/* Grand Fireworks card previews — tiny WebGL scenes for the documentation cards. */
(() => {
  "use strict";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const cards = [];
  const vertex = `attribute vec2 a_position; attribute float a_size; attribute vec4 a_color;
    uniform vec2 u_resolution; varying vec4 v_color;
    void main(){ vec2 p=a_position/u_resolution*2.0-1.0; gl_Position=vec4(p.x,-p.y,0.,1.); gl_PointSize=a_size; v_color=a_color; }`;
  const fragment = `precision mediump float; varying vec4 v_color;
    void main(){ vec2 p=gl_PointCoord-.5; float d=length(p); float glow=pow(max(0.,1.-d*2.),1.8); if(glow<.02) discard; gl_FragColor=vec4(v_color.rgb*glow,v_color.a*glow); }`;

  function shader(gl, type, source) {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s;
  }
  function createCard(card, type) {
    const canvas = document.createElement("canvas");
    canvas.className = "card-webgl-preview";
    canvas.setAttribute("aria-hidden", "true");
    card.prepend(canvas);
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) { canvas.remove(); return; }
    const p = gl.createProgram(); gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vertex)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(p);
    const entry = { card, canvas, gl, type, program: p, buffer: gl.createBuffer(), visible: true, width: 0, height: 0 };
    entry.position = gl.getAttribLocation(p, "a_position"); entry.size = gl.getAttribLocation(p, "a_size"); entry.color = gl.getAttribLocation(p, "a_color"); entry.resolution = gl.getUniformLocation(p, "u_resolution");
    new ResizeObserver(() => resize(entry)).observe(card); resize(entry); cards.push(entry);
  }
  function resize(entry) {
    const rect = entry.card.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
    entry.width = Math.max(1, Math.round(rect.width * dpr)); entry.height = Math.max(1, Math.round(rect.height * dpr));
    entry.canvas.width = entry.width; entry.canvas.height = entry.height;
  }
  function point(out, x, y, size, r, g, b, a) { out.push(x, y, size, r, g, b, a); }
  function draw(entry, time) {
    const { gl, width: w, height: h, type } = entry; if (!w || !h) return;
    const t = time * 0.001, points = [];
    if (type === "moonlit") {
      // One-way upward/rightward drift; seamless wrap only occurs off-card.
      const moonProgress = (t * 0.012) % 1, mx = w * (.66 + moonProgress * .25), my = h * (.62 - moonProgress * .42);
      for (let i = 11; i >= 1; i--) point(points, mx, my, i * 16, .68, .78, 1, .012);
      point(points, mx, my, 20, .94, .96, 1, .75);
      for (let i = 0; i < 26; i++) { const x = ((i * 83.7 + t * (3 + i % 3)) % w), y = (i * 37.3) % (h * .76); const a = .10 + .23 * (Math.sin(t * 1.5 + i) + 1) * .5; point(points, x, y, 1.5 + i % 3, 1, 1, 1, a); }
      for (let i = 0; i < 34; i++) point(points, (i / 33) * w, h * (.84 + Math.sin(i * 1.7) * .025), 2, .15, .08, .16, .28);
    } else if (type === "lab") {
      for (let x = 0; x < w; x += 28) for (let y = 0; y < h; y += 28) point(points, x, y, 1.2, .28, .35, 1, .14);
      const cx = w * .82, cy = h * .52;
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, radius = h * (.16 + .11 * Math.sin(t * 1.4 + i)); point(points, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, 4, .39, .48, 1, .58); }
      point(points, cx, cy, 12 + Math.sin(t * 2) * 3, .7, .74, 1, .85);
    } else {
      for (let i = 0; i < 21; i++) { const speed = .14 + (i % 4) * .045, x = ((i * 67 + Math.sin(t + i) * 18) % w), y = h - ((t * speed * h + i * 29) % (h + 20)), fade = Math.sin(Math.min(1, y / h) * Math.PI) * .62; point(points, x, y, 3 + i % 3, i % 2 ? 1 : .98, i % 2 ? .33 : .78, i % 2 ? .5 : .15, fade); }
      for (let i = 0; i < 8; i++) point(points, w * (.15 + i * .1), h * (.74 + Math.sin(t + i) * .035), 5, .4, .55, 1, .32);
    }
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(entry.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);
    const stride = 7 * 4; gl.enableVertexAttribArray(entry.position); gl.vertexAttribPointer(entry.position, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(entry.size); gl.vertexAttribPointer(entry.size, 1, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(entry.color); gl.vertexAttribPointer(entry.color, 4, gl.FLOAT, false, stride, 12);
    gl.uniform2f(entry.resolution, w, h); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.drawArrays(gl.POINTS, 0, points.length / 7);
  }
  function setup() {
    const targets = [
      ["a[href$='moonlit-horizon.html']", "moonlit"],
      ["a[href$='feature-demos.html']", "lab"],
      ["a[href$='guided-builder.html']", "maker"],
    ];
    targets.forEach(([selector, type]) => { const card = document.querySelector(selector); if (card) createCard(card, type); });
    const observer = new IntersectionObserver(entries => entries.forEach(e => { const item = cards.find(c => c.card === e.target); if (item) item.visible = e.isIntersecting; }), { threshold: 0.01 }); cards.forEach(c => observer.observe(c.card));
    function frame(time) { if (!document.hidden && !reduceMotion.matches) cards.filter(c => c.visible).forEach(c => draw(c, time)); requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
  }
  const style = document.createElement("style");
  style.textContent = `.card-webgl-preview{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.7;mix-blend-mode:screen}.card{position:relative;overflow:hidden}.card>*:not(.card-webgl-preview){position:relative;z-index:1}.card:hover .card-webgl-preview{opacity:1}@media (prefers-reduced-motion:reduce){.card-webgl-preview{display:none}}`;
  document.head.append(style); document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", setup, { once: true }) : setup();
})();
