# philliphimes.com — Wrap-Up Checklist

_Generated June 11, 2026. A full automated audit of all 86 HTML pages found **0 broken links, 0 broken anchors, 0 empty hrefs**. The items below are the remaining intentional placeholders, "Coming Soon" features, and off-site tasks to finish before you call the site done._

---

## 1. Visible "Coming Soon" placeholders (decide: build or remove)

These are the only 3 placeholders a visitor actually sees on a rendered page. Everything else flagged by the audit is dormant code (see §4).

| # | Page | Location | What it is | Action needed |
|---|------|----------|-----------|---------------|
| 1 | `index.html` (line 730) | Home — reLifeIQ™ section | Video tile reads **"Phil's reLifeIQ™ Story — Coming Soon"** with a ▶ play icon over an empty box | Record/embed the video, OR swap the empty tile for a static image/graphic until it's ready |
| 2 | `primequity.html` (line 307) | PrimEquity page — Renew™ heading | Gold **"Coming Soon"** badge next to the Renew™ heading | Launch Renew™ and remove the badge, OR leave as a genuine roadmap teaser |
| 3 | `master-planned-communities.html` (line 372) | Legacy community card | Price shows **"Ask Phil for Pricing"** instead of a range | Optional: add a real "From $XXXk" range once you have builder pricing. (Legacy by Hillwood is a real, active CCISD community — the "Ask Phil" CTA is legitimate, not a bug.) |

---

## 2. IDX search links — generic vs. neighborhood-specific

Every neighborhood page's "View Listings" button currently points to the **generic** advanced-search URL:

```
https://philliphimes.idxbroker.com/idx/search/advanced
```

This works — it just drops the visitor on a blank search form instead of pre-filtering to that neighborhood. To make each button land on a saved search for its neighborhood, create the saved link in **IDXAddons** and swap the `href`.

- Already configured (per CLAUDE.md): **Mar Bella = savedlink 2903**, **Brittany Lakes = 2935**
- **Action:** create saved searches for the remaining 34 neighborhoods and replace the generic URL on each page. Low priority — the generic link is functional; this is a conversion polish item.
- **Verify naming:** double-check any `/i/{Neighborhood}` slugs match what IDXBroker actually generated (e.g. confirm `/i/Silver-lake` vs `/i/Silvercreek` for Silverlake).

---

## 2b. Guide lead-capture popups — finish the GHL wiring ⚠️

The three home-page guide buttons ("30-Day Plan", "Buyer's Advantage", "Seller's Edge") and the two footer guide links now open a **lead-capture popup** instead of going to the contact page. On submit, the lead is saved to **Netlify Forms** (form name `guide-download`) AND posted to a **GoHighLevel webhook** so your GHL workflow can email the right PDF.

**One thing left for you to do — paste your GHL webhook URL:**

1. In GoHighLevel, build a Workflow with an **Inbound Webhook** trigger. Copy its webhook URL.
2. In `index.html`, find `var GHL_WEBHOOK_URL = '';` (in the guide-modal script near the bottom) and paste your URL between the quotes.
3. In the GHL workflow, branch on the `guide` field — it arrives as one of: `30day`, `buyer-advantage`, or `seller-edge` (the `guide_title` field carries the human-readable name). Send the matching PDF as an email attachment / download link for each branch.
4. Upload the 3 PDFs to GHL (or wherever your emails link to). Fields delivered to the webhook: `first_name`, `last_name`, `email`, `phone`, `sms_consent`, `guide`, `guide_title`, `page`, `timestamp`.

> Until the URL is pasted, popups still work and every lead is captured in Netlify — only the automated email won't fire. **Also: in the Netlify dashboard, confirm the `guide-download` form appears under Forms after the next deploy** (Netlify auto-detects it from the static HTML).

---

## 3. Off-site launch tasks (not in the code)

- [ ] **Submit `sitemap.xml` to Google Search Console** (and Bing Webmaster Tools). The sitemap is current and includes all market-update articles.
- [ ] **Verify the domain in Google Search Console** if not already done.
- [ ] **Set up / claim Google Business Profile** for Phillip Himes, REALTOR® — link it to philliphimes.com.
- [ ] **Start collecting Google reviews** — the site has no review widget yet; reviews drive local SEO more than almost anything else.
- [ ] **Confirm social profile links resolve** — the `sameAs` JSON-LD points to YouTube `@PhillipHimesrealtor`, Facebook `philliphimesrealtor`, Instagram `philhimes`, LinkedIn `philhimes`. Make sure each profile exists and is active.
- [ ] **Test all forms end-to-end on the live domain** — submit one real test lead through the contact form and confirm it lands in both Netlify Forms and your LeadConnector/GHL inbox.

---

## 4. Confirmed NOT problems (no action needed)

- **The 72 "Article Image / Articles coming soon" blog placeholders** flagged by the audit are **dormant JavaScript fallbacks**. Every neighborhood page has an empty `POSTS = []` array, so `renderBlog()` never injects them into the page. A visitor never sees them. When you add a real blog post to a page's `POSTS` array (with an `image`), the real card renders automatically. Nothing to fix.
- **Forms are fully wired** — contact, valuation, and lead forms post to Netlify Forms (`data-netlify`) and fire a `fetch()` webhook to LeadConnector/GHL. No dead form actions.
- **All 36 neighborhoods** are MLS-priced (June 2026 data) and identity-verified.
- **All 6 cities** have published market-update articles, each linked from `market-insights.html` and listed in the sitemap.
- **SEO/AEO metadata** is complete site-wide: title/description/canonical/OG tags, RealEstateAgent + FAQPage JSON-LD, `sameAs` social profiles, `llms.txt`, and optimized images.

---

## Quick priority order

1. **Submit sitemap to Google Search Console** + claim Google Business Profile _(biggest SEO payoff, 30 min)_
2. **Decide on the 3 "Coming Soon" placeholders** (§1) — record video / launch features / or leave as teasers
3. **Test forms live** with one real submission
4. **Start gathering Google reviews**
5. _(Polish, ongoing)_ Configure neighborhood-specific IDX saved searches (§2)
