/* ================================================================
   SIGNALS — interactions for John Chrisley's portfolio
   Vanilla JS, no dependencies. Everything is feature-detected and
   reduced-motion aware. Modules:
     1. reveal        — scroll-triggered entrances (IntersectionObserver)
     2. activeSection — header + rail active state
     3. railProgress  — scroll-linked progress on the left rail
     4. header        — scrolled state
     5. mobileMenu    — open/close
     6. magnetic      — pointer-following buttons (desktop only)
   ================================================================ */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(pointer: fine)').matches;

  /* ----------------------------------------------------------------
     1 · REVEAL ON SCROLL
     ---------------------------------------------------------------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-in'));
  }

  /* ----------------------------------------------------------------
     2 · ACTIVE SECTION (header links + rail)
     ---------------------------------------------------------------- */
  const sectionIds = ['hero', 'about', 'work', 'stack', 'experience', 'education', 'contact'];
  const sections = sectionIds
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const headerLinks = document.querySelectorAll('.header__link');
  const railLinks   = document.querySelectorAll('.rail__list a');

  function setActive(id) {
    const key = id === 'hero' ? 'top' : id;
    headerLinks.forEach(a =>
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    railLinks.forEach(a =>
      a.classList.toggle('is-active', a.getAttribute('data-rail') === key));
  }

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(s => spy.observe(s));
  }

  /* ----------------------------------------------------------------
     3 · RAIL PROGRESS + HEADER STATE (scroll, rAF-throttled)
     ---------------------------------------------------------------- */
  const header       = document.getElementById('header');
  const rail         = document.getElementById('rail');
  const railProgress = document.getElementById('railProgress');
  let ticking = false;

  function onScrollFrame() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docH > 0 ? Math.min(scrollTop / docH, 1) : 0;

    if (header) header.classList.toggle('header--scrolled', scrollTop > 40);

    if (rail && railProgress) {
      const track = rail.offsetHeight - 8;
      railProgress.style.height = (progress * track) + 'px';
    }
    ticking = false;
  }

  function requestScroll() {
    if (!ticking) {
      window.requestAnimationFrame(onScrollFrame);
      ticking = true;
    }
  }
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });
  onScrollFrame();

  /* ----------------------------------------------------------------
     4 · MOBILE MENU
     ---------------------------------------------------------------- */
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  function closeMenu() {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function openMenu() {
    menuToggle.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () =>
      mobileMenu.classList.contains('is-open') ? closeMenu() : openMenu());
    mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    // close if resized up to desktop
    window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
      if (e.matches) closeMenu();
    });
  }

  /* ----------------------------------------------------------------
     5 · MAGNETIC BUTTONS (desktop, motion-on only)
     ---------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    const STRENGTH = 0.28;
    const MAX = 9;
    document.querySelectorAll('[data-magnetic]').forEach(el => {
      el.style.transition = 'transform 0.25s cubic-bezier(0.22,1,0.36,1)';
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        let dx = (e.clientX - (r.left + r.width / 2)) * STRENGTH;
        let dy = (e.clientY - (r.top + r.height / 2)) * STRENGTH;
        dx = Math.max(-MAX, Math.min(MAX, dx));
        dy = Math.max(-MAX, Math.min(MAX, dy));
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
})();
