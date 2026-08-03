/**
 * listings.js
 * Single source of truth for Phil's active/featured listings.
 * Used by the homepage Featured Listings band and the /listings page.
 *
 * To add a listing: copy a block below, fill it in, done — every page updates.
 * To mark one sold: set status: 'sold' (card shows a SOLD badge, dims slightly).
 * To retire a listing: set active: false (hidden everywhere).
 *
 * Usage:
 *   <script src="js/listings.js"></script>
 *   <div class="listing-grid" id="featured-listings-grid"></div>
 *   <script>renderListings('featured-listings-grid', { limit: 6 });</script>
 */

const LISTINGS = [
  {
    id:        '6310-star-light-ct',
    active:    true,
    status:    'active',                 // 'active' | 'pending' | 'sold'
    badge:     'For Sale',
    address:   '6310 Star Light Court',
    city:      'Spring, TX',
    community: 'Benders Landing Estates',
    price:     '$1,425,000',
    beds:      '4',
    baths:     '4½',
    sqft:      '3,862',
    img:       'images/listings/6310-star-light/01.jpg',
    href:      '6310-star-light-ct-listing.html',   // ungated, SEO-indexed page
    blurb:     'A gated 1-acre estate — wine cellar, cigar lounge & resort-style pool.',
  },
  {
    id:        '2222-scenic-shore',
    active:    true,
    status:    'active',
    badge:     'For Sale',
    address:   '2222 Scenic Shore Drive',
    city:      'Seabrook, TX',
    community: 'Seabrook Island',
    price:     '$479,900',
    beds:      '4',
    baths:     '3½',
    sqft:      '3,129',
    img:       'images/listings/2222-scenic-shore/01.jpg',
    href:      '2222-scenic-shore-listing.html',
    blurb:     'Updated 2-story pool home — new roof (2025) & HVAC (2026). Clear Creek ISD.',
  },
];

function buildListingCard(l) {
  const sold = l.status === 'sold';
  const pending = l.status === 'pending';
  const badge = sold ? 'Sold' : (pending ? 'Under Contract' : (l.badge || 'For Sale'));
  const badgeClass = sold ? ' listing-card__badge--sold' : (pending ? ' listing-card__badge--pending' : '');
  return (
    '<a class="listing-card' + (sold ? ' listing-card--sold' : '') + '" href="' + l.href + '">' +
      '<div class="listing-card__media">' +
        '<img loading="lazy" src="' + l.img + '" alt="' + l.address + ', ' + l.city + '" />' +
        '<span class="listing-card__badge' + badgeClass + '">' + badge + '</span>' +
      '</div>' +
      '<div class="listing-card__body">' +
        '<div class="listing-card__price">' + l.price + '</div>' +
        '<div class="listing-card__addr">' + l.address + '</div>' +
        '<div class="listing-card__city">' + l.city + (l.community ? ' · ' + l.community : '') + '</div>' +
        '<div class="listing-card__stats">' +
          '<span><b>' + l.beds + '</b> Beds</span>' +
          '<span><b>' + l.baths + '</b> Baths</span>' +
          '<span><b>' + l.sqft + '</b> Sq Ft</span>' +
        '</div>' +
        (l.blurb ? '<p class="listing-card__blurb">' + l.blurb + '</p>' : '') +
        '<span class="listing-card__cta">' + (sold ? 'View Details' : 'View Listing') + ' &rarr;</span>' +
      '</div>' +
    '</a>'
  );
}

/**
 * Render listing cards into a container.
 * @param {string|HTMLElement} containerOrId
 * @param {Object} [opts] - { limit: number, includeSold: boolean }
 */
function renderListings(containerOrId, opts) {
  opts = opts || {};
  const el = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
  if (!el) return;
  let items = LISTINGS.filter(function (l) { return l.active !== false; });
  if (!opts.includeSold) items = items.filter(function (l) { return l.status !== 'sold'; });
  // active first, then pending, then sold
  const order = { active: 0, pending: 1, sold: 2 };
  items.sort(function (a, b) { return (order[a.status] || 0) - (order[b.status] || 0); });
  if (opts.limit) items = items.slice(0, opts.limit);
  if (!items.length) {
    el.innerHTML = '<p class="listing-grid__empty">New listings coming soon. <a href="contact.html">Ask Phil what\'s coming to market &rarr;</a></p>';
    return;
  }
  el.innerHTML = items.map(buildListingCard).join('\n');
}
