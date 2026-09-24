/* ================================================================
   johnchrisley.dev · interactions (vanilla, no dependencies)
   Motion budget: transform + opacity only; nothing runs off-screen.
   1 boot · 2 reveals · 3 header · 4 mobile menu · 5 roller
   6 counter · 7 card stack
   ================================================================ */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  // Older Safari only has MediaQueryList.addListener.
  const onChange = (mq, fn) => (mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn));

  /* 1 · boot: start the hero entrance on the next frame */
  requestAnimationFrame(() => root.classList.add('is-loaded'));

  /* 2 · reveals: fade + rise once, then stop observing */
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

  // Content can now reveal itself, so disarm the 3 s fallback in <head>.
  // Anything that throws before this line leaves it armed and the page shows.
  window.__jc = true;

  /* 3 · header: solid background once the page scrolls */
  const header = document.getElementById('header');
  const syncHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  /* 4 · mobile menu: the page behind goes inert so focus stays in the menu */
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('mobileMenu');
  const brand = document.querySelector('.brand');
  const behind = ['.skip-link', 'main', '.footer'].map((sel) => document.querySelector(sel)).filter(Boolean);
  const setMenu = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.classList.toggle('menu-open', open);
    behind.forEach((el) => { el.inert = open; });
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  onChange(window.matchMedia('(min-width: 861px)'), (e) => {
    if (!e.matches || menu.hidden) return;
    const hadFocus = menu.contains(document.activeElement);
    setMenu(false);
    if (hadFocus) brand.focus();
  });

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
