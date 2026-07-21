/**
 * Grand Fireworks JS
 * Photorealistic, configurable WebGL-first fireworks with a Canvas 2D fallback.
 *
 * Creator: Travis MacDonald
 * Website: http://travisandjoelyweareaperfect.fit/
 * Repository: https://github.com/travisjmac/grand-fireworks-js
 * Created: July 15, 2026
 * Version: 1.3.1
 *
 * @author Travis MacDonald
 * @version 1.3.1
 * @since 2026-07-15
 * @see http://travisandjoelyweareaperfect.fit/
 * @see https://github.com/travisjmac/grand-fireworks-js
 */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const TYPES = ['grand_peony','imperial_chrysanthemum','weeping_willow','royal_palm','diamond_ring','crossette_supreme','golden_brocade','dragon_fish','majestic_comet','cascading_horsetail','starburst','glitter_nova','crown_jewel','thunder_clap','galactic_spiral'];
  const PALETTES = [
    ['#FFD700','#FFA500','#FFE082','#FFFFFF'], ['#FF1744','#FF5252','#FF8A80','#FFFFFF'],
    ['#2962FF','#4D96FF','#89CFF0','#FFFFFF'], ['#00E676','#69F0AE','#B9F6CA','#FFFFFF'],
    ['#AA00FF','#D17FE0','#EA80FC','#FFFFFF'], ['#FF1493','#FF69B4','#FFC0CB','#FFFFFF'],
    ['#00CED1','#40E0D0','#7FFFD4','#FFFFFF'], ['#FFFFFF','#E6E6FA','#F5F5F5','#FFD700']
  ];
  const PRESETS = {
    low:    { fps:30, dprCap:1,    maxParticles:650,  maxRockets:4,  launchInterval:1100, particleScale:.72, secondary:.45 },
    medium: { fps:60, dprCap:1.25, maxParticles:1100, maxRockets:6,  launchInterval:850,  particleScale:.88, secondary:.70 },
    high:   { fps:60, dprCap:1.5,  maxParticles:1900, maxRockets:10, launchInterval:650,  particleScale:1,   secondary:1 },
    ultra:  { fps:60, dprCap:2,    maxParticles:2800, maxRockets:14, launchInterval:475,  particleScale:1.2, secondary:1.25 }
  };
  const STYLES = {
    classic:{
      visuals:{ opacity:1, trails:true, trailFade:.115, bloom:1.25, rocketExhaust:true, explosionFlashes:true, starChance:.08, groupedSalvos:true, secondaryCrackle:true },
      show:{ intensity:1, openingSalvo:6, launchInterval:null, launchSpread:.55, angleRange:14, angleStrength:1, enabledTypes:'all', palettes:'default' }
    },
    spectacle:{
      visuals:{ opacity:1, trails:true, trailFade:.18, bloom:1.8, rocketExhaust:true, explosionFlashes:true, starChance:.12, groupedSalvos:true, secondaryCrackle:true },
      show:{ intensity:1.8, openingSalvo:8, launchInterval:400, launchSpread:.7, angleRange:20, angleStrength:1.4, enabledTypes:'all', palettes:[['#FF0055','#FFCC00'],['#00F2FE','#4FACFE'],['#FFD700','#FFA500','#FFFFFF'],['#FF1744','#FF5252','#FF8A80','#FFFFFF'],['#AA00FF','#D17FE0','#EA80FC','#FFFFFF']] }
    },
    elegance:{
      visuals:{ opacity:.4, trails:true, trailFade:.07, bloom:.9, rocketExhaust:true, explosionFlashes:true, starChance:.04, groupedSalvos:false, secondaryCrackle:false },
      show:{ intensity:.5, openingSalvo:3, launchInterval:1200, launchSpread:.7, angleRange:10, angleStrength:.6, enabledTypes:['grand_peony','imperial_chrysanthemum','weeping_willow','starburst'], palettes:[['#FFFFFF','#E6E6FA','#F5F5F5','#FFD700'],['#FFD700','#FFA500','#FFE082','#FFFFFF'],['#FFE4E1','#FFF0F5','#FFD700','#FFFFFF']] }
    },
    neon:{
      visuals:{ opacity:1, trails:true, trailFade:.14, bloom:1.5, rocketExhaust:true, explosionFlashes:true, starChance:.18, groupedSalvos:true, secondaryCrackle:true },
      show:{ intensity:1.5, openingSalvo:7, launchInterval:500, launchSpread:.5, angleRange:18, angleStrength:1.2, enabledTypes:['starburst','crossette_supreme','glitter_nova','galactic_spiral','thunder_clap'], palettes:[['#00F2FE','#4FACFE','#FFFFFF'],['#FF0055','#FF69B4','#FFC0CB','#FFFFFF'],['#00FF7F','#7FFF00','#FFFFFF'],['#AA00FF','#D17FE0','#EA80FC','#FFFFFF']] }
    },
    ember:{
      visuals:{ opacity:.35, trails:true, trailFade:.08, bloom:1.7, rocketExhaust:true, explosionFlashes:false, starChance:.03, groupedSalvos:false, secondaryCrackle:false },
      show:{ intensity:.4, openingSalvo:4, launchInterval:1100, launchSpread:.65, angleRange:12, angleStrength:.8, enabledTypes:['weeping_willow','cascading_horsetail','golden_brocade','imperial_chrysanthemum','royal_palm'], palettes:[['#FF4500','#FFD700'],['#DC143C','#FF6347','#FFFFFF'],['#8B0000','#FF4500','#FFD700','#FFFFFF'],['#FF6347','#FF7F50','#FFE4E1'],['#DAA520','#FFD700','#FFFFFF']] }
    }
  };
  const DEFAULTS = {
    container: null, mode:'fullscreen', placement:'overlay', clip:true, zIndex:9999,
    autoStart:false, baseStyle:'classic', duration:0, durationMode:'graceful', maxFinishTime:5000,
    background:false,
    transition:{ fadeIn:500, fadeOut:400, easing:'ease-out', clearOnHide:true },
    renderer:{ preferred:'auto', fallback:'canvas2d', preserveDrawingBuffer:'auto' },
    visuals:{ opacity:1, trails:true, trailFade:.115, bloom:1.25, rocketExhaust:true, explosionFlashes:true, starChance:.08, groupedSalvos:true, secondaryCrackle:true },
    performance:{ preset:'medium', adaptive:true, pauseWhenHidden:true, pauseWhenOffscreen:true, respectReducedMotion:true },
    show:{ intensity:1, openingSalvo:6, maxRockets:null, maxParticles:null, launchInterval:null, launchSpread:.55, angleRange:14, angleStrength:1, textRocketAngle:0, enabledTypes:'all', palettes:'default' },
    finale:{ enabled:false, type:'super-grand-finale', triggers:['stop','duration'], trails:10, trailFlight:1100, burstScale:1, maxWaitBeforeLaunch:3000, particleScale:1, finishDelay:800, maxDuration:9000 },
    textFirework:{ enabled:true, renderMode:'hybrid', maxCharacters:72, maxCharactersPerLine:24, maxLines:3, overflow:'ellipsis', maxWidth:.82, verticalPosition:.42, lineHeight:1.15, fontFamily:'system-ui, sans-serif', fontWeight:800, fontSize:92, particleSpacing:4, particleSize:2.5, colors:['#FFFFFF','#FFD700','#FF69B4'], revealDuration:250, holdDuration:1400, dissolveDuration:900, dissolveStyle:'sparkle', fallDuration:3200, gravity:.025, textGlow:1, shimmer:true, synchronizeExplosions:true, exclusive:true }
  };

  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const merge = (a,b) => { const out={...a}; Object.keys(b||{}).forEach(k=>{ out[k]=a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k])&&typeof b[k]==='object'&&!Array.isArray(b[k])?merge(a[k],b[k]):b[k]; }); return out; };
  const hex = value => { const h=value.replace('#',''); const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; };

  // Creates an array of N interpolated hex colors between two hex values
  function createColorRamp(hex1, hex2, steps = 4) {
    const parse = h => {
      const clean = h.replace('#', '');
      const n = parseInt(clean.length === 3 ? clean.split('').map(x => x + x).join('') : clean, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    const [r1, g1, b1] = parse(hex1);
    const [r2, g2, b2] = parse(hex2);
    const ramp = [];

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.round(r1 + (r2 - r1) * t).toString(16).padStart(2, '0');
      const g = Math.round(g1 + (g2 - g1) * t).toString(16).padStart(2, '0');
      const b = Math.round(b1 + (b2 - b1) * t).toString(16).padStart(2, '0');
      ramp.push(`#${r}${g}${b}`);
    }
    return ramp;
  }

  // Guarantees any array of 1, 2, 3, or 4+ colors normalizes into exactly 4 colors
  function normalizePalette(colors) {
    if (!Array.isArray(colors) || colors.length === 0) return PALETTES[0];

    // 1 color -> Ramp from target color to White
    if (colors.length === 1) {
      return createColorRamp(colors[0], '#FFFFFF', 4);
    }

    // 2 colors (Pair) -> 4-step interpolated ramp between color 1 and color 2
    if (colors.length === 2) {
      return createColorRamp(colors[0], colors[1], 4);
    }

    // 3 colors -> Add white highlight for core sparkle
    if (colors.length === 3) {
      return [...colors, '#FFFFFF'];
    }

    // 4 or more colors -> Slice to 4
    return colors.slice(0, 4);
  }

  const cssTarget = value => typeof value==='string' ? document.querySelector(value) : value;

  class WebGLRenderer {
    constructor(canvas,onLost,options={}) {
      this.canvas=canvas;
      const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:Boolean(options.preserveDrawingBuffer),powerPreference:'high-performance'});
      if(!gl) throw new Error('WebGL 2 unavailable');
      this.gl=gl; this.onLost=onLost; this.capacity=0;
      this._lost=e=>{ e.preventDefault(); onLost('webgl-context-lost'); };
      canvas.addEventListener('webglcontextlost',this._lost,false);
      this.program=this._program(`#version 300 es
        in vec2 a_position; in float a_size; in vec4 a_color; in float a_star;
        uniform vec2 u_resolution; out vec4 v_color; out float v_star;
        void main(){ vec2 z=a_position/u_resolution; vec2 clip=z*2.0-1.0; gl_Position=vec4(clip.x,-clip.y,0,1); gl_PointSize=a_size; v_color=a_color; v_star=a_star; }`,
        `#version 300 es
        precision mediump float; in vec4 v_color; in float v_star; out vec4 outColor;
        void main(){ vec2 q=(gl_PointCoord-vec2(.5))*2.0; float d=length(q); float halo=pow(max(0.0,1.0-d),2.1); float core=smoothstep(.25,0.0,d); float ray=max(smoothstep(.10,0.0,abs(q.x)),smoothstep(.10,0.0,abs(q.y)))*(1.0-d)*v_star; float a=(halo*.72+core+ray*.8)*v_color.a; if(a<.012)discard; outColor=vec4(v_color.rgb*a,a); }`);
      this.fadeProgram=this._program(`#version 300 es
        void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0,1);}`,
        `#version 300 es
        precision mediump float; uniform float u_fade; out vec4 outColor; void main(){outColor=vec4(0,0,0,u_fade);}`);
      this.fadeUniform=gl.getUniformLocation(this.fadeProgram,'u_fade');
      this.buffer=gl.createBuffer(); this.stride=8; this.data=new Float32Array(0);
      this.aPos=gl.getAttribLocation(this.program,'a_position'); this.aSize=gl.getAttribLocation(this.program,'a_size'); this.aColor=gl.getAttribLocation(this.program,'a_color'); this.aStar=gl.getAttribLocation(this.program,'a_star'); this.uRes=gl.getUniformLocation(this.program,'u_resolution');
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST);
    }
    _shader(type,src){const g=this.gl,s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(s));return s;}
    _program(v,f){const g=this.gl,p=g.createProgram();g.attachShader(p,this._shader(g.VERTEX_SHADER,v));g.attachShader(p,this._shader(g.FRAGMENT_SHADER,f));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(p));return p;}
    resize(w,h,dpr){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.canvas.style.width=w+'px';this.canvas.style.height=h+'px';this.gl.viewport(0,0,this.canvas.width,this.canvas.height);this.dpr=dpr;}
    render(items,w,h,trailFade){const g=this.gl;if(trailFade>=1){g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);}else{g.useProgram(this.fadeProgram);g.uniform1f(this.fadeUniform,clamp(trailFade,0,1));g.blendFunc(g.ZERO,g.ONE_MINUS_SRC_ALPHA);g.drawArrays(g.TRIANGLES,0,3);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);}const need=items.length*this.stride;if(this.data.length<need)this.data=new Float32Array(Math.max(need,this.data.length*2,256));let o=0;for(const p of items){this.data[o++]=p.x*this.dpr;this.data[o++]=p.y*this.dpr;this.data[o++]=clamp((p.flash?p.size:p.size*6.2)*this.dpr,2,256);this.data[o++]=p.r;this.data[o++]=p.g;this.data[o++]=p.b;this.data[o++]=clamp(p.alpha,0,1);this.data[o++]=p.star?1:0;}g.useProgram(this.program);g.uniform2f(this.uRes,w*this.dpr,h*this.dpr);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,this.data.subarray(0,o),g.DYNAMIC_DRAW);const s=this.stride*4;g.enableVertexAttribArray(this.aPos);g.vertexAttribPointer(this.aPos,2,g.FLOAT,false,s,0);g.enableVertexAttribArray(this.aSize);g.vertexAttribPointer(this.aSize,1,g.FLOAT,false,s,8);g.enableVertexAttribArray(this.aColor);g.vertexAttribPointer(this.aColor,4,g.FLOAT,false,s,12);g.enableVertexAttribArray(this.aStar);g.vertexAttribPointer(this.aStar,1,g.FLOAT,false,s,28);g.drawArrays(g.POINTS,0,items.length);}
    clear(){const g=this.gl;g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);}
    destroy(){this.canvas.removeEventListener('webglcontextlost',this._lost);const g=this.gl;g.deleteBuffer(this.buffer);g.deleteProgram(this.program);g.deleteProgram(this.fadeProgram);}
  }

  class CanvasRenderer {
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});if(!this.ctx)throw new Error('Canvas 2D unavailable');this.sprites=new Map();}
    resize(w,h,dpr){this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);this.canvas.style.width=w+'px';this.canvas.style.height=h+'px';this.dpr=dpr;this.ctx.setTransform(dpr,0,0,dpr,0,0);}
    _sprite(r,g,b,star=false){const rgb=[r,g,b].map(x=>Math.round(x*255)),key=rgb.join(',')+(star?'s':'g');if(this.sprites.has(key))return this.sprites.get(key);const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32),color=`rgb(${rgb.join(',')})`;gr.addColorStop(0,'white');gr.addColorStop(.10,'white');gr.addColorStop(.24,color);gr.addColorStop(.56,`rgba(${rgb.join(',')},.42)`);gr.addColorStop(1,`rgba(${rgb.join(',')},0)`);x.fillStyle=gr;x.fillRect(0,0,64,64);if(star){x.globalCompositeOperation='lighter';x.fillStyle='white';x.beginPath();for(let i=0;i<10;i++){const radius=i%2?5:18,a=i*Math.PI/5-Math.PI/2,px=32+Math.cos(a)*radius,py=32+Math.sin(a)*radius;i?x.lineTo(px,py):x.moveTo(px,py);}x.closePath();x.fill();}this.sprites.set(key,c);return c;}
    render(items,w,h,fade){const x=this.ctx;x.setTransform(this.dpr,0,0,this.dpr,0,0);if(fade>=1)x.clearRect(0,0,w,h);else{x.save();x.globalCompositeOperation='destination-out';x.globalAlpha=clamp(fade,0,1);x.fillRect(0,0,w,h);x.restore();}x.globalCompositeOperation='lighter';for(const p of items){const pulse=p.sparkle&&Math.sin(performance.now()*.026+(p.phase||0))>.72?1.55:1,z=p.flash?p.size:Math.max(4.5,p.size*5.2*pulse),s=this._sprite(p.r,p.g,p.b,Boolean(p.star));x.globalAlpha=clamp(p.alpha,0,1);x.drawImage(s,p.x-z,p.y-z,z*2,z*2);}x.globalAlpha=1;x.globalCompositeOperation='source-over';}
    clear(){this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);}
    destroy(){this.sprites.clear();}
  }

  class GrandFireworks extends EventTarget {
    constructor(options={}) {
      super(); this.userOptions=options; this.options=this._resolve(options); this.state='idle'; this.rockets=[];this.pendingRockets=[];this.particles=[];this.pool=[];this.flashes=[];this.textBlocks=[];this.quality=1;this.contextLossCount=0;this.finalePlayed=false;this.lastLaunch=0;this.elapsed=0;this.raf=0;this.stopPromise=null;this.resizePending=true;this.fps=0;this.nextAdapt=0;
      this.container=cssTarget(this.options.container)||document.body;this._buildLayers();this._initRenderer();this._bind();if(this.options.autoStart)requestAnimationFrame(()=>this.start());
    }
    _resolve(input){const styleName=input.baseStyle||'classic',style=STYLES[styleName]||STYLES.classic;let o=merge(merge(DEFAULTS,style),input);const name=(o.performance&&o.performance.preset)||'medium',p=PRESETS[name]||PRESETS.medium;o.performance=merge({preset:name,adaptive:true,pauseWhenHidden:true,pauseWhenOffscreen:true,respectReducedMotion:true},o.performance||{});o.visuals.trailFade=clamp(Number(o.visuals.trailFade)||.115,.03,1);o.visuals.bloom=clamp(Number(o.visuals.bloom)||1,.5,2);o.visuals.starChance=clamp(Number(o.visuals.starChance)||0,0,.3);o.renderer.preserveDrawingBuffer=o.renderer.preserveDrawingBuffer==='auto'?(o.mode==='contained'||Boolean(o.visuals.trails)):Boolean(o.renderer.preserveDrawingBuffer);o.show.maxParticles=clamp(Number(o.show.maxParticles||p.maxParticles),100,5000);o.show.maxRockets=clamp(Number(o.show.maxRockets||p.maxRockets),1,25);o.show.launchInterval=Number(o.show.launchInterval||p.launchInterval);o.show.launchSpread=clamp(Number(o.show.launchSpread),0,1);o.show.angleRange=clamp(Number(o.show.angleRange),0,45);o.show.angleStrength=clamp(Number(o.show.angleStrength),0,3);o.show.textRocketAngle=clamp(Number(o.show.textRocketAngle),-45,45);o.performance.fps=p.fps;o.performance.dprCap=p.dprCap;o.performance.particleScale=p.particleScale;o.performance.secondary=p.secondary;o.duration=Math.max(0,Number(o.duration)||0);return o;}
    _buildLayers(){const o=this.options,c=this.container;this.root=document.createElement('div');this.root.className='grand-fireworks-root';Object.assign(this.root.style,{position:o.mode==='fullscreen'?'fixed':'absolute',inset:'0',width:'100%',height:'100%',overflow:o.clip?'hidden':'visible',pointerEvents:'none',isolation:'isolate',zIndex:String(o.placement==='background'?0:o.zIndex),opacity:String(clamp(Number(o.visuals.opacity ?? 1), 0, 1))});if(o.mode==='contained'&&getComputedStyle(c).position==='static'){this.oldPosition=c.style.position;c.style.position='relative';}this.backdrop=document.createElement('div');Object.assign(this.backdrop.style,{position:'absolute',inset:'0',opacity:'0',transition:`opacity ${o.transition.fadeIn}ms ${o.transition.easing}`});if(o.background){this.backdrop.style.background=o.background.value||'';this.backdrop.style.opacity='0';if(o.background.className)this.backdrop.className=o.background.className;}this.canvas=this._canvas();this.textCanvas=this._canvas();this.textCanvas.className='grand-fireworks-text-layer';this.textCanvas.style.display='none';this.textCtx=this.textCanvas.getContext('2d',{alpha:true,desynchronized:true});this.root.append(this.backdrop,this.textCanvas,this.canvas);if(o.placement==='background')c.insertBefore(this.root,c.firstChild);else c.appendChild(this.root);}
    _canvas(){const c=document.createElement('canvas');Object.assign(c.style,{position:'absolute',inset:'0',display:'block',width:'100%',height:'100%',pointerEvents:'none'});c.setAttribute('aria-hidden','true');return c;}
    _initRenderer(force){let pref=force||((this.options.renderer||{}).preferred||'auto');if(pref==='auto'&&this.options.mode==='contained')pref='canvas2d';try{if(pref!=='canvas2d'){this.renderer=new WebGLRenderer(this.canvas,r=>this._fallback(r),this.options.renderer);this.rendererType='webgl2';return;}}catch(e){}this.renderer=new CanvasRenderer(this.canvas);this.rendererType='canvas2d';}
    _fallback(reason){if(this.rendererType==='canvas2d')return;this.contextLossCount++;this.renderer.destroy();const old=this.canvas;this.canvas=this._canvas();old.replaceWith(this.canvas);this.renderer=new CanvasRenderer(this.canvas);this.rendererType='canvas2d';this.resizePending=true;this.dispatchEvent(new CustomEvent('rendererchange',{detail:{from:'webgl2',to:'canvas2d',reason}}));}
    _bind(){this.onResize=()=>this.resizePending=true;this.onVisibility=()=>{if(!this.options.performance.pauseWhenHidden)return;if(document.hidden)this.pause(true);else this.resume(true);};window.addEventListener('resize',this.onResize,{passive:true});document.addEventListener('visibilitychange',this.onVisibility);if(this.options.mode==='contained'&&global.ResizeObserver){this.resizeObserver=new ResizeObserver(this.onResize);this.resizeObserver.observe(this.container);}}
    start(run={}){if(this.state==='running')return this;clearTimeout(this.fadeTimer);this.runtimeDuration=run.duration===undefined?this.options.duration:Math.max(0,Number(run.duration)||0);this.elapsed=0;this.accepting=true;this.finalePlayed=false;this.state='running';this.lastTime=performance.now();this.lastLaunch=this.lastTime;this.root.style.display='block';this.root.style.opacity='1';requestAnimationFrame(()=>{if(this.options.background)this.backdrop.style.opacity=String(this.options.background.opacity===undefined?1:this.options.background.opacity);});for(let i=0;i<this.options.show.openingSalvo;i++)this._queueRocket(this.lastTime+i*180);this._loop();this.dispatchEvent(new Event('start'));return this;}
    pause(internal=false){if(!['running','finishing','finale'].includes(this.state))return this;this.pausedState=this.state;this.state='paused';cancelAnimationFrame(this.raf);this.raf=0;if(!internal)this.dispatchEvent(new Event('pause'));return this;}
    resume(internal=false){if(this.state!=='paused')return this;this.state=this.pausedState||'running';this.lastTime=performance.now();this._loop();if(!internal)this.dispatchEvent(new Event('resume'));return this;}
    stop(options={}){if(this.state==='stopped'||this.state==='idle')return Promise.resolve(this);if(this.stopPromise)return this.stopPromise;if(options.immediate){this.accepting=false;return this._fade(true);}this.accepting=false;this.state='finishing';this.finishStarted=performance.now();this.wantFinale=options.finale===undefined?this._finaleTriggered('stop'):Boolean(options.finale);this.stopPromise=new Promise(resolve=>this.stopResolve=resolve);if(!this.raf){this.lastTime=performance.now();this._loop();}return this.stopPromise;}
    _finaleTriggered(trigger){return this.options.finale.enabled&&(this.options.finale.triggers||[]).includes(trigger)&&!this.finalePlayed;}
    finalize(){return this.stop({finale:true});}
    clear(){this.rockets.length=this.pendingRockets.length=this.particles.length=this.flashes.length=this.textBlocks.length=0;this.renderer.clear();if(this.textCtx)this.textCtx.clearRect(0,0,this.textCanvas.width,this.textCanvas.height);return this;}
    destroy(){cancelAnimationFrame(this.raf);clearTimeout(this.fadeTimer);window.removeEventListener('resize',this.onResize);document.removeEventListener('visibilitychange',this.onVisibility);if(this.resizeObserver)this.resizeObserver.disconnect();this.renderer.destroy();this.root.remove();if(this.oldPosition!==undefined)this.container.style.position=this.oldPosition;this.state='destroyed';}
    _activateManual(state='manual'){if(this.state==='destroyed')return false;const inactive=['idle','stopped','paused','fading'].includes(this.state);if(!inactive)return false;clearTimeout(this.fadeTimer);cancelAnimationFrame(this.raf);this.raf=0;this.stopPromise=null;this.stopResolve=null;this.accepting=false;this.state=state;this.lastTime=performance.now();this.root.style.display='block';this.root.style.opacity='1';if(this.options.background)this.backdrop.style.opacity=String(this.options.background.opacity===undefined?1:this.options.background.opacity);this.resizePending=true;this._loop();return true;}
    launch(options={}){this._activateManual('manual');if(!['running','finishing','manual'].includes(this.state))return this;this._createRocket(options);return this;}
    launchFinale(options={}){const standalone=this._activateManual('finale');this.finalePlayed=true;this.finaleStarted=performance.now();this.pendingRockets.length=0;if(this.rockets.length>=this.options.show.maxRockets)this.rockets.length=0;this._createRocket({type:'grand-finale-carrier',x:.5,burstHeight:.24,finale:true,colors:['#FFFFFF','#FFD700','#00FFFF']});if(standalone||options.stopAfter!==false){this.accepting=false;this.state='finale';}this.dispatchEvent(new CustomEvent('finalestage',{detail:{stage:'carrier'}}));return this;}
    launchText(text,overrides={}){const cfg=merge(this.options.textFirework,overrides);if(!cfg.enabled||!text)return Promise.resolve([]);this._activateManual('manual');let value=String(text).trim();if(value.length>cfg.maxCharacters)value=value.slice(0,cfg.maxCharacters-1)+'…';const lines=this._wrapText(value,cfg);if(cfg.exclusive)this.accepting=false;const now=performance.now(),plans=this._textPlans(lines,cfg),sync=now+1800,total=plans.reduce((n,p)=>n+p.points.length,0),reserved=Math.max(1,Math.floor(this.options.show.maxParticles*.9)),stride=Math.max(1,Math.ceil(total/reserved));if(stride>1)for(const plan of plans)plan.points=plan.points.filter((_,i)=>i%stride===0);const needed=plans.reduce((n,p)=>n+p.points.length,0),keep=Math.max(0,this.options.show.maxParticles-needed);while(this.particles.length>keep){const removed=this.particles.shift();if(removed)this.pool.push(removed);}this.textReservedUntil=sync+cfg.revealDuration+cfg.holdDuration+cfg.dissolveDuration+cfg.fallDuration;for(const plan of plans){const travel=(this.height+30-plan.y)/.62;this.pendingRockets.push({launchAt:sync-travel,textPlan:plan,type:'text',x:this.width/2,y:this.height+25,burstY:plan.y,syncAt:sync,colors:cfg.colors,cfg});}if(cfg.exclusive)this.textExclusiveUntil=this.textReservedUntil;this.dispatchEvent(new CustomEvent('textlaunch',{detail:{text:value,lines,particles:needed}}));return Promise.resolve(lines);}
    _wrapText(text,cfg){const words=text.split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(next.length<=cfg.maxCharactersPerLine)line=next;else{if(line)lines.push(line);line=word;}if(lines.length===cfg.maxLines)break;}if(lines.length<cfg.maxLines&&line)lines.push(line);const used=lines.join(' ').length;if(used<text.length&&lines.length){if(cfg.overflow==='ellipsis')lines[lines.length-1]=lines[lines.length-1].replace(/[.…]*$/,'')+'…';}return lines.slice(0,cfg.maxLines);}
    _textPlans(lines,cfg){const plans=[],block=cfg.fontSize*cfg.lineHeight*lines.length,top=this.height*cfg.verticalPosition-block/2;lines.forEach((line,i)=>{const off=document.createElement('canvas'),x=off.getContext('2d');off.width=Math.max(280,Math.floor(this.width*cfg.maxWidth));off.height=Math.ceil(cfg.fontSize*1.45);x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.font=`${cfg.fontWeight} ${cfg.fontSize}px ${cfg.fontFamily}`;x.fillText(line,off.width/2,off.height/2,off.width-8);const data=x.getImageData(0,0,off.width,off.height).data,points=[],step=Math.max(2,Math.round(cfg.particleSpacing/this.options.performance.particleScale));for(let py=0;py<off.height;py+=step)for(let px=0;px<off.width;px+=step)if(data[(py*off.width+px)*4+3]>100)points.push({x:this.width/2-off.width/2+px,y:top+i*cfg.fontSize*cfg.lineHeight+py});plans.push({line,points,y:top+i*cfg.fontSize*cfg.lineHeight+off.height/2});});return plans;}
    _queueRocket(time){this.pendingRockets.push({launchAt:time});}
    _createRocket(o={}){if(this.rockets.length>=this.options.show.maxRockets)return;const show=this.options.show,colors=o.colors||this._palette(),type=o.type||this._type(),x=o.x===undefined?.5+(Math.random()-.5)*show.launchSpread:o.x,burstY=this.height*(o.burstHeight===undefined?.12+Math.random()*.38:o.burstHeight),startY=this.height+24,remaining=o.syncAt?Math.max(.2,(o.syncAt-performance.now())/1000):0,vy=o.syncAt?-(startY-burstY)/remaining:-(560+Math.random()*180),range=o.finale?18:show.angleRange,angle=o.angle===undefined?(o.syncAt?show.textRocketAngle:(Math.random()*2-1)*range):Number(o.angle)||0,vx=Math.abs(vy)*Math.tan(angle*Math.PI/180)*show.angleStrength;this.rockets.push({x:x<=1?this.width*x:x,y:startY,vx,vy,burstY,type,colors,finale:o.finale,textPlan:o.textPlan,cfg:o.cfg,angle,sparkClock:0});}
    _type(){const e=this.options.show.enabledTypes;const list=e==='all'?TYPES:e;return list[Math.floor(Math.random()*list.length)];}
    _palette() {
      const p = this.options.show.palettes;

      if (p === 'default' || !p) {
        return PALETTES[Math.floor(Math.random() * PALETTES.length)];
      }

      if (typeof p === 'function') {
        return normalizePalette(p());
      }

      if (Array.isArray(p) && p.length > 0) {
        const chosen = p[Math.floor(Math.random() * p.length)];

        if (Array.isArray(chosen)) {
          return normalizePalette(chosen);
        }
      }

      return PALETTES[0];
    }
    _loop(){if(this.raf||['stopped','idle','paused','destroyed'].includes(this.state))return;const frame=now=>{this.raf=0;if(['stopped','paused','destroyed'].includes(this.state))return;if(this.resizePending)this._resize();const dt=Math.min(.05,(now-this.lastTime)/1000||.016);this.lastTime=now;this.fps+=((1/dt)-this.fps)*.05;if(this.state==='running'){this.elapsed+=dt*1000;if(this.runtimeDuration>0&&this.elapsed>=this.runtimeDuration){this.accepting=false;if(this.options.durationMode==='strict'){this._fade(false);}else{this.state='finishing';this.finishStarted=now;this.wantFinale=this._finaleTriggered('duration');this.stopPromise=new Promise(resolve=>this.stopResolve=resolve);}}}
        if(this.options.performance.adaptive&&now>=this.nextAdapt){const target=this.options.performance.fps;this.nextAdapt=now+2000;if(this.fps<target*.78)this.quality=Math.max(.6,this.quality-.1);else if(this.fps>target*.93)this.quality=Math.min(1,this.quality+.05);}
        this._update(now,dt);const trailFade=this.options.visuals.trails?1-Math.pow(1-this.options.visuals.trailFade,dt*60):1;this.renderer.render(this._drawItems(now),this.width,this.height,trailFade);this._drawText(now);this._finish(now);this.raf=requestAnimationFrame(frame);};this.raf=requestAnimationFrame(frame);}
    _resize(){this.resizePending=false;const r=this.options.mode==='fullscreen'?{width:innerWidth,height:innerHeight}:this.container.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(devicePixelRatio||1,this.options.performance.dprCap);this.renderer.resize(this.width,this.height,this.dpr);this.textCanvas.width=Math.round(this.width*this.dpr);this.textCanvas.height=Math.round(this.height*this.dpr);this.textCanvas.style.width=this.width+'px';this.textCanvas.style.height=this.height+'px';this.textCtx.setTransform(this.dpr,0,0,this.dpr,0,0);}
    _update(now,dt){if(this.state==='running'&&this.textExclusiveUntil&&now>=this.textExclusiveUntil){this.textExclusiveUntil=0;this.accepting=true;}for(let i=this.pendingRockets.length-1;i>=0;i--){const q=this.pendingRockets[i];if(now>=q.launchAt){this.pendingRockets.splice(i,1);this._createRocket(q.textPlan?{type:'text',x:.5,burstHeight:q.textPlan.y/this.height,colors:q.colors,textPlan:q.textPlan,cfg:q.cfg,syncAt:q.syncAt}:{});}}
      if(this.accepting&&now-this.lastLaunch>this.options.show.launchInterval/this.options.show.intensity){const load=this.particles.length/Math.max(1,this.options.show.maxParticles*this.quality),count=this.options.visuals.groupedSalvos&&load<.58?1+Math.floor(Math.random()*3):1;for(let i=0;i<count;i++)this._createRocket();if(this.options.visuals.groupedSalvos&&load<.48&&Math.random()<.5){this._queueRocket(now+300+Math.random()*450);if(Math.random()<.45)this._queueRocket(now+480+Math.random()*500);}this.lastLaunch=now;}
      for(let i=this.rockets.length-1;i>=0;i--){const r=this.rockets[i];r.x+=r.vx*dt;r.y+=r.vy*dt;r.vy+=(r.satellite?28:45)*dt;r.sparkClock+=dt;if(this.options.visuals.rocketExhaust&&r.type!=='text'&&r.sparkClock>=(r.satellite?.018:.032)){r.sparkClock=0;this._spawn({x:r.x+(Math.random()-.5)*4,y:r.y+(r.satellite?0:6),vx:-r.vx*.002+(Math.random()-.5)*.8,vy:-r.vy*.002+1+Math.random()*2,color:r.colors[0],size:(r.satellite?1.3:.8)+Math.random()*1.8,life:520+Math.random()*480,gravity:.045,friction:.965,sparkle:true,star:r.satellite&&Math.random()<.12,exhaust:true});}if((r.satellite&&now>=r.detonateAt)||(!r.satellite&&r.y<=r.burstY)){this._explode(r,now);this.rockets.splice(i,1);}}
      for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i],age=now-p.birth;if(p.crackleDelay&&!p.crackled&&age>=p.crackleDelay){p.crackled=true;for(let n=0;n<6;n++){const a=Math.random()*TAU,s=.4+Math.random()*2;this._spawn({x:p.x,y:p.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color:'#FFFFFF',size:.5+Math.random(),life:280+Math.random()*420,gravity:.06,friction:.94,sparkle:true});}}if(p.text&&p.hybrid){if(now<p.releaseAt){p.x=p.tx;p.y=p.ty;p.alpha=0;}else{const released=now-p.releaseAt;p.vy+=p.gravity*dt*60;p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.alpha=clamp(1-released/p.fall,0,1)*(p.twinkle?.55+.45*Math.sin(p.phase+age*.02):1);}}else if(p.text){if(age<p.assemble){const t=1-Math.pow(1-age/p.assemble,3);p.x=p.sx+(p.tx-p.sx)*t+Math.sin(p.phase+age*.02)*(1-t)*20;p.y=p.sy+(p.ty-p.sy)*t+Math.cos(p.phase+age*.017)*(1-t)*20;}else if(age<p.assemble+p.hold){p.x=p.tx+Math.sin(p.phase+age*.012)*1.2;p.y=p.ty+Math.cos(p.phase+age*.01)*1.2;}else{p.vy+=p.gravity*dt*60;p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;}p.alpha=clamp(1-age/p.life,0,1)*(p.twinkle?.55+.45*Math.sin(p.phase+age*.02):1);}else{let gravity=p.gravity,friction=p.friction;if(p.type==='willow'){gravity*=.2;friction=.997;}else if(p.type==='palm'){gravity*=.6;friction=.995;}else if(p.type==='horsetail'){gravity*=1.5;friction=.98;}else if(p.type==='fish'){p.vx+=Math.sin(now*.01+p.x*.01)*.3*dt*60;p.vy+=Math.cos(now*.01+p.y*.01)*.3*dt*60;}else if(p.type==='spiral'){const dx=p.centerX-p.x,dy=p.centerY-p.y,d=1/(Math.hypot(dx,dy)||1);p.vx+=dx*d*.05*dt*60;p.vy+=dy*d*.05*dt*60;}p.vy+=gravity*dt*60;p.vx*=Math.pow(friction,dt*60);p.vy*=Math.pow(friction,dt*60);p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.alpha=clamp(1-age/p.life,0,1)*(p.twinkle?.5+.5*Math.sin(p.phase+age*.02):1);}if(age>=p.life||p.y>this.height+120||p.x<-120||p.x>this.width+120){this.pool.push(p);this.particles.splice(i,1);}}
      for(let i=this.flashes.length-1;i>=0;i--)if(now-this.flashes[i].birth>=this.flashes[i].life)this.flashes.splice(i,1);
    }
    _spawn(o){const textPriority=Boolean(o.text),limit=textPriority?this.options.show.maxParticles:this.options.show.maxParticles*this.quality;if(!textPriority&&this.textReservedUntil&&performance.now()<this.textReservedUntil)return false;if(this.particles.length>=limit)return false;const p=this.pool.pop()||{};Object.assign(p,o);const c=hex(o.color||'#fff');p.r=c[0];p.g=c[1];p.b=c[2];p.birth=o.birth||performance.now();p.alpha=1;p.phase=Math.random()*TAU;p.friction=o.friction||.985;p.gravity=o.gravity===undefined?.12:o.gravity;p.life=o.life||2200;p.size=(o.size||2)*this.options.performance.particleScale*this.options.visuals.bloom;p.text=Boolean(o.text);p.hybrid=Boolean(o.hybrid);p.twinkle=Boolean(o.twinkle);p.sparkle=Boolean(o.sparkle);p.star=o.star===undefined?((o.size||2)>3&&Math.random()<this.options.visuals.starChance):Boolean(o.star);p.type=o.type||'normal';p.crackled=false;p.crackleDelay=o.crackleDelay||0;this.particles.push(p);return true;}
    _burst(r,count,min,max,opts={}){count=Math.max(1,Math.floor(count*this.options.performance.secondary));for(let i=0;i<count;i++){const a=opts.randomAngles?Math.random()*TAU:i/count*TAU+(Math.random()-.5)*(opts.jitter===undefined?.16:opts.jitter),s=min+Math.random()*(max-min);if(!this._spawn({x:r.x,y:r.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s*(opts.yScale===undefined?1:opts.yScale)+(opts.yBias||0),color:r.colors[i%r.colors.length],size:(opts.minSize||opts.size||1.2)+Math.random()*((opts.maxSize||4)-(opts.minSize||opts.size||1.2)),life:opts.life||2200,gravity:opts.gravity,friction:opts.friction,twinkle:opts.twinkle,sparkle:opts.sparkle,star:opts.star,type:opts.type,centerX:r.x,centerY:r.y,crackleDelay:opts.crackle?700+Math.random()*900:0}))break;}}
    _flash(r,now,size=130){if(!this.options.visuals.explosionFlashes)return;const c=hex(r.colors[0]);this.flashes.push({x:r.x,y:r.y,r:c[0],g:c[1],b:c[2],size:size*this.options.visuals.bloom,birth:now,life:420,alpha:.34,flash:true,star:true});}
    _crossette(r){const arms=Math.max(8,Math.floor(28*this.options.performance.secondary));for(let arm=0;arm<arms;arm++){const base=arm*TAU/arms,speed=4+Math.random()*6;for(let split=0;split<6;split++){const a=base+(split-2.5)*.12+(Math.random()-.5)*.12;if(!this._spawn({x:r.x,y:r.y,vx:Math.cos(a)*speed*(.55+Math.random()*.45),vy:Math.sin(a)*speed*(.55+Math.random()*.45),color:r.colors[(arm+split)%r.colors.length],size:1.2+Math.random()*3.8,life:1500+Math.random()*900,gravity:.11,friction:.985,sparkle:true,crackleDelay:this.options.visuals.secondaryCrackle?750+Math.random()*650:0}))return;}}}
    _starburst(r){const arms=8+Math.floor(Math.random()*4),per=Math.max(10,Math.floor(38*this.options.performance.secondary));for(let arm=0;arm<arms;arm++){const base=arm*TAU/arms;for(let i=0;i<per;i++){const speed=i/per*10+Math.random()*2.5,a=base+(Math.random()-.5)*.22;if(!this._spawn({x:r.x,y:r.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,color:r.colors[i%r.colors.length],size:1.2+Math.random()*3.2,life:1800+Math.random()*1200,gravity:.1,friction:.985,star:i%13===0}))return;}}}
    _crown(r){const per=Math.max(10,Math.floor(32*this.options.performance.secondary));for(let point=0;point<5;point++){const base=point*TAU/5-Math.PI/2;for(let i=0;i<per;i++){const a=base+(Math.random()-.5)*.38,s=4+Math.random()*5;if(!this._spawn({x:r.x,y:r.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color:r.colors[point%r.colors.length],size:1.8+Math.random()*3.4,life:2100+Math.random()*1300,gravity:.09,friction:.987,twinkle:true,star:i%11===0}))return;}}this._burst({...r,colors:['#FFFFFF']},24,.3,3,{life:900,twinkle:true,star:true,randomAngles:true});}
    _spiral(r){const per=Math.max(20,Math.floor(74*this.options.performance.secondary));for(let spiral=0;spiral<4;spiral++){const offset=spiral*TAU/4;for(let i=0;i<per;i++){const a=i/per*Math.PI*4+offset,s=i/per*8+1;if(!this._spawn({x:r.x,y:r.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color:r.colors[i%r.colors.length],size:1.2+Math.random()*3.3,life:2300+Math.random()*1200,gravity:.04,friction:.993,type:'spiral',centerX:r.x,centerY:r.y,twinkle:i%7===0}))return;}}}
    _launchFinaleTrails(r,now){const cfg=this.options.finale,count=clamp(Math.round(cfg.trails||10),3,20),flight=Math.max(500,Number(cfg.trailFlight)||1100);for(let i=0;i<count;i++){const a=-Math.PI/2+i/count*TAU+(Math.random()-.5)*.08,s=155+Math.random()*95,colors=PALETTES[i%PALETTES.length];this.rockets.push({x:r.x,y:r.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,type:'grand-finale-burst',colors,finale:true,satellite:true,detonateAt:now+flight*(.84+Math.random()*.3),sparkClock:0,angle:a});}this.dispatchEvent(new CustomEvent('finalestage',{detail:{stage:'trails',count}}));}
    _grandFinaleBurst(r,now){const scale=clamp(Number(this.options.finale.burstScale)||1,.4,2);this._flash(r,now,175);this._burst(r,Math.round(92*scale),3.5,11,{life:3300,twinkle:true,sparkle:true,minSize:1.4,maxSize:4.8,crackle:this.options.visuals.secondaryCrackle});this._burst({...r,colors:['#FFFFFF',r.colors[0]]},Math.round(30*scale),10.5,11.2,{life:2100,jitter:.018,minSize:2.2,maxSize:5.4,star:true});this._burst(r,Math.round(24*scale),1.5,5.5,{life:3900,gravity:.025,yScale:.3,yBias:-1.2,twinkle:true,type:'willow',randomAngles:true});this.dispatchEvent(new CustomEvent('finalestage',{detail:{stage:'secondary-burst',x:r.x,y:r.y}}));}
    _explode(r,now){if(r.type==='text'){const cfg=r.cfg,hybrid=cfg.renderMode!=='particles';if(cfg.renderMode!=='particles')this.textBlocks.push({text:r.textPlan.line,x:this.width/2,y:r.textPlan.y,birth:now,cfg});if(cfg.renderMode!=='crisp')for(let i=0;i<r.textPlan.points.length;i++){const q=r.textPlan.points[i],releaseStart=now+cfg.revealDuration+cfg.holdDuration,fraction=cfg.dissolveStyle==='left-to-right'?clamp(q.x/this.width,0,1):cfg.dissolveStyle==='top-down'?clamp(q.y/this.height,0,1):cfg.dissolveStyle==='random'||cfg.dissolveStyle==='sparkle'?Math.random():i/r.textPlan.points.length,releaseAt=releaseStart+fraction*cfg.dissolveDuration;if(!this._spawn({x:q.x,y:q.y,sx:r.x,sy:r.y,tx:q.x,ty:q.y,vx:(Math.random()-.5)*.32,vy:-.08-Math.random()*.18,color:cfg.colors[i%cfg.colors.length],size:cfg.particleSize,life:hybrid?cfg.revealDuration+cfg.holdDuration+cfg.dissolveDuration+cfg.fallDuration:500+cfg.holdDuration+cfg.fallDuration,text:true,hybrid,assemble:500,hold:cfg.holdDuration,releaseAt,fall:cfg.fallDuration,gravity:cfg.gravity,birth:now,twinkle:cfg.shimmer}))break;}return;}
      if(r.type==='grand-finale-carrier'){this._flash(r,now,190);this._burst({...r,colors:['#FFFFFF','#FFD700']},64,2,5.5,{life:1300,twinkle:true,sparkle:true,randomAngles:true,minSize:1,maxSize:3.4});this._launchFinaleTrails(r,now);return;}
      if(r.type==='grand-finale-burst'){this._grandFinaleBurst(r,now);return;}
      if(r.type==='sovereign-crown'){this._flash(r,now,220);this._burst(r,360,3,10,{life:3600,twinkle:true,sparkle:true});this._burst(r,180,8,11,{life:2500,minSize:2.4,maxSize:4.8,jitter:.015});this._burst({...r,colors:['#FFFFFF','#FFD700']},240,1,6,{life:4800,gravity:.035,yScale:.35,yBias:-2,twinkle:true,type:'willow'});return;}
      this._flash(r,now,r.type==='thunder_clap'?210:130);
      switch(r.type){
        case 'crossette_supreme':this._crossette(r);break;
        case 'starburst':this._starburst(r);break;
        case 'crown_jewel':this._crown(r);break;
        case 'galactic_spiral':this._spiral(r);break;
        case 'royal_palm':this._burst(r,32,5,13,{life:2600,yScale:.25,yBias:-5,type:'palm',minSize:1.6,maxSize:3.4});this._burst({...r,y:r.y-30},135,4,9,{life:3000,yScale:.6,yBias:2,type:'palm',randomAngles:true});break;
        case 'majestic_comet':this._spawn({x:r.x,y:r.y,vx:0,vy:0,color:'#FFFFFF',size:12,life:700,gravity:0,friction:1,star:true});this._burst(r,55,1,3,{life:1500,yScale:.3,yBias:1.5,randomAngles:true,star:true});break;
        case 'thunder_clap':this._burst({...r,colors:['#FFFFFF']},105,11,25,{life:650,minSize:2.5,maxSize:7,randomAngles:true,star:true});this._burst(r,210,5,15,{life:1500,randomAngles:true,crackle:true});break;
        case 'weeping_willow':this._burst(r,145,2,6,{life:4400,gravity:.025,yScale:.24,yBias:-2.2,twinkle:true,sparkle:true,type:'willow',randomAngles:true});break;
        case 'cascading_horsetail':this._burst(r,95,2,5,{life:3500,gravity:.18,yScale:.18,yBias:3,type:'horsetail',randomAngles:true});break;
        case 'dragon_fish':this._burst(r,75,3,10,{life:2700,type:'fish',randomAngles:true,minSize:1.8,maxSize:5.5});break;
        case 'golden_brocade':this._burst(r,310,1,7,{life:4000,twinkle:true,sparkle:true,randomAngles:true,minSize:.55,maxSize:2.5,crackle:this.options.visuals.secondaryCrackle});break;
        case 'glitter_nova':this._burst(r,410,.2,8.5,{life:3600,twinkle:true,sparkle:true,randomAngles:true,minSize:.45,maxSize:1.8,crackle:this.options.visuals.secondaryCrackle});break;
        case 'diamond_ring':this._burst(r,125,7,7.4,{life:2600,jitter:.015,twinkle:true,minSize:2,maxSize:4.6});break;
        case 'imperial_chrysanthemum':this._burst(r,230,3,9,{life:3200,twinkle:true,minSize:1.2,maxSize:3.8});break;
        default:this._burst(r,170,3,8,{life:2500,minSize:1.7,maxSize:4.7});
      }}
    _drawText(now){const x=this.textCtx;if(!this.textBlocks.length){if(this.textCanvas.style.display!=='none'){x.setTransform(this.dpr,0,0,this.dpr,0,0);x.clearRect(0,0,this.width,this.height);this.textCanvas.style.display='none';}return;}this.textCanvas.style.display='block';x.setTransform(this.dpr,0,0,this.dpr,0,0);x.clearRect(0,0,this.width,this.height);for(let i=this.textBlocks.length-1;i>=0;i--){const b=this.textBlocks[i],c=b.cfg,age=now-b.birth,total=c.revealDuration+c.holdDuration+c.dissolveDuration;if(age>=total){this.textBlocks.splice(i,1);continue;}let alpha;if(age<c.revealDuration)alpha=age/c.revealDuration;else if(age<c.revealDuration+c.holdDuration)alpha=1;else alpha=1-(age-c.revealDuration-c.holdDuration)/c.dissolveDuration;x.save();x.globalAlpha=clamp(alpha,0,1);x.font=`${c.fontWeight} ${c.fontSize}px ${c.fontFamily}`;x.textAlign='center';x.textBaseline='middle';x.fillStyle=c.colors[0]||'#FFFFFF';x.shadowColor=c.colors[1]||c.colors[0]||'#FFFFFF';x.shadowBlur=18*(c.textGlow||1);x.fillText(b.text,b.x,b.y,this.width*c.maxWidth);x.globalAlpha*=.55;x.lineWidth=1.2;x.strokeStyle='#FFFFFF';x.strokeText(b.text,b.x,b.y,this.width*c.maxWidth);x.restore();}if(!this.textBlocks.length)this.textCanvas.style.display='none';}
    _drawItems(now=performance.now()){const a=[];for(const f of this.flashes){const t=clamp(1-(now-f.birth)/f.life,0,1);a.push({...f,alpha:t*.34,size:f.size*(1.15-t*.15)});}for(const r of this.rockets){const c=hex(r.colors[0]);a.push({x:r.x,y:r.y,size:4.6*this.options.visuals.bloom,alpha:1,r:c[0],g:c[1],b:c[2],star:true});}for(const p of this.particles)a.push(p);return a;}
    _finish(now){if(!['finishing','finale','manual'].includes(this.state))return;if(this.state==='finishing'){const drained=!this.rockets.length&&!this.pendingRockets.length&&!this.particles.length&&!this.textBlocks.length,timeout=now-this.finishStarted>=this.options.maxFinishTime;if(drained||timeout){if(timeout){this.rockets.length=0;this.pendingRockets.length=0;this.particles.length=0;this.flashes.length=0;this.textBlocks.length=0;}if(this.wantFinale&&!this.finalePlayed){this.state='finale';this.launchFinale({stopAfter:true});this.finaleStarted=now;}else this._fade(false);}}else if(this.state==='finale'){const done=!this.rockets.length&&!this.pendingRockets.length&&!this.particles.length&&!this.flashes.length&&!this.textBlocks.length,timeout=now-(this.finaleStarted||now)>this.options.finale.maxDuration;if(done||timeout)this._fade(false);}else if(this.state==='manual'){const done=!this.rockets.length&&!this.pendingRockets.length&&!this.particles.length&&!this.flashes.length&&!this.textBlocks.length;if(done)this._fade(false);}}
    _fade(clear){if(this.state==='fading')return this.stopPromise||Promise.resolve(this);this.state='fading';this.accepting=false;const duration=clear?0:this.options.transition.fadeOut;this.backdrop.style.transition=`opacity ${duration}ms ${this.options.transition.easing}`;this.backdrop.style.opacity='0';const promise=this.stopPromise||new Promise(resolve=>this.stopResolve=resolve);this.stopPromise=promise;this.fadeTimer=setTimeout(()=>{cancelAnimationFrame(this.raf);this.raf=0;if(clear||this.options.transition.clearOnHide)this.clear();this.root.style.display='none';this.state='stopped';const resolve=this.stopResolve;this.stopResolve=null;this.stopPromise=null;if(resolve)resolve(this);this.dispatchEvent(new Event('stop'));},duration);return promise;}
    setOptions(partial){this.userOptions=merge(this.userOptions,partial);this.options=this._resolve(this.userOptions);return this;}
    setOpacity(level){this.options.visuals.opacity=clamp(Number(level),0,1);if(this.root){this.root.style.opacity=String(this.options.visuals.opacity);}return this;}
    setStyle(name){const s=STYLES[name];if(!s)return this;this.setOptions({baseStyle:name,...s});if(this.root)this.root.style.opacity=String(clamp(Number(this.options.visuals.opacity??1),0,1));return this;}
    // Generates a random visual configuration and applies it live
    feelingLucky(){
      const PALETTE_POOL=[
        ['#FF0055','#FFCC00'],['#00F2FE','#4FACFE'],['#FF0055'],['#FFD700','#FFA500','#FFFFFF'],
        ['#FF1744','#FF5252','#FF8A80','#FFFFFF'],['#2962FF','#4D96FF','#89CFF0','#FFFFFF'],
        ['#00E676','#69F0AE','#B9F6CA','#FFFFFF'],['#AA00FF','#D17FE0','#EA80FC','#FFFFFF'],
        ['#FF1493','#FF69B4','#FFC0CB','#FFFFFF'],['#00CED1','#40E0D0','#7FFFD4','#FFFFFF'],
        ['#FF4500','#FFD700'],['#8A2BE2','#FF69B4','#FFFFFF'],['#FFD700'],
        ['#FF6347','#FFD700','#7FFF00'],['#00BFFF','#1E90FF','#FFFFFF'],['#FF69B4','#FFFFFF']
      ];
      const PRESETS=['low','medium','high','ultra'];
      const rand=(min,max)=>min+Math.random()*(max-min);
      const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
      const clamp=n=>Math.max(0,Math.min(1,n));
      const cfg={
        visuals:{
          opacity:clamp(rand(0.15,0.6)),trails:Math.random()<.85,trailFade:clamp(rand(0.06,0.2)),
          bloom:clamp(rand(0.7,1.8)),rocketExhaust:Math.random()<.8,explosionFlashes:Math.random()<.85,
          starChance:clamp(rand(0.02,0.2)),groupedSalvos:Math.random()<.7,secondaryCrackle:Math.random()<.65
        },
        performance:{preset:pick(PRESETS),adaptive:true,pauseWhenHidden:true,pauseWhenOffscreen:true,respectReducedMotion:true},
        show:{
          intensity:clamp(rand(0.4,2)),openingSalvo:Math.floor(rand(2,10)),launchInterval:Math.floor(rand(300,1400)),
          launchSpread:clamp(rand(0.2,0.9)),angleRange:clamp(rand(2,30)),angleStrength:clamp(rand(0.2,2.5)),
          enabledTypes:Math.random()<.7?pick([['grand_peony','imperial_chrysanthemum','starburst','glitter_nova'],['weeping_willow','cascading_horsetail','royal_palm','golden_brocade'],['crossette_supreme','diamond_ring','crown_jewel','thunder_clap'],['dragon_fish','majestic_comet','galactic_spiral']]):'all',
          palettes:[pick(PALETTE_POOL),pick(PALETTE_POOL),pick(PALETTE_POOL),pick(PALETTE_POOL)]
        },
        transition:{fadeIn:Math.floor(rand(200,1200)),fadeOut:Math.floor(rand(200,1000)),easing:pick(['ease-out','ease','linear','ease-in-out']),clearOnHide:true}
      };
      if(Math.random()<.35)cfg.background={value:pick(['radial-gradient(circle at center, rgba(8,12,40,.65), #000 82%)','linear-gradient(135deg, #1a0a2e, #040714)','linear-gradient(180deg, #101a4b, #040714)','radial-gradient(circle at 50% 35%, #38175e, #080312 72%)']),opacity:clamp(rand(0.6,1))};
      this.setOptions(cfg);
      if(this.root)this.root.style.opacity=String(clamp(Number(cfg.visuals.opacity??1),0,1));
      // Recolor existing mid-air particles
      const palette=this._palette();
      if(palette&&palette.length){
        const colors=palette.map(h=>{const c=h.replace('#','');const n=parseInt(c.length===3?c.split('').map(x=>x+x).join(''):c,16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];});
        this.particles.forEach((p,i)=>{const c=colors[i%colors.length];p.r=c[0];p.g=c[1];p.b=c[2];});
        this.rockets.forEach(r=>{r.colors=palette;});
      }
      return cfg;
    }
    getOptions(){return JSON.parse(JSON.stringify(this.options));}
    getStats(){return{renderer:this.rendererType,fallbackActive:this.rendererType==='canvas2d'&&this.options.renderer.preferred!=='canvas2d',contextLossCount:this.contextLossCount,state:this.state,particles:this.particles.length,rockets:this.rockets.length,fps:Math.round(this.fps),durationRemaining:this.runtimeDuration?Math.max(0,Math.round(this.runtimeDuration-this.elapsed)):null,quality:this.quality};}
  }

  GrandFireworks.VERSION='1.3.1';GrandFireworks.DEFAULTS=DEFAULTS;GrandFireworks.PRESETS=PRESETS;GrandFireworks.TYPES=TYPES;GrandFireworks.STYLES=STYLES;global.GrandFireworks=GrandFireworks;
})(window);
