# Portfolio Redesign: "Kinetic Editorial" (Design)

**Date:** 2026-09-24
**Status:** Design approved in brainstorming (hook = option C, page flow approved). Pending spec review.

## Goal

Rebuild johnchrisley.dev as a freelance-first portfolio that hooks a small-business
owner in the first five seconds, with all content updated to September 2026.

## Audience and success criteria

- **Primary visitor:** small-business owners and freelance clients (OnlineJobs.ph and
  similar). **Secondary:** recruiters for select full-time or remote roles.
- Within five seconds of landing, a visitor knows:
  1. what Jc builds: software that runs a small business;
  2. that it is real: a deployed client system, with proof directly under the hook;
  3. how to hire him: a "Start a project" button that leads to email.
- Performance does not regress: no third-party JS, animation limited to transform and
  opacity, and the site stays smooth on a mid-range phone.

## Confirmed facts (the source of truth for copy)

Confirmed by Jc on 2026-09-24:

- 4th-year BS Computer Engineering, MMSU Batac, graduating 2027.
- Software Engineer Intern, Komunidad Global, **May to Sep 2026** (climate-tech SaaS, Django).
- EGMC Motorparts POS is **deployed** at the store.
- J&J Grocery POS is **not live**. Label it "in testing", never "in daily use".
- Open to select full-time roles; freelance stays the main pitch.
- No public prices. The CTA is "Get a quote".

Everything else comes from `~/knowledge` (experience, projects, profile).

## Visual direction

- **Kinetic Editorial:** light paper base with giant display type and one orange accent.
  Dark ink bands are used for the proof strip and the contact section.
- **Tokens:** paper `#F4F2EC`, card `#FBFAF6`, line `#DCD8CC`, ink `#16130E`,
  ink-2 `#57524A`, ink-3 `#908A7C`, accent `#FF4D17`, status green `#1FAA59`.
- **Type:** Bricolage Grotesque (display, weight 800, tight tracking), Inter (body),
  JetBrains Mono (labels and data).
- **Standing rules from past feedback:** no photo of Jc; no custom cursor, marquee, or
  scroll cue; a minimal hero; no em dashes in site copy (use commas, colons, or "·").

## Page structure

1. **Header:** brand `John Chrisley.dev`, nav (Work, Services, About), and a
   "Start a project" pill linking to `#contact`. On mobile the nav moves into a menu
   toggle. The header gains a solid background after the first scroll.
2. **Hero:**
   - Green status dot with "Open for projects".
   - Eyebrow: "Freelance developer · Ilocos Norte, PH".
   - H1: "I build the software that runs your ___". The blank rolls through
     *parts shop. / grocery. / salon. / clinic. / restaurant.*, all business types Jc
     has built for (EGMC; J&J; BookmeIN presets).
   - Sub: "Point-of-sale, inventory, dashboards and AI automation. Built, tested and
     deployed for real businesses."
   - Buttons: "See the work" (`#work`) and "Start a project" (`#contact`).
3. **Proof strip (dark band):**
   - "Deployed." EGMC POS running in-store
   - "229" automated tests on the EGMC build (counts up once)
   - "Live." PisoFolio on Vercel
   - "'26" SWE intern at Komunidad Global
4. **Work** ("Systems real people use."): pinned stacking cards, one per project, each
   with a kicker, title, 2-3 sentence story, stack chips, a real screenshot, and one link.

   | # | Project | Kicker | Screenshot | Link |
   |---|---------|--------|------------|------|
   | 01 | EGMC Motorparts POS | Client · Deployed | New Sale: search + cart (local seed data) | none (private repo); "Private client build · ask me for a demo" goes to `#contact` |
   | 02 | PisoFolio | Live · AI | Radar signal board (public market data) | pisofolio.vercel.app |
   | 03 | J&J Grocery POS | Multi-branch · In testing | POS terminal with cart, VAT, total (local dev data) | none (private repo) |
   | 04 | AI Video Pipeline (MoneyPrinterTurbo, extended) | Open source · AI media | Creator console with 9:16 preview | github.com/Aresss615/MoneyPrinterTurbo-Extended |

   A lab row follows. Only public repos get links:
   - Job-finder bot → `job_bot` (public)
   - Bot Lab: 8 Freqtrade paper bots vs BTC (private, text only)
   - BookmeIN → `bookmein` (public)
   - MLBB Draft AI → `MLBB-draft-ai` (public)

   The dead `roadmap.johnchrisley.dev` link (no DNS record) is dropped.
5. **Services** ("What I can build for you."):
   - Three offers: POS & inventory; Web apps & dashboards; AI & automation.
   - A four-step process: Talk → Scope (clear plan + fixed quote) → Build (weekly
     demos) → Launch (deploy, train staff, keep it running).
6. **About** ("Engineer by degree. Builder by habit."): a short story (4th-year CpE, grew
   up fixing the tech in the family grocery, now builds software for stores like it)
   plus a compact timeline:
   - Komunidad Global, SWE Intern, May–Sep 2026
   - J&J Grocery, System Developer, 2022–now
   - LGU Solsona, IT Intern, 2023
   - MMSU BS CpE, 2023–2027

   This section replaces the old Capabilities, Experience, and Education sections.
7. **Contact (dark band):**
   - Headline: "Still running it on *spreadsheets?*"
   - Large email link `johnchrisley4@gmail.com`.
   - Row of GitHub, LinkedIn, phone `+63 947 893 8873`, and Résumé (existing Drive
     link).
   - Small note: "Open to select full-time roles too".
8. **Footer:** © 2026, "Designed and built from scratch", source link, back to top.

## Motion (performance budget)

- **No GSAP and no third-party JS.** Everything lives in one `script.js` (target < 8 KB).
- **Rolling word:** CSS keyframes on `translateY` only. The visible H1 includes a
  visually hidden "business." for screen readers; the roller is `aria-hidden`. It runs 3 loops (about 37 s),
  then rests on "parts shop.", and pauses while off-screen.
- **Hero entrance:** CSS staggered line-rise on load, keyed off a class set by script.
- **Counter:** "229" ticks up once via IntersectionObserver plus a short
  `requestAnimationFrame` loop (about 900 ms) that stops when done. The count starts as the proof strip fades in.
- **Stacking cards:** each card is `position: sticky` with a stepped `top`. As the next
  card slides over, the covered card scales to about 0.95 and dims slightly. One
  rAF-throttled scroll handler (active only near the Work section) writes a `--p`
  (0-1) custom property on the covered card; CSS turns it into `transform` and an
  overlay `opacity`.
- **Reveals:** an IntersectionObserver adds `.is-in`, and CSS transitions opacity and
  transform. Each element animates once, then is unobserved.
- **Stacking guard:** stacking turns on only at ≥ 761px wide AND only when every
  card fits below its sticky offset; otherwise the cards are a normal list (a
  sticky card taller than the screen would hide its own bottom). On mobile the
  screenshot sits above the text.
- **`prefers-reduced-motion: reduce`:** the word stays on "parts shop.", there is no
  entrance or reveal motion, the counter shows its final value, and cards sit in a
  normal list.
- No permanent `will-change`, no scroll-jacking, and no scrubbed filters.

## Assets

- Screenshots were captured by headless Playwright on Jc's Mac, then cropped to 16:10 and
  exported as WebP at 800w and 1600w: `img/work/{egmc,pisofolio,grocery,video}-{800,1600}.webp`
  (about 18-76 KB each).
- **Data provenance:** EGMC and J&J screenshots come from local dev databases with
  seed/demo data, not the stores' real figures. PisoFolio shows public market-data
  signals. The video console shows a sample story.
- Images use `srcset` with 800w and 1600w, explicit `width`/`height` (no layout
  shift), and `loading="lazy"` below the fold.
- **New `og.png` (1200×630):** `og.html` is restyled to the new hook and rendered by
  headless Chrome.

## SEO and meta

- **Title:** "John Chrisley Delos Santos · Freelance Software Developer (PH)".
- **Meta description and OG/Twitter text:** rewritten to the freelance pitch.
- **JSON-LD `Person`:** `jobTitle` "Freelance Software Developer"; `knowsAbout`
  updated (Django, PHP, MySQL, Python, React, POS systems, automation, LLMs).
- `sitemap.xml` lastmod set to 2026-09-24. `theme-color` stays `#F4F2EC`.

## Files

- **Rewrite:** `index.html`, `style.css`, `script.js`, `og.html`, `img/og.png`,
  `sitemap.xml`, `README.md`, `CLAUDE.md` (fix the stale "Signals / no GSAP" note;
  document the hammok deploy).
- **Add:** `img/work/*.webp`, and a `.gitignore` covering `.DS_Store`, `.superpowers/`,
  and `.playwright-mcp/`.
- **Delete (unused or public clutter):**
  - `motion.js`
  - the 12 root screenshots `v1-*.png`, `v2-*.png`, `v3-*.png`
  - the tracked `.playwright-mcp/` logs
  - `img/profile*.{jpg,png,webp}`, `img/profile-cinematic.*`, `img/jc.png`
  - `.DS_Store`, untracked from git
- **Untouched:** `legal/**` (self-contained TikTok pages), `CNAME`, `robots.txt`,
  `img/jc-logo.svg`.
- **Knowledge base, updated via the `maintaining-knowledge-repo` rules:** internship
  dates and title, 4th year, EGMC deployed, and the portfolio's new design plus hammok
  deploy.

## Deploy

- The live site is served from **hammok**, not GitHub Pages: an `nginx:alpine`
  container in `/srv/apps/portfolio` behind the Cloudflare tunnel. The
  `hammok-deploy@portfolio.timer` unit pulls `main` from GitHub every minute.
- Going live requires only Jc's `git push`. Nothing on hammok changes.
- Flagged, out of scope: nginx blocks dotfiles but serves `CLAUDE.md`, `README.md`,
  and `docs/` publicly.

## Verification (before calling it done)

Automated with headless Playwright against `python3 -m http.server`:

- Desktop 1440×900 and mobile 390×844 screenshots of every section, reviewed visually.
- Zero console errors and zero page errors.
- Every internal `#anchor` resolves to an element. Every external link returns a 2xx
  or 3xx (LinkedIn's bot-block `999` is accepted).
- No horizontal overflow at 390px (`scrollWidth <= innerWidth`).
- A reduced-motion emulation run shows a static hero word and cards in a normal list.
- Weight: no third-party `<script>`, `script.js` < 8 KB, and above-the-fold image bytes
  < 150 KB.

## Out of scope

Case-study detail pages, a blog, public prices, a dark-mode toggle, analytics,
hammok/nginx changes, and the `/legal` pages.
