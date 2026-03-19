/* ============================================
   Main JavaScript — Gunner Stone Portfolio
   ============================================ */

(function () {
  'use strict';

  // --- Dark Mode ---
  const themeToggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  const iconSun = themeToggle?.querySelector('.icon-sun');
  const iconMoon = themeToggle?.querySelector('.icon-moon');

  function getPreferredTheme() {
    const urlTheme = new URLSearchParams(window.location.search).get('theme');
    if (urlTheme === 'dark' || urlTheme === 'light') return urlTheme;
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function stampThemeOnLinks(theme) {
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;
      const base = href.split('?')[0];
      a.setAttribute('href', base + '?theme=' + theme);
    });
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch(e) {}
    document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
    if (iconSun && iconMoon) {
      iconSun.style.display = theme === 'dark' ? 'none' : 'block';
      iconMoon.style.display = theme === 'dark' ? 'block' : 'none';
    }
    stampThemeOnLinks(theme);
  }

  applyTheme(getPreferredTheme());

  themeToggle?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || getPreferredTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  // --- Navbar scroll shadow ---
  const navbar = document.getElementById('navbar');
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        navbar?.classList.toggle('scrolled', window.scrollY > 10);
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- Mobile hamburger menu ---
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  hamburger?.addEventListener('click', () => {
    navLinks?.classList.toggle('open');
    const isOpen = navLinks?.classList.contains('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  // Close mobile nav when a link is clicked
  navLinks?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });

  // --- Scroll Reveal (Intersection Observer) ---
  const revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    revealElements.forEach((el) => observer.observe(el));
  } else {
    // Fallback: show everything
    revealElements.forEach((el) => el.classList.add('visible'));
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

})();
