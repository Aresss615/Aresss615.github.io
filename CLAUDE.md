# CLAUDE.md

Project-specific guidance. Global rules + owner context live in ~/knowledge (read
~/knowledge/INDEX.md first). This file wins on project facts.

## Project Overview
johnchrisley.dev - Jc's personal portfolio, freelance-first. Current design is
"Kinetic Editorial" (2026-09): light paper, giant Bricolage Grotesque type, one
orange accent, rolling-word hook ("I build the software that runs your ___"),
proof strip, sticky stacking case cards with real screenshots, services, about,
contact. Spec: docs/superpowers/specs/2026-09-24-portfolio-redesign-design.md.

## Stack
- Hand-written HTML5 + CSS custom properties + vanilla JS (`script.js`). No
  framework, no bundler, no GSAP, no third-party JS.
- Fonts: Bricolage Grotesque, Inter, JetBrains Mono (Google Fonts).

## Deploy
- Live site is served from hammok, NOT GitHub Pages: nginx:alpine container in
  /srv/apps/portfolio behind the Cloudflare tunnel; `hammok-deploy@portfolio.timer`
  pulls `main` every minute. `git push` (Jc only) = deploy. CNAME is kept but unused.
- nginx blocks dotfiles but serves every other repo file (CLAUDE.md, docs/) publicly.

## Conventions / constraints
- Performance is a hard requirement: animate transform + opacity only; no canvas,
  no smooth-scroll hijack, no scrubbed filters, no permanent will-change.
- Wordmark is lowercase `johnchrisley.dev` (Jc, 2026-09-24); full name stays in title/footer/about.
- Standing dislikes: no photo of Jc, no custom cursor, no marquee, no scroll cue,
  no crowded hero. No em dashes in site copy.
- Only link public repos (grocery-pos, egmc-motorparts, pisofolio are private).
- Verify before claiming done: `PLAYWRIGHT_MODULE=<playwright path> node tests/verify.js`
  (Playwright currently borrowed from ~/dev/projects/investment-sim-cutover-worktree/node_modules/playwright).
- Commits: one short imperative line, no AI attribution. Never push.

## Status
Live. Tier 2 (CLAUDE.md only); no ROADMAP/DECISIONS/ARCHITECTURE unless the site
grows enough to need them.
