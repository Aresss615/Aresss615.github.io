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

// The roller's clip window must start at its own line box, never above it,
// or the outgoing word paints over the line above mid-roll.
async function rollerWindowCheck(page, label) {
  const r = await page.evaluate(() => {
    const roller = document.querySelector('.roller');
    const sizer = document.querySelector('.roller__sizer');
    if (!roller || !sizer) return null;
    const lh = parseFloat(getComputedStyle(document.querySelector('.hero__title')).lineHeight);
    const s = sizer.getBoundingClientRect();
    const lineTop = s.top + (s.height - lh) / 2;
    return { windowTop: roller.getBoundingClientRect().top, lineTop };
  });
  check(`rolling word stays inside its own line (${label})`, r && r.windowTop >= r.lineTop - 1, JSON.stringify(r));
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
  check('og.html wordmark is lowercase johnchrisley.dev', read('og.html').includes('<span>johnchrisley<i>.dev</i></span>'));
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
      brand: (document.querySelector('.brand')?.textContent || '').replace(/\s+/g, ''),
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
  await rollerWindowCheck(page, '1440px');
  const aboutLines = await page.evaluate(() => {
    const h = document.getElementById('about-title');
    return h ? Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)) : -1;
  });
  check('about headline sits on two lines at 1440px', aboutLines === 2, `${aboutLines} lines`);
  check('header wordmark reads johnchrisley.dev', d.brand === 'johnchrisley.dev', d.brand);

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

  // Park with every card stuck, focus the top card's link, then Shift+Tab back
  // into a covered card: the newly focused link must be the thing on top.
  await page.evaluate(async () => {
    const cards = [...document.querySelectorAll('.case')];
    const last = cards[cards.length - 1];
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 100));
    const stickTop = parseFloat(getComputedStyle(last).top) || 0;
    const naturalTop = last.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: naturalTop - stickTop + 10, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 300));
    last.querySelector('a')?.focus();
  });
  await page.keyboard.press('Shift+Tab');
  const hit = await page.evaluate(() => {
    const a = document.activeElement;
    const r = a.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { focused: (a.textContent || '').trim().slice(0, 30), onTop: Boolean(el) && (el === a || a.contains(el)) };
  });
  check('Shift+Tab in the stack lands on a visible link', hit.onTop, JSON.stringify(hit));

  // Focus ring must reach 3:1 against whatever surface sits behind it.
  const rings = await page.evaluate(() => {
    const lum = (c) => {
      const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map((v) => {
        v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bgOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(c)) return c;
      }
      return 'rgb(255, 255, 255)';
    };
    const sels = ['.hero .btn--line', '.case--paper .case__link', '.case--accent .case__link', '.case--forest .case__link',
      'a.lab__card', '.services__cta .btn', '.contact__mail', '.contact__links a', '.footer a'];
    return sels.map((sel) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, ratio: 0, note: 'missing' };
      el.focus({ preventScroll: true });
      const L1 = lum(getComputedStyle(el).outlineColor);
      const L2 = lum(bgOf(el.parentElement));
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      return { sel, ratio: Math.round(ratio * 100) / 100, fv: el.matches(':focus-visible') };
    });
  });
  const weak = rings.filter((r) => !(r.ratio >= 3 && r.fv));
  check('focus ring is at least 3:1 on every surface', weak.length === 0, JSON.stringify(weak));

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
    await rollerWindowCheck(page, `${viewport.width}px`);
    check(`no console or page errors (${viewport.width}px)`, errors.length === 0, errors.join(' / '));

    if (viewport === MOBILE) {
      const state = () => page.evaluate(() => ({
        hidden: document.getElementById('mobileMenu')?.hidden,
        expanded: document.getElementById('menuToggle')?.getAttribute('aria-expanded'),
        focus: document.activeElement?.id,
        focusClass: document.activeElement?.className || '',
        stacking: document.querySelector('.cases')?.classList.contains('is-stacking'),
      }));
      await page.click('#menuToggle', { timeout: 5000 });
      const opened = await state();
      check('menu opens from the toggle', opened.hidden === false && opened.expanded === 'true', JSON.stringify(opened));
      const trail = [];
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        trail.push(await page.evaluate(() => {
          const a = document.activeElement;
          if (!a || a === document.body) return 'body';
          return a.closest('#mobileMenu') ? 'menu' : a.closest('#header') ? 'header' : 'behind';
        }));
      }
      check('Tab never lands behind the open menu', !trail.includes('behind'), trail.join(','));
      await page.focus('#mobileMenu a');
      await page.keyboard.press('Escape');
      const closed = await state();
      check('Escape closes the menu and returns focus', closed.hidden === true && closed.focus === 'menuToggle', JSON.stringify(closed));
      await page.click('#menuToggle', { timeout: 5000 });
      await page.focus('#mobileMenu a');
      await page.setViewportSize(DESKTOP);
      await sleep(500);
      const wide = await state();
      check('widening to desktop closes the menu', wide.hidden === true, JSON.stringify(wide));
      check('widening moves focus out of the closed menu to the brand', /\bbrand\b/.test(wide.focusClass), JSON.stringify(wide));
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

  // script.js loads but throws partway: content must still show.
  const breakers = [
    ['IntersectionObserver throws', () => { window.IntersectionObserver = function () { throw new Error('boom'); }; }],
    ['MediaQueryList has no addEventListener', () => { Object.defineProperty(MediaQueryList.prototype, 'addEventListener', { value: undefined }); }],
  ];
  for (const [label, breakIt] of breakers) {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    await ctx.addInitScript(breakIt);
    const pg = await ctx.newPage();
    await pg.goto(BASE, { waitUntil: 'load' });
    await sleep(3500);
    await scrollThrough(pg);
    const stuck = await pg.evaluate(() => [...document.querySelectorAll('[data-reveal], [data-hero]')]
      .filter((el) => getComputedStyle(el).opacity !== '1').length);
    check(`content shows when ${label}`, stuck === 0, `${stuck} hidden`);
    await ctx.close();
  }
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
    // Each group runs on its own so one stuck interaction cannot hide later results.
    const group = async (name, fn) => {
      try { return await fn(); } catch (e) { check(`${name} ran to completion`, false, e.message.split('\n')[0]); return undefined; }
    };
    const external = (await group('desktop checks', () => desktopChecks(browser))) || [];
    await group('short desktop check', () => shortDesktopCheck(browser));
    await group('mobile checks', () => mobileChecks(browser));
    await group('reduced motion checks', () => reducedMotionChecks(browser));
    await group('script-blocked check', () => noScriptFallbackCheck(browser));
    await group('outbound link checks', () => externalChecks(external));
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
