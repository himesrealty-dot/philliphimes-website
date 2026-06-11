# CLAUDE.md — philliphimes.com Project Reference

## Project Overview

**philliphimes.com** is the personal real estate website for Phillip Himes, REALTOR® | Brokered by eXp Realty, serving the Houston Bay Area (League City, Friendswood, Pearland, Clear Lake, Dickinson, Manvel).

- Contact: phil@philliphimes.com · (832) 536-1016
- Office: 2600 South Shore Blvd. Ste 300, League City, TX 77573
- Static HTML/CSS/JS site — no build system, no framework

---

## Directory Structure

```
philliphimes-website/
├── index.html                  # Home page
├── about.html                  # Phil's story
├── buyers.html                 # BuyerIQ™ — Buyer's Edge
├── sellers.html                # SellerIQ™ — Seller's Edge
├── search.html                 # Property search
├── contact.html                # Ask Phil
├── cities.html                 # All cities overview
├── marketiq.html               # MarketIQ™ tool
├── buyeriq.html                # BuyerIQ™ tool
├── selleriq.html               # SellerIQ™ tool
├── trumarket.html              # TruMarket™ home value
├── rebalance.html              # Rebalance™ tool
├── privacy-policy.html
├── terms-of-service.html
│
├── ── City Pages ──
├── league-city.html
├── friendswood.html
├── pearland.html
├── clear-lake.html
├── dickinson.html
├── manvel.html
│
├── ── Neighborhood Pages (36 total) ──
│   [see full list below]
│
├── css/
│   └── styles.css              # Global stylesheet
├── js/
│   ├── main.js                 # Nav, mobile menu, global UI
│   └── neighborhoods.js        # SINGLE SOURCE OF TRUTH for all 36 neighborhoods
├── images/
│   ├── logo.png
│   ├── favicon.ico
│   └── lifestyle/              # Lifestyle section photos (72×58px display)
└── CLAUDE.md                   # This file
```

---

## Neighborhood Pages — Master List (36 total)

### League City (6 neighborhoods)

| File | Name | Price Range | Status |
|------|------|-------------|--------|
| `tuscan-lakes.html` | Tuscan Lakes | $315K – $1.5M+ | live |
| `westover-park.html` | Westover Park | $335K – $600K+ | live |
| `south-shore-harbour.html` | South Shore Harbour | $305K – $1.3M+ | live |
| `mar-bella.html` | Mar Bella | $335K – $800K+ | live |
| `brittany-lakes.html` | Brittany Lakes | $290K – $530K | live |
| `magnolia-creek.html` | Magnolia Creek | $360K – $750K+ | live |

### Friendswood (6 neighborhoods)

| File | Name | Price Range | Status |
|------|------|-------------|--------|
| `avalon.html` | Avalon | $600K – $1.4M+ | live |
| `friendswood-lakes.html` | Friendswood Lakes | $470K – $1.3M+ | live |
| `falcon-ridge.html` | Falcon Ridge | $360K – $620K | live |
| `west-ranch.html` | West Ranch | $500K – $1.4M+ | live |
| `heritage-park.html` | Heritage Park | $220K – $410K | live |
| `wilderness-trails.html` | Wilderness Trails | $340K – $600K | live |

### Pearland (6 neighborhoods)

| File | Name | Price Range | Status | School District |
|------|------|-------------|--------|-----------------|
| `shadow-creek-ranch.html` | Shadow Creek Ranch | $285K – $800K+ | live | Alvin ISD → Shadow Creek HS |
| `silverlake.html` | Silverlake | $335K – $800K | live | Alvin ISD |
| `riverstone-ranch.html` | Riverstone Ranch | $315K – $600K | live | Alvin ISD → Shadow Creek HS |
| `southern-trails.html` | Southern Trails | $285K – $950K+ | live | Alvin ISD → Shadow Creek HS |
| `southgate.html` | Southgate | $395K – $525K | live | Pearland ISD |
| `country-place.html` | Country Place | $220K – $560K | live | Pearland ISD |

### Clear Lake (6 neighborhoods)

| File | Name | Price Range | Status | School District |
|------|------|-------------|--------|-----------------|
| `bay-oaks.html` | Bay Oaks | $475K – $1.4M+ | live | CCISD → Clear Lake HS |
| `bay-forest.html` | Bay Forest | $320K – $650K+ | live | CCISD → Clear Lake HS |
| `bay-knoll.html` | Bay Knoll | $315K – $450K | live | CCISD → Clear Lake HS |
| `brookwood.html` | Brookwood | $340K – $565K | live | CCISD → Clear Lake HS |
| `taylor-lake.html` | Taylor Lake | $315K – $750K | live | CCISD → Clear Lake HS |
| `the-reserve-at-clear-lake.html` | The Reserve at Clear Lake | $500K – $1M+ | live | CCISD → Clear Lake HS |

### Dickinson (6 neighborhoods)

| File | Name | Price Range | Status |
|------|------|-------------|--------|
| `nicholstone.html` | Nicholstone | $200K – $370K | live |
| `bay-colony.html` | Bay Colony | $210K – $400K | live |
| `pedregal.html` | Pedregal | $410K – $710K | live |
| `peacock-isle.html` | Peacock Isle | $340K – $760K | live |
| `bayou-maison.html` | Bayou Maison | $240K – $340K | live |
| `bayou-bend-estate.html` | Bayou Bend Estate | $330K – $400K | live |

### Manvel (6 neighborhoods)

| File | Name | Price Range | Status | School District |
|------|------|-------------|--------|-----------------|
| `pomona.html` | Pomona | $320K – $550K | live | Alvin ISD → Manvel HS |
| `rodeo-palms.html` | Rodeo Palms | $270K – $420K | live | Alvin ISD → Manvel HS |
| `del-bello-lakes.html` | Del Bello Lakes | $310K – $520K | live | Alvin ISD → Manvel HS |
| `meridiana.html` | Meridiana | $340K – $580K | live | Alvin ISD → Manvel HS |
| `sedona-lakes.html` | Sedona Lakes | $290K – $470K | live | Alvin ISD → Manvel HS |
| `valencia.html` | Valencia | $300K – $490K | live | Alvin ISD → Manvel HS |

---

## neighborhoods.js — Single Source of Truth

**`js/neighborhoods.js`** exports the `NEIGHBORHOODS` array and the `renderNeighborhoodCards()` function. Every city page and the BuyerIQ™ tool use this file to render neighborhood cards.

### To update a neighborhood

Edit only `js/neighborhoods.js` — all pages using `renderNeighborhoodCards()` update automatically.

### Key fields

```js
{
  id:       'neighborhood-id',      // slug, matches HTML filename
  name:     'Neighborhood Name',
  city:     'city-slug',            // e.g. 'league-city', 'manvel'
  cityName: 'City Name',
  tag:      'Tag · Tag',            // displayed on card
  desc:     'Short description...',
  price:    '$XXXk – $YYYk',
  href:     'neighborhood.html',    // empty string = not live yet
  live:     true,                   // false = shows "coming soon" card
}
```

### To add a new neighborhood

1. Add entry to `NEIGHBORHOODS` array in `js/neighborhoods.js`
2. Create the HTML file (see template conventions below)
3. Set `live: true` and `href` once the page is ready

---

## Neighborhood Page Template

All neighborhood pages follow a strict ~575-line template. Use an existing page as the source of truth.

### Structure (in order)

1. `<head>` — meta tags, OG tags, two JSON-LD blocks (RealEstateAgent + FAQPage), stylesheet link, inline `<style>`
2. `<nav>` — standard site nav (identical across all pages)
3. **Hero section** — `{prefix}-hero` with breadcrumb, eyebrow, h1, subtitle, CTA buttons, frosted card with 4 highlights
4. **Stats bar** — `.nh-stats` with 4 stats (price range, HOA, school district, commute)
5. **Facts strip** — `.facts-strip` with 5 quick facts
6. **Story section** — `.nh-section` with story-grid: narrative left, visual card right
7. **Homes section** — `.nh-section--alt` with 3 home tiers (entry / sweet spot / premium)
8. **Schools section** — `.nh-section` with `.school-card`
9. **Location & Commute section** — `.nh-section--dark` with 6 commute cards
10. **Listings CTA** — `.nh-section` with links to IDX search
11. **Lifestyle section** — `.nh-section--dark` with 4 lifestyle cards (2×2 grid)
12. **FAQ section** — `.nh-section--alt` with accordion FAQ list
13. **Blog section** — `.blog-section` (empty `POSTS = []`, renders "coming soon" message)
14. **Phil CTA** — `.phil-cta` dark section
15. **Footer** — standard footer (city-appropriate Buying links)
16. `<script>` — inline blog render + FAQ accordion logic

### CSS prefix convention

Each page gets a unique 2-4 character prefix for all hero-related CSS classes. Shared CSS (`.nh-stats`, `.facts-strip`, `.nh-section`, etc.) is identical across all pages and defined inline in each page's `<style>` block.

**Known legacy collision:** `tuscan-lakes.html` also uses the `tl-` prefix (same as `taylor-lake.html`). Harmless in practice since each page's CSS is inline, but do not reuse `tl-` for any new page.

| File | Prefix | City |
|------|--------|------|
| bay-knoll.html | `bkn-` | Clear Lake |
| bay-oaks.html | `bok-` | Clear Lake |
| bay-forest.html | `bfo-` | Clear Lake |
| brookwood.html | `brw-` | Clear Lake |
| taylor-lake.html | `tl-` | Clear Lake |
| the-reserve-at-clear-lake.html | `rcl-` | Clear Lake |
| nicholstone.html | `nch-` | Dickinson |
| bay-colony.html | `bc-` | Dickinson |
| pedregal.html | `ped-` | Dickinson |
| peacock-isle.html | `pki-` | Dickinson |
| bayou-maison.html | `bym-` | Dickinson |
| bayou-bend-estate.html | `bbe-` | Dickinson |
| riverstone-ranch.html | `rr-` | Pearland |
| southern-trails.html | `sot-` | Pearland |
| rodeo-palms.html | `rdp-` | Manvel |
| del-bello-lakes.html | `dbl-` | Manvel |
| sedona-lakes.html | `sdl-` | Manvel |
| valencia.html | `val-` | Manvel |

### School card CSS classes

- **CCISD** (Clear Lake area): `.school-card--ccisd` — `border-top: 4px solid var(--navy)`
- **Alvin ISD** (Pearland/Manvel area): `.school-card--alvin` — `border-top: 4px solid #1b3a5c`

Both classes are defined inline in each page's `<style>` block.

### School district reference

| City | District | High School |
|------|----------|-------------|
| Clear Lake | Clear Creek ISD (CCISD) | Clear Lake High School |
| Pearland (SH 288 corridor) | Alvin ISD | Shadow Creek High School |
| Manvel | Alvin ISD | Manvel High School |
| Dickinson | Dickinson ISD | Dickinson High School |
| Friendswood (most neighborhoods) | Friendswood ISD | Friendswood High School |
| Friendswood — **Heritage Park** (north edge) | Clear Creek ISD (CCISD) | Clear Brook High School |

**Heritage Park is NOT in Friendswood ISD** — it is zoned to CCISD (Clear Brook HS). Do not list it on friendswood-isd-homes.html; it belongs on ccisd-homes.html.

**Always include the disclaimer:** "School campus assignments are address-specific — always confirm the specific assignment for any address before purchasing."

### Updating a neighborhood's price range — every place it lives

A neighborhood's price range appears in up to 10 places. When updating from MLS data, change ALL of them:

1. `js/neighborhoods.js` — `price` field (drives city pages + BuyerIQ cards)
2. This file's neighborhood table
3. `{neighborhood}.html` — hero stats bar (`.nh-stats__value` "Price Range")
4. `{neighborhood}.html` — home tier prices (`.home-tier__price`, 3 tiers)
5. `{neighborhood}.html` — price FAQ in the HTML accordion
6. `{neighborhood}.html` — same FAQ in the JSON-LD FAQPage block (must stay in sync)
7. `{neighborhood}.html` — `<meta name="description">` (and og:description) if it quotes prices
8. `buyeriq.html` — `CITY_DATA` array `priceRange` (city-level min–max across its 6 neighborhoods)
9. `{district}-isd-homes.html` — hardcoded `.hood-card__price` card (these pages do NOT use neighborhoods.js)
10. `{district}-isd-homes.html` — FAQ text (HTML + JSON-LD) and meta description if they cite the neighborhood

Verify with: `Select-String -Pattern '<old range>'` across `*.html`, `js/neighborhoods.js`, and `CLAUDE.md` — expect zero hits.

### Listings section

All neighborhood pages currently use the placeholder IDX search link:
```
https://philliphimes.idxbroker.com/idx/search/advanced
```

Some pages with IDXAddons saved search links use specific savedlink IDs (e.g., Mar Bella = 2903, Brittany Lakes = 2935). Update the href when a saved search is configured in IDXAddons.

### Commute times reference

| From | Downtown | TMC | NASA JSC | Kemah | Galveston |
|------|----------|-----|----------|-------|-----------|
| Clear Lake | ~30 min | ~25 min | ~10 min | ~15 min | ~30 min |
| Pearland (Alvin ISD) | ~25 min | ~20 min | ~30 min | ~35 min | ~45 min |
| Manvel | ~35 min | ~30 min | ~35 min | ~40 min | ~50 min |
| Dickinson | ~35 min | ~30 min | ~20 min | ~15 min | ~20 min |

### Lifestyle images

All photos stored in `images/lifestyle/`. Confirmed filenames:
- `Space Center Houston.jpg`
- `Kemah Boardwalk.jpg`
- `HEB (1).jpg`
- `Kroger.jpg`
- `Walgreens.jpg`
- `Ocean Grill & Sushi.jpg`
- `Kings Biergarden.jpg`
- `Lupe Tortilla.jpg`
- `Jimmy Changas.jpg`
- `Gringo's Mexican.png`
- `BJ's Brewhouse.png`
- `Killens Texas BBQ.png`
- `Kelsey-Seybold.jpg`
- `LA Fitness.jpg`
- `Chase.jpg`
- `UTMB.jpg`
- `Moody Gardens.jpg`
- `Good Vibes Coastal Kitchen.png`
- `South Shore Marina.png`
- `South Shore Country Club.png`

Display size: 72×58px (`object-fit: cover`)

---

## Breadcrumb and Footer Conventions

### Breadcrumb format

```html
<p class="{prefix}-hero__crumb">
  <a href="index.html">Home</a> &rsaquo;
  <a href="{city}.html">{City Name}</a> &rsaquo;
  {Neighborhood Name}
</p>
```

### Footer — Buying by District section

All pages share an identical footer with a **"Buying by District"** column linking to the ISD landing pages (not the city pages):

```html
<div class="footer__heading">Buying by District</div>
<ul class="footer__links">
  <li><a href="ccisd-homes.html">Clear Creek ISD Homes</a></li>
  <li><a href="alvin-isd-homes.html">Alvin ISD Homes</a></li>
  <li><a href="friendswood-isd-homes.html">Friendswood ISD Homes</a></li>
  <li><a href="pearland-isd-homes.html">Pearland ISD Homes</a></li>
  <li><a href="dickinson-isd-homes.html">Dickinson ISD Homes</a></li>
  <li><a href="new-construction.html">New Construction</a></li>
  <li><a href="relocating-to-league-city.html">Relocating to League City</a></li>
</ul>
```

---

## JSON-LD Blocks

Each neighborhood page includes two JSON-LD blocks:

1. **RealEstateAgent** — standard Phil Himes contact info with `areaServed` set to the neighborhood name
2. **FAQPage** — 6 FAQ questions matching the HTML accordion (they must stay in sync)

---

## Market Update Pages

City market-update articles ({city}-market-update-{month}-{year}.html, e.g. `friendswood-market-update-june-2026.html`) are built from Phil's full-market MLS CSV exports (all statuses incl. Terminated/Expired/Withdrawn). Workflow:

1. Stats are pre-computed by script into `data/market-stats-{month}-{year}.json` — city level + per target neighborhood (filtered by Subdivision regex). Article prose must use ONLY these numbers, never recompute.
2. Each article: city overview → failure-rate callout → one anchored section per target neighborhood (`#{slug}`) → buyer/seller takeaways → FAQ (HTML + FAQPage JSON-LD in sync) → HAR MLS disclaimer. Structure cloned from the compare-* article skeleton. JSON-LD: BlogPosting + BreadcrumbList + FAQPage.
3. Each target neighborhood page's `POSTS` array gets the market update as the new `featured: true` first entry (URL with `#{slug}` anchor); prior featured post is demoted to `featured: false` (archive).
4. Add the article to sitemap.xml; market-insights.html is the hub linking all reports (indexed as of June 2026 — no longer robots-disallowed).

Key derived stat: failRatePct = (Terminated+Expired+Withdrawn) / (failed + sold). Caveat any neighborhood with <10 solds as a small sample. Taylor Lake Village is a separate municipality — NOT in the Clear Lake export; needs its own data.

## Blog Section

All neighborhood pages have an empty blog section:

```js
const POSTS = [];
function renderBlog() {
  const featuredWrap = document.getElementById('blog-featured-wrap');
  if (!POSTS.find(p => p.featured)) {
    featuredWrap.innerHTML = '<div class="blog-archive__empty">Articles coming soon...</div>';
  }
}
renderBlog();
```

When blog posts are added, populate `POSTS` with the appropriate post objects.

---

## FAQ Accordion Script

Standard at bottom of every neighborhood page:

```js
document.querySelectorAll('.faq-item__q').forEach(q => {
  q.addEventListener('click', () => {
    const isOpen = q.classList.contains('open');
    document.querySelectorAll('.faq-item__q').forEach(el => {
      el.classList.remove('open');
      el.setAttribute('aria-expanded', 'false');
      el.nextElementSibling.classList.remove('open');
    });
    if (!isOpen) {
      q.classList.add('open');
      q.setAttribute('aria-expanded', 'true');
      q.nextElementSibling.classList.add('open');
    }
  });
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); q.click(); }
  });
});
```

---

## Brand / Design Tokens

Defined in `css/styles.css`:

```css
--navy:        #1b3a5c
--gold:        #c9a455
--off-white:   (cream background)
--font-heading: (sans-serif)
--font-accent:  (italic serif)
--radius-full:  9999px
--radius-lg:    ...
--radius-md:    ...
--shadow-md:    ...
```

---

## Key Pages

- **BuyerIQ™** (`buyeriq.html`) — uses `renderNeighborhoodCards()` from `neighborhoods.js`. The `NEIGHBORHOODS` name must not conflict with any local variable in that page.
- **City pages** — each renders a neighborhood grid via `renderNeighborhoodCards('hoods-grid', 'city-slug')`. They `<script src="js/neighborhoods.js">` before calling the render function.
- **Nav** — all pages share identical nav HTML. Mobile CTA buttons use `display:none` via `style` attribute, shown by JS.
