/* Compliance constants — the single source of truth for Phil's required notices.
 *
 * WHY THIS FILE EXISTS
 * The TREC notices are legally required disclosures. They are written into every
 * landing page as STATIC html so they render even if JavaScript never runs — a
 * notice that depends on a script is a notice that can silently disappear. This
 * file is the canonical copy of those values, and on load it re-syncs any anchor
 * tagged `data-phh-link` to the value below. So:
 *
 *   - JS off / script blocked  -> the static href in the page still works.
 *   - A URL changes           -> edit THIS FILE ONLY; every page picks it up.
 *
 * When a URL changes, also run a sweep so the static fallbacks don't drift:
 *   Select-String -Pattern 'assets.cdn.filesafe.space' -Path *.html
 *
 * Load it on any landing page AFTER the footer markup:
 *   <script src="js/compliance.js"></script>
 */
(function () {
  'use strict';

  var PHH_COMPLIANCE = {
    // TREC-required notices, hosted on Phil's own CDN.
    trecConsumerProtection: 'https://assets.cdn.filesafe.space/l8dNWKKtBchv50jZJYBL/media/6a9f2196bcef8b5f2c2e9c78.pdf',
    trecInfoAboutBrokerageServices: 'https://assets.cdn.filesafe.space/l8dNWKKtBchv50jZJYBL/media/6a9f21b6bbc6015019c5157f.pdf',

    // Site pages.
    privacyPolicy: 'privacy-policy.html',
    termsOfService: 'terms-of-service.html',

    // Brokerage identity, as it must appear in advertising.
    agentName:   'Phillip Himes',
    agentTitle:  'REALTOR®',
    brokerage:   'eXp Realty, LLC',
    licensedIn:  'Texas',
    address:     '2600 South Shore Blvd. #300, League City, TX 77573',
    phone:       '(832) 990-9738',
    phoneHref:   'tel:8329909738',
    email:       'phil@philliphimes.com'
  };

  // Anchors opt in with data-phh-link="<key>". Unknown keys are left alone so a
  // typo degrades to the static href rather than blanking the link.
  var KEYS = {
    'trec-cpn':     'trecConsumerProtection',
    'trec-iabs':    'trecInfoAboutBrokerageServices',
    'privacy':      'privacyPolicy',
    'terms':        'termsOfService'
  };

  function sync(root) {
    (root || document).querySelectorAll('a[data-phh-link]').forEach(function (a) {
      var key = KEYS[a.getAttribute('data-phh-link')];
      if (key && PHH_COMPLIANCE[key]) a.setAttribute('href', PHH_COMPLIANCE[key]);
    });
  }

  window.PHH_COMPLIANCE = PHH_COMPLIANCE;
  window.PHH_COMPLIANCE.syncLinks = sync;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { sync(); });
  } else {
    sync();
  }
})();
