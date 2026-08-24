// ─────────────────────────────────────────────────────────────────────────────
// The Front Porch — mortgage payoff calculator.
//
// Everything derives from ONE loan record, so nothing can drift out of sync:
// the balance, the payment and both payoff dates are all computed, never
// asserted. Replace LOAN with the member's real figures from their closing
// disclosure and the whole section re-runs.
//
// Deliberately NOT a refinance tool. It runs the loan the member already has.
// The moment it quotes a rate or an offer it becomes credit advertising, which
// is a different regulatory animal and not Phil's to make.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var root = document.getElementById('payoff');
  if (!root) return;

  // MOCKUP DATA — replace per member.
  var LOAN = {
    original:    332500,
    annualRate:  3.125,
    termMonths:  360,
    firstPayment: '2021-03-01'
  };

  var $ = function (id) { return document.getElementById(id); };
  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  var usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  var r = LOAN.annualRate / 100 / 12;

  // Level payment for a fully-amortising loan.
  var payment = r === 0
    ? LOAN.original / LOAN.termMonths
    : LOAN.original * r / (1 - Math.pow(1 + r, -LOAN.termMonths));

  // Payments made so far, from the first-payment date to today.
  var start = new Date(LOAN.firstPayment + 'T00:00:00');
  var now   = new Date();
  var made  = Math.max(0, Math.min(
    LOAN.termMonths,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  ));

  // Closed-form remaining balance after `made` payments.
  function balanceAfter(k) {
    if (r === 0) return Math.max(0, LOAN.original - payment * k);
    var g = Math.pow(1 + r, k);
    return Math.max(0, LOAN.original * g - payment * (g - 1) / r);
  }
  var balance = balanceAfter(made);

  // Amortise forward from today. Returns months to payoff and interest paid.
  // Simulated rather than closed-form because the annual lump breaks the formula.
  function project(extraMonthly, annualExtra) {
    var bal = balance, months = 0, interest = 0, paidExtra = 0;
    var guard = LOAN.termMonths + 12;
    while (bal > 0.01 && months < guard) {
      var i = bal * r;
      var principal = payment - i + extraMonthly;
      paidExtra += extraMonthly;
      // The annual lump lands on the anniversary of the first payment.
      if (annualExtra && months > 0 && months % 12 === 0) {
        principal += payment;
        paidExtra += payment;
      }
      if (principal > bal) { principal = bal; }
      interest += i;
      bal -= principal;
      months++;
    }
    return { months: months, interest: interest, extraPaid: paidExtra };
  }

  function addMonths(d, n) {
    var x = new Date(d.getTime());
    x.setMonth(x.getMonth() + n);
    return x;
  }
  function monthYear(d) {
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  function yearsMonths(n) {
    var y = Math.floor(n / 12), m = n % 12, out = [];
    if (y) out.push(y + (y === 1 ? ' year' : ' years'));
    if (m) out.push(m + (m === 1 ? ' month' : ' months'));
    return out.length ? out.join(', ') : 'no time';
  }

  // ── Static facts ──────────────────────────────────────────────────────────
  $('pay-orig').textContent  = usd0.format(LOAN.original);
  $('pay-rate').textContent  = LOAN.annualRate.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + '%';
  $('pay-term').textContent  = (LOAN.termMonths / 12) + '-year fixed';
  $('pay-start').textContent = monthYear(start);
  $('pay-bal').textContent   = usd0.format(balance);
  $('pay-pmt').textContent   = usd2.format(payment);

  var base = project(0, false);

  var extraEl  = $('pay-extra');
  var slider   = $('pay-slider');
  var annualEl = $('pay-annual');

  function render() {
    var extra  = Math.max(0, Number(extraEl.value) || 0);
    var annual = annualEl.checked;
    var s = project(extra, annual);

    var saved   = Math.max(0, base.months - s.months);
    var payoff  = addMonths(now, s.months);
    var interestSaved = Math.max(0, base.interest - s.interest);

    $('pay-when').textContent = monthYear(payoff);
    $('pay-sooner').textContent = saved > 0
      ? yearsMonths(saved) + ' sooner'
      : 'the same as it stands today';

    $('pay-yrs-now').textContent = yearsMonths(base.months);
    $('pay-yrs-new').textContent = yearsMonths(s.months);
    $('pay-bar-now').style.width = '100%';
    $('pay-bar-new').style.width = (base.months ? (s.months / base.months) * 100 : 0) + '%';

    $('pay-saved').textContent    = usd0.format(interestSaved);
    $('pay-invested').textContent = usd0.format(s.extraPaid);
    // Prepaying a mortgage returns EXACTLY the note rate — that is the whole
    // truth of it. A "cents returned per dollar" figure reads like a loss,
    // because the extra principal is not spent, it becomes equity. Showing the
    // rate is both honest and the actually useful number: at 3% prepaying is
    // weak, at 7% it is strong, and the member can compare it to anything else.
    $('pay-ratio').textContent = extra > 0 || annual
      ? LOAN.annualRate.toFixed(3).replace(/0+$/, '').replace(/\.$/, '') + '% a year'
      : '—';

    // Presets reflect the current value.
    [].forEach.call(root.querySelectorAll('.pay__preset[data-extra]'), function (b) {
      b.classList.toggle('is-on', Number(b.dataset.extra) === extra);
    });
  }

  function setExtra(v, from) {
    v = Math.max(0, Math.min(3000, Math.round(v / 25) * 25));
    if (from !== 'input')  extraEl.value = v;
    if (from !== 'slider') slider.value = Math.min(1000, v);
    render();
  }

  extraEl.addEventListener('input',  function () { setExtra(Number(extraEl.value) || 0, 'input'); });
  slider.addEventListener('input',   function () { setExtra(Number(slider.value), 'slider'); });
  annualEl.addEventListener('change', render);

  [].forEach.call(root.querySelectorAll('.pay__preset'), function (btn) {
    btn.addEventListener('click', function () {
      if (btn.hasAttribute('data-round')) {
        // Round the total P&I up to the next $100.
        setExtra(Math.ceil(payment / 100) * 100 - payment);
      } else {
        setExtra(Number(btn.dataset.extra));
      }
    });
  });

  render();
})();
