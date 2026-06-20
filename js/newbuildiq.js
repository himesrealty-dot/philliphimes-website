/* NewBuildIQ — consumer-side integration for philliphimes.com
 *
 * Talks to the Real Estate Agentic OS backend (one app, one deploy):
 *   - reads CURATED live new-construction data  (GET /newbuildiq/public/*)
 *   - captures TAGGED leads                      (POST /lead)
 *
 * Everything degrades gracefully: if NewBuildIQ isn't enabled yet (the public
 * API 404s until ENABLE_NEWBUILDIQ=true) or the backend is unreachable, pages
 * keep their static content and the lead form falls back to a mailto. So this
 * file is safe to ship before the backend is switched on.
 *
 * To point at a custom domain later, change NEWBUILDIQ_API in one place.
 */
(function () {
  'use strict';

  var NEWBUILDIQ_API = 'https://real-estate-agentic-os-production.up.railway.app';
  var DEFAULT_CITY = 'League City';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(v) {
    return (typeof v === 'number' && v) ? '$' + Math.round(v).toLocaleString() : null;
  }

  async function getJSON(path) {
    var r = await fetch(NEWBUILDIQ_API + path, { headers: { 'Accept': 'application/json' } });
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  }

  // ── public reads (curated). Always resolve; never throw into the page. ──────
  async function fetchCommunities(city) {
    try {
      var d = await getJSON('/newbuildiq/public/communities?city=' + encodeURIComponent(city || DEFAULT_CITY));
      return Array.isArray(d.communities) ? d.communities : [];
    } catch (e) { return []; }
  }
  async function fetchMarket(city, community) {
    try {
      var p = '/newbuildiq/public/market?city=' + encodeURIComponent(city || DEFAULT_CITY);
      if (community) p += '&community=' + encodeURIComponent(community);
      return await getJSON(p);
    } catch (e) { return { found: false, has_data: false }; }
  }

  // Render live, in-stock communities into #nbiq-live (which starts hidden).
  // If there's no live data (API dark or zero inventory) the block stays hidden
  // and the page's curated static content stands on its own.
  async function renderLiveCommunities(opts) {
    opts = opts || {};
    var el = document.getElementById(opts.target || 'nbiq-live');
    if (!el) return;
    var cardsWrap = el.querySelector('[data-nbiq-cards]');
    if (!cardsWrap) return;
    var comms = (await fetchCommunities(opts.city)).filter(function (c) { return (c.active_inventory || 0) > 0; });
    if (!comms.length) return;
    comms.sort(function (a, b) { return (b.active_inventory || 0) - (a.active_inventory || 0); });
    cardsWrap.innerHTML = comms.slice(0, opts.limit || 9).map(function (c) {
      var price = money(c.active_median_price);
      var builders = (c.builders || []).filter(Boolean).slice(0, 3).join(' · ');
      var n = c.active_inventory;
      return '<div class="community-card" style="cursor:default;">'
        + '<div class="community-card__city">' + esc(c.name) + '</div>'
        + '<div class="community-card__name">' + n + ' active ' + (n === 1 ? 'home' : 'homes') + '</div>'
        + (builders ? '<div class="community-card__district">' + esc(builders) + '</div>' : '')
        + (price ? '<div class="community-card__price">Median <span>' + price + '</span></div>' : '')
        + '</div>';
    }).join('');
    el.style.display = '';
  }

  // ── tagged lead capture -> FastAPI /lead (NOT Netlify Forms) ───────────────
  // Opt in with <form class="nbiq-form" data-tag="new-construction-report"
  // data-source="..."> ; honeypot field name="company"; consent checkbox
  // name="sms_consent".
  function wireForms() {
    document.querySelectorAll('form.nbiq-form').forEach(function (form) {
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var btn = form.querySelector('[type=submit]');
        var orig = btn ? btn.textContent : '';
        var data = Object.fromEntries(new FormData(form));

        // Honeypot: a filled hidden "company" field = bot. Look like success.
        if ((data.company || '').trim()) { showMsg(form, true); form.reset(); return; }
        if (!(data.email || '').trim() && !(data.phone || '').trim()) {
          alert('Please add an email or a phone number so Phil can reach you.');
          return;
        }
        var consentEl = form.querySelector('[name="sms_consent"]');
        var payload = {
          name: (data.name || '').trim(),
          email: (data.email || '').trim(),
          phone: (data.phone || '').trim(),
          message: (data.message || data.community || '').trim(),
          consent: consentEl ? consentEl.checked : !!data.consent,
          source: form.getAttribute('data-source') || ('nbiq:' + location.pathname),
          tag: form.getAttribute('data-tag') || 'builder-incentives',
          company: data.company || ''
        };
        if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }
        try {
          var r = await fetch(NEWBUILDIQ_API + '/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!r.ok) throw new Error('http ' + r.status);
          showMsg(form, true); form.reset();
        } catch (err) {
          showMsg(form, false); // mailto fallback — a lead is never lost
        } finally {
          if (btn) { btn.textContent = orig; btn.disabled = false; }
        }
      });
    });
  }

  function showMsg(form, ok) {
    var prev = form.parentNode.querySelector('.nbiq-form__msg');
    if (prev) prev.remove();
    var msg = document.createElement('div');
    msg.className = 'nbiq-form__msg';
    msg.style.cssText = 'margin-top:1rem;padding:0.9rem 1.1rem;border-radius:10px;'
      + 'font-size:0.92rem;line-height:1.5;'
      + (ok ? 'background:#e8f3f6;color:#0a5c6e;border:1px solid rgba(32,137,160,0.35);'
            : 'background:#fff5e6;color:#7a4f00;border:1px solid rgba(201,164,85,0.5);');
    if (ok) {
      msg.textContent = '✓ Got it — Phil will send you the current new-construction details shortly. '
        + 'Tip: register with him before visiting a model home so your representation is protected.';
    } else {
      msg.innerHTML = "Couldn't submit just now. Please email "
        + "<a href='mailto:phil@philliphimes.com' style='color:inherit;text-decoration:underline;'>phil@philliphimes.com</a>"
        + ' or call (832) 536-1016 and Phil will get right back to you.';
    }
    form.parentNode.insertBefore(msg, form.nextSibling);
    setTimeout(function () { msg.remove(); }, 10000);
  }

  function init() {
    wireForms();
    var live = document.getElementById('nbiq-live');
    if (live) renderLiveCommunities({ city: live.getAttribute('data-city') || DEFAULT_CITY });
  }
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);

  // Expose for pages that want to drive it directly.
  window.NewBuildIQ = {
    api: NEWBUILDIQ_API,
    fetchCommunities: fetchCommunities,
    fetchMarket: fetchMarket,
    renderLiveCommunities: renderLiveCommunities
  };
})();
