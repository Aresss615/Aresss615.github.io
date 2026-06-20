/* ================================================================
   MOTION — cinematic enhancement layer for John Chrisley's portfolio
   Progressive enhancement on top of script.js. Everything here is
   optional: if GSAP is missing or the user prefers reduced motion,
   the base site is untouched. Each module is wrapped so a failure in
   any one of them never breaks the page.

   Performance budget: transform + opacity ONLY. No canvas, no
   smooth-scroll hijack, no scrubbed filters/blends — those were the
   source of the Chrome jank. Scroll work is one compositor-friendly
   timeline.

   Modules:
     1. hero intro     — title-card assembles on load
     2. hero scroll    — scroll-assembled parallax (single scrub)
     3. reveals        — section entrances (GSAP, batched, once)
     4. flip-headlines — split-flap headline characters
     5. lift-cards     — lab cards rise in
     6. about          — word-by-word statement reveal
     7. experience     — timeline line draw
     8. watermark      — giant ghosted name parallax (transform only)
     9. counters       — number tick-up
   ================================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(pointer: fine)').matches;
  const isMobile     = window.matchMedia('(max-width: 860px)').matches;
  const hasGSAP      = typeof window.gsap !== 'undefined';

  const safe = (label, fn) => { try { fn(); } catch (e) { console.warn('[motion] ' + label + ' failed:', e); } };

  // Hero entrance is pure CSS, keyed off this class — set it early so the
  // page reveals even if GSAP never loads.
  document.documentElement.classList.add('hero-ready');

  /* ----------------------------------------------------------------
     HERO POINTER PARALLAX — light cursor drift on the cinema layer.
     Pure CSS-variable writes; no animation loop. (desktop only)
     ---------------------------------------------------------------- */
  safe('hero-cursor', () => {
    if (reduceMotion || !finePointer) return;
    const hero  = document.getElementById('hero');
    const stage = document.querySelector('.hero__cinema');
    if (!hero || !stage) return;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - (r.left + r.width / 2)) / r.width;
      const py = (e.clientY - (r.top + r.height / 2)) / r.height;
      stage.style.setProperty('--cinema-x', (px * -14).toFixed(2) + 'px');
      stage.style.setProperty('--cinema-y', (py * -9).toFixed(2) + 'px');
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      stage.style.setProperty('--cinema-x', '0px');
      stage.style.setProperty('--cinema-y', '0px');
    });
  });

  // ---- everything below needs GSAP ----
  if (reduceMotion || !hasGSAP) {
    document.documentElement.classList.add('is-loaded');
    return;
  }
  const { gsap } = window;
  const ST = window.ScrollTrigger;
  if (ST) gsap.registerPlugin(ST);

  /* ----------------------------------------------------------------
     1 · HERO INTRO — the title card assembles on load
        Cinema frame marks, poster lines, and the ghost title fade and
        settle into place. Transform/opacity only.
     ---------------------------------------------------------------- */
  safe('hero-intro', () => {
    const stage = document.querySelector('.hero__cinema');
    if (!stage) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero__frame', { autoAlpha: 0, scale: 0.4, duration: 0.7, stagger: 0.08 }, 0)
      .from('.hero__poster-line', { scaleX: 0, transformOrigin: '50% 50%', duration: 0.9, stagger: 0.1 }, 0.1)
      .from('.hero__cinema-title', { autoAlpha: 0, yPercent: 8, duration: 1.1 }, 0.15)
      .from('.hero__signal', { autoAlpha: 0, x: 16, duration: 0.7 }, 0.4);
  });

  if (!ST) { document.documentElement.classList.add('is-loaded', 'gsap-on'); return; }

  /* ----------------------------------------------------------------
     2 · HERO SCROLL — scroll-assembled parallax
        One scrubbed timeline over the hero's own height. The giant
        ghost title drifts up and dissolves; the content and portrait
        ease away at different rates so the screen feels like it is
        being pulled apart as you scroll into the page.
        Transform + opacity only → stays on the compositor.
     ---------------------------------------------------------------- */
  safe('hero-scroll', () => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.4 },
      defaults: { ease: 'none' },
    });
    tl.to('.hero__cinema-title', { yPercent: -34, autoAlpha: 0 }, 0)
      .to('.hero__cinema', { yPercent: -14 }, 0)
      .to('.hero__text', { yPercent: -6, autoAlpha: 0.35 }, 0)
      .to('.hero__card', { yPercent: 10 }, 0);
  });

  /* ----------------------------------------------------------------
     3 · GENERIC REVEALS — section heads, rows, list items (batched, once)
     ---------------------------------------------------------------- */
  safe('reveals', () => {
    const groups = [
      '.about__body', '.layer', '.exp__item', '.contact__lead',
      '.sec-head__index', '.sec-head__note', '.sec-head__rule', '.tools',
    ];
    gsap.utils.toArray(groups.join(',')).forEach((el) => {
      gsap.fromTo(el, { y: 40, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, duration: 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
    // chips stagger inside each capability layer
    gsap.utils.toArray('.layer').forEach((row) => {
      const chips = row.querySelectorAll('.chips--lg li');
      if (!chips.length) return;
      gsap.from(chips, { y: 14, autoAlpha: 0, duration: 0.45, ease: 'power2.out', stagger: 0.03,
        scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
    });
  });

  /* ----------------------------------------------------------------
     4 · FLIP HEADLINES — split-flap characters that face you
     ---------------------------------------------------------------- */
  function splitChars(el) {
    const chars = [];
    const build = (src, dest) => {
      Array.from(src.childNodes).forEach((node) => {
        if (node.nodeType === 3) {
          node.textContent.split('').forEach((ch) => {
            if (ch === ' ') { dest.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'char'; s.textContent = ch;
            dest.appendChild(s); chars.push(s);
          });
        } else if (node.nodeType === 1) {
          const shell = node.cloneNode(false);
          dest.appendChild(shell);
          build(node, shell);
        }
      });
    };
    el.setAttribute('aria-label', el.textContent.trim());
    const original = el.cloneNode(true);
    el.textContent = '';
    build(original, el);
    return chars;
  }

  safe('flip-headlines', () => {
    gsap.utils.toArray('.sec-head__title, .contact__big, .case__title').forEach((el) => {
      const chars = splitChars(el);
      if (!chars.length) return;
      gsap.from(chars, {
        rotationX: -96, autoAlpha: 0, yPercent: 24, transformOrigin: '50% 0%', transformPerspective: 600,
        duration: 0.7, ease: 'power3.out', stagger: { each: 0.02, from: 'start' },
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
      });
    });
  });

  /* ----------------------------------------------------------------
     5 · LIFT CARDS — lab grid rises in
     ---------------------------------------------------------------- */
  safe('lift-cards', () => {
    const g = document.querySelector('.lab__grid');
    if (!g) return;
    const targets = g.querySelectorAll('.lab__item');
    if (!targets.length) return;
    gsap.from(targets, {
      y: 28, autoAlpha: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: g, start: 'top 82%', once: true },
    });
  });

  /* ----------------------------------------------------------------
     6 · ABOUT — word-by-word statement
     ---------------------------------------------------------------- */
  safe('about-words', () => {
    const el = document.querySelector('.about__statement');
    if (!el) return;
    const wrap = (node) => {
      const out = document.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach((tok) => {
            if (/^\s+$/.test(tok)) { out.appendChild(document.createTextNode(tok)); }
            else if (tok) {
              const s = document.createElement('span');
              s.className = 'word'; s.textContent = tok;
              out.appendChild(s);
            }
          });
        } else if (child.nodeType === 1) {
          const clone = child.cloneNode(true);
          clone.classList.add('word');
          out.appendChild(clone);
        }
      });
      return out;
    };
    const frag = wrap(el);
    el.textContent = '';
    el.appendChild(frag);
    gsap.from(el.querySelectorAll('.word'), {
      yPercent: 110, autoAlpha: 0, duration: 0.7, ease: 'power3.out', stagger: 0.025,
      scrollTrigger: { trigger: el, start: 'top 80%', once: true },
    });
  });

  /* ----------------------------------------------------------------
     7 · EXPERIENCE — timeline line draw
     ---------------------------------------------------------------- */
  safe('exp-line', () => {
    const list = document.querySelector('.exp');
    if (!list) return;
    list.classList.add('exp--lined');
    const line = document.createElement('span');
    line.className = 'exp__line'; line.setAttribute('aria-hidden', 'true');
    list.appendChild(line);
    gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 75%', end: 'bottom 80%', scrub: true } });
  });

  /* ----------------------------------------------------------------
     8 · WATERMARK — giant ghosted name behind contact (transform only)
     ---------------------------------------------------------------- */
  safe('watermark', () => {
    const contact = document.querySelector('.section--contact .container');
    if (!contact) return;
    const wm = document.createElement('div');
    wm.className = 'watermark'; wm.setAttribute('aria-hidden', 'true');
    wm.innerHTML = '<span>DELOS&nbsp;SANTOS</span>';
    contact.parentElement.insertBefore(wm, contact);
    gsap.fromTo(wm.querySelector('span'), { xPercent: 6 }, { xPercent: -6, ease: 'none',
      scrollTrigger: { trigger: '.section--contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ----------------------------------------------------------------
     9 · COUNTERS — tick numbers up on enter
     ---------------------------------------------------------------- */
  safe('counters', () => {
    gsap.utils.toArray('[data-count]').forEach((el) => {
      const end = parseFloat(el.getAttribute('data-count'));
      if (isNaN(end)) return;
      const obj = { v: 0 };
      gsap.to(obj, { v: end, duration: 1.4, ease: 'power2.out',
        onUpdate: () => { el.textContent = Math.round(obj.v); },
        scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  });

  /* ----------------------------------------------------------------
     refresh after load / fonts so trigger positions are correct
     ---------------------------------------------------------------- */
  safe('refresh', () => {
    window.addEventListener('load', () => ST.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
    setTimeout(() => ST.refresh(), 1200);
  });

  document.documentElement.classList.add('is-loaded', 'gsap-on', 'hero-ready');
})();
