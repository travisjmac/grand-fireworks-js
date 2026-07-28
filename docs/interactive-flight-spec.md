# GrandFireworks Flight — Interactive 3D Experience

> **Project:** Grand Fireworks JS — Companion Project  
> **Branch:** `feature/games-missile-command`  
> **Date:** 2026-07-27  
> **Goal:** A **separate, standalone project** that wraps GrandFireworks.js into an interactive 3D free-flight experience. The core library stays untouched — this is a layer on top.

---

## 1. Vision

A **standalone companion project** that wraps a running `GrandFireworks.js` instance and turns it into an interactive 3D free-flight experience. The core library stays completely untouched — the flight layer reads particle positions each frame and re-projects them into 3D space.

Instead of watching fireworks from a fixed camera, the user becomes a **free-flying observer** in a 3D world. Fireworks explode with real depth — expanding spheres of light you can fly **toward, through, and past**. The show happens all around you.

**Modes of interaction:**
- **Free flight** — mouse/keyboard/gamepad controls to fly anywhere in the scene
- **Guided tour** — autopilot cinematography that swoops, banks, and orbits the action
- **Orbit** — lock onto a burst and circle it

---

## 2. Camera System (Viewer) — Flight Layer

The flight layer provides a full 3D camera with position and look-at target. The core library is not modified.

### 2.1 Camera Properties

```
camera.x: float     // world X position (left/right along horizon)
camera.y: float     // world Y position (up/down — height above ground)
camera.z: float     // world Z position (depth — distance from the action)
camera.lookX: float // world X the camera is looking at
camera.lookY: float // world Y the camera is looking at
camera.lookZ: float // world Z the camera is looking at
camera.fov: float   // field of view in degrees (default ~60)
```

### 2.2 Projection

A simple perspective projection maps 3D world points `(wx, wy, wz)` to screen coordinates `(sx, sy)`:

```
// Camera → view space
dx = wx - camera.x
dy = wy - camera.y
dz = wz - camera.z

// Look-at rotation — rotate dx,dy,dz by camera orientation
// (derived from lookAt - camera position)

// Perspective divide
scale = fovScale / max(dz, 0.1)
sx = dx * scale + screenCenterX
sy = -dy * scale + screenCenterY
```

Particle size also scales with depth (further = smaller, closer = bigger).

### 2.3 Defaults

- `camera.x` = center of the launch horizon
- `camera.y` = ground level (~0)
- `camera.z` = comfortable watching distance (e.g. -500)
- `camera.lookX` = center of scene
- `camera.lookY` = typical burst height
- `camera.lookZ` = 0

---

## 3. Particle System — 3D Space

Every particle gets a Z coordinate. This is the biggest change.

### 3.1 Per-Particle Fields (added)

```
p.z: float     // world Z position (default 0)
p.vz: float    // velocity in Z
p.gz: float    // gravity in Z (optional, for wind/drift)
```

### 3.2 Explosion Modes

The shell type determines the *shape* of the explosion in 3D.

| Mode | Shape | Description |
|------|-------|-------------|
| `2d` | Flat ring/circle | Current behavior — all particles at z=0. Backward compat. |
| `billboard` | Sphere surface | Particles burst outward on a sphere surface, always face camera. Good performance, real depth feel. |
| `full3d` | Volumetric sphere | Particles fill a sphere with randomized depth, render as tiny 3D points/lines. Highest immersion. |

### 3.3 Burst Shape — Sphere

For billboard and full3D modes, a shell explosion spawns particles on a sphere:

```
for each particle i:
  theta = random(0, 2π)
  phi = random(0, π)
  speed = random(burstMin, burstMax)
  p.x = burstX + cos(theta) * sin(phi) * speed
  p.y = burstY + sin(theta) * sin(phi) * speed
  p.z = burstZ + cos(phi) * speed
  p.vx = cos(theta) * sin(phi) * speed * 0.05  // etc.
  p.vy = ...
  p.vz = ...
```

Gravity still pulls Y downward. Z can have slight wind/drift.

### 3.4 Particle Culling

Cull particles that are:
- Behind the camera (`dz < 0.1`)
- Too far left/right/up/down of the view frustum
- Past their lifetime

---

## 4. Rendering — 3D Pipeline

### 4.1 Canvas2D Renderer

Canvas2D doesn't do native 3D, so we project manually:

1. For each particle, compute screen position via camera projection
2. Scale size by depth (closer = bigger)
3. Sort by Z (far → near) for correct overlap
4. Draw sprites with depth-scaled size and alpha

### 4.2 WebGL2 Renderer

The vertex shader already handles zoom. Upgrade it to a full 3D projection:

**Vertex shader inputs:**
```
in vec3 a_position;     // now 3 components (x, y, z)
in float a_size;
in vec4 a_color;
in float a_star;
```

**Uniforms (new):**
```
uniform mat4 u_viewProj;  // view-projection matrix
uniform vec3 u_viewerPos; // for distance-based size scaling
```

**Particle size** = `a_size * (focalLength / (viewSpaceZ + epsilon))` — perspective size scaling.

### 4.3 Depth Sorting

For correct transparency, sort particles back-to-front each frame. With thousands of particles, use a fast approximate sort or bucket sort by Z.

### 4.4 Particle Sprites

Sprites always face the camera (billboarding) for 2D and billboard modes. In full3D mode, optionally render as small glowing spheres or line segments.

---

## 5. Flight Controls

### 5.1 Keyboard/Mouse Scheme

| Input | Action |
|-------|--------|
| W / ↑ | Move forward (toward lookAt) |
| S / ↓ | Move backward |
| A / ← | Strafe left |
| D / → | Strafe right |
| Q / E | Move down / up |
| Mouse drag | Rotate camera (look around) |
| Scroll wheel | Change FOV (zoom lens) or change Z (fly closer/further) |
| Shift | Boost speed (2x) |
| Space | Brake / stop |

### 5.2 Gamepad Support

Standard twin-stick:
- Left stick: move (forward/back/strafe)
- Right stick: look around
- Triggers: up/down
- D-pad: speed control

### 5.3 Touch (Mobile)

- Single finger drag: look around
- Two-finger pinch: zoom/FOV
- Two-finger drag: strafe

### 5.4 Auto-Pilot / Cinematic Modes

| Mode | Behavior |
|------|----------|
| `orbit` | Circle around a point of interest (burst center) |
| `flyover` | Travel along a spline path, camera looking at the show |
| `chase` | Follow a specific rocket from behind |
| `static` | Fixed camera, current behavior |

---

## 6. Launch Points (Horizon)

The flight layer uses the core library's existing `launchHorizon` option to place **fixed launch positions** along a horizon line. The core `GrandFireworks.js` already handles random rocket spawning — the flight layer just positions the viewer to see more or less of it.

### 6.1 Launch Pad Visualization

Launch pads are rendered by the **flight layer** (not the core engine) as visual markers:
- Small ground lights or mortar tubes
- Positioned at `y = groundLevel`, `z = 0`, evenly spaced along X
- Rendered as a separate canvas overlay or Three.js / raw WebGL scene

### 6.2 Future: Interactive Pads

For the missile-command game, pads could become clickable targets or controlled launch points — but that's a separate project.

---

## 7. Explosion Types — 3D Modes

The core library's explosion types don't change. The flight layer **intercepts** particle positions from the core and adds Z-depth when rendering:

| Mode | What happens |
|------|-------------|
| `2d` (default) | Pass-through. All particles rendered as-is at z=0. Core untouched. |
| `billboard` | Flight layer re-maps burst particles onto a sphere surface in its own render pass. Same particles, but with calculated Z for the camera projection. |
| `full3d` | Flight layer spawns additional volumetric particles around each core particle for depth fill. More expensive, higher immersion. |

---

## 8. How It Connects to GrandFireworks.js

The flight layer is **not a fork or modification** — it's a consumer:

```
┌─────────────────────────────────┐
│   GrandFireworks.js (core)      │  ← untouched, pure 2D
│   - spawns rockets              │
│   - explodes shells             │
│   - runs physics                │
│   - renders to canvas           │
└──────────┬──────────────────────┘
           │ reads particle positions each frame
           ▼
┌──────────────────────────────────┐
│   Flight Layer (new project)     │  ← the new code
│   - 3D camera / viewer           │
│   - projects particles into 3D   │
│   - flight controls              │
│   - depth sorting + rendering    │
│   - launch pad visualization     │
└──────────────────────────────────┘
```

**How it works at runtime:**
1. Core engine runs normally — rockets launch, explode, physics tick
2. Each frame, the flight layer reads `fireworks.particles` and `fireworks.rockets`
3. It projects those 2D positions into 3D space based on camera position
4. It renders the projected particles on its own WebGL/Canvas layer **over** or **instead of** the core canvas
5. The core canvas can optionally be hidden (let the flight layer do all rendering)

### 8.1 Reading Particle Data

The core library already exposes particle arrays publicly:
```js
fireworks.particles   // Array of { x, y, size, r, g, b, alpha, ... }
fireworks.rockets     // Array of { x, y, vx, vy, ... }
fireworks.width       // canvas width
fireworks.height      // canvas height
```

No new API needed on the core — it's all read-only access.

### 8.2 Rendering Strategy

Option A — **Overlay canvas**: Keep the core canvas rendering normally (2D fireworks), and the flight layer renders a transparent 3D overlay on top. The 2D show is the "background", the 3D particles pop out in front.

Option B — **Replace renderer**: The flight layer hides the core canvas and does all rendering itself. Full control, but loses the core's trail/bloom effects.

Option C — **Hybrid (recommended)**: Core renders trails and bloom on its canvas (as background layer). Flight layer reads core particles and re-renders them as 3D billboarded sprites on top. Best of both worlds.

---

## 9. Flight Layer API

The flight layer would be its own class that wraps a GrandFireworks instance:

```js
const fireworks = new GrandFireworks({ show: { launchHorizon: 3 } });
fireworks.start();

const flight = new GrandFireworksFlight(fireworks, {
  mode: 'billboard',      // '2d' | 'billboard' | 'full3d'
  controls: 'free',       // 'free' | 'orbit' | 'chase' | 'static' | 'guided'
  showLaunchers: true,
  speed: 1,
});

flight.setViewer(0, 0, -500, 0, 200, 0);  // x, y, z, lookX, lookY, lookZ
flight.setFov(60);
flight.flyTo(200, 100, -300, 0, 150, 0, 2000); // smooth flyover in 2s

// Events
flight.addEventListener('viewerchange', (e) => { ... });
flight.addEventListener('nearburst', (e) => { ... }); // flew close to an explosion

flight.destroy(); // cleans up its layer, core untouched
```

---

## 10. Project Structure

A new folder alongside the existing project:

```
grand-fireworks-js/
├── GrandFireworks.js         ← core (unchanged)
├── ...
└── flight/                   ← new companion project
    ├── GrandFireworksFlight.js   ← main flight class
    ├── Camera.js                 ← 3D camera math
    ├── Controls.js               ← keyboard/mouse/gamepad
    ├── Projector.js              ← 3D → 2D projection
    ├── Renderer.js               ← WebGL/Canvas 3D renderer
    ├── LauncherVis.js            ← launch pad visualization
    ├── GuidedTour.js             ← auto-pilot cinematic mode
    ├── index.html                ← demo page
    └── README.md                 ← standalone docs
```

---

## 11. Performance Considerations

| Concern | Solution |
|---------|----------|
| Particle count in 3D | Same cap as 2D — flight layer reuses core particles |
| Depth sorting | Simple array sort by projected Z (far → near) |
| Billboard sprites in WebGL | Vertex shader with camera-facing quads or point sprites |
| Canvas fallback | Software projection with `drawImage` |
| Flying through dense bursts | Auto-reduce particle size when within burst radius |
| LOD | Far particles = skip draw, mid = sprites, near = full detail |

---

## 12. Implementation Phases

### Phase 1 — Foundation
- Create `flight/` folder and project skeleton
- `Camera.js` — 3D camera with position, look-at, FOV
- `Projector.js` — perspective projection (world → screen)
- Basic overlay canvas that reads core particles and projects them
- Depth sorting by Z

### Phase 2 — Billboard Mode
- Map 2D burst particles onto a sphere surface for Z depth
- Render as camera-facing sprites on the overlay
- Size scales with distance (perspective)
- Trails from core canvas show through underneath

### Phase 3 — Flight Controls
- `Controls.js` — keyboard + mouse look
- Smooth camera interpolation (lerp)
- Connect controls to camera movement
- Scroll wheel zoom/FOV

### Phase 4 — Full3D Mode & Launch Pads
- Volumetric particle fill around each core particle
- `LauncherVis.js` — ground markers for launch pads
- Gamepad support

### Phase 5 — Cinematic & Polish
- `GuidedTour.js` — auto-pilot orbits and flyovers
- HUD overlay with position/speed/FPS
- `index.html` demo page with controls UI
- Performance tuning

---

## 13. Open Questions

1. Option A, B, or C for rendering strategy? (Hybrid C recommended)
2. Should the flight layer support Three.js as an optional renderer backend?
3. How should sound panning work when the viewer moves? (3D audio via stereo pan?)
4. Should launch pads be clickable/interactive for the missile-command game later?
5. Should there be a ground plane / skybox for spatial reference when flying?
