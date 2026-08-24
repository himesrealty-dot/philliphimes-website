// ─────────────────────────────────────────────────────────────────────────────
// The Front Porch — portal nav hamburger.
//
// Deliberately separate from main.js: that handler binds to the site nav's
// .nav__* classes, and the whole point of the portal bar is that it does NOT
// inherit the site nav. Shared by front-porch.html, front-porch-vendors.html
// and front-porch-newsletter.html.
//
// main.js still runs alongside this for its smooth-scroll on a[href^="#"].
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var burger = document.getElementById('fp-burger');
  var menu   = document.getElementById('fp-menu');
  if (!burger || !menu) return;

  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  }

  burger.addEventListener('click', function () {
    setOpen(!menu.classList.contains('is-open'));
  });

  // Close after picking a destination, so the panel isn't left covering it
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      burger.focus();
    }
  });

  // Reset state if the viewport grows back past the breakpoint
  window.addEventListener('resize', function () {
    if (window.innerWidth > 820) setOpen(false);
  }, { passive: true });
})();
