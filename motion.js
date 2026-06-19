/* ================================================================
   MOTION — cinematic enhancement layer for John Chrisley's portfolio
   Progressive enhancement on top of script.js. Everything here is
   optional: if GSAP/Lenis are missing or the user prefers reduced
   motion, the base site is untouched. Wrapped so a failure in any one
   module never breaks the page.

   Modules:
     0. intro          — page-load curtain
     1. smooth scroll  — Lenis + GSAP/ScrollTrigger sync
     2. aurora         — animated hero background canvas
     3. cursor         — custom dot + ring
     4. hero parallax  — portrait tilt + layer parallax
     5. marquee        — scroll-velocity skew
     6. reveals        — section entrances (GSAP, batched)
     7. about          — word-by-word statement reveal
     8. work           — pinned/stacking case studies + dim
     9. experience     — timeline line draw
    10. watermark      — giant ghosted name parallax
    11. counters       — number tick-up
   ================================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(pointer: fine)').matches;
  const isMobile     = window.matchMedia('(max-width: 860px)').matches;
  const hasGSAP      = typeof window.gsap !== 'undefined';
  const hasLenis     = typeof window.Lenis !== 'undefined';

  const safe = (label, fn) => { try { fn(); } catch (e) { console.warn('[motion] ' + label + ' failed:', e); } };

  // always start at the top — the cinematic intro assumes a top-of-page reveal
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* ----------------------------------------------------------------
     0 · INTRO CURTAIN  (runs even without libs; CSS auto-dismisses)
     ---------------------------------------------------------------- */
  safe('intro', () => {
    if (reduceMotion) { document.documentElement.classList.add('is-loaded'); return; }
    document.documentElement.classList.add('intro-active');
    const intro = document.createElement('div');
    intro.className = 'intro';
    intro.setAttribute('aria-hidden', 'true');

    const words = ['John', 'Chrisley'];
    const titleHTML = words.map((w) =>
      '<span class="intro__word">' +
        [...w].map((c) => '<span class="intro__char">' + c + '</span>').join('') +
      '</span>'
    ).join(' ');
    intro.innerHTML =
      '<div class="intro__bg"></div>' +
      '<div class="intro__content">' +
        '<span class="intro__tag mono">Computer Engineer · Full-stack &amp; Systems</span>' +
        '<h2 class="intro__title">' + titleHTML + '</h2>' +
        '<div class="intro__row">' +
          '<span class="intro__count mono">0</span>' +
          '<span class="intro__line"><span class="intro__fill"></span></span>' +
          '<span class="intro__pct mono">Loading</span>' +
        '</div>' +
      '</div>';
    document.body.appendChild(intro);

    const done = () => {
      document.documentElement.classList.remove('intro-active');
      document.documentElement.classList.add('is-loaded');
      if (intro.parentNode) intro.remove();
    };

    if (!hasGSAP) {
      intro.style.transition = 'clip-path 0.9s cubic-bezier(0.76,0,0.24,1)';
      intro.style.clipPath = 'inset(0 0 0 0)';
      setTimeout(() => {
        intro.style.clipPath = 'inset(0 0 100% 0)';
        setTimeout(done, 900);
      }, 900);
      setTimeout(done, 3000);
      return;
    }

    const g = window.gsap;
    const chars   = intro.querySelectorAll('.intro__char');
    const countEl = intro.querySelector('.intro__count');
    const counter = { v: 0 };
    const tl = g.timeline({ onComplete: done });
    if (location.search.indexOf('slowintro') !== -1) tl.timeScale(0.18);   // debug: slow-mo the intro
    tl.set(intro, { clipPath: 'inset(0 0 0 0)' })
      .from(intro.querySelector('.intro__tag'), { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power2.out' })
      .to(chars, { yPercent: -110, duration: 0.95, ease: 'power4.out', stagger: 0.04 }, '-=0.15')
      .to(counter, { v: 100, duration: 1.4, ease: 'power2.inOut',
        onUpdate: () => { countEl.textContent = Math.round(counter.v); } }, '<')
      .to(intro.querySelector('.intro__fill'), { width: '100%', duration: 1.4, ease: 'power2.inOut' }, '<')
      .to(intro.querySelector('.intro__pct'), { autoAlpha: 0, duration: 0.3 }, '-=0.25')
      .addLabel('reveal', '+=0.15')
      // un-hide the hero — its entrance is driven by pure CSS (see style.css),
      // so nothing here fights the scroll animations on the hero.
      .add(() => document.documentElement.classList.remove('intro-active'), 'reveal')
      .to(intro.querySelector('.intro__content'), { yPercent: -8, autoAlpha: 0, duration: 0.6, ease: 'power3.in' }, 'reveal')
      .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 1.05, ease: 'expo.inOut' }, 'reveal+=0.1');

    // hard safety: never let the curtain trap the page
    setTimeout(() => { if (document.body.contains(intro)) { tl.progress(1); } }, 6000);
  });

  /* ----------------------------------------------------------------
     2 · AURORA — animated hero background (independent of GSAP)
     ---------------------------------------------------------------- */
  safe('aurora', () => {
    if (reduceMotion) return;
    const hero = document.getElementById('hero');
    if (!hero) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'hero__aurora';
    canvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(canvas, hero.firstChild);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.6);
    let w = 0, h = 0;
    // warm paper-friendly palette (saturated colors, low alpha, multiply blend)
    const blobs = [
      { hue: '255,77,23',  r: 0.55, x: 0.78, y: 0.12, ax: 0.10, ay: 0.07, sp: 0.00022, ph: 0.0,  a: 0.30 },
      { hue: '255,150,40', r: 0.50, x: 0.20, y: 0.85, ax: 0.12, ay: 0.06, sp: 0.00017, ph: 1.7,  a: 0.24 },
      { hue: '255,90,30',  r: 0.42, x: 0.50, y: 0.45, ax: 0.16, ay: 0.10, sp: 0.00028, ph: 3.1,  a: 0.18 },
      { hue: '90,110,150', r: 0.46, x: 0.92, y: 0.78, ax: 0.08, ay: 0.09, sp: 0.00020, ph: 4.6,  a: 0.12 },
    ];
    let mx = 0.5, my = 0.5;        // target mouse (normalized)
    let cmx = 0.5, cmy = 0.5;      // eased

    function resize() {
      const rect = hero.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    if (finePointer) {
      hero.addEventListener('pointermove', (e) => {
        const rect = hero.getBoundingClientRect();
        mx = (e.clientX - rect.left) / rect.width;
        my = (e.clientY - rect.top) / rect.height;
      }, { passive: true });
    }

    let t0 = performance.now();
    function frame(now) {
      requestAnimationFrame(frame);
      if (window.scrollY > window.innerHeight * 1.25) return;   // off-screen: skip the heavy draw
      const t = now - t0;
      cmx += (mx - cmx) * 0.05;
      cmy += (my - cmy) * 0.05;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'multiply';
      const par = 0.04; // mouse parallax strength
      for (const b of blobs) {
        const cx = (b.x + Math.sin(t * b.sp + b.ph) * b.ax + (cmx - 0.5) * par) * w;
        const cy = (b.y + Math.cos(t * b.sp * 1.3 + b.ph) * b.ay + (cmy - 0.5) * par) * h;
        const rad = b.r * Math.max(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, 'rgba(' + b.hue + ',' + b.a + ')');
        g.addColorStop(1, 'rgba(' + b.hue + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(frame);
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
     1 · SMOOTH SCROLL (Lenis ↔ GSAP)
     ---------------------------------------------------------------- */
  let lenis = null;
  safe('lenis', () => {
    if (!hasLenis || isMobile) return;   // native touch scroll on mobile
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    if (ST) lenis.on('scroll', ST.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;   // expose for anchor handling / debugging
    // make in-page anchor links use Lenis
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -70, duration: 1.1 });
      });
    });
  });

  if (!ST) { document.documentElement.classList.add('is-loaded'); return; }

  /* ----------------------------------------------------------------
     5 · MARQUEE — scroll-velocity skew
     ---------------------------------------------------------------- */
  safe('marquee', () => {
    const track = document.querySelector('.marquee__track');
    if (!track) return;
    const skewSetter = gsap.quickTo(track, 'skewX', { duration: 0.5, ease: 'power3' });
    ST.create({
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-12, 12, self.getVelocity() / -180);
        skewSetter(v);
      },
    });
  });

  /* ----------------------------------------------------------------
     4 · HERO PARALLAX + PORTRAIT TILT
     ---------------------------------------------------------------- */
  safe('hero-parallax', () => {
    const card = document.querySelector('.hero__card');
    // 3D tilt toward cursor
    if (finePointer && card) {
      const portrait = card.querySelector('.portrait');
      if (portrait) {
        gsap.set(card, { transformPerspective: 800, transformStyle: 'preserve-3d' });
        const rx = gsap.quickTo(portrait, 'rotationX', { duration: 0.6, ease: 'power3' });
        const ry = gsap.quickTo(portrait, 'rotationY', { duration: 0.6, ease: 'power3' });
        card.addEventListener('pointermove', (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - (r.left + r.width / 2)) / r.width;
          const py = (e.clientY - (r.top + r.height / 2)) / r.height;
          ry(px * 10); rx(-py * 10);
        });
        card.addEventListener('pointerleave', () => { rx(0); ry(0); });
      }
    }
  });

  /* ----------------------------------------------------------------
     6 · GENERIC REVEALS — section heads, cards, rows (batched)
        We let GSAP own these and neutralise the CSS [data-reveal] base
        on enhanced elements via the .gsap-on flag on <html>.
     ---------------------------------------------------------------- */
  safe('reveals', () => {
    // headlines, section heads and cards are handled by the flip module below
    const groups = [
      '.about__body', '.stack__row', '.exp__item', '.contact__lead',
      '.sec-head__index', '.sec-head__note', '.sec-head__rule',
    ];   // hero children are revealed by the intro timeline
    const els = gsap.utils.toArray(groups.join(','));
    els.forEach((el) => {
      gsap.fromTo(el, { y: 44, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
    // chips stagger inside each stack row
    gsap.utils.toArray('.stack__row').forEach((row) => {
      const chips = row.querySelectorAll('.chips--lg li');
      if (!chips.length) return;
      gsap.from(chips, { y: 16, autoAlpha: 0, duration: 0.5, ease: 'power2.out', stagger: 0.04,
        scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
    });
  });

  /* ----------------------------------------------------------------
     6b · FLIP REVEALS — split-flap headlines + cards that flip to face you
     ---------------------------------------------------------------- */
  // Split an element's text into .char spans, preserving inline tags (<em>,<br>).
  // Sets aria-label so screen readers still read the whole phrase.
  function splitChars(el) {
    const chars = [];
    const build = (src, dest) => {
      Array.from(src.childNodes).forEach((node) => {
        if (node.nodeType === 3) {
          node.textContent.split('').forEach((ch) => {
            if (ch === ' ') { dest.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'char'; s.textContent = ch;
            dest.appendChild(s); chars.push(s);
          });
        } else if (node.nodeType === 1) {
          const shell = node.cloneNode(false);   // keep <em>/<br> but not its text
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

  safe('flip-cards', () => {
    const sets = [
      { grid: '.lab__grid', items: '.lab__item' },
      { grid: '.edu', items: '.edu__item' },
      { grid: '.contact__links', items: '.contact__item' },
    ];
    sets.forEach(({ grid, items }) => {
      const g = document.querySelector(grid);
      if (!g) return;
      const targets = g.querySelectorAll(items);
      if (!targets.length) return;
      gsap.from(targets, {
        rotationY: 42, z: -120, autoAlpha: 0, transformOrigin: '50% 50%', transformPerspective: 900,
        duration: 0.9, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: g, start: 'top 82%', once: true },
      });
    });
  });

  /* ----------------------------------------------------------------
     7 · ABOUT — word-by-word statement
     ---------------------------------------------------------------- */
  safe('about-words', () => {
    const el = document.querySelector('.about__statement');
    if (!el) return;
    // wrap each word (preserve existing <em> emphasis)
    const wrap = (node) => {
      const out = document.createDocumentFragment();
      // static snapshot — appending nodes mutates a live childNodes list
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
     8 · WORK — pinned / stacking case studies
        Cards are CSS-sticky (see style.css). Here we scrub the outgoing
        card's scale + dim as the next one slides over it.
     ---------------------------------------------------------------- */
  safe('work-stack', () => {
    if (isMobile) return;
    const cases = gsap.utils.toArray('.case');
    cases.forEach((card, i) => {
      if (i === cases.length - 1) return;       // last stays full
      const next = cases[i + 1];
      gsap.fromTo(card,
        { scale: 1, filter: 'brightness(1)' },
        { scale: 0.93, filter: 'brightness(0.92)', ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } });
    });
  });

  /* ----------------------------------------------------------------
     9 · EXPERIENCE — timeline line draw
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
     10 · WATERMARK — giant ghosted name behind contact
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
     11 · COUNTERS — tick numbers up on enter
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
     refresh after load / fonts so pin positions are correct
     ---------------------------------------------------------------- */
  safe('refresh', () => {
    window.addEventListener('load', () => ST.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
    setTimeout(() => ST.refresh(), 1200);
  });

  document.documentElement.classList.add('is-loaded', 'gsap-on');
})();
