/* HomeSearchIQ app shell behavior — js/app.js
   Tab switching, PWA install prompt, service-worker registration, and the
   quick-filter deep-link builder that hands off to IDXBroker results. */
(function () {
  'use strict';

  var IDX = 'https://philliphimes.idxbroker.com';

  /* ---- service worker (app-scoped by its own narrow fetch handler) ---- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  /* ---- tabs ---- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabbtn'));
  var panes = Array.prototype.slice.call(document.querySelectorAll('.pane'));
  function showTab(name) {
    var found = false;
    panes.forEach(function (p) {
      var on = p.getAttribute('data-pane') === name;
      p.classList.toggle('is-active', on);
      if (on) found = true;
    });
    if (!found) { showTab('search'); return; }
    tabs.forEach(function (t) {
      t.setAttribute('aria-selected', String(t.getAttribute('data-tab') === name));
    });
    try { document.querySelector('.app-body').scrollTop = 0; window.scrollTo(0, 0); } catch (e) {}
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { showTab(t.getAttribute('data-tab')); });
  });

  /* start on ?tab= if present, else search */
  var params = new URLSearchParams(window.location.search);
  showTab(params.get('tab') || 'search');

  /* top search box routes into IDX basic search */
  var searchInput = document.getElementById('app-search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var q = searchInput.value.trim();
        var url = q ? (IDX + '/idx/search/basic?ccz=city&city%5B%5D=' + encodeURIComponent(q))
                    : (IDX + '/idx/search/basic');
        window.open(url, '_blank', 'noopener');
      }
    });
  }

  /* ---- quick-filter builder -> /idx/results/listings ---- */
  function wireChipGroup(groupEl) {
    if (!groupEl) return;
    groupEl.addEventListener('click', function (e) {
      var chip = e.target.closest('.fchip');
      if (!chip) return;
      groupEl.querySelectorAll('.fchip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      chip.setAttribute('aria-pressed', 'true');
    });
  }
  var ptGroup = document.querySelector('.filter-chips[data-group="pt"]');
  var priceGroup = document.querySelector('.filter-chips[data-group="price"]');
  wireChipGroup(ptGroup);
  wireChipGroup(priceGroup);

  function selected(groupEl) {
    if (!groupEl) return null;
    var c = groupEl.querySelector('.fchip[aria-pressed="true"]');
    return c ? c.getAttribute('data-value') : null;
  }
  var goBtn = document.getElementById('filter-go');
  if (goBtn) {
    goBtn.addEventListener('click', function () {
      var pt = selected(ptGroup) || 'sfr';
      var price = selected(priceGroup); // "lp-hp" or null
      var url = IDX + '/idx/results/listings?pt=' + encodeURIComponent(pt);
      if (price && price.indexOf('-') > -1) {
        var parts = price.split('-');
        if (parts[0]) url += '&lp=' + encodeURIComponent(parts[0]);
        if (parts[1]) url += '&hp=' + encodeURIComponent(parts[1]);
      }
      url += '&srt=newest';
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ---- install prompt ---- */
  var deferred = null;
  var installBtn = document.getElementById('install-btn');
  var installTip = document.getElementById('install-tip');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (installBtn) installBtn.hidden = false;
  });

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (!deferred) return;
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; installBtn.hidden = true; });
    });
  }

  window.addEventListener('appinstalled', function () {
    if (installBtn) installBtn.hidden = true;
    if (installTip) installTip.classList.remove('is-shown');
  });

  /* iOS has no beforeinstallprompt — show the manual Add-to-Home-Screen tip,
     unless already running as an installed app. */
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isIOS && !standalone && installTip) {
    installTip.classList.add('is-shown');
  }
})();
