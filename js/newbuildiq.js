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

  // ── IDX listings links for the live community cards ────────────────────────
  // Community name (exactly as the feed returns it) -> its branded new-construction
  // saved search. Full URLs so any IDX domain / slug format works. Sub-sections
  // resolve to their parent by prefix (e.g. "Meridiana 70'" -> Meridiana,
  // "Massey Oaks Village" -> Massey Oaks). Anything unmapped falls back to the
  // city-level saved search, then the generic advanced search — never a dead end.
  var IDX_BASE = 'https://philliphimes.idxbroker.com';
  var IDX_ADVANCED = IDX_BASE + '/idx/search/advanced';
  var COMMUNITY_SEARCH = {
    // League City
    'Legacy': 'https://search.philliphimes.com/i/new-construction-legacy-league-city-philip-himes-',
    'Westland Ranch': 'https://search.philliphimes.com/i/new-construction-league-city-westland-ranch',
    'Samara': 'https://search.philliphimes.com/i/new-construction-samara',
    'Davis Harbor': 'https://search.philliphimes.com/i/new-construction-league-city-davis-harbor',
    'Pedregal': 'https://search.philliphimes.com/i/pedregal',
    // Pearland
    'Massey Oaks': 'https://search.philliphimes.com/i/new-construction---massey-oaks',
    'Alexander': 'https://search.philliphimes.com/i/new-construction-pearland-alexander',
    // Manvel
    'Meridiana': 'https://search.philliphimes.com/i/new-construction-meridiana-manvel-tx-phillip-himes',
    'Valencia': 'https://search.philliphimes.com/i/new-construction-valencia-manvel-tx-phillip-himes-072a9',
    'Pomona': 'https://search.philliphimes.com/i/new-construction-pomona-manvel-tx-phillip-himes-a5082-d6812',
    'Foxtail Palms': 'https://search.philliphimes.com/i/new-construction-foxtail-palms-manvel-tx-phillip-himes',
    'Avellino': 'https://search.philliphimes.com/i/new-construction-avellino-manvel-tx-phillip-himes',
    'Del Bello Lakes': 'https://search.philliphimes.com/i/new-construction-del-bello-lakes-manvel-tx-phillip-himes',
    // Clear Lake / Webster + Dickinson
    'Midline': 'https://search.philliphimes.com/i/new-construction-midline',
    'Peacock Isle': 'https://search.philliphimes.com/i/new-construction-peacock-isle-dickinson-tx-phillip-himes-a5082-51ebb',
    // Friendswood
    'Friendswood Trails': 'https://search.philliphimes.com/i/new-construction-friendswood-trails',
    // Texas City
    'Lago Mar': 'https://search.philliphimes.com/i/new-construction-lago-mar-texas-city-tx-phillip-himes-c04dc',
    'Beacon Point': 'https://search.philliphimes.com/i/new-construction-beacon-point',
    'Pearlbrook': 'https://search.philliphimes.com/i/new-construction-pearlbrook-texas-city-tx-phillip-himes',
    'Steed Landing': 'https://search.philliphimes.com/i/new-construction-steed-landing-texas-city-tx-phillip-himes',
    'Vida Costera': 'https://search.philliphimes.com/i/new-construction-vida-costera',
    'Grand Cay Harbour': 'https://search.philliphimes.com/i/new-construction-grand-cay-harbour-texas-city-tx-phillip-himes-c04dc-4f349'
    // Intentionally unmapped (fall back to the city search): Coastal Point and
    // Westwood (both closing out), Pearland Old Townsite (scattered infill).
  };
  var CITY_SEARCH = {
    'League City': 'League-City',
    'Pearland': 'Pearland',
    'Friendswood': 'Friendswood',
    'Clear Lake': 'Clear-Lake'
  };
  // The community a subdivision belongs to. MLS lists lot-size sections as their
  // own subdivisions ("Meridiana 70'", "Massey Oaks Village"), but each saved
  // search covers ALL of a community's sections — so roll them into the parent.
  function parentName(name) {
    if (!name) return name;
    if (COMMUNITY_SEARCH[name]) return name;
    for (var key in COMMUNITY_SEARCH) {
      if (COMMUNITY_SEARCH.hasOwnProperty(key) && name.indexOf(key) === 0) return key;
    }
    return name;
  }
  function listingsUrl(name, city) {
    if (name) {
      var p = parentName(name);
      if (COMMUNITY_SEARCH[p]) return COMMUNITY_SEARCH[p];
    }
    if (city && CITY_SEARCH[city]) return IDX_BASE + '/i/' + CITY_SEARCH[city];
    return IDX_ADVANCED;
  }

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
    // Pull every requested city, tag each community with its city, then merge.
    var cities = (opts.cities && opts.cities.length) ? opts.cities : [opts.city || DEFAULT_CITY];
    var all = [];
    for (var ci = 0; ci < cities.length; ci++) {
      var list = await fetchCommunities(cities[ci]);
      for (var li = 0; li < list.length; li++) {
        if ((list[li].active_inventory || 0) > 0) { list[li].__city = cities[ci]; all.push(list[li]); }
      }
    }
    if (!all.length) return;
    // Group each subdivision under its parent community so a community shows as
    // ONE card. Sections are distinct subdivisions, so their counts add up; a
    // subdivision repeated with different casing is the same set, so count once.
    // Median price comes from the largest section (averaging medians isn't valid).
    var groups = {}, order = [];
    all.forEach(function (c) {
      var raw = String(c.name || '').trim();
      if (!raw) return;
      var p = parentName(raw), gk = p.toLowerCase();
      if (!groups[gk]) {
        groups[gk] = { name: p, __city: c.__city, active_inventory: 0,
                       builders: [], active_median_price: null, _seen: {}, _top: -1 };
        order.push(gk);
      }
      var g = groups[gk], nk = raw.toLowerCase();
      if (g._seen[nk]) return;               // same subdivision, different casing
      g._seen[nk] = 1;
      g.active_inventory += (c.active_inventory || 0);
      (c.builders || []).forEach(function (b) {
        if (b && g.builders.indexOf(b) < 0) g.builders.push(b);
      });
      if ((c.active_inventory || 0) > g._top) {
        g._top = c.active_inventory || 0;
        if (typeof c.active_median_price === 'number') g.active_median_price = c.active_median_price;
      }
    });
    var comms = order.map(function (k) { return groups[k]; });
    comms.sort(function (a, b) { return (b.active_inventory || 0) - (a.active_inventory || 0); });
    cardsWrap.innerHTML = comms.slice(0, opts.limit || 18).map(function (c) {
      var price = money(c.active_median_price);
      var builders = (c.builders || []).filter(Boolean).slice(0, 2).join(' · ');
      var meta = [c.__city, builders].filter(Boolean).join(' · ');
      var n = c.active_inventory;
      var href = listingsUrl(c.name, c.__city);
      return '<a class="community-card" href="' + esc(href) + '" target="_blank" rel="noopener" style="text-decoration:none;display:block;">'
        + '<div class="community-card__city">' + esc(c.name) + '</div>'
        + '<div class="community-card__name">' + n + ' active ' + (n === 1 ? 'home' : 'homes') + '</div>'
        + (meta ? '<div class="community-card__district">' + esc(meta) + '</div>' : '')
        + (price ? '<div class="community-card__price">Median <span>' + price + '</span></div>' : '')
        + '<div class="community-card__cta" style="margin-top:0.7rem;font-family:var(--font-heading);font-weight:700;font-size:0.8rem;color:var(--teal);">View homes →</div>'
        + '</a>';
    }).join('');
    el.style.display = '';
  }

  // ── gated incentive reveal (the lead-magnet payoff) ────────────────────────
  // After a builder-incentives lead is captured, show the current verified list
  // right on the page. Community optional → the whole city's current list. Always
  // resolves; a failure just leaves the standard thank-you.
  async function fetchGatedIncentives(city, community) {
    try {
      var p = '/newbuildiq/gated/incentives?city=' + encodeURIComponent(city || DEFAULT_CITY);
      if (community) p += '&community=' + encodeURIComponent(community);
      return await getJSON(p);
    } catch (e) { return { found: false, incentives: [] }; }
  }

  async function revealIncentives(form, city, community) {
    var d = await fetchGatedIncentives(city, community);
    var incs = (d && d.incentives) || [];
    var host = form.parentNode;
    var box = document.createElement('div');
    box.className = 'nbiq-reveal';
    var head = community ? esc(community) : esc(city);
    if (!incs.length) {
      box.innerHTML = '<div class="nbiq-reveal__head">You\'re on the list, ' + head + '.</div>'
        + '<p class="nbiq-reveal__empty">Phil is confirming this week\'s current incentives and will '
        + 'send you the verified list shortly — and walk you through which ones actually save you the most.</p>';
    } else {
      var cards = incs.map(function (i) {
        var where = i.community ? '<span class="nbiq-inc__where">' + esc(i.community) + '</span>' : '';
        var exp = i.expires ? '<span class="nbiq-inc__exp">Ends ' + esc(i.expires) + '</span>' : '';
        var lender = i.lender_terms ? '<div class="nbiq-inc__lender">Financing: ' + esc(i.lender_terms) + '</div>' : '';
        return '<div class="nbiq-inc">'
          + '<div class="nbiq-inc__top"><span class="nbiq-inc__builder">' + esc(i.builder || 'Builder') + '</span>' + where + '</div>'
          + '<div class="nbiq-inc__type">' + esc(i.type || 'Incentive') + '</div>'
          + '<div class="nbiq-inc__amt">' + esc(i.buyer_incentive) + '</div>'
          + lender + exp + '</div>';
      }).join('');
      box.innerHTML = '<div class="nbiq-reveal__head">Current incentives — ' + head + '</div>'
        + '<div class="nbiq-reveal__grid">' + cards + '</div>'
        + '<p class="nbiq-reveal__disc">' + esc(d.disclaimer || 'Offered by the builders; subject to change — verify current terms with the builder.') + '</p>'
        + '<p class="nbiq-reveal__cta">Want Phil to line these up and see the homes with you? '
        + '<a href="tel:8325361016">Call (832) 536-1016</a></p>';
    }
    form.style.display = 'none';
    host.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
          // Lead captured. If this form asks for the gated reveal, show the current
          // incentive list right here (the payoff); otherwise the standard thank-you.
          if (form.getAttribute('data-reveal') === 'incentives') {
            await revealIncentives(form,
              form.getAttribute('data-city') || DEFAULT_CITY,
              (data.community || '').trim());
          } else {
            showMsg(form, true); form.reset();
          }
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
    if (live) {
      var cs = live.getAttribute('data-cities');   // e.g. "League City,Pearland,Manvel"
      renderLiveCommunities(cs
        ? { cities: cs.split(',').map(function (s) { return s.trim(); }).filter(Boolean) }
        : { city: live.getAttribute('data-city') || DEFAULT_CITY });
    }
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
