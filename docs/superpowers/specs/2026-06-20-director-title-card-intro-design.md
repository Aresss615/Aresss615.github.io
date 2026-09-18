# Director Title Card Intro Design

**Date:** 2026-06-20
**Status:** Approved for implementation

## Goal

Make the portfolio intro feel more cinematic while keeping the current light editorial portfolio, copy, section order, typography system, and static GitHub Pages architecture intact.

## Approved Direction

Use a **Director's Title Card + Match Cut** intro. The opening starts as a dark warm-black film title card, then wipes into the existing light hero. The site after the intro remains the same portfolio experience, with the hero receiving a stronger reveal moment.

## Visual Treatment

- Full-screen dark intro surface using warm black, paper text, signal orange, subtle amber light leaks, and visible film-grain texture.
- Thin guide lines and frame marks create a director/title-card feel without adding extra user-facing content.
- Existing intro copy stays focused on identity and role: `Computer Engineer · Full-stack & Systems`, `John Chrisley`, and a progress/status line.
- The title reveal uses staged letter motion, a horizontal progress burn, and a final shutter/iris wipe.
- The wipe resolves into the existing hero: headline lines rise, portrait fades in with a short light sweep, and the aurora/grid continue underneath.

## Scope

Modify only:

- `motion.js`: intro DOM, GSAP timeline, hero entry coordination, and safety timers.
- `style.css`: title-card styling, grain/light effects, wipe masks, hero sweep styling, responsive and reduced-motion rules.
- `index.html`: cache-busting query strings for changed static assets.

Do not change:

- Portfolio copy.
- Section order.
- Header/navigation structure.
- Main color system after the intro.
- Framework/build setup.

## Accessibility And Safety

- `prefers-reduced-motion: reduce` skips the cinematic intro and shows the hero immediately.
- The intro remains `aria-hidden="true"` and adds no keyboard trap.
- A hard safety timeout still removes the curtain if animation or CDN libraries fail.
- CSS fallback without GSAP uses a simple timed wipe and still reveals the page.
- No audio is added.

## Verification

- Static check confirms the new intro hooks, style selectors, reduced-motion handling, and cache-busting references are present.
- Local browser preview verifies the page loads, the intro clears, the hero is visible, and no framework/runtime overlay appears.
- Desktop and mobile screenshots verify no hero text overlap, the portrait remains visible, and the intro styling does not break responsive layout.
