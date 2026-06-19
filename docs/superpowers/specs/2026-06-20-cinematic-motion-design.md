# Cinematic Motion Layer — Portfolio

**Date:** 2026-06-20
**Author:** John Chrisley E. Delos Santos (with Claude)
**Status:** Approved — building

## Goal

Transform the existing portfolio into a "very stunning, interactive" experience
in the spirit of two Framer references (a dark cinematic agency site and the
"Majd" minimal portfolio) — **without** changing the site's content, copy,
structure, fonts, or its current light "editorial paper" aesthetic. This is a
pure **motion + visual-drama layer** on top of the current hand-built static site.

User direction (explicit):
- "I just want the cool animation." → keep current look, add motion.
- Hero: animated abstract visual **+ keep the portrait**.
- Motion intensity: **maximum cinematic**.
- Tech: free to add libraries if it makes the site stunning.
- Selected Work: **full pinned stacking** (cards stack/slide over each other).

## Non-goals

- No color/theme change, no copy rewrite, no restructure.
- No build step / framework rebuild — stays a static GitHub Pages site.
- Must degrade gracefully: if libraries fail to load or `prefers-reduced-motion`
  is set, the existing site works exactly as today.

## Architecture

Progressive enhancement in three layers:

1. **`script.js` (unchanged baseline):** rail, menu, active-section, base reveals,
   magnetic buttons. Site is fully functional with only this.
2. **Libraries (CDN, `defer`):** Lenis (smooth scroll) + GSAP + ScrollTrigger.
3. **`motion.js` (new):** all cinematic enhancements. Guards on
   `prefers-reduced-motion` and on library presence; wrapped in try/catch so a
   failure never breaks the page. Injects decorative DOM (aurora canvas, custom
   cursor, intro curtain, name watermark) so the HTML stays clean and no-JS safe.

## Features

### Foundation
- Lenis smooth inertia scroll, synced to GSAP ticker + `ScrollTrigger.update`.
  Native scroll events still fire, so the existing rail/active-section code keeps working.
- Page-load **intro curtain**: paper-colored overlay with the name + a thin
  progress line that lifts to reveal the hero. CSS auto-dismiss fallback (max ~2.5s)
  so it can never get stuck, even without JS.

### Hero
- **Aurora canvas** behind the headline: a few large, soft, drifting orange/amber
  glows on the paper background, with gentle mouse parallax. DPR-capped, paused
  when off-screen.
- **Masked headline reveal** (already present as clip-reveal — kept/strengthened).
- Portrait card gets **scroll parallax + subtle 3D tilt** toward the cursor.

### Global interactions
- **Custom cursor** (dot + trailing ring) on fine-pointer devices; grows over
  links/buttons. Native cursor hidden only where the custom one is active.
- Stronger **magnetic** buttons (existing hook).
- Marquee gains **scroll-velocity skew/speed**.

### Scroll cinematics
- **About:** statement reveals **word-by-word** on enter.
- **Selected Work:** the three cases **pin and stack** (CSS sticky + GSAP scrub
  that scales/dims the outgoing card as the next slides over). Architecture SVGs
  keep drawing themselves on enter. Disabled on small screens (normal flow).
- **Capabilities / Experience:** rows/chips **stagger in**; experience timeline
  **draws its vertical line** as you pass.
- **Contact:** a **giant ghosted name watermark** parallaxes behind the contact
  block (the "Majd" move).
- Optional light **counters** on a couple of numeric values.

## Accessibility & performance
- Full `prefers-reduced-motion` path: no Lenis, no aurora, no cursor, no pin,
  intro dismissed instantly — falls back to the current static experience.
- Coarse-pointer (touch): no custom cursor, native scroll, no pinning.
- Canvas DPR capped; animation paused off-screen; ScrollTrigger refreshed on
  load/resize/font-load.

## Verification
- Render via Playwright at desktop / tablet / mobile widths; check readability,
  the pinned-stack behavior, and that nothing overlaps the fixed header/rail.
- Confirm reduced-motion fallback renders the plain site.
