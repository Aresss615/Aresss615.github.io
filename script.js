/* ================================================================
   SCRIPT.JS — Portfolio of John Chrisley Delos Santos

   Handles:
   1. Scroll progress bar
   2. Mobile navigation (toggle, overlay, link close)
   3. Active nav link tracking on scroll
   4. Sticky header state
   5. Scroll-to-top button
   6. Reveal-on-scroll animations (IntersectionObserver)
   7. Subtle tilt effect on project cards
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  
  /* -------------------------------------------------------
     ELEMENT REFERENCES
     ------------------------------------------------------- */
  const header        = document.getElementById('header');
  const navToggle     = document.getElementById('navToggle');
  const navMenu       = document.getElementById('navMenu');
  const navLinks      = document.querySelectorAll('.nav__link');
  const scrollTopBtn  = document.getElementById('scrollTopBtn');
  const scrollProgress = document.getElementById('scrollProgress');
  const sections      = document.querySelectorAll('.section, .hero');

  /* Create mobile overlay element */
  const overlay = document.createElement('div');
  overlay.classList.add('nav__overlay');
  document.body.appendChild(overlay);

  /* -------------------------------------------------------
     1. SCROLL PROGRESS BAR
     — Shows a thin accent-colored bar at the very top of
       the page indicating how far the user has scrolled.
     ------------------------------------------------------- */
  function updateScrollProgress() {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = (scrollTop / scrollHeight) * 100;
    scrollProgress.style.width = progress + '%';
  }

  /* -------------------------------------------------------
     2. MOBILE NAVIGATION
     ------------------------------------------------------- */
  function openMenu() {
    navToggle.classList.add('open');
    navMenu.classList.add('open');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navToggle.classList.remove('open');
    navMenu.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }

  navToggle.addEventListener('click', () => {
    if (navMenu.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener('click', closeMenu);

  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  /* -------------------------------------------------------
     3. ACTIVE NAV LINK ON SCROLL
     — Highlights the nav link for the section currently
       in the viewport.
     ------------------------------------------------------- */
  function updateActiveLink() {
    const scrollY = window.scrollY + 250;

    sections.forEach(section => {
      const sectionTop    = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId     = section.getAttribute('id');

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  /* -------------------------------------------------------
     4. HEADER SCROLL STATE
     — Adds a class to the header when scrolled, enabling
       a border + shadow via CSS.
     ------------------------------------------------------- */
  function updateHeaderState() {
    if (window.scrollY > 60) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
  }

  /* -------------------------------------------------------
     5. SCROLL-TO-TOP BUTTON
     ------------------------------------------------------- */
  function updateScrollTopBtn() {
    if (window.scrollY > 500) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* -------------------------------------------------------
     6. REVEAL ON SCROLL (IntersectionObserver)
     — Elements with [data-reveal] animate in when they
       enter the viewport. Each element only animates once.
     ------------------------------------------------------- */
  const revealElements = document.querySelectorAll('[data-reveal]');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  revealElements.forEach(el => revealObserver.observe(el));

  /* -------------------------------------------------------
     7. MASTHEAD CLOCK (Manila time)
     ------------------------------------------------------- */
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    const tickClock = () => {
      const now = new Date();
      const opts = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Manila' };
      const time = new Intl.DateTimeFormat('en-GB', opts).format(now);
      clockEl.textContent = `◷ ${time} PHT`;
    };
    tickClock();
    setInterval(tickClock, 30000);
  }

  /* -------------------------------------------------------
     8. SUBTLE TILT EFFECT ON PROJECT CARDS
     — Gives a slight 3D perspective tilt on mouse movement
       over cards with [data-tilt]. Respects prefers-reduced-motion.
     ------------------------------------------------------- */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    const tiltCards = document.querySelectorAll('[data-tilt]');

    tiltCards.forEach(card => {
      card.style.transition += ', transform 0.15s ease';
      card.style.willChange = 'transform';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -3;
        const rotateY = ((x - centerX) / centerX) * 3;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
      });
    });
  }

  /* -------------------------------------------------------
     SCROLL EVENT (combined handler)
     — Runs all lightweight scroll-dependent functions.
       Uses requestAnimationFrame for performance.
     ------------------------------------------------------- */
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateScrollProgress();
        updateActiveLink();
        updateHeaderState();
        updateScrollTopBtn();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  /* Run once on load (in case user arrives mid-page) */
  updateScrollProgress();
  updateActiveLink();
  updateHeaderState();
  updateScrollTopBtn();

  /* -------------------------------------------------------
     SMOOTH ANCHOR LINKS
     — Ensures all in-page anchor links scroll smoothly,
       even if CSS scroll-behavior is not supported.
     ------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

});
