# CLAUDE.md

Project-specific guidance. Global rules + owner context live in ~/knowledge (read
~/knowledge/INDEX.md first). This file wins on project facts.

## Project Overview
johnchrisley.dev - Jc's personal portfolio. Current design is "Signals": a dark,
instrument-style site built from scratch. No framework, no build step - hand-written
HTML5, CSS, and vanilla JS, deployed on GitHub Pages (this repo is the Pages source;
`CNAME` -> johnchrisley.dev). Live and recently updated (2026-06). Freelance-first.

## Stack
- Semantic HTML5; CSS custom-property design system (graphite + signal-amber).
- Vanilla JS: IntersectionObserver reveals, scroll-linked rail, magnetic buttons
  (`script.js`, `motion.js`). Fonts: Space Grotesk, Inter, JetBrains Mono.
- No framework, no bundler.

## Conventions / constraints
- Performance is a hard requirement (~/knowledge/projects/portfolio.md) - keep it
  fast; no heavy libraries, mind animation cost on mobile.
- Commits: one short imperative line, no AI attribution.

## NOTE - conflict with ~/knowledge
~/knowledge/projects/portfolio.md describes the portfolio as a "cinematic GSAP /
ScrollTrigger" site. This repo's current design ("Signals") is vanilla JS with NO
GSAP. The knowledge file likely describes an earlier version. Treat THIS repo as
canonical for the live site; the knowledge file should be updated (flagged 2026-06-22).

## Status
Live on GitHub Pages. Tier 2 (CLAUDE.md only); no ROADMAP/DECISIONS/ARCHITECTURE
unless the site grows enough to need them.
