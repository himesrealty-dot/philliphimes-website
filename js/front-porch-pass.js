// ─────────────────────────────────────────────────────────────────────────────
// Guest-pass claim page.
//
// The address field types ahead against the county appraisal roll — the same
// table that powers the member dashboard. That is what removes the fuzzy
// address-matching problem entirely: the visitor picks a real record, so we
// get a prop_id, not a string to guess at.
//
// MOCKUP: ROLL is a handful of hardcoded records. In production this is a
// debounced lookup against the parsed CAD data (Galveston / Harris / Brazoria
// / Fort Bend), returning prop_id + situs + the value history.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var ROLL = [
    {
      prop: '000000412887', situs: '1428 Tuscan Vista Dr', city: 'League City', zip: '77573',
      county: 'Galveston CAD', hs: true,
      years: [
        { y: 2026, appraised: 502310, assessed: 389304 },
        { y: 2025, appraised: 440100, assessed: 353913 },
        { y: 2024, appraised: 419900, assessed: 321739 },
        { y: 2023, appraised: 392000, assessed: 292490 },
        { y: 2022, appraised: 331200, assessed: 265900 }
      ]
    },
    {
      // The conversion case: owner-occupied, no exemption on file.
      prop: '000000518402', situs: '2210 Meridian Bay Ln', city: 'Friendswood', zip: '77546',
      county: 'Galveston CAD', hs: false,
      years: [
        { y: 2026, appraised: 468900, assessed: 468900 },
        { y: 2025, appraised: 421400, assessed: 421400 },
        { y: 2024, appraised: 398750, assessed: 398750 },
        { y: 2023, appraised: 366200, assessed: 366200 },
        { y: 2022, appraised: 318400, assessed: 318400 }
      ]
    },
    {
      prop: '000000733915', situs: '2245 Bay Colony Dr', city: 'Dickinson', zip: '77539',
      county: 'Galveston CAD', hs: true,
      years: [
        { y: 2026, appraised: 318700, assessed: 271455 },
        { y: 2025, appraised: 295200, assessed: 246777 },
        { y: 2024, appraised: 281050, assessed: 224343 },
        { y: 2023, appraised: 259900, assessed: 203948 },
        { y: 2022, appraised: 221500, assessed: 185407 }
      ]
    },
    {
      prop: '000000901244', situs: '14 Shadow Creek Pkwy', city: 'Pearland', zip: '77584',
      county: 'Brazoria CAD', hs: true,
      years: [
        { y: 2026, appraised: 389400, assessed: 340118 },
        { y: 2025, appraised: 361900, assessed: 309198 },
        { y: 2024, appraised: 342600, assessed: 281089 },
        { y: 2023, appraised: 318200, assessed: 255535 },
        { y: 2022, appraised: 274900, assessed: 232305 }
      ]
    }
  ];

  var TAX_RATE = 0.022; // approximate combined rate, for illustration only

  var $ = function (id) { return document.getElementById(id); };
  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  var input = $('pass-addr'), ac = $('pass-ac'), go = $('pass-go');
  var picked = null, active = -1;

  function close() { ac.classList.remove('is-open'); input.setAttribute('aria-expanded', 'false'); active = -1; }

  function search(q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) { close(); return; }
    var hits = ROLL.filter(function (r) {
      return (r.situs + ' ' + r.city + ' ' + r.zip).toLowerCase().indexOf(q) > -1;
    });
    ac.innerHTML = '';
    if (!hits.length) {
      ac.innerHTML = '<div class="pass-ac__none">No match in Galveston, Harris, Brazoria or Fort Bend. ' +
        'If your county isn’t on that list yet, <a href="mailto:phil@philliphimes.com?subject=Add%20my%20county">tell me</a> ' +
        'and I’ll let you know when it is.</div>';
    } else {
      hits.forEach(function (r, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'pass-ac__item';
        b.setAttribute('role', 'option');
        b.innerHTML = r.situs + '<small>' + r.city + ', TX ' + r.zip + ' · ' + r.county + '</small>';
        b.addEventListener('click', function () { choose(r); });
        ac.appendChild(b);
      });
    }
    ac.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
  }

  function choose(r) {
    picked = r;
    input.value = r.situs + ', ' + r.city;
    close();
    go.disabled = false;
  }

  input.addEventListener('input', function () { picked = null; go.disabled = true; search(input.value); });
  input.addEventListener('keydown', function (e) {
    var items = ac.querySelectorAll('.pass-ac__item');
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active += (e.key === 'ArrowDown' ? 1 : -1);
      if (active < 0) active = items.length - 1;
      if (active >= items.length) active = 0;
      [].forEach.call(items, function (el, i) { el.classList.toggle('is-active', i === active); });
      items[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && active > -1) {
      e.preventDefault(); items[active].click();
    } else if (e.key === 'Escape') { close(); }
  });
  document.addEventListener('click', function (e) {
    if (!ac.contains(e.target) && e.target !== input) close();
  });

  // ── Render the snapshot ───────────────────────────────────────────────────
  function render(r) {
    var cur = r.years[0], prev = r.years[1];
    var pct = ((cur.appraised - prev.appraised) / prev.appraised) * 100;
    var cap = cur.appraised - cur.assessed;

    $('res-addr').textContent   = r.situs;
    $('res-county').textContent = r.city + ', TX ' + r.zip + ' · ' + r.county + ' · Prop ID ' + r.prop;
    $('res-val').textContent    = usd0.format(cur.appraised);
    $('res-chg').textContent    = (pct >= 0 ? '↑ ' : '↓ ') + Math.abs(pct).toFixed(1) + '%';
    $('res-assessed').textContent = usd0.format(cur.assessed);
    $('res-cap').textContent = cap > 0
      ? usd0.format(cap) + ' held off by your homestead cap'
      : 'No cap applied — taxed on the full value';
    $('res-hs').textContent = r.hs ? 'On file' : 'Not on file';
    $('res-hs-note').textContent = r.hs
      ? 'Verified on the current roll'
      : 'The county has no homestead exemption for this address';

    // The finding
    if (!r.hs) {
      $('res-flag-h').textContent = 'There’s no homestead exemption on this property';
      $('res-flag-p').innerHTML =
        'If you live here, that is very likely money left on the table — and Texas lets you file ' +
        '<b>up to two years late and collect a refund</b> on what you already paid. ' +
        'On this value that is somewhere around <b>' + usd0.format(cap > 0 ? cap * TAX_RATE : 140000 * TAX_RATE) +
        ' a year</b>, plus whatever the cap would have saved you since. Worth ten minutes with your appraisal district.';
    } else {
      $('res-flag-h').textContent = 'Your homestead cap saved you about ' + usd0.format(cap * TAX_RATE) + ' this year';
      $('res-flag-p').innerHTML =
        'The county appraised this at <b>' + usd0.format(cur.appraised) + '</b> but you are only taxed on <b>' +
        usd0.format(cur.assessed) + '</b>. That gap is your homestead cap doing its job, and it grows every ' +
        'year the appraised value climbs faster than 10%.';
    }

    var rows = '';
    r.years.forEach(function (y, i) {
      var p = r.years[i + 1];
      var ch = p ? (((y.appraised - p.appraised) / p.appraised) * 100) : null;
      rows += '<tr>' +
        '<td class="yr">' + y.y + '</td>' +
        '<td>' + usd0.format(y.appraised) + '</td>' +
        '<td>' + (ch === null ? '—' : (ch >= 0 ? '+' : '−') + Math.abs(ch).toFixed(1) + '%') + '</td>' +
        '<td>' + usd0.format(y.assessed) + '</td>' +
        '<td>' + (r.hs ? 'Homestead' : '—') + '</td>' +
        '</tr>';
    });
    $('res-hist').innerHTML = rows;

    $('res-source').textContent =
      'Source: ' + r.county + ' certified appraisal roll, public record. Appraised value is the county’s ' +
      'assessment for tax purposes as of 1 January each year — it is not what the house would sell for, ' +
      'and it is usually conservative. Tax savings shown are approximate, using a combined rate of about 2.2%; ' +
      'your actual rate depends on your taxing units.';
  }

  go.addEventListener('click', function () {
    if (!picked) return;
    render(picked);
    $('step-claim').classList.remove('is-on');
    $('step-result').classList.add('is-on');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('pass-again').addEventListener('click', function () {
    $('step-result').classList.remove('is-on');
    $('step-claim').classList.add('is-on');
    input.value = ''; picked = null; go.disabled = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Opt-in ────────────────────────────────────────────────────────────────
  var form = $('pass-form'), consent = $('pass-consent'), sub = $('pass-sub');
  function gate() {
    var f = form.firstName.value.trim(), e = form.email.value.trim();
    sub.disabled = !(f && e.indexOf('@') > 0 && consent.checked);
  }
  form.addEventListener('input', gate);
  consent.addEventListener('change', gate);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sub.disabled) return;
    // Production: POST to /lead with source 'guest-pass', the prop_id, and the
    // referring member so the thank-you goes to the right person.
    form.style.display = 'none';
    $('pass-done').style.display = 'block';
  });
  gate();
})();
