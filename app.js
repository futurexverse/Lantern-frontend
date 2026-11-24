/* ===================================================================
   LANTERN — Landing Page Script
   Loader, theme, nav, mascot interactions (no dependencies)
   =================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme ---------- */
  function readTheme() {
    try {
      var p = new URLSearchParams(location.search).get('theme');
      if (p === 'light' || p === 'dark') return p;
    } catch (e) {}
    try {
      var t = localStorage.getItem('lantern:theme');
      if (t === 'light' || t === 'dark') return t;
    } catch (e) {}
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
  }

  function syncThemeIcons(theme) {
    var sun = document.querySelector('.theme-icon-sun');
    var moon = document.querySelector('.theme-icon-moon');
    if (sun) sun.style.display = theme === 'dark' ? '' : 'none';
    if (moon) moon.style.display = theme === 'light' ? '' : 'none';
  }

  var theme = readTheme();
  document.documentElement.dataset.theme = theme;
  syncThemeIcons(theme);

  var themeBtn = document.getElementById('themeIcon');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      theme = theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem('lantern:theme', theme); } catch (e) {}
      syncThemeIcons(theme);
    });
  }

  /* ---------- Loader ---------- */
  var loaderDone = false;
  function hideLoader() {
    if (loaderDone) return;
    loaderDone = true;
    var l = document.getElementById('loader');
    if (l) {
      l.classList.add('done');
      l.setAttribute('aria-hidden', 'true');
    }
    var ann = document.getElementById('announcement');
    if (ann) ann.textContent = 'LANTERN loaded.';
  }
  window.addEventListener('load', function () {
    setTimeout(hideLoader, reduceMotion ? 0 : 900);
  });
  setTimeout(hideLoader, 4500); // safety net (fonts/network stalls)

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById('header');
  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile nav ---------- */
  var mobileToggle = document.getElementById('mobileToggle');
  var mobileNav = document.getElementById('mobileNav');
  function closeNav() {
    if (mobileNav) mobileNav.classList.remove('open');
    if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');
  }
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ---------- Login buttons ---------- */
  document.querySelectorAll('[data-login]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      location.href = 'login.html';
    });
  });

  /* ---------- Social links ---------- */
  var SOCIAL = {
    telegram: 'https://t.me/lantern_bot',
    twitter: 'https://x.com/lanternbot'
  };
  document.querySelectorAll('[data-social]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var url = SOCIAL[el.getAttribute('data-social')];
      if (url) window.open(url, '_blank', 'noopener');
    });
  });

  /* ---------- Brand home link ---------- */
  var brand = document.querySelector('.brand');
  if (brand) {
    brand.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Mascot: drag + tap ---------- */
  var mover = document.getElementById('mascotMover');
  if (mover && !reduceMotion) {
    var MAX_DX = 150, MAX_DY = 110;
    var dragging = false, moved = 0, startX = 0, startY = 0, baseX = 0, baseY = 0;
    var idleTimer = null;

    function setIdle(on) {
      clearTimeout(idleTimer);
      if (on) mover.classList.add('idle-animating');
      else mover.classList.remove('idle-animating');
    }

    function scheduleIdle(delay) {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { mover.classList.add('idle-animating'); }, delay || 0);
    }

    mover.addEventListener('pointerdown', function (e) {
      dragging = true;
      moved = 0;
      startX = e.clientX; startY = e.clientY;
      var m = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(mover.style.transform || '');
      baseX = m ? parseFloat(m[1]) : 0;
      baseY = m ? parseFloat(m[2]) : 0;
      setIdle(false);
      mover.classList.add('is-dragging');
      mover.classList.remove('hopping');
      try { mover.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });

    mover.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      var x = Math.max(-MAX_DX, Math.min(MAX_DX, baseX + dx));
      var y = Math.max(-MAX_DY, Math.min(MAX_DY, baseY + dy));
      mover.style.transform = 'translate3d(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px, 0)';
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      mover.classList.remove('is-dragging');
      mover.style.transform = '';      // springs back via CSS transition
      if (moved < 6) {
        // treat as a tap -> hop
        mover.classList.add('hopping');
        mover.addEventListener('animationend', function onEnd() {
          mover.removeEventListener('animationend', onEnd);
          mover.classList.remove('hopping');
          scheduleIdle(60);
        });
      } else {
        scheduleIdle(400);
      }
    }
    mover.addEventListener('pointerup', endDrag);
    mover.addEventListener('pointercancel', endDrag);

    setIdle(true); // gentle float once the page is up
  } else if (mover && reduceMotion) {
    mover.classList.remove('idle-animating');
  }
})();
