/* =========================================
   Market report pages — nav behaviour only
   philliphimes.com
   -----------------------------------------
   The report pages load this instead of js/main.js. main.js also animates
   every `.card` and wires site forms; the report body uses `.card` for its
   own layout, so loading main.js there would restyle content this site does
   not own. This file is the nav section of main.js and nothing else.
   Keep the two in step if the nav behaviour changes.
   ========================================= */
document.addEventListener('DOMContentLoaded', function () {
  var hamburger = document.querySelector('.nav__hamburger');
  var navLinks = document.querySelector('.nav__links');
  if (!hamburger || !navLinks) return;

  var mobileCta = navLinks.querySelector('.nav__mobile-cta');

  function setOpen(isOpen) {
    navLinks.classList.toggle('nav__links--open', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    hamburger.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    if (mobileCta) mobileCta.style.display = isOpen ? 'block' : 'none';
  }

  hamburger.addEventListener('click', function () {
    setOpen(!navLinks.classList.contains('nav__links--open'));
  });

  // Mobile dropdown toggles (Buying, Cities, Tools)
  document.querySelectorAll('.nav__item--dropdown > .nav__link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        link.closest('.nav__item--dropdown').classList.toggle('open');
      }
    });
  });

  // Close the menu when a real link is followed
  navLinks.querySelectorAll('a:not(.nav__item--dropdown > .nav__link)').forEach(function (link) {
    link.addEventListener('click', function () { setOpen(false); });
  });

  // Sticky nav shadow
  var nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', function () {
      nav.style.boxShadow = window.scrollY > 10
        ? '0 4px 16px rgba(0,0,0,0.12)'
        : '0 1px 3px rgba(0,0,0,0.08)';
    }, { passive: true });
  }
});
