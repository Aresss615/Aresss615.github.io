# Portfolio Redesign ("Kinetic Editorial") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace johnchrisley.dev with the approved freelance-first "Kinetic Editorial" one-pager: rolling-word hook, proof strip, stacking case-study cards with real screenshots, services, about, and contact.

**Architecture:** One static page: `index.html` plus `style.css` plus a dependency-free `script.js`. No framework, no build step, no third-party JS. Motion is CSS transitions and keyframes, triggered by IntersectionObserver and one rAF-throttled scroll handler for the card stack. The only animated properties are transform and opacity. A Playwright script (`tests/verify.js`) serves the repo and asserts content, layout, motion fallbacks, and links.

**Tech Stack:** HTML5, CSS custom properties, vanilla JS (ES2020), Google Fonts (Bricolage Grotesque, Inter, JetBrains Mono), Playwright (dev-only, borrowed from an existing install via `PLAYWRIGHT_MODULE`), `python3 -m http.server`, headless Chrome, `cwebp`/ImageMagick.

**Spec:** `docs/superpowers/specs/2026-09-24-portfolio-redesign-design.md`

## Global Constraints

- No third-party `<script src>`; GSAP and `motion.js` are removed. `script.js` < 8 KB.
- Animate only `transform` and `opacity`. No permanent `will-change`, no scroll-jacking, no scrubbed filters, no `backdrop-filter`.
- No photo of Jc, no custom cursor, no marquee, no scroll cue. The hero stays minimal.
- No em dashes (`—`) in visible copy. Use commas, colons, or `·`. En dash `–` is fine in date ranges.
- Confirmed facts: 4th-year BS CpE (MMSU, graduating 2027); Komunidad Global SWE Intern **May–Sep 2026**; EGMC POS **deployed**; J&J Grocery POS **in testing** (never "in daily use"); open to select full-time roles; no public prices.
- Links only to public targets: `MoneyPrinterTurbo-Extended`, `job_bot`, `bookmein`, and `MLBB-draft-ai` repos, plus pisofolio.vercel.app. No link to private repos or to `roadmap.johnchrisley.dev`.
- Colors: paper `#F4F2EC`, card `#FBFAF6`, line `#DCD8CC`, ink `#16130E`, ink-2 `#57524A`, ink-3 `#736D60`, accent `#FF4D17`, accent text on paper `#E5400F`, green `#1FAA59`, forest `#26332B`.
- `legal/**`, `CNAME`, `robots.txt`, and `img/jc-logo.svg` are untouched.
- Commits: one short imperative subject line, no body, no Co-Authored-By or AI attribution. Never push.

## Review Focus

1. **A card taller than the screen while sticky.** Its bottom would be hidden forever under the next card. Expected: stacking turns on only when every card fits below its sticky offset; otherwise the cards are a normal list. Pinned by Task 1 checks "no stacking when a card is taller than the screen (1440x600)" and "cards are a plain list at 390px".
2. **Narrow phones (320px) with the long rolling word "restaurant." or the email address.** Expected: no horizontal scroll. Pinned by Task 1 check "no horizontal scroll at 320px".
3. **`script.js` blocked or failing** (ad blocker, flaky network). Expected: all content becomes visible within about 3 s. Pinned by Task 1 check "content shows even if script.js fails to load".
4. **Resizing from phone to desktop with the menu open.** Expected: the menu closes and stacking re-measures. Pinned by Task 1 checks "widening to desktop closes the menu" and "widening to desktop turns stacking on".
5. **Keyboard users on the mobile menu.** Expected: Escape closes it and focus returns to the toggle. Pinned by Task 1 check "Escape closes the menu and returns focus".

---

## File Structure

| File | Responsibility |
|------|----------------|
| `tests/verify.js` | **Create.** Serves the repo, runs every automated check, and saves screenshots with `--shots`. |
| `index.html` | **Rewrite.** Markup, copy, meta, and JSON-LD for the whole page. |
| `style.css` | **Rewrite.** Design tokens, layout, components, motion states, and reduced-motion rules. |
| `script.js` | **Rewrite.** Boot, header state, mobile menu, reveals, roller pause, counter, card stack. |
| `og.html` + `img/og.png` | **Rewrite.** Source and render of the 1200×630 share image. |
| `img/work/*.webp` | **Create.** Four screenshots × two sizes (800w, 1600w). |
| `sitemap.xml`, `README.md`, `CLAUDE.md`, `.gitignore` | **Update / create.** |
| `motion.js`, `v*.png`, `.playwright-mcp/`, `img/profile*`, `img/jc.png`, `.DS_Store` | **Delete / untrack.** |

Screenshots were already captured and converted during brainstorming. They live at
`/private/tmp/claude-501/-Users-jc-dev-projects-Aresss615-github-io/27f0a506-5930-49ed-8955-70460999b291/scratchpad/work/*.webp`
(below, `$SCRATCH` = that scratchpad directory).

Playwright for the checks: `export PLAYWRIGHT_MODULE=/Users/jc/dev/projects/investment-sim-cutover-worktree/node_modules/playwright`

---

### Task 1: Verification harness

**Files:**
- Create: `tests/verify.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `node tests/verify.js [--no-external] [--shots DIR]`. It prints `PASS`/`FAIL` lines and exits 1 on any failure. Later tasks depend on these DOM hooks:
  - `h1`, `.roller`, `.roller__track > span`, `.cases`
  - `.case` (li with `--i`), `.case > .case__card`, `.case__title`
  - `#header.is-scrolled`, `#menuToggle`, `#mobileMenu[hidden]`
  - `[data-reveal]`, `[data-hero]`, `[data-count]`
  - `#hero`, `#work`, `#services`, `#about`, `#contact`, `#top`
  - `window.__jc`, and the `html.js`, `html.is-loaded`, and `html.no-motion` classes

- [ ] **Step 1: Write the check script**

Create `tests/verify.js`:

```js
#!/usr/bin/env node
/* ================================================================
   Site checks for johnchrisley.dev
   Serves the repo with python3's http.server, drives headless Chromium
   through Playwright, prints PASS/FAIL per check, exits 1 on any FAIL.

   Run:  PLAYWRIGHT_MODULE=/abs/path/to/node_modules/playwright node tests/verify.js
   Flags: --no-external   skip live checks of outbound links
          --shots <dir>   save desktop + mobile screenshots for review
   ================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}/`;
const argv = process.argv.slice(2);
const SKIP_EXTERNAL = argv.includes('--no-external');
const SHOTS = argv.includes('--shots') ? path.resolve(argv[argv.indexOf('--shots') + 1]) : null;

const DESKTOP = { width: 1440, height: 900 };
const SHORT = { width: 1440, height: 600 };
const MOBILE = { width: 390, height: 844 };
const TINY = { width: 320, height: 640 };

const WORDS = ['parts shop.', 'grocery.', 'salon.', 'clinic.', 'restaurant.', 'parts shop.'];
const CASES = ['EGMC Motorparts POS', 'PisoFolio', 'J&J Grocery POS', 'AI Video Pipeline'];

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: Boolean(ok), detail: String(detail) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/* ---------- server ---------- */
function startServer() {
  return spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
}
async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) return; } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error(`server did not start on ${BASE}`);
}

/* ---------- helpers ---------- */
async function open(browser, { viewport = DESKTOP, reducedMotion = 'no-preference', blockScript = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  if (blockScript) await page.route('**/script.js*', (route) => route.abort());
  await page.goto(BASE, { waitUntil: 'load' });
  await sleep(300);
  return { context, page, errors };
}

// Scroll top to bottom in steps so every reveal and lazy image fires.
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.7);
    for (let y = 0; y <= document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await sleep(1200);
}

async function screenshots(page, label) {
  fs.mkdirSync(SHOTS, { recursive: true });
  for (const id of ['hero', 'work', 'services', 'about', 'contact']) {
    await page.evaluate((sel) => document.getElementById(sel)?.scrollIntoView({ behavior: 'instant', block: 'start' }), id);
    await sleep(700);
    await page.screenshot({ path: path.join(SHOTS, `${label}-${id}.png`) });
  }
  // Mid-stack frame: the third card arriving over the second.
  await page.evaluate(async () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 100));
    const c = document.querySelectorAll('.case')[2];
    if (c) window.scrollTo({ top: c.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.45, behavior: 'instant' });
  });
  await sleep(700);
  await page.screenshot({ path: path.join(SHOTS, `${label}-stack.png`) });
}

/* ---------- 1 · file checks ---------- */
function fileChecks() {
  const html = read('index.html');
  const jsBytes = fs.statSync(path.join(ROOT, 'script.js')).size;
  check('script.js is under 8 KB', jsBytes < 8192, `${jsBytes} bytes`);
  check('no third-party <script src>', !/<script[^>]*\ssrc=["']https?:/i.test(html));
  check('motion.js is gone', !exists('motion.js'));
  check('no link to dead roadmap subdomain', !html.includes('roadmap.johnchrisley.dev'));
  check('grocery POS is not claimed live', !/in daily use/i.test(html));
  check('internship reads May–Sep 2026', html.includes('May–Sep 2026'));
  check('title names the freelance role', /<title>[^<]*Freelance Software Developer[^<]*<\/title>/.test(html));
  check('og.html carries the new hook', read('og.html').includes('that runs your'));
  const png = fs.readFileSync(path.join(ROOT, 'img/og.png'));
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  check('img/og.png is 1200x630', w === 1200 && h === 630, `${w}x${h}`);
  check('sitemap lastmod is 2026-09-24', read('sitemap.xml').includes('<lastmod>2026-09-24</lastmod>'));
  for (const name of ['egmc', 'pisofolio', 'grocery', 'video']) {
    for (const size of [800, 1600]) check(`img/work/${name}-${size}.webp exists`, exists(`img/work/${name}-${size}.webp`));
  }
  const clutter = fs.readdirSync(ROOT).filter((n) => /^v\d.*\.png$/.test(n));
  check('old root screenshots removed', clutter.length === 0, clutter.join(', '));
  const ignore = exists('.gitignore') ? read('.gitignore') : '';
  check('.gitignore covers scratch dirs', ['.superpowers/', '.playwright-mcp/', '.DS_Store'].every((p) => ignore.includes(p)));
}

/* ---------- 2 · desktop ---------- */
async function desktopChecks(browser) {
  const { context, page, errors } = await open(browser);

  const firstLoadImageBytes = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((e) => e.initiatorType === 'img').reduce((sum, e) => sum + e.transferSize, 0));
  check('first-load image bytes < 150 KB', firstLoadImageBytes < 150 * 1024, `${Math.round(firstLoadImageBytes / 1024)} KB`);

  const d = await page.evaluate(() => {
    const texts = (sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    return {
      h1: (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim(),
      words: texts('.roller__track > span'),
      missingSections: ['hero', 'work', 'services', 'about', 'contact'].filter((id) => !document.getElementById(id)),
      cases: texts('.case .case__title'),
      text: document.body.innerText,
      deadAnchors: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'))
        .filter((h) => h.length > 1 && !document.getElementById(h.slice(1))),
      badImgs: [...document.images].filter((i) => !i.alt || !i.getAttribute('width') || !i.getAttribute('height'))
        .map((i) => i.getAttribute('src')),
      stacking: document.querySelector('.cases')?.classList.contains('is-stacking') || false,
    };
  });
  check('h1 opens with the hook', d.h1.startsWith('I build the software that runs your'), d.h1.slice(0, 60));
  check('roller lists the five business types', JSON.stringify(d.words) === JSON.stringify(WORDS), d.words.join(' | '));
  check('hero/work/services/about/contact sections exist', d.missingSections.length === 0, d.missingSections.join(', '));
  check('case studies in approved order', JSON.stringify(d.cases) === JSON.stringify(CASES), d.cases.join(' | '));
  check('no em dash in visible copy', !d.text.includes('—'));
  check('every #anchor resolves', d.deadAnchors.length === 0, d.deadAnchors.join(', '));
  check('every image has alt + width + height', d.badImgs.length === 0, d.badImgs.join(', '));
  check('cards stack on a 1440x900 desktop', d.stacking);

  // Put card 2 halfway over card 1: card 1 should be easing back (0 < --p < 1).
  const p = await page.evaluate(async () => {
    const cards = [...document.querySelectorAll('.case')];
    if (cards.length < 2 || !cards[0].firstElementChild) return -1;
    const second = cards[1];
    const stickTop = parseFloat(getComputedStyle(second).top) || 0;
    const naturalTop = second.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: naturalTop - stickTop - cards[0].offsetHeight * 0.5, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 250));
    return parseFloat(cards[0].firstElementChild.style.getPropertyValue('--p')) || 0;
  });
  check('covered card eases back while the next slides over', p > 0.2 && p < 0.8, `--p=${p}`);

  const solid = await page.evaluate(() => document.getElementById('header')?.classList.contains('is-scrolled'));
  check('header turns solid after scrolling', solid);

  await scrollThrough(page);
  const imgsLoaded = await page.evaluate(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
  check('all images load after a full scroll', imgsLoaded);
  const external = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="http"]')].map((a) => a.href))]);
  check('no console or page errors (desktop)', errors.length === 0, errors.join(' / '));

  if (SHOTS) await screenshots(page, 'desktop');
  await context.close();
  return external;
}

/* ---------- 3 · short desktop ---------- */
async function shortDesktopCheck(browser) {
  const { context, page } = await open(browser, { viewport: SHORT });
  const stacking = await page.evaluate(() => document.querySelector('.cases')?.classList.contains('is-stacking'));
  check('no stacking when a card is taller than the screen (1440x600)', stacking === false);
  await context.close();
}

/* ---------- 4 · mobile ---------- */
async function mobileChecks(browser) {
  for (const viewport of [MOBILE, TINY]) {
    const { context, page, errors } = await open(browser, { viewport });
    await scrollThrough(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`no horizontal scroll at ${viewport.width}px`, overflow <= 0, `${overflow}px over`);
    const stacking = await page.evaluate(() => document.querySelector('.cases')?.classList.contains('is-stacking'));
    check(`cards are a plain list at ${viewport.width}px`, stacking === false);
    check(`no console or page errors (${viewport.width}px)`, errors.length === 0, errors.join(' / '));

    if (viewport === MOBILE) {
      const state = () => page.evaluate(() => ({
        hidden: document.getElementById('mobileMenu')?.hidden,
        expanded: document.getElementById('menuToggle')?.getAttribute('aria-expanded'),
        focus: document.activeElement?.id,
        stacking: document.querySelector('.cases')?.classList.contains('is-stacking'),
      }));
      await page.click('#menuToggle');
      const opened = await state();
      check('menu opens from the toggle', opened.hidden === false && opened.expanded === 'true', JSON.stringify(opened));
      await page.keyboard.press('Escape');
      const closed = await state();
      check('Escape closes the menu and returns focus', closed.hidden === true && closed.focus === 'menuToggle', JSON.stringify(closed));
      await page.click('#menuToggle');
      await page.setViewportSize(DESKTOP);
      await sleep(500);
      const wide = await state();
      check('widening to desktop closes the menu', wide.hidden === true, JSON.stringify(wide));
      check('widening to desktop turns stacking on', wide.stacking === true, JSON.stringify(wide));
      if (SHOTS) {
        await page.setViewportSize(MOBILE);
        await sleep(400);
        await screenshots(page, 'mobile');
      }
    }
    await context.close();
  }
}

/* ---------- 5 · reduced motion ---------- */
async function reducedMotionChecks(browser) {
  const { context, page } = await open(browser, { reducedMotion: 'reduce' });
  const r = await page.evaluate(() => {
    const track = document.querySelector('.roller__track');
    return {
      anim: track ? getComputedStyle(track).animationName : 'missing',
      transform: track ? getComputedStyle(track).transform : 'missing',
      stacking: document.querySelector('.cases')?.classList.contains('is-stacking'),
      hidden: [...document.querySelectorAll('[data-reveal], [data-hero]')].filter((el) => getComputedStyle(el).opacity !== '1').length,
    };
  });
  check('reduced motion: word rests on "parts shop."', r.anim === 'none' && r.transform === 'none', JSON.stringify(r));
  check('reduced motion: cards are a plain list', r.stacking === false);
  check('reduced motion: nothing waits to be revealed', r.hidden === 0, `${r.hidden} hidden`);
  await context.close();
}

/* ---------- 6 · script blocked ---------- */
async function noScriptFallbackCheck(browser) {
  const { context, page } = await open(browser, { blockScript: true });
  await sleep(3500);
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-hero]')]
    .filter((el) => getComputedStyle(el).opacity !== '1').length);
  check('content shows even if script.js fails to load', hidden === 0, `${hidden} hidden`);
  await context.close();
}

/* ---------- 7 · outbound links ---------- */
async function externalChecks(urls) {
  if (SKIP_EXTERNAL) { check('outbound links (skipped)', true); return; }
  for (const url of urls) {
    let status = -1;
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'Mozilla/5.0 (link check)' } });
      status = res.status;
    } catch { /* network error: status stays -1 */ }
    const ok = (status >= 200 && status < 400) || (url.includes('linkedin.com') && status === 999);
    check(`link ${url}`, ok, `status ${status}`);
  }
}

/* ---------- run ---------- */
(async () => {
  const server = startServer();
  let browser;
  try {
    await waitForServer();
    try { fileChecks(); } catch (e) { check('file checks ran', false, e.message); }
    browser = await chromium.launch();
    const external = await desktopChecks(browser);
    await shortDesktopCheck(browser);
    await mobileChecks(browser);
    await reducedMotionChecks(browser);
    await noScriptFallbackCheck(browser);
    await externalChecks(external);
  } catch (e) {
    check('verify.js ran to completion', false, e.stack || e.message);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${!r.ok && r.detail ? `  (${r.detail})` : ''}`);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
```

- [ ] **Step 2: Run it against the current (old) site and confirm it fails**

Run: `PLAYWRIGHT_MODULE=/Users/jc/dev/projects/investment-sim-cutover-worktree/node_modules/playwright node tests/verify.js --no-external`
Expected: exit 1. FAIL lines include "no third-party <script src>", "motion.js is gone", "roller lists the five business types", "case studies in approved order", "internship reads May–Sep 2026", and "no em dash in visible copy". The last line reads "N/M checks passed" with N < M, and no "verify.js ran to completion" failure (the harness itself works).

- [ ] **Step 3: Commit**

```bash
git add tests/verify.js
git commit -m "Add site verification script"
```

---

### Task 2: Assets and cleanup

**Files:**
- Create: `img/work/{egmc,pisofolio,grocery,video}-{800,1600}.webp`, `.gitignore`
- Delete: `motion.js`, `v1-hero-top.png`, `v1-hero.png`, `v2-hero.png`, `v3-*.png` (9 files), `.playwright-mcp/` (tracked logs), `img/profile.{jpg,png,webp}`, `img/profile-cinematic.{jpg,png,webp}`, `img/jc.png`
- Untrack: `.DS_Store`

**Interfaces:**
- Consumes: the WebP files in `$SCRATCH/work/`.
- Produces: `img/work/<name>-<800|1600>.webp`, each 16:10 (800×500 and 1600×1000). Task 3's markup references these paths.

- [ ] **Step 1: Copy the screenshots in and confirm their sizes**

```bash
SCRATCH=/private/tmp/claude-501/-Users-jc-dev-projects-Aresss615-github-io/27f0a506-5930-49ed-8955-70460999b291/scratchpad
mkdir -p img/work
for n in egmc pisofolio grocery video; do for s in 800 1600; do cp "$SCRATCH/work/$n-$s.webp" img/work/; done; done
for f in img/work/*.webp; do magick identify -format "%f %wx%h %b\n" "$f"; done
```
Expected: 8 lines; the `*-800.webp` files are `800x500` and the `*-1600.webp` files are `1600x1000`, each under 80 KB.

- [ ] **Step 2: Remove clutter and write `.gitignore`**

```bash
git rm -q motion.js v1-hero-top.png v1-hero.png v2-hero.png v3-contact.png v3-hero-top.png v3-hero.png v3-mobile-hero.png v3-mobile-menu.png v3-mobile-menu2.png v3-work.png v3-work2.png v3-work3.png
git rm -rq .playwright-mcp
git rm -q img/profile.jpg img/profile.png img/profile.webp img/profile-cinematic.jpg img/profile-cinematic.png img/profile-cinematic.webp img/jc.png
git rm -q --cached .DS_Store
rm -rf .playwright-mcp
```

Create `.gitignore`:

```gitignore
.DS_Store
.superpowers/
.playwright-mcp/
```

- [ ] **Step 3: Run the file checks**

Run: `PLAYWRIGHT_MODULE=/Users/jc/dev/projects/investment-sim-cutover-worktree/node_modules/playwright node tests/verify.js --no-external | grep -E "webp|motion.js|screenshots removed|gitignore"`
Expected: all 11 matching lines start with `PASS`. The old `index.html` still loads the missing `motion.js`, so a desktop console-error FAIL elsewhere is expected until Task 3.

- [ ] **Step 4: Commit**

```bash
git add img/work .gitignore
git commit -m "Add work screenshots, remove old assets"
```

---

### Task 3: Page markup

**Files:**
- Rewrite: `index.html`

**Interfaces:**
- Consumes: `img/work/*.webp` (Task 2).
- Produces every hook listed in Task 1. Class names used by Task 4 (CSS) and Task 5 (JS):
  - **Header:** `header#header.header`, `.brand`, `.nav`, `.header__cta`, `button#menuToggle.menu-toggle`, `div#mobileMenu.mobile-menu[hidden]`
  - **Hero:** `.hero`, `.status`, `.status__dot`, `.hero__title`, `.hero__line[data-hero]`, `.roller`, `.roller__sizer`, `.roller__track`, `.hero__foot`
  - **Proof:** `.proof`, `.proof__grid`, `.proof__item`, `.proof__big`, `[data-count="229"]`, `.proof__label`
  - **Work:** `.cases > li.case.case--{paper|accent|ink|forest}[style="--i:N"][data-reveal] > article.case__card`, `.case__body`, `.case__kicker`, `.case__title`, `.case__text`, `.chips`, `.case__link`, `.case__note`, `figure.case__shot > img`
  - **Lab:** `.lab`, `.lab__head`, `.lab__grid`, `.lab__card`, `.lab__name`, `.lab__desc`, `.lab__meta`
  - **Services:** `.offers > li.offer`, `.offer__num`, `ol.steps > li.step`, `.step__k`, `.services__cta`, `.services__note`
  - **About:** `.about__grid`, `.about__text`, `ol.timeline`, `.timeline__when`
  - **Contact and footer:** `.contact`, `.contact__title`, `.contact__sub`, `.contact__mail`, `.contact__links`, `.contact__note`, `.footer`, `.footer__inner`
  - **Shared:** `.btn`, `.btn--ink`, `.btn--line`, `.btn--accent`, `.btn--sm`, `.tag`, `.sec-head`, `.sec-head__title`, `.sec-head__note`, `.sr-only`

- [ ] **Step 1: Replace `index.html` entirely**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>John Chrisley Delos Santos · Freelance Software Developer (PH)</title>
  <meta name="description" content="Freelance software developer in the Philippines. I build point-of-sale, inventory, dashboards and AI automation for small businesses: built, tested and deployed." />
  <meta name="author" content="John Chrisley E. Delos Santos" />
  <meta name="theme-color" content="#F4F2EC" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://johnchrisley.dev/" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://johnchrisley.dev/" />
  <meta property="og:title" content="John Chrisley Delos Santos · Freelance Software Developer" />
  <meta property="og:description" content="I build the software that runs your business: point-of-sale, inventory, dashboards and AI automation. Built, tested and deployed." />
  <meta property="og:image" content="https://johnchrisley.dev/img/og.png?v=kinetic1" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="John Chrisley Delos Santos · Freelance Software Developer" />
  <meta name="twitter:description" content="I build the software that runs your business: POS, inventory, dashboards and AI automation." />
  <meta name="twitter:image" content="https://johnchrisley.dev/img/og.png?v=kinetic1" />

  <link rel="icon" type="image/svg+xml" href="img/jc-logo.svg" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&amp;family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@500;600;700&amp;display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css?v=kinetic1" />

  <script>
    document.documentElement.classList.add('js');
    setTimeout(function () { if (!window.__jc) document.documentElement.classList.add('no-motion'); }, 3000);
  </script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "John Chrisley E. Delos Santos",
    "alternateName": "Jc",
    "url": "https://johnchrisley.dev",
    "image": "https://johnchrisley.dev/img/og.png",
    "jobTitle": "Freelance Software Developer",
    "description": "Freelance software developer in the Philippines building point-of-sale, inventory, dashboards and AI automation for small businesses.",
    "alumniOf": { "@type": "CollegeOrUniversity", "name": "Mariano Marcos State University" },
    "address": { "@type": "PostalAddress", "addressLocality": "Solsona", "addressRegion": "Ilocos Norte", "addressCountry": "PH" },
    "email": "mailto:johnchrisley4@gmail.com",
    "sameAs": ["https://github.com/Aresss615", "https://www.linkedin.com/in/johnchrisley"],
    "knowsAbout": ["Django", "Python", "PHP", "MySQL", "JavaScript", "React", "Point of sale systems", "Inventory management", "Automation", "Large language models"]
  }
  </script>
</head>
<body>

  <a href="#work" class="skip-link">Skip to work</a>

  <header class="header" id="header">
    <div class="container header__inner">
      <a href="#top" class="brand" aria-label="John Chrisley, back to top">
        <svg class="brand__mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke="currentColor" stroke-width="1.2"/>
          <path d="M15.5 6.5v6.2c0 2.3-1.5 3.6-3.7 3.6-1 0-1.9-.25-2.6-.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M17 7.2A5.6 5.6 0 0 0 13.4 6 5.6 5.6 0 1 0 17 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>
        </svg>
        <span>John Chrisley<span class="brand__dim">.dev</span></span>
      </a>
      <nav class="nav" aria-label="Primary">
        <a href="#work">Work</a>
        <a href="#services">Services</a>
        <a href="#about">About</a>
      </nav>
      <a href="#contact" class="btn btn--ink btn--sm header__cta">Start a project</a>
      <button class="menu-toggle" id="menuToggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu"><span></span></button>
    </div>
  </header>

  <div class="mobile-menu" id="mobileMenu" hidden>
    <nav aria-label="Mobile">
      <a href="#work">Work</a>
      <a href="#services">Services</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
    <a href="#contact" class="btn btn--accent">Start a project</a>
  </div>

  <main id="top">

    <!-- HERO -->
    <section class="hero" id="hero" aria-labelledby="hero-title">
      <div class="container">
        <p class="status" data-hero style="--d:0">
          <span class="status__dot" aria-hidden="true"></span>
          <span>Open for projects</span>
          <span class="status__dim">Freelance developer · Ilocos Norte, PH</span>
        </p>
        <h1 class="hero__title" id="hero-title">
          <span class="hero__line" data-hero style="--d:1">I build the software</span>
          <span class="hero__line" data-hero style="--d:2">that runs your <span class="sr-only">business.</span><span class="roller" aria-hidden="true"><span class="roller__sizer">restaurant.</span><span class="roller__track"><span>parts shop.</span><span>grocery.</span><span>salon.</span><span>clinic.</span><span>restaurant.</span><span>parts shop.</span></span></span></span>
        </h1>
        <div class="hero__foot" data-hero style="--d:3">
          <p class="hero__sub">Point-of-sale, inventory, dashboards and AI automation. Built, tested and deployed for real businesses.</p>
          <div class="hero__actions">
            <a href="#work" class="btn btn--ink">See the work
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>
            </a>
            <a href="#contact" class="btn btn--line">Start a project</a>
          </div>
        </div>
      </div>
    </section>

    <!-- PROOF -->
    <section class="proof" aria-label="Proof">
      <div class="container proof__grid">
        <div class="proof__item" data-reveal style="--d:0">
          <span class="proof__big">Deployed<em>.</em></span>
          <span class="proof__label">EGMC POS running in-store</span>
        </div>
        <div class="proof__item" data-reveal style="--d:1">
          <span class="proof__big" data-count="229">229</span>
          <span class="proof__label">automated tests on the EGMC build</span>
        </div>
        <div class="proof__item" data-reveal style="--d:2">
          <span class="proof__big">Live<em>.</em></span>
          <span class="proof__label">PisoFolio on Vercel</span>
        </div>
        <div class="proof__item" data-reveal style="--d:3">
          <span class="proof__big">’26</span>
          <span class="proof__label">SWE intern at Komunidad Global</span>
        </div>
      </div>
    </section>

    <!-- 01 · WORK -->
    <section class="section work" id="work" aria-labelledby="work-title">
      <div class="container">
        <header class="sec-head" data-reveal>
          <p class="tag">01 / Selected work</p>
          <h2 class="sec-head__title" id="work-title">Systems real people <em>use.</em></h2>
          <p class="sec-head__note">Four builds, from a paying client’s parts store to an AI video pipeline. Real screens, real stacks.</p>
        </header>

        <ol class="cases">

          <li class="case case--paper" style="--i:0" data-reveal>
            <article class="case__card">
              <div class="case__body">
                <p class="case__kicker"><b>01</b> Client · Deployed</p>
                <h3 class="case__title">EGMC Motorparts POS</h3>
                <p class="case__text">Point-of-sale and inventory for a motorcycle parts store with a repair shop. Cashiers find any part by name, brand, part number or the bike it fits. The owner, based in the US, checks sales, stock and profit from anywhere.</p>
                <ul class="chips" aria-label="Stack"><li>Django</li><li>MySQL</li><li>HTMX</li><li>Tailwind</li><li>229 tests</li></ul>
                <a href="#contact" class="case__link">Private client build · ask me for a demo
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                </a>
              </div>
              <figure class="case__shot">
                <img src="img/work/egmc-800.webp" srcset="img/work/egmc-800.webp 800w, img/work/egmc-1600.webp 1600w" sizes="(max-width: 860px) calc(100vw - 4.5rem), 600px" width="1600" height="1000" loading="lazy" decoding="async" alt="EGMC Motorparts New Sale screen: a parts search for battery above a cart with brake pads, a spark plug and a CVT belt" />
              </figure>
            </article>
          </li>

          <li class="case case--accent" style="--i:1" data-reveal>
            <article class="case__card">
              <div class="case__body">
                <p class="case__kicker"><b>02</b> Live · AI</p>
                <h3 class="case__title">PisoFolio</h3>
                <p class="case__text">A paper-trading simulator in Philippine pesos with an AI investment buddy. Its Radar collects market data every 30 minutes on its own and ranks signals across crypto and US stocks.</p>
                <ul class="chips" aria-label="Stack"><li>React</li><li>Vercel</li><li>Supabase</li><li>Gemini</li><li>GitHub Actions</li></ul>
                <a href="https://pisofolio.vercel.app" target="_blank" rel="noopener" class="case__link">Open the live app
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
                </a>
              </div>
              <figure class="case__shot">
                <img src="img/work/pisofolio-800.webp" srcset="img/work/pisofolio-800.webp 800w, img/work/pisofolio-1600.webp 1600w" sizes="(max-width: 860px) calc(100vw - 4.5rem), 600px" width="1600" height="1000" loading="lazy" decoding="async" alt="PisoFolio Radar board ranking long and short signals for AMD, NFLX, SOL, AAPL and more" />
              </figure>
            </article>
          </li>

          <li class="case case--ink" style="--i:2" data-reveal>
            <article class="case__card">
              <div class="case__body">
                <p class="case__kicker"><b>03</b> Multi-branch · In testing</p>
                <h3 class="case__title">J&amp;J Grocery POS</h3>
                <p class="case__text">Checkout and inventory for my family’s grocery: barcode scanning, BIR-format receipts with 12% VAT, cash and GCash tender, and a double-entry journal behind every sale. In testing before rollout.</p>
                <ul class="chips" aria-label="Stack"><li>PHP 8</li><li>MySQL</li><li>JavaScript</li><li>PHPUnit</li></ul>
                <p class="case__note">Private repo · in testing before rollout</p>
              </div>
              <figure class="case__shot">
                <img src="img/work/grocery-800.webp" srcset="img/work/grocery-800.webp 800w, img/work/grocery-1600.webp 1600w" sizes="(max-width: 860px) calc(100vw - 4.5rem), 600px" width="1600" height="1000" loading="lazy" decoding="async" alt="J&amp;J Grocery POS terminal: product grid and a five-item sale totalling 621 pesos with VAT" />
              </figure>
            </article>
          </li>

          <li class="case case--forest" style="--i:3" data-reveal>
            <article class="case__card">
              <div class="case__body">
                <p class="case__kicker"><b>04</b> Open source · AI media</p>
                <h3 class="case__title">AI Video Pipeline</h3>
                <p class="case__text">A fork of MoneyPrinterTurbo that I extended into a faceless short-video studio: script, local voice cloning, word-by-word captions and a 9:16 render, all on my own machine.</p>
                <ul class="chips" aria-label="Stack"><li>Python</li><li>WhisperX</li><li>Chatterbox TTS</li><li>FFmpeg</li></ul>
                <a href="https://github.com/Aresss615/MoneyPrinterTurbo-Extended" target="_blank" rel="noopener" class="case__link">Read the code
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>
                </a>
              </div>
              <figure class="case__shot">
                <img src="img/work/video-800.webp" srcset="img/work/video-800.webp 800w, img/work/video-1600.webp 1600w" sizes="(max-width: 860px) calc(100vw - 4.5rem), 600px" width="1600" height="1000" loading="lazy" decoding="async" alt="Video pipeline console: a story script beside a 9:16 phone preview with word-highlighted captions" />
              </figure>
            </article>
          </li>

        </ol>

        <div class="lab" data-reveal>
          <div class="lab__head">
            <p class="tag">Also in the lab</p>
            <a href="https://github.com/Aresss615" target="_blank" rel="noopener" class="lab__all">GitHub profile ↗</a>
          </div>
          <ul class="lab__grid">
            <li>
              <a class="lab__card" href="https://github.com/Aresss615/job_bot" target="_blank" rel="noopener">
                <span class="lab__name">Job-finder bot</span>
                <span class="lab__desc">A daily cron that pulls remote job posts, scores them against my profile and emails the best leads.</span>
                <span class="lab__meta">Python · GitHub Actions</span>
              </a>
            </li>
            <li>
              <div class="lab__card">
                <span class="lab__name">Bot Lab</span>
                <span class="lab__desc">Eight Freqtrade paper-trading bots racing plain BTC buy-and-hold, with a live scoreboard.</span>
                <span class="lab__meta">Private · Python · Docker</span>
              </div>
            </li>
            <li>
              <a class="lab__card" href="https://github.com/Aresss615/bookmein" target="_blank" rel="noopener">
                <span class="lab__name">BookmeIN</span>
                <span class="lab__desc">One booking engine for hotels, salons and clinics. Row locks make double-booking impossible.</span>
                <span class="lab__meta">PHP · MySQL · JS</span>
              </a>
            </li>
            <li>
              <a class="lab__card" href="https://github.com/Aresss615/MLBB-draft-ai" target="_blank" rel="noopener">
                <span class="lab__name">MLBB Draft AI</span>
                <span class="lab__desc">A pick-and-counter drafting assistant for Mobile Legends.</span>
                <span class="lab__meta">React · TypeScript</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 02 · SERVICES -->
    <section class="section services" id="services" aria-labelledby="services-title">
      <div class="container">
        <header class="sec-head" data-reveal>
          <p class="tag">02 / Services</p>
          <h2 class="sec-head__title" id="services-title">What I can build <em>for you.</em></h2>
          <p class="sec-head__note">If your business runs on paper, spreadsheets or group chats, there is probably a system that saves you hours every week. I build it, test it and stay on to keep it running.</p>
        </header>

        <ul class="offers">
          <li class="offer" data-reveal style="--d:0">
            <span class="offer__num">01</span>
            <h3>POS &amp; inventory</h3>
            <p>Checkout, stock, restock, suppliers, sales and profit reports. Runs on the store laptop you already have.</p>
          </li>
          <li class="offer" data-reveal style="--d:1">
            <span class="offer__num">02</span>
            <h3>Web apps &amp; dashboards</h3>
            <p>Booking systems, records and owner dashboards you can check from your phone, from anywhere.</p>
          </li>
          <li class="offer" data-reveal style="--d:2">
            <span class="offer__num">03</span>
            <h3>AI &amp; automation</h3>
            <p>LLM features, bots and scheduled jobs that take the boring, repetitive work off your plate.</p>
          </li>
        </ul>

        <ol class="steps" data-reveal aria-label="How a project works">
          <li class="step"><span class="step__k">01 · Talk</span><p>A free call about how your business runs today.</p></li>
          <li class="step"><span class="step__k">02 · Scope</span><p>A clear plan and a fixed quote before any code is written.</p></li>
          <li class="step"><span class="step__k">03 · Build</span><p>Weekly demos, so you test it while it grows.</p></li>
          <li class="step"><span class="step__k">04 · Launch</span><p>I deploy it, train your staff and keep it running.</p></li>
        </ol>

        <div class="services__cta" data-reveal>
          <a href="#contact" class="btn btn--accent">Get a quote
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
          <p class="services__note">No public price list. Every project gets its own fixed quote.</p>
        </div>
      </div>
    </section>

    <!-- 03 · ABOUT -->
    <section class="section about" id="about" aria-labelledby="about-title">
      <div class="container about__grid">
        <div data-reveal>
          <p class="tag">03 / About</p>
          <h2 class="sec-head__title" id="about-title">Engineer by degree.<br />Builder by <em>habit.</em></h2>
          <p class="about__text">I’m John Chrisley, “Jc”, a 4th-year Computer Engineering student at Mariano Marcos State University. Since 2022 I’ve kept the tech running at my family’s grocery in Solsona, and now I build the software that runs stores like it.</p>
          <p class="about__text">This year I interned as a software engineer at Komunidad Global, a climate-tech SaaS company, working on a Django early-warning pipeline that sends SMS, email and Telegram alerts. I work end to end: database, backend, the screen your staff uses, and the deploy.</p>
        </div>
        <ol class="timeline" data-reveal style="--d:1">
          <li><span class="timeline__when">May–Sep 2026</span><div><b>Software Engineer Intern</b><small>Komunidad Global · climate-tech SaaS · Django</small></div></li>
          <li><span class="timeline__when">2022–now</span><div><b>System Developer &amp; Tech Support</b><small>J&amp;J Grocery · Solsona, Ilocos Norte</small></div></li>
          <li><span class="timeline__when">2023</span><div><b>IT Intern</b><small>LGU Solsona · records, LAN, backups</small></div></li>
          <li><span class="timeline__when">2023–2027</span><div><b>BS Computer Engineering</b><small>MMSU Batac · 4th year</small></div></li>
        </ol>
      </div>
    </section>

    <!-- 04 · CONTACT -->
    <section class="contact" id="contact" aria-labelledby="contact-title">
      <div class="container">
        <p class="tag" data-reveal>04 / Contact</p>
        <h2 class="contact__title" id="contact-title" data-reveal>Still running it<br />on <em>spreadsheets?</em></h2>
        <p class="contact__sub" data-reveal>Tell me how your business runs today and what keeps breaking. I read every message and reply with ideas and a fixed quote.</p>
        <a class="contact__mail" href="mailto:johnchrisley4@gmail.com?subject=Project%20inquiry" data-reveal>johnchrisley4@gmail.com
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
        <ul class="contact__links" data-reveal>
          <li><a href="https://github.com/Aresss615" target="_blank" rel="noopener">GitHub</a></li>
          <li><a href="https://www.linkedin.com/in/johnchrisley" target="_blank" rel="noopener">LinkedIn</a></li>
          <li><a href="tel:+639478938873">+63 947 893 8873</a></li>
          <li><a href="https://drive.google.com/uc?export=download&amp;id=1K0SmSttcz0BwnOK9-gqVg9O5dzLa0S3p">Résumé ↓</a></li>
        </ul>
        <p class="contact__note" data-reveal>Open to select full-time roles too.</p>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container footer__inner">
      <span>© 2026 John Chrisley E. Delos Santos</span>
      <span>Designed and built from scratch · no framework, no template</span>
      <span><a href="https://github.com/Aresss615/Aresss615.github.io" target="_blank" rel="noopener">Source</a> · <a href="#top">Back to top ↑</a></span>
    </div>
  </footer>

  <script src="script.js?v=kinetic1" defer></script>
</body>
</html>
```

- [ ] **Step 2: Run the content checks**

Run: `PLAYWRIGHT_MODULE=/Users/jc/dev/projects/investment-sim-cutover-worktree/node_modules/playwright node tests/verify.js --no-external | grep -E "hook|roller lists|sections exist|approved order|em dash|anchor|alt \+|third-party|roadmap|daily use|May–Sep|title names"`
Expected: every matching line is `PASS`. Stacking, menu, reduced-motion, and fallback checks still fail until Tasks 4 and 5.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Rebuild page markup for redesign"
```

---

### Task 4: Styles

**Files:**
- Rewrite: `style.css`

**Interfaces:**
- Consumes: the class names from Task 3.
- Produces:
  - **Custom properties:** `--p` (0–1, set by JS on `.case__card`), `--i` (card index, set inline), `--d` (reveal delay index).
  - **State classes:** `.cases.is-stacking`, `html.is-loaded`, `html.no-motion`, `html.menu-open`, `#header.is-scrolled`, `.roller.is-paused`, `[data-reveal].is-in`, `.steps.is-in`.

- [ ] **Step 1: Replace `style.css` entirely**

```css
/* ================================================================
   KINETIC EDITORIAL · johnchrisley.dev
   Paper base, ink type, one signal-orange accent, giant display.
   Motion budget: transform + opacity only.
   1 tokens · 2 base · 3 buttons · 4 header + menu · 5 hero · 6 proof
   7 sections · 8 work · 9 lab · 10 services · 11 about · 12 contact
   13 footer · 14 reveal · 15 reduced motion
   ================================================================ */

/* 1 · tokens ------------------------------------------------------ */
:root {
  --paper: #F4F2EC;
  --card: #FBFAF6;
  --line: #DCD8CC;
  --line-2: #C8C2B3;
  --ink: #16130E;
  --ink-2: #57524A;
  --ink-3: #736D60;
  --ink-soft: #A39C8E;
  --ink-line: #2C2822;
  --accent: #FF4D17;
  --accent-text: #E5400F;
  --green: #1FAA59;
  --forest: #26332B;

  --ff-display: 'Bricolage Grotesque', 'Helvetica Neue', Arial, sans-serif;
  --ff-body: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --ff-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;

  --container: 1240px;
  --pad-x: clamp(1rem, 5vw, 3rem);
  --sec-py: clamp(5rem, 11vw, 9rem);
  --header-h: 68px;
  --radius: 22px;

  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-io: cubic-bezier(0.7, 0, 0.2, 1);
}

/* 2 · base -------------------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
  scroll-padding-top: var(--header-h);
}
html.menu-open { overflow: hidden; }

body {
  font-family: var(--ff-body);
  font-size: 1.0625rem;
  line-height: 1.6;
  color: var(--ink-2);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: clip;
}

h1, h2, h3 {
  font-family: var(--ff-display);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.035em;
  color: var(--ink);
}

a { color: inherit; text-decoration: none; }
ul, ol { list-style: none; }
img { display: block; max-width: 100%; height: auto; }
em { font-style: normal; color: var(--accent-text); }
strong { color: var(--ink); font-weight: 600; }
::selection { background: var(--accent); color: var(--ink); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }

.container { width: 100%; max-width: var(--container); margin-inline: auto; padding-inline: var(--pad-x); }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

.skip-link {
  position: fixed; top: 0; left: 50%; z-index: 100;
  transform: translate(-50%, -120%);
  padding: 0.6rem 1rem; border-radius: 0 0 10px 10px;
  background: var(--ink); color: var(--paper);
  font: 500 0.8rem var(--ff-mono);
  transition: transform 0.2s var(--ease);
}
.skip-link:focus { transform: translate(-50%, 0); }

.tag {
  font: 500 0.72rem/1.4 var(--ff-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* 3 · buttons ----------------------------------------------------- */
.btn {
  display: inline-flex; align-items: center; gap: 0.55rem;
  padding: 0.85rem 1.35rem;
  border: 1.5px solid transparent; border-radius: 999px;
  font: 600 0.92rem/1 var(--ff-body);
  white-space: nowrap;
  transition: transform 0.25s var(--ease), background-color 0.25s, color 0.25s, border-color 0.25s;
}
.btn svg { width: 1em; height: 1em; transition: transform 0.25s var(--ease); }
.btn:hover svg { transform: translateX(3px); }
.btn:active { transform: scale(0.97); }
.btn--ink { background: var(--ink); color: var(--paper); }
.btn--ink:hover { background: #000; }
.btn--ink:hover svg { transform: translateY(3px); }
.btn--line { border-color: var(--ink); color: var(--ink); }
.btn--line:hover { background: var(--ink); color: var(--paper); }
.btn--accent { background: var(--accent); color: var(--ink); }
.btn--accent:hover { background: #FF6A3D; }
.btn--sm { padding: 0.6rem 1rem; font-size: 0.82rem; }

/* 4 · header + mobile menu ---------------------------------------- */
.header {
  position: fixed; inset: 0 0 auto; z-index: 50;
  height: var(--header-h);
  border-bottom: 1px solid transparent;
  transition: background-color 0.3s, border-color 0.3s;
}
.header.is-scrolled, .menu-open .header { background: var(--paper); border-color: var(--line); }
.header__inner { height: 100%; display: flex; align-items: center; gap: 2rem; }

.brand {
  display: inline-flex; align-items: center; gap: 0.6rem;
  margin-right: auto;
  font: 700 1.02rem var(--ff-display);
  letter-spacing: -0.02em;
  color: var(--ink);
}
.brand__mark { width: 26px; height: 26px; color: var(--accent); }
.brand__dim { color: var(--ink-3); font-weight: 500; }

.nav { display: flex; gap: 1.75rem; }
.nav a { position: relative; font-size: 0.92rem; font-weight: 500; color: var(--ink-2); transition: color 0.2s; }
.nav a::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: -4px; height: 1.5px;
  background: var(--ink); transform: scaleX(0); transform-origin: left;
  transition: transform 0.3s var(--ease);
}
.nav a:hover { color: var(--ink); }
.nav a:hover::after { transform: scaleX(1); }

.menu-toggle {
  display: none; position: relative;
  width: 42px; height: 42px; border-radius: 50%;
  border: 1.5px solid var(--ink); background: transparent; cursor: pointer;
}
.menu-toggle span { position: absolute; inset: 0; }
.menu-toggle span::before, .menu-toggle span::after {
  content: ''; position: absolute; top: 50%; left: 50%;
  width: 16px; height: 1.5px; margin-top: -0.75px; background: var(--ink);
  transition: transform 0.3s var(--ease);
}
.menu-toggle span::before { transform: translate(-50%, -3px); }
.menu-toggle span::after { transform: translate(-50%, 3px); }
.menu-toggle[aria-expanded="true"] span::before { transform: translate(-50%, 0) rotate(45deg); }
.menu-toggle[aria-expanded="true"] span::after { transform: translate(-50%, 0) rotate(-45deg); }

.mobile-menu {
  position: fixed; inset: var(--header-h) 0 0; z-index: 49;
  display: flex; flex-direction: column; gap: 2rem;
  padding: 2rem var(--pad-x);
  background: var(--paper);
  overflow-y: auto;
}
.mobile-menu[hidden] { display: none; }
.mobile-menu nav { display: flex; flex-direction: column; }
.mobile-menu nav a {
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--line);
  font: 800 2.4rem/1.15 var(--ff-display);
  letter-spacing: -0.03em;
  color: var(--ink);
}
.mobile-menu .btn { align-self: flex-start; }

@media (max-width: 860px) {
  .nav, .header__cta { display: none; }
  .menu-toggle { display: inline-block; }
}

/* 5 · hero -------------------------------------------------------- */
.hero {
  display: flex; flex-direction: column; justify-content: flex-end;
  min-height: max(560px, calc(100svh - 8.5rem));
  padding: calc(var(--header-h) + 3rem) 0 clamp(2.5rem, 7vh, 4.5rem);
}

.status {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem 0.75rem;
  font: 500 0.74rem/1.4 var(--ff-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
}
.status__dot { position: relative; width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
.status__dot::after {
  content: ''; position: absolute; inset: -4px; border-radius: 50%;
  background: rgba(31, 170, 89, 0.3);
  animation: pulse 2.4s var(--ease) infinite;
}
.status__dim { color: var(--ink-3); }
@keyframes pulse { from { transform: scale(0.5); opacity: 1; } to { transform: scale(2.2); opacity: 0; } }

.hero__title {
  --lh: 0.94;
  margin-top: clamp(1.25rem, 3vh, 2rem);
  font-size: clamp(2.6rem, 6.6vw, 5.6rem);
  line-height: var(--lh);
  letter-spacing: -0.045em;
}
.hero__line { display: block; }

/* Rolling word. The sizer reserves the widest word so nothing reflows.
   Items sit 0.4em apart so neighbours never peek into the clip window. */
.roller {
  --step: calc((var(--lh) + 0.4) * 1em);
  position: relative;
  display: inline-block;
  padding: 0.12em 0 0.24em;
  margin: -0.12em 0 -0.24em;
  color: var(--accent-text);
  clip-path: inset(0 -0.3em);
}
.roller__sizer { visibility: hidden; }
.roller__track {
  position: absolute; top: 0.12em; left: 0;
  display: flex; flex-direction: column; gap: 0.4em;
  animation: roll 12.5s var(--ease-io) 1.6s 3 both;
}
.roller__track > span { display: block; height: calc(var(--lh) * 1em); line-height: var(--lh); white-space: nowrap; }
.roller.is-paused .roller__track { animation-play-state: paused; }
@keyframes roll {
  0%, 15%  { transform: translateY(0); }
  20%, 35% { transform: translateY(calc(var(--step) * -1)); }
  40%, 55% { transform: translateY(calc(var(--step) * -2)); }
  60%, 75% { transform: translateY(calc(var(--step) * -3)); }
  80%, 95% { transform: translateY(calc(var(--step) * -4)); }
  100%     { transform: translateY(calc(var(--step) * -5)); }
}

.hero__foot {
  display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
  gap: 1.5rem 3rem;
  margin-top: clamp(2rem, 5vh, 3.25rem);
  padding-top: clamp(1.5rem, 3vh, 2rem);
  border-top: 1px solid var(--line-2);
}
.hero__sub { max-width: 38ch; font-size: clamp(1rem, 1.3vw, 1.15rem); }
.hero__actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }

/* 6 · proof strip ------------------------------------------------- */
.proof { background: var(--ink); color: var(--paper); }
.proof__grid { display: grid; grid-template-columns: repeat(4, 1fr); }
.proof__item {
  display: flex; flex-direction: column; gap: 0.4rem;
  padding: clamp(1.5rem, 3vw, 2.25rem) clamp(1rem, 2vw, 1.75rem);
  border-left: 1px solid var(--ink-line);
}
.proof__item:first-child { border-left: 0; padding-left: 0; }
.proof__big {
  font: 800 clamp(1.5rem, 3.4vw, 2.75rem)/1 var(--ff-display);
  letter-spacing: -0.04em;
  color: var(--paper);
  font-variant-numeric: tabular-nums;
}
.proof__big em { color: var(--accent); }
.proof__label { font: 500 0.74rem/1.45 var(--ff-mono); letter-spacing: 0.04em; color: var(--ink-soft); }

@media (max-width: 760px) {
  .proof__grid { grid-template-columns: 1fr 1fr; }
  .proof__item { padding-left: 1rem; border-top: 1px solid var(--ink-line); }
  .proof__item:nth-child(odd) { border-left: 0; padding-left: 0; }
  .proof__item:nth-child(-n + 2) { border-top: 0; }
}

/* 7 · sections ---------------------------------------------------- */
.section { padding: var(--sec-py) 0; }
.sec-head { max-width: 780px; }
.sec-head__title {
  margin-top: 0.9rem;
  font-size: clamp(2.3rem, 5.2vw, 4.4rem);
  line-height: 0.98;
  letter-spacing: -0.045em;
}
.sec-head__note { margin-top: 1.1rem; max-width: 54ch; }

/* 8 · work: stacking case cards ----------------------------------- */
.cases {
  display: flex; flex-direction: column;
  gap: clamp(1.25rem, 3vw, 2rem);
  margin-top: clamp(2.5rem, 6vw, 4.5rem);
}
.cases.is-stacking { gap: 10vh; padding-bottom: 8vh; }
.cases.is-stacking .case { position: sticky; top: calc(var(--header-h) + 1rem + var(--i) * 1.1rem); }

.case__card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.2fr);
  align-items: center;
  gap: clamp(1.5rem, 3.5vw, 3.5rem);
  padding: clamp(1.25rem, 3.2vw, 3rem);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: 0 -18px 50px -30px rgba(22, 19, 14, 0.45);
}
.is-stacking .case__card { transform-origin: 50% 0; transform: scale(calc(1 - var(--p, 0) * 0.05)); }
.is-stacking .case__card::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: #0B0A08; opacity: calc(var(--p, 0) * 0.3); pointer-events: none;
}

.case--paper .case__card { background: var(--card); color: var(--ink-2); border: 1px solid var(--line); }
.case--accent .case__card { background: var(--accent); color: rgba(22, 19, 14, 0.86); }
.case--ink .case__card { background: var(--ink); color: #CFC9BD; }
.case--forest .case__card { background: var(--forest); color: #CBD8CF; }
.case--ink .case__title, .case--forest .case__title { color: #FFFFFF; }

.case__kicker {
  display: flex; align-items: center; gap: 0.75rem;
  font: 500 0.72rem/1 var(--ff-mono);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.case__kicker b { padding: 0.35rem 0.5rem; border: 1px solid currentColor; border-radius: 6px; font-weight: 700; }
.case__title { margin-top: 1rem; font-size: clamp(1.9rem, 3.4vw, 3rem); letter-spacing: -0.04em; }
.case__text { margin-top: 1rem; max-width: 46ch; font-size: 0.98rem; }

.chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 1.25rem; }
.chips li { padding: 0.45rem 0.65rem; border: 1px solid currentColor; border-radius: 999px; font: 500 0.72rem/1 var(--ff-mono); }

.case__link {
  display: inline-flex; align-items: center; gap: 0.5rem;
  margin-top: 1.5rem; padding-bottom: 0.2rem;
  border-bottom: 1.5px solid currentColor;
  font-weight: 600; font-size: 0.92rem;
}
.case__link svg { width: 1em; height: 1em; transition: transform 0.25s var(--ease); }
.case__link:hover svg { transform: translate(3px, -3px); }
.case__note { margin-top: 1.5rem; font: 500 0.74rem var(--ff-mono); letter-spacing: 0.04em; }

.case__shot {
  border-radius: 14px; overflow: hidden;
  background: #1D1C1A;
  box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.08);
}
.case__shot::before {
  content: ''; display: block; height: 26px;
  background:
    radial-gradient(circle at 16px 50%, #4A4640 0 4px, transparent 4.5px),
    radial-gradient(circle at 30px 50%, #4A4640 0 4px, transparent 4.5px),
    radial-gradient(circle at 44px 50%, #4A4640 0 4px, transparent 4.5px),
    #1D1C1A;
}
.case__shot img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; object-position: top left; }

@media (max-width: 860px) {
  .case__card { grid-template-columns: 1fr; }
  .case__shot { order: -1; }
}

/* 9 · lab --------------------------------------------------------- */
.lab { margin-top: clamp(3.5rem, 8vw, 6rem); }
.lab__head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 1rem;
  padding-bottom: 1rem; border-bottom: 1px solid var(--line-2);
}
.lab__all { font-size: 0.9rem; font-weight: 600; color: var(--ink); }
.lab__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-top: 1.25rem; }
.lab__card {
  display: flex; flex-direction: column; gap: 0.35rem; height: 100%;
  padding: 1.1rem 1.15rem;
  border: 1px solid var(--line); border-radius: 14px;
  background: var(--card);
  transition: transform 0.3s var(--ease), border-color 0.3s;
}
a.lab__card:hover { transform: translateY(-3px); border-color: var(--ink); }
.lab__name { font: 700 1.05rem var(--ff-display); letter-spacing: -0.02em; color: var(--ink); }
.lab__desc { font-size: 0.86rem; line-height: 1.5; }
.lab__meta { margin-top: auto; padding-top: 0.5rem; font: 500 0.7rem var(--ff-mono); letter-spacing: 0.04em; color: var(--ink-3); }

@media (max-width: 1000px) { .lab__grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 520px) { .lab__grid { grid-template-columns: 1fr; } }

/* 10 · services --------------------------------------------------- */
.services { border-top: 1px solid var(--line); }
.offers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: clamp(2.5rem, 5vw, 3.5rem); }
.offer {
  display: flex; flex-direction: column; gap: 0.75rem;
  min-height: 260px;
  padding: clamp(1.5rem, 2.5vw, 2rem);
  border: 1px solid var(--line); border-radius: 18px;
  background: var(--card);
}
.offer__num {
  display: inline-grid; place-items: center;
  width: 2.4rem; height: 2.4rem; border-radius: 10px;
  background: var(--accent); color: var(--ink);
  font: 700 0.8rem var(--ff-mono);
}
.offer h3 { margin-top: auto; font-size: 1.6rem; letter-spacing: -0.03em; }
.offer p { font-size: 0.95rem; }

.steps {
  position: relative;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem;
  margin-top: clamp(2.5rem, 5vw, 3.5rem);
  padding-top: 1.5rem;
}
.steps::before, .steps::after { content: ''; position: absolute; top: 0; left: 0; right: 0; }
.steps::before { height: 1px; background: var(--line-2); }
.steps::after {
  height: 2px; background: var(--accent);
  transform: scaleX(0); transform-origin: left;
  transition: transform 1.4s var(--ease) 0.2s;
}
.steps.is-in::after, .no-motion .steps::after { transform: scaleX(1); }
.step__k {
  display: inline-flex; align-items: center; gap: 0.5rem;
  font: 600 0.74rem var(--ff-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
}
.step__k::before { content: ''; width: 7px; height: 7px; border-radius: 2px; background: var(--accent); }
.step p { margin-top: 0.5rem; font-size: 0.95rem; }

.services__cta { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem 1.5rem; margin-top: 2.75rem; }
.services__note { font: 500 0.78rem var(--ff-mono); letter-spacing: 0.02em; color: var(--ink-3); }

@media (max-width: 900px) {
  .offers { grid-template-columns: 1fr; }
  .offer { min-height: 0; }
  .offer h3 { margin-top: 0.5rem; }
  .steps { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 520px) { .steps { grid-template-columns: 1fr; } }

/* 11 · about ------------------------------------------------------ */
.about { border-top: 1px solid var(--line); }
.about__grid { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(2.5rem, 6vw, 6rem); align-items: start; }
.about__text { margin-top: 1.25rem; max-width: 54ch; font-size: 1.05rem; }
.timeline { border-top: 1px solid var(--line-2); }
.timeline li { display: grid; grid-template-columns: 8.5rem 1fr; gap: 1rem; padding: 1.15rem 0; border-bottom: 1px solid var(--line); }
.timeline__when { padding-top: 0.15rem; font: 500 0.74rem/1.6 var(--ff-mono); letter-spacing: 0.04em; color: var(--ink-3); }
.timeline b { display: block; font-weight: 600; color: var(--ink); }
.timeline small { display: block; margin-top: 0.2rem; font-size: 0.88rem; color: var(--ink-3); }

@media (max-width: 860px) { .about__grid { grid-template-columns: 1fr; } }
@media (max-width: 420px) { .timeline li { grid-template-columns: 1fr; gap: 0.25rem; } }

/* 12 · contact ---------------------------------------------------- */
.contact { background: var(--ink); color: #CFC9BD; padding: clamp(5rem, 12vw, 9rem) 0 clamp(3rem, 6vw, 4.5rem); }
.contact .tag { color: var(--ink-soft); }
.contact__title {
  margin-top: 1.25rem;
  font-size: clamp(2.8rem, 8.2vw, 7.2rem);
  line-height: 0.92;
  letter-spacing: -0.05em;
  color: var(--paper);
}
.contact__title em { color: var(--accent); }
.contact__sub { margin-top: 1.5rem; max-width: 46ch; font-size: 1.05rem; }
.contact__mail {
  display: inline-flex; align-items: center; gap: 0.75rem;
  max-width: 100%;
  margin-top: clamp(2rem, 5vw, 3rem); padding-bottom: 0.35rem;
  border-bottom: 3px solid var(--accent);
  font: 700 clamp(1.15rem, 3.6vw, 2.6rem)/1.1 var(--ff-display);
  letter-spacing: -0.03em;
  color: var(--paper);
  overflow-wrap: anywhere;
}
.contact__mail svg { flex: none; width: 0.9em; height: 0.9em; transition: transform 0.3s var(--ease); }
.contact__mail:hover svg { transform: translateX(6px); }
.contact__links { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 2.5rem; }
.contact__links a {
  display: inline-flex; padding: 0.7rem 1.1rem;
  border: 1px solid var(--ink-line); border-radius: 999px;
  font: 500 0.85rem var(--ff-mono);
  color: var(--paper);
  transition: border-color 0.25s;
}
.contact__links a:hover { border-color: var(--paper); }
.contact__note { margin-top: 1.5rem; font: 500 0.78rem var(--ff-mono); letter-spacing: 0.04em; color: var(--ink-soft); }

/* 13 · footer ----------------------------------------------------- */
.footer { background: var(--ink); color: var(--ink-soft); border-top: 1px solid var(--ink-line); }
.footer__inner {
  display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.75rem 1.5rem;
  padding-block: 1.75rem;
  font: 500 0.74rem var(--ff-mono);
  letter-spacing: 0.04em;
}
.footer a { transition: color 0.2s; }
.footer a:hover { color: var(--paper); }

/* 14 · reveal ----------------------------------------------------- */
.js [data-hero] { opacity: 0; transform: translateY(30px); }
.is-loaded [data-hero] {
  opacity: 1; transform: none;
  transition: opacity 0.9s var(--ease), transform 1.1s var(--ease);
  transition-delay: calc(var(--d, 0) * 110ms + 80ms);
}
.js [data-reveal] {
  opacity: 0; transform: translateY(26px);
  transition: opacity 0.9s var(--ease), transform 1s var(--ease);
  transition-delay: calc(var(--d, 0) * 90ms);
}
.js [data-reveal].is-in { opacity: 1; transform: none; }
.no-motion [data-hero], .no-motion [data-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }

/* 15 · reduced motion --------------------------------------------- */
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0s !important;
  }
  .roller__track { animation: none !important; }
  .status__dot::after { display: none; }
  .js [data-hero], .js [data-reveal] { opacity: 1; transform: none; }
}
```

- [ ] **Step 2: Run the layout checks**

Run: `PLAYWRIGHT_MODULE=/Users/jc/dev/projects/investment-sim-cutover-worktree/node_modules/playwright node tests/verify.js --no-external | grep -E "horizontal|reduced motion: word"`
Expected: `PASS  no horizontal scroll at 390px`, `PASS  no horizontal scroll at 320px`, `PASS  reduced motion: word rests on "parts shop."`. The stacking, menu, and fallback checks still fail until Task 5, because `script.js` is still the old file.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "Add Kinetic Editorial styles"
```

---

### Task 5: Interactions

**Files:**
- Rewrite: `script.js`

**Interfaces:**
- Consumes: the DOM hooks from Task 3 and the state classes from Task 4.
- Produces:
  - `window.__jc = true`, which disarms the 3 s `no-motion` fallback in `<head>`.
  - Classes: `html.is-loaded`, `#header.is-scrolled`, `html.menu-open`, `[data-reveal].is-in`, `.roller.is-paused`, `.cases.is-stacking`.
  - The inline style `--p` on each covered `.case__card`.

- [ ] **Step 1: Replace `script.js` entirely**

```js
/* ================================================================
   johnchrisley.dev · interactions (vanilla, no dependencies)
   Motion budget: transform + opacity only; nothing runs off-screen.
   1 boot · 2 header · 3 mobile menu · 4 reveals · 5 roller
   6 counter · 7 card stack
   ================================================================ */
(() => {
  'use strict';
  window.__jc = true;

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* 1 · boot: start the hero entrance on the next frame */
  requestAnimationFrame(() => root.classList.add('is-loaded'));

  /* 2 · header: solid background once the page scrolls */
  const header = document.getElementById('header');
  const syncHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  /* 3 · mobile menu */
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('mobileMenu');
  const setMenu = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.classList.toggle('menu-open', open);
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* 4 · reveals: fade + rise once, then stop observing */
  const reveals = document.querySelectorAll('[data-reveal]');
  if (reduce || !hasIO) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  }

  /* 5 · roller: pause the rolling word while the hero is off-screen */
  const roller = document.querySelector('.roller');
  if (roller && hasIO && !reduce) {
    new IntersectionObserver(([entry]) => {
      roller.classList.toggle('is-paused', !entry.isIntersecting);
    }).observe(roller);
  }

  /* 6 · counter: tick proof numbers up once, as they fade in */
  const countUp = (el) => {
    const end = Number(el.dataset.count);
    const start = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - start) / 900);
      el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };
  if (hasIO && !reduce) {
    const cio = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        cio.unobserve(entry.target);
        countUp(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    document.querySelectorAll('[data-count]').forEach((el) => cio.observe(el));
  }

  /* 7 · card stack: sticky cards, and the covered card eases back as the
         next one slides over. Only when every card fits on screen, so no
         card can hide its own bottom under the next one. */
  const cases = document.querySelector('.cases');
  if (!cases) return;
  const cards = [...cases.querySelectorAll('.case')];
  const wide = window.matchMedia('(min-width: 761px)');
  let stacking = false;
  let near = !hasIO;
  let frame = 0;
  let metrics = [];

  const update = () => {
    frame = 0;
    if (!stacking) return;
    const tops = cards.map((c) => c.getBoundingClientRect().top);
    for (let i = 0; i < cards.length - 1; i++) {
      const p = 1 - (tops[i + 1] - metrics[i + 1].top) / metrics[i].h;
      cards[i].firstElementChild.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
    }
  };

  const measure = () => {
    stacking = false;
    cases.classList.remove('is-stacking');
    cards.forEach((c) => c.firstElementChild.style.removeProperty('--p'));
    if (reduce || !wide.matches) return;
    cases.classList.add('is-stacking');
    metrics = cards.map((c) => ({ top: parseFloat(getComputedStyle(c).top) || 0, h: c.offsetHeight }));
    if (!metrics.every((m) => m.top + m.h <= window.innerHeight - 16)) {
      cases.classList.remove('is-stacking');
      return;
    }
    stacking = true;
    update();
  };

  if (hasIO) {
    new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      if (near && stacking && !frame) frame = requestAnimationFrame(update);
    }, { rootMargin: '200px 0px' }).observe(cases);
  }
  window.addEventListener('scroll', () => {
    if (stacking && near && !frame) frame = requestAnimationFrame(update);
  }, { passive: true });

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 150);
  });
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
})();
```

- [ ] **Step 2: Run the full suite offline**

Run: `PLAYWRIGHT_MODULE=/Users/jc/dev/projects/investment-sim-cutover-worktree/node_modules/playwright node tests/verify.js --no-external`
Expected: everything passes except the three checks Task 6 owns: `og.html carries the new hook`, `img/og.png is 1200x630` (it may already pass on the old image), and `sitemap lastmod is 2026-09-24`.

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "Rewrite interactions without GSAP"
```

---

### Task 6: Share image and sitemap

**Files:**
- Rewrite: `og.html`, `img/og.png`, `sitemap.xml`

**Interfaces:**
- Consumes: nothing.
- Produces: `img/og.png` (1200×630), referenced by the meta tags from Task 3.

- [ ] **Step 1: Replace `og.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&amp;family=JetBrains+Mono:wght@500&amp;display=swap" rel="stylesheet" />
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #F4F2EC; font-family: 'Bricolage Grotesque', sans-serif; }
  .card { width: 1200px; height: 630px; padding: 60px 72px 56px; display: flex; flex-direction: column; justify-content: space-between; color: #16130E; }
  .top { display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 14px; font-weight: 700; font-size: 26px; letter-spacing: -0.02em; }
  .brand span { color: #736D60; font-weight: 500; }
  .brand svg { width: 38px; height: 38px; color: #FF4D17; }
  .status { display: flex; align-items: center; gap: 14px; font: 500 17px 'JetBrains Mono', monospace; letter-spacing: 0.1em; text-transform: uppercase; }
  .status::before { content: ''; width: 12px; height: 12px; border-radius: 50%; background: #1FAA59; box-shadow: 0 0 0 6px rgba(31, 170, 89, 0.18); }
  h1 { font-weight: 800; font-size: 84px; line-height: 0.94; letter-spacing: -0.045em; }
  h1 em { font-style: normal; color: #E5400F; }
  .foot { display: flex; align-items: flex-end; justify-content: space-between; padding-top: 22px; border-top: 2px solid #16130E; font: 500 18px 'JetBrains Mono', monospace; color: #57524A; }
  .foot b { font: 700 26px 'Bricolage Grotesque', sans-serif; letter-spacing: -0.02em; color: #16130E; }
</style>
</head>
<body>
  <div class="card">
    <div class="top">
      <div class="brand">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="1.5" y="1.5" width="21" height="21" rx="6" stroke="currentColor" stroke-width="1.2"/>
          <path d="M15.5 6.5v6.2c0 2.3-1.5 3.6-3.7 3.6-1 0-1.9-.25-2.6-.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M17 7.2A5.6 5.6 0 0 0 13.4 6 5.6 5.6 0 1 0 17 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/>
        </svg>
        John Chrisley<span>.dev</span>
      </div>
      <div class="status">Open for projects</div>
    </div>
    <h1>I build the software<br />that runs your <em>parts shop.</em></h1>
    <div class="foot">
      <b>John Chrisley Delos Santos</b>
      <span>Freelance developer · POS · Web apps · AI automation</span>
    </div>
  </div>
</body>
</html>
```

- [ ] **Step 2: Render `img/og.png` and confirm its size**

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 --virtual-time-budget=6000 --screenshot="$PWD/img/og.png" "file://$PWD/og.html" 2>/dev/null
magick identify -format "%wx%h %b\n" img/og.png
```
Expected: `1200x630`. Then open `img/og.png` with the Read tool and confirm the headline fits on two lines with "parts shop." in orange and nothing clipped. If the render is not exactly 1200×630, use `magick img/og.png -crop 1200x630+0+0 +repage img/og.png`.

- [ ] **Step 3: Update `sitemap.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://johnchrisley.dev/</loc>
    <lastmod>2026-09-24</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

- [ ] **Step 4: Run the full suite, including outbound links**

Run: `PLAYWRIGHT_MODULE=/Users/jc/dev/projects/investment-sim-cutover-worktree/node_modules/playwright node tests/verify.js`
Expected: `N/N checks passed`, exit 0. If one outbound link fails, curl it by hand. Report a real dead link to Jc rather than hiding it.

- [ ] **Step 5: Commit**

```bash
git add og.html img/og.png sitemap.xml
git commit -m "Refresh share image and sitemap"
```

---

### Task 7: Docs, spec note, knowledge base

**Files:**
- Rewrite: `README.md`
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-09-24-portfolio-redesign-design.md` (Motion section)
- Modify (separate repo): `~/knowledge` files, via the `maintaining-knowledge-repo` skill

**Interfaces:**
- Consumes: final behavior from Tasks 3–6.
- Produces: accurate docs for the next session.

- [ ] **Step 1: Replace `README.md`**

````markdown
# johnchrisley.dev

Portfolio of **John Chrisley Delos Santos**, freelance software developer (PH).

"Kinetic Editorial": light paper, giant display type, one orange accent. Hand-written
HTML, CSS and vanilla JavaScript. No framework, no build step, no third-party scripts.

## Stack
- Semantic HTML5, one page (`index.html`)
- CSS custom-property design system (`style.css`)
- Vanilla JS (`script.js`, < 8 KB): IntersectionObserver reveals, rolling-word hook,
  sticky stacking case cards. Transform and opacity only; honors `prefers-reduced-motion`.
- Fonts: Bricolage Grotesque · Inter · JetBrains Mono

## Deploy
Served from **hammok** (`nginx:alpine` in `/srv/apps/portfolio`) behind a Cloudflare
tunnel. `hammok-deploy@portfolio.timer` pulls `main` from GitHub every minute, so
`git push` is the deploy.

## Local preview
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Checks
```bash
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/verify.js           # full suite
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node tests/verify.js --no-external --shots /tmp/shots
```
````

- [ ] **Step 2: Rewrite `CLAUDE.md` project facts**

Replace the whole file with:

```markdown
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
- Standing dislikes: no photo of Jc, no custom cursor, no marquee, no scroll cue,
  no crowded hero. No em dashes in site copy.
- Only link public repos (grocery-pos, egmc-motorparts, pisofolio are private).
- Verify before claiming done: `PLAYWRIGHT_MODULE=<playwright path> node tests/verify.js`
  (Playwright currently borrowed from ~/dev/projects/investment-sim-cutover-worktree/node_modules/playwright).
- Commits: one short imperative line, no AI attribution. Never push.

## Status
Live. Tier 2 (CLAUDE.md only); no ROADMAP/DECISIONS/ARCHITECTURE unless the site
grows enough to need them.
```

- [ ] **Step 3: Correct the spec's motion notes**

In `docs/superpowers/specs/2026-09-24-portfolio-redesign-design.md`, make three edits in the Motion section:

1. Replace the bullet starting `- **Mobile (< 760px):**` with:
   ```
   - **Stacking guard:** stacking turns on only at ≥ 761px wide AND only when every
     card fits below its sticky offset; otherwise the cards are a normal list (a
     sticky card taller than the screen would hide its own bottom). On mobile the
     screenshot sits above the text.
   ```
2. Append to the rolling-word bullet: ` It runs 3 loops (about 37 s), then rests on "parts shop.", and pauses while off-screen.`
3. Append to the counter bullet: ` The count starts as the proof strip fades in.`

- [ ] **Step 4: Update ~/knowledge**

Invoke the `maintaining-knowledge-repo` skill and apply these facts, all `[Jc, 2026-09-24]` unless noted:
- `experience.md`: the Komunidad Global internship ran **May to Sep 2026** (not 2026-07-07). The title stays Software Engineer Intern.
- `profile.md` + `INDEX.md` "Who": **4th-year** BS CpE (not 3rd), still expected 2027.
- `projects/egmc-motorparts.md`: **deployed** at the store (laptop runbook executed). egmc.johnchrisley.dev returned Cloudflare 530 on 2026-09-24 (origin offline at that moment).
- `projects/pos-system.md`: still **not live**; shown as "in testing" on the portfolio.
- `projects/portfolio.md` + INDEX Portfolio summary: new "Kinetic Editorial" design (2026-09-24); **served from hammok** (nginx container, auto-pull timer), not GitHub Pages. Resolves the old Signals/GSAP conflict note. `roadmap.johnchrisley.dev` has no DNS record (dead) and was removed from the site.
- `career/job-preferences.md`: open to select full-time roles alongside freelance (reconfirmed).

Follow the skill's commit rules for the knowledge repo.

- [ ] **Step 5: Commit the portfolio repo docs**

```bash
git add README.md CLAUDE.md docs/superpowers/specs/2026-09-24-portfolio-redesign-design.md
git commit -m "Update docs for redesign"
```

---

### Task 8: Final verification and visual review

**Files:**
- Modify: only what the review turns up (`style.css` / `index.html` / `script.js`).

**Interfaces:**
- Consumes: everything.
- Produces: a verified site and screenshots for Jc.

- [ ] **Step 1: Full suite plus screenshots**

Run: `PLAYWRIGHT_MODULE=/Users/jc/dev/projects/investment-sim-cutover-worktree/node_modules/playwright node tests/verify.js --shots "$SCRATCH/final"`
Expected: `N/N checks passed`, exit 0; 12 PNGs in `$SCRATCH/final` (desktop and mobile × hero, work, services, about, contact, stack).

- [ ] **Step 2: Look at every screenshot**

Open each PNG with the Read tool. Check:
- The hero headline fits on two lines at 1440px, "parts shop." is orange, and the proof strip is visible at the bottom of the first viewport.
- The stacking frame shows the covered card slightly scaled and dimmed.
- Card text is readable on all four themes, and screenshots are sharp.
- On mobile, nothing overlaps, cards are a plain list, and the email fits.

Fix any issue in the owning file, re-run Step 1, and commit each fix with a short subject (e.g. `git commit -m "Fix hero wrap at 1280px"`).

- [ ] **Step 3: Stop the local helpers**

```bash
lsof -ti tcp:8765 tcp:8766 | xargs kill 2>/dev/null   # EGMC + grocery dev servers used for screenshots
bash /Users/jc/.claude/plugins/cache/claude-plugins-official/superpowers/6.4.1/skills/brainstorming/scripts/stop-server.sh /Users/jc/dev/projects/Aresss615.github.io/.superpowers/brainstorm/50834-1790211882
```

- [ ] **Step 4: Report**

Tell Jc: checks passed (with the count), what changed, the commits, that `git push` deploys via hammok, and the open items:
- Confirm the Résumé Drive link is the current `JCED_Resume.pdf`.
- The EGMC tunnel returned 530 today.
- `roadmap.johnchrisley.dev` DNS is dead.
- nginx serves `CLAUDE.md` and `docs/` publicly.
