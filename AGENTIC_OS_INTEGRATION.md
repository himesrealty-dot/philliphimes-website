# Handoff → `philliphimes-website` build

*From the Agentic OS build to the website build. This tells the website project what
Agentic OS now does, the integration contract between the two, and the concrete
changes the website side needs to make. Written 2026-08-03.*

---

## 1. The boundary (read this first)

There are **two separate builds**, and they stay separate — different repos, different
deploys, **no shared code**:

- **Website** (`himesrealty-dot/philliphimes-website`, static HTML on **Netlify**, plus its
  Netlify Functions) = **presentation**. It hosts pages and renders things.
- **Agentic OS** (Railway backend) = **the brain** — data (listings/IDX), the **TruMarket**
  value engine, brand voice + RAG + compliance, and publishing orchestration.

**Mental model:** Agentic OS *produces* finished pages/data and *publishes* them to the website;
the website *hosts and renders*. Agentic OS treats the website as a publish **target**.

**Out of scope for the website — do NOT build these here:** Blotato and all social media
(that's Agentic OS → Blotato, social only, never touches the website), and the internal
generation of reports (Agentic OS generates them; the site only hosts published pages).

---

## 2. What's changing / what Agentic OS now does

1. **Agentic OS will publish listing pages into this repo** (via the GitHub API) — a listing's
   page becomes a committed `.html` file; Netlify auto-deploys it. Pages are **updatable**
   (status/price/tour/photos change → Agentic OS re-commits).
2. **Listing photos live in Cloudflare R2**, not in this repo. Agentic OS uploads a listing's
   photos to R2 and provides **public URLs** (`https://pub-1b31…r2.dev/listing-photos/<slug>/…`).
   Pages reference those URLs; the site does **not** host listing photos.
3. **TruMarket is the single source of truth for home value.** The site's value/market numbers
   must come from Agentic OS's TruMarket API — not from this repo's own `comp_engine.py` /
   `zillow-property.js` logic.
4. **Home value is gated** — the number is delivered only after lead capture.
5. Listings move through a **status lifecycle** (Coming Soon → Active → Pending → Sold) that
   changes what the page shows.

---

## 3. The asks (what the website side needs to do)

### A. Formalize a canonical listing-page **template with named, fillable slots**
This is the key contract — Agentic OS fills this template to generate each listing page, so it
needs a stable template with clearly-marked placeholders. Use the existing listing page
(`6310-star-light-ct.html`) as the source of truth and document the slots. Required slots:
- **Meta/SEO** — title, description, canonical, OG tags (per address)
- **Status** — render 4 states: `coming_soon` | `active` | `pending` | `sold` (badge + the right CTA)
- **Hero image** — one R2 URL
- **Gallery** — ordered list of R2 URLs
- **Price**, **address**, **beds/baths/sqft**, **description** (buyer-facing, from the MLS extract)
- **Primary CTA** — "Schedule a tour" (Active); swaps by status (see §4)
- **Virtual tour** — an embed slot that takes a validated provider **link** (Matterport, etc.)
  and renders a safe iframe. Added *after* publish sometimes → must be re-render-friendly.
- **Open house** — a block for one or more date/time entries; hidden/auto-expired after it passes
- **Sold-state block** — testimonial text + optional closing photo, and the CTA swap (see §4)

**Please reply with the exact slot names/markers you settle on** so Agentic OS fills the right
places. Keep sections data-driven so re-generation is idempotent.

### B. Confirm the repo conventions for programmatic commits
- **Filename/slug:** `<address-slug>.html` (e.g. `6310-star-light-ct.html`) — confirm the slug rule.
- **Index:** how a new listing registers in `listings.html`.
- **Sitemap:** Agentic OS should update `sitemap.xml` on publish — confirm format.
- **Commit access:** Agentic OS commits via the GitHub API (a bot token / collaborator). Confirm
  that's acceptable and Phil will provision the token.

### C. Repoint the Netlify Functions to TruMarket (single source)
- `home-value.js`, `market-data.js`, `marketiq-stats.js` should **call Agentic OS's TruMarket
  `/api/v1`** instead of computing their own numbers / pulling Zillow. (Agentic OS will provide
  the request/response contract — see §5.)
- **Retire** this repo's own value logic (`data/comp_engine.py`, the Zillow value path) so the
  number on the site matches everywhere.
- Keep the value **gated** — capture the lead before showing the number.

### D. Reviews (Sold page + site)
Google reviews will be **displayed** (pulled via the Business Profile API, read-only). Mechanism
(a Netlify Function here vs. Agentic OS serving them) is **TBD** — flag your preference.

---

## 4. Status lifecycle — how the page changes by status

| Status | Page shows | CTA |
|---|---|---|
| **Coming Soon** | teaser + "Coming Soon" badge | "Get notified / early access" |
| **Active** | full listing | "Schedule a tour" |
| **Pending** | "Pending / Under Contract" badge | "See similar / join backup list" |
| **Sold** | "Sold" badge; **the private-showing section flips to a TruMarket "What's your home worth?" CTA (gated)**; testimonial + optional closing photo shown; **page stays indexed** (neighborhood seller magnet) | value CTA |

Agentic OS sets the status and re-commits the page; the template must render each state.

---

## 5. What Agentic OS provides to you
- **Listing data** (address, price, specs, buyer-facing description) — from the MLS-sheet extract.
- **R2 photo URLs** (hero + ordered gallery).
- **Status, virtual-tour link, open-house dates, testimonial/closing-photo** (as they're set).
- **TruMarket API contract** for the value functions — **[to be provided]**; ping us and we'll
  document the endpoint + request/response shape.

---

## 6. Still being designed on the Agentic OS side (don't wait on these)
- Listing **launch campaign** (30-day social drip) and the **Blotato handoff** — both social, they
  do **not** touch the website.
- **Email/newsletter** send mechanism.

---

## 7. TL;DR for the website build
1. Turn the listing page into a **documented template with named slots** and send us the slot names.
2. Confirm **slug + `listings.html` + `sitemap.xml` conventions** and that Agentic OS can commit via API.
3. **Repoint the value Netlify Functions to TruMarket**, gate the value, retire the local comp/Zillow logic.
4. Make the template render the **4 status states** (incl. the Sold → gated-value repurpose).
5. Photos + value come **from Agentic OS (R2 URLs / TruMarket API)** — the site renders, it doesn't compute.
