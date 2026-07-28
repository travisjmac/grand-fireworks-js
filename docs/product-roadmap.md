# Grand Fireworks Product Roadmap

This roadmap ranks the features most likely to make Grand Fireworks a tool people return to, rather than a one-time visual effect library. The order balances user value, differentiation, and reuse of the existing Feature Lab and Configuration Workbench.

## 1. Timeline Composer

**Why first:** This turns individual launches into authored experiences. It is the clearest step from “fireworks engine” to “creative product.”

Let people place shells, text messages, style changes, sound cues, and finale beats on a simple timeline, preview the sequence, and export one reusable configuration object.

## 2. Shareable Shows

**Why second:** A beautiful show is much more valuable when it can be sent to someone in one click.

Save a configuration into a compact URL, including the theme, timing, text, mixed-style ratios, and sound settings. Opening the link recreates the same show without an account.

## 3. Scene Presets

**Why third:** Most people want a moment, not a parameter sheet.

Ship opinionated starting points such as Wedding, Birthday, Product Launch, Game Achievement, Holiday, Livestream, Countdown, and Memorial. Each preset should set the pacing, palette, sound, text treatment, and finale behaviour together.

## 4. Brand Kit

**Why fourth:** This makes the engine useful for agencies, marketing teams, and product teams.

Accept a logo, brand colours, and font. Generate a cohesive branded firework palette, text treatment, and optional logo reveal automatically.

## 5. Visual Event Triggers

**Why fifth:** This connects fireworks to real product moments with minimal code.

Provide copy-ready triggers for form submission, level completion, donation alerts, checkout success, a scheduled time, and custom application events.

## 6. Media Capture

**Why sixth:** Recording makes the work portable beyond a web page.

Export a clean WebM clip, social-ready loop, still frame, or transparent PNG frame. Include a capture mode that hides controls and creator overlays automatically.

## 7. Accessibility & Sensory-Safe Mode

**Why seventh:** This broadens the audience and makes the product responsible by default.

Offer an explicit low-flash, low-motion, reduced-particle, muted, and high-contrast mode. Respect system preferences automatically and let creators preview the safe version.

## 8. Performance Advisor

**Why eighth:** Creators need confidence that their show will work on a visitor’s device.

Estimate a safe configuration from the current renderer, viewport, frame rate, and device capability. Explain the trade-off in plain language and offer one-click optimizations.

## 9. Synced Pop-out Configuration Workbench

**Why ninth:** This is a quality-of-life multiplier for serious creators and multi-monitor setups.

Allow the Workbench to move into a separate synced window while the main page remains a full unobstructed preview. Changes, preview controls, save/load actions, and configuration state must synchronize in both directions.

## 10. 3D Flight Experience

**Why tenth:** This is the biggest immersion differentiator, but also the largest engineering project.

Build the separate flight layer described in [interactive-flight-spec.md](interactive-flight-spec.md): persistent 3D positions, a movable viewer, depth-aware sound, and the ability to fly through bursts. Keep it separate from the stable 2D core.

## Product Principles

- Lead with moments and presets, not raw options.
- Make every visual choice previewable immediately.
- Preserve a clean developer export path: a simple configuration object and event API.
- Keep the main show usable on ordinary devices; expose spectacle as an intentional choice.
- Treat sound, motion, and flashing as user-controllable—not mandatory.
