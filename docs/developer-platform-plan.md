# Grand Fireworks JS Developer Platform Plan

> **Superseded:** This plan is retained as historical implementation context. The Grand Fireworks JS repository is now maintenance-only. Future development of the broader animation engine and visual design studio belongs in the separate Papercloak Animation Studios repository.

## Purpose

This plan defines the developer-facing API work that should happen before the documentation redesign. The package name remains **`grand-fireworks-js`**. The core remains framework-free, dependency-free at runtime, WebGL 2-first, and Canvas 2D-compatible.

Work should be completed one sprint at a time on:

`feature/updates-api-and-micro-events-updates`

Each sprint should leave the repository buildable, tested, and usable. Do not commit, tag, push, or publish unless Travis explicitly requests it.

## Delivery order

### Sprint 1 — TypeScript and public API contract

Establish the public contract before adding wrappers or alternate entry points.

Scope:

- Add first-party TypeScript declarations for the current public API.
- Type launch, text, finale, world-ender, style, theme, sound, performance, and event options.
- Type return values for `getOptions()`, `getStats()`, and cleanup handles.
- Document browser-only behavior and safe import expectations.
- Add declaration validation or a small TypeScript fixture if the project can support it without adding runtime dependencies.

Acceptance criteria:

- Existing JavaScript usage remains backward-compatible.
- Public methods and configuration fields are represented accurately.
- No declaration claims features that are not implemented.
- `npm test`, `npm run build`, and `git diff --check` pass.

#### Sprint 1 status — COMPLETE

- **Status:** Complete.
- **Completed work:**
  - Authored first-party TypeScript declarations in `index.d.ts` covering the constructor, every configuration section, launch/text/finale/world-ender/stop option vectors, return types for `getOptions()`, `getStats()`, and cleanup handles, plus the static `VERSION`, `DEFAULTS`, `PRESETS`, `TYPES`, `STYLES`, and `COLOR_THEMES` members.
  - Wired `types: ./index.d.ts` and an `exports["."].types` condition in `package.json`; added `index.d.ts` to the published `files` list. Both default and named imports type-check.
  - Added `npm run typecheck` using TypeScript (dev-only dependency) with two focused fixtures (`fixture.ts`, `named-import-fixture.ts`) compiled under `strict` mode.
  - Added a declaration contract test to `npm test` that verifies the public methods and configuration interfaces are present in `index.d.ts` and that the file is published.
- **Files changed:** `index.d.ts` (new), `types/fixtures/fixture.ts` (new), `types/fixtures/named-import-fixture.ts` (new), `types/fixtures/tsconfig.json` (new), `package.json`, `package-lock.json`, `tests/run-tests.js`, `README.md`, `CHANGELOG.md`.
- **Tests run:** `npm test` (12/12), `npm run typecheck`, `npm run build`, `git diff --check`.
- **Decisions made:**
  - Used a hand-written declaration rather than generated output, because the runtime is a class-based IIFE that cannot be faithfully re-emitted by a declaration generator.
  - Kept TypeScript strictly as a dev dependency (like `terser`); the runtime and published package remain zero-dependency.
  - `ColorThemeName` is declared as the seven implemented theme keys plus an open `(string & {})` escape hatch so unknown-but-valid themes still type-check without advertising unimplemented names.
  - Default and named imports both work via `export default` + `export class` with a merged namespace for statics.
- **Known limitations:** The browser-only `window.GrandFireworks` global is described in prose and typed through the CommonJS export; a `declare global` augmentation was intentionally not emitted so the package does not pollute `window` typings for non-GrandFireworks consumers.
- **Follow-up work:** None for Sprint 1. Later sprints may extend `index.d.ts` (micro-events helpers in Sprint 2, headless contract in Sprint 6); update the declaration and rerun `npm run typecheck` when those APIs land.

### Sprint 2 — Micro-events and DOM trigger helpers

Make common celebratory interactions one or two lines of code.

Proposed API:

```js
fireworks.burstFromPointer(event, options?)
const detach = fireworks.attachToElement(element, options?)
detach()
```

Scope:

- Support pointer, mouse, and touch-compatible coordinates through Pointer Events where available.
- Correctly translate page/client coordinates into the engine’s coordinate system.
- Support an element object as the primary input; selector support is optional and must be explicit.
- Return cleanup functions from attachment helpers.
- Handle destroyed instances and missing elements safely.
- Respect reduced motion, performance limits, sound opt-in, and existing active fireworks.
- Add examples for buttons, form success, pointer interaction, and custom application events.

Acceptance criteria:

- Helpers do not leak event listeners.
- Existing fireworks are never cleared by helper calls.
- Helpers work with contained and fullscreen canvases.
- Tests cover coordinates, cleanup, repeated attachment, destroyed instances, and reduced motion.

### Sprint 3 — React wrapper package

Create a separate React wrapper without adding React to the core package.

Proposed surface:

```tsx
<GrandFireworks autoStart={false} baseStyle="cinematic" />
const { launch, launchText, setOptions } = useFireworks()
```

Scope:

- Create a separate wrapper package or package workspace with React as a peer dependency.
- Create and destroy the engine at the correct component lifecycle boundaries.
- Apply option changes without clearing active fireworks.
- Expose useful imperative methods through a ref and/or hook.
- Handle container sizing, cleanup, and server-rendered environments safely.
- Add one focused example and wrapper documentation.

Acceptance criteria:

- React is not a dependency of the core package.
- Unmount always destroys listeners, animation state, audio hooks, and renderer resources.
- Prop updates preserve active shells and particles.
- The wrapper has a minimal integration test or verified fixture.

### Sprint 4 — Vue 3 wrapper package

Create the Vue equivalent using the same lifecycle and behavior contract as React.

Proposed surface:

```vue
<GrandFireworks ref="fireworksRef" :auto-start="false" base-style="cinematic" />
```

Scope:

- Create a separate Vue 3 wrapper package with Vue as a peer dependency.
- Provide a component and composable where useful.
- Define ref exposure explicitly with `defineExpose` or the chosen wrapper mechanism.
- Apply reactive option updates safely.
- Add one focused example and wrapper documentation.

Acceptance criteria:

- Vue is not a dependency of the core package.
- Mount, update, unmount, and ref behavior are documented and tested.
- Existing active fireworks survive reactive option changes.
- Wrapper behavior matches the React lifecycle contract.

### Sprint 5 — Modular ESM entry points and optional features

Reduce the bundle-size objection without destabilizing the existing browser and CommonJS paths.

Scope:

- Define and implement supported package exports while retaining the existing root import.
- Separate the smallest practical core from optional sound, text, and advanced effect modules.
- Add ESM-compatible entry points and bundler tests.
- Measure minified and gzipped sizes in a repeatable way.
- Do not promise a specific size until the build output confirms it.
- Keep Canvas fallback and WebGL behavior available according to the selected entry point’s contract.

Acceptance criteria:

- Existing CDN, CommonJS, and root-package usage continues to work.
- Every documented subpath resolves in supported bundlers.
- Optional features are genuinely optional rather than merely renamed exports.
- Build output and size measurements are documented.
- No runtime framework dependency is introduced.

### Sprint 6 — Headless simulation and custom render-loop support

Allow advanced users to own the render loop without forcing the current canvas renderer onto them.

Scope:

- Separate simulation state and timing from renderer ownership where practical.
- Define a stable public frame/particle data contract.
- Support caller-driven updates and rendering without exposing fragile internal objects.
- Decide whether the public API is a mode on the core class or a separate `FireworksCore` export.
- Prototype integration with one custom renderer, preferably Three.js or a minimal custom WebGL loop.
- Preserve the current canvas/WebGL API unchanged.

Acceptance criteria:

- The headless contract is documented before examples are published.
- Consumers can advance simulation deterministically or through a supplied clock.
- No renderer-specific private fields are required.
- Performance and memory ownership are clear.
- A custom-renderer example is verified and does not become a core dependency.

### Sprint 7 — Developer release hardening

Consolidate the feature work before rebuilding the public documentation.

Scope:

- Run the full test suite and build.
- Verify package contents with `npm pack --dry-run`.
- Test CDN, CommonJS, ESM, TypeScript, React, Vue, and headless examples where applicable.
- Update `README.md`, `CHANGELOG.md`, and `docs/AI_HANDOFF.md`.
- Record migration notes and compatibility constraints.
- Confirm public API names and package exports are final enough for documentation.

## Documentation sprint after developer work

Only begin this after Sprint 7 is complete.

- Redesign the homepage hero around CDN, npm, Vanilla JS, React, Vue, modular, and headless paths.
- Add accessible code tabs and copy buttons.
- Add framework integration guides.
- Add micro-event recipes for buttons, forms, pointers, and application events.
- Add modular import and measured bundle-size examples.
- Add the verified custom-renderer example.
- Add browser support, accessibility, performance, lifecycle, cleanup, and troubleshooting sections.
- Add restrained SEO metadata and accurate JSON-LD.
- Add an interactive benchmark only if its methodology and limitations are visible.
- Verify every code example against the actual build artifacts.

## Explicit non-goals

- Do not rename the package from `grand-fireworks-js`.
- Do not add React, Vue, Svelte, or Angular to the core runtime dependencies.
- Do not hand-edit `dist/`.
- Do not promise Svelte or Angular wrappers until they are implemented and supported.
- Do not expose private renderer internals as a headless API.
- Do not claim bundle-size or benchmark results without reproducible measurements.

## AI implementation handoff prompt

Use this prompt when assigning one sprint to an implementation AI:

```text
You are implementing one sprint from docs/developer-platform-plan.md in the Grand Fireworks JS repository.

Read AGENTS.md, docs/AI_HANDOFF.md, docs/developer-platform-plan.md, README.md, package.json, the relevant source files, and tests before editing. Work on the existing branch feature/updates-api-and-micro-events-updates. The package name is grand-fireworks-js and must not be changed.

Your assigned sprint is: [INSERT SPRINT NUMBER AND TITLE]

Implement only the assigned sprint’s scope. Preserve the framework-free, zero-runtime-dependency core, WebGL 2 preference, Canvas fallback, sound opt-in behavior, reduced-motion behavior, active-firework continuity, and stable distribution filenames. Do not hand-edit dist/. Use apply_patch for intentional edits.

Before coding, inspect the current API and identify compatibility risks. Define any new public API clearly and avoid inventing undocumented behavior. Add focused tests and examples where the sprint requires them. Update README.md, CHANGELOG.md, and docs/AI_HANDOFF.md only when the sprint changes public behavior or architecture.

Verify proportionally with npm test, npm run build when source or package data changes, npm pack --dry-run when package exports change, and git diff --check. Review the final diff for unrelated changes, leaked credentials, accidental framework dependencies, and documentation claims that are not backed by implementation.

At handoff, report:
1. What changed.
2. Public API or package-export changes.
3. Files changed.
4. Tests and verification commands run.
5. Known limitations or follow-up work.
Do not commit, tag, push, or publish.
```

## AI review prompt

Use this prompt after each sprint or before merging the branch:

```text
Review the implementation of [INSERT SPRINT NUMBER AND TITLE] in the Grand Fireworks JS repository.

Read AGENTS.md, docs/AI_HANDOFF.md, docs/developer-platform-plan.md, the relevant diff, source files, tests, package metadata, and documentation. The package name must remain grand-fireworks-js. Review the changes as a production library maintainer, not as an author defending the implementation.

Prioritize findings in this order:
1. Backward compatibility and broken existing browser/CommonJS/CDN usage.
2. Public API correctness and whether documentation matches the shipped behavior.
3. Renderer, animation-loop, memory, event-listener, and WebGL resource leaks.
4. Reduced-motion, sound opt-in, Canvas fallback, hidden/offscreen behavior, and accessibility regressions.
5. Framework lifecycle and SSR issues, if applicable.
6. Bundle-size, export, and package-content regressions, if applicable.
7. Test gaps, flaky assumptions, and missing cleanup coverage.
8. Unrelated edits, generated-file mistakes, credentials, or release-process violations.

Do not recommend speculative redesigns unless the current implementation cannot safely support its documented contract. Give concrete findings with severity, file, line, why it matters, and a minimal fix. If no findings exist, say so and list any residual risks or unverified environments. Do not modify files unless explicitly asked.
```
