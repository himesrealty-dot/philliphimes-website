# Phillip Himes Real Estate — Website Project Instructions
**Last Updated:** May 26 2026 | **Status:** Live at philliphimes.com

---

## 1. CONTACT & IDENTITY

| Field | Value |
|-------|-------|
| Name | Phillip Himes |
| Compliance Brand | Phillip Himes \| Brokered by EXP Realty |
| Phone | (832) 895-7547 ← swap for GHL tracking # once A2P approved |
| Email | phil@philliphimes.com |
| Domain | philliphimes.com |
| Primary Market | League City, TX |
| Submarkets | Friendswood, Clear Lake, Webster, Pearland |

---

## 2. BRAND IDENTITY

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Deep Navy | #1B3A5C | Primary / authority / headings |
| Teal | #2089A0 | Differentiator / growth / links |
| Warm Gold | #C9A455 | Accent / premium / highlights |
| White | #FFFFFF | Backgrounds |
| Dark Gray | #333333 | Body text |

### Typography
- **Headings**: Montserrat (ExtraBold / Black weight)
- **Body**: Open Sans
- **Accent / Quotes**: Playfair Display (italic)

### Voice & Tone
- Direct, warm, confident — not salesy
- Meet people at their life event, not their transaction
- Forward-looking language (never dwell on the hard part)
- Use "you" language — the client is always the hero

### Taglines & Brand Architecture

| Brand | Tagline | Purpose |
|-------|---------|---------|
| reLifeIQ™ (Rebalance + Amplify + Renew) | "Live Better Now. Build Wealth. Retire Strong." | Life-stage wealth & equity tools for 50-60 avatar — replaces PrimEquity™ |
| Real Estate Business | "Sell Smart. Buy Right. Build More." | Core real estate service brand — buyers, sellers, investors |
| Renew™ | TBD | Life transition / divorce path — needs its own tagline |

**Brand Promise**: "Your best chapter isn't behind you. Let's go build it."

### IQ Brand Family — Complete
| Portal | Domain | Descriptor |
|--------|--------|------------|
| BuyerIQ™ | (philliphimes.com/buyeriq) | "The tools and local intelligence to find the right home in the right neighborhood — before you walk through a single door." |
| SellerIQ™ | (philliphimes.com/selleriq) | "Know your home's real value, your market position, and exactly what you'll walk away with — before you decide anything." |
| reLifeIQ™ | relifeiq.com ✅ REGISTERED | "Every real estate decision begins with a life moment. reLifeIQ helps you make the right move for where you are right now." |
| NewBuildIQ™ | newbuildiq.com ✅ REGISTERED | New construction intelligence platform |

### "Sell Smart. Buy Right. Build More." — Site Decision Point Architecture
This tagline doubles as the Choose Your Own Adventure decision point on the homepage:
- **Sell Smart** → SellerIQ™ portal
- **Buy Right** → BuyerIQ™ portal
- **Build More** → reLifeIQ™ portal → full reLifeIQ suite (Rebalance™, Amplify™, Renew™)

### reLifeIQ™ Brand Notes
- Domain: relifeiq.com (registered May 2026)
- Replaces PrimEquity™ as the parent brand name
- Sub-tools retain their names: Rebalance™, Amplify™, Renew™
- "re-" prefix serves dual meaning: Real Estate + renewal/reimagining
- Needs a video on the homepage portal explaining the concept — Phil on camera, 60-90 seconds
- Renew™ tagline still TBD

### Logo
- File: `images/logo.png`
- Navy house roofline icon + "Phillip" (navy) + door icon + "Himes" (teal)
- Gold divider line + "BROKERED BY EXP REALTY" in teal
- All HTML pages include an onerror fallback: if logo.png fails to load, text version displays

---

## 3. SITE PHILOSOPHY

### The Core Architecture — Locked May 2026
> **"The homepage is the hook. The briefing is the bridge. The portal is where the relationship is built."**

This single sentence is the north star for every build decision on this site. Use it as a filter:
- Adding something to the homepage? Ask: **is this a hook?**
- Building inside the briefing? Ask: **is this building the bridge?**
- Adding something to a portal? Ask: **is this deepening the relationship?**

If the answer is no, it doesn't belong there.

### The Three-Layer Journey
| Layer | Location | Purpose |
|-------|----------|---------|
| **Hook** | Homepage | Universal value — IDX search, market stats, TruMarket snapshot, mortgage calculator. Earned trust before any path is chosen. |
| **Bridge** | The Briefings (BuyerIQ Briefing · SellerIQ Briefing · reLifeIQ Briefing) | Video series that pre-sells the portal tools. First 2-3 episodes free, opt-in earned at the natural gate. Phil on camera. |
| **Relationship** | Portals (BuyerIQ™ · SellerIQ™ · reLifeIQ™) | Full tool suite, Caitlyn engaged, conversion path active. This is where trust becomes a transaction. |

### The Guided Tour Principle
The site is a guided tour, not a brochure. Every element — the nav, the briefing, the tools, the CTA — is architecting the visitor's journey. But the tour is **invisible**. The prospect feels like every move is their own decision. They arrive at conversion feeling like they chose it. That's the most powerful conversion in existence because there's no resistance.

### The Competitive Advantage
**The big sites are passive.** They provide tools and wait for the prospect to raise their hand by clicking "Request a Showing" or "Get Home Value." If the visitor doesn't click, they're invisible.

**This site is active.** The behavioral intelligence layer reads intent signals before the prospect consciously decides to act. Caitlyn reaches out intelligently before they raise their hand. The big sites give visitors a map. We give them a guide.

### The Traffic & Conversion Strategy
- Target conversion rate: 5-6% (matching the big sites) but with higher lead quality
- Traffic engine: organic AEO/SEO — the only way to offset paid traffic costs at scale
- Lead philosophy: high intent, lower volume beats low intent, high volume for this business model
- Gate strategy: free Layer 1 tools build trust → opt-in earned at natural commitment moments (briefing episode 3, IDX save, TruMarket request)

**The core insight:** Zillow and Realtor.com win on inventory. We can't beat them there. We beat them by being the only site that meets visitors at their *life event* — not treating them as a generic buyer or seller.

**The big real estate sites make one critical mistake:** They ask the visitor to self-identify their transaction type (buy / sell / rent). But people don't think of themselves as "a buyer." They think: "We just found out we're having twins and we need more space." Or: "My kids just left for college and this house feels empty." Or: "My company is relocating me to Houston in 60 days."

**Our advantage:** We meet them where they are emotionally, give them the information they expect (search, data, market info), and create a follow-up system that speaks to their specific situation.

### AEO / SEO Strategy
- AI engines (ChatGPT, Perplexity, Google AI Overviews) pull from structured Q&A content
- Every neighborhood page uses FAQPage + Question/Answer schema markup
- Answer questions the way a knowledgeable local expert would — specific, opinionated, useful
- Index.html has RealEstateAgent LocalBusiness schema (JSON-LD)
- Target: "best neighborhoods in League City for families" / "homes for sale in Friendswood TX" style queries

---

## 4. TECH STACK

| Layer | Tool | Status |
|-------|------|--------|
| Hosting | Netlify (auto-deploy from GitHub) | ✅ LIVE |
| Domain | philliphimes.com (GoDaddy DNS) | ✅ LIVE |
| Forms | Netlify Forms (built-in) | ✅ Ready |
| CRM | GoHighLevel (GHL) | ⏳ Pending A2P compliance |
| IDX / Listings | IDX Broker Engage (philliphimes.idxbroker.com) | ✅ LIVE — RealtyCandy configured |
| IDX Addons | IDXAddons.com | ✅ Active — 127 addons available |
| Source Control | GitHub → philliphimes-website repo | ✅ LIVE — Netlify auto-deploys on push |
| NewBuildIQ | newbuildiq.com | ✅ Domain owned, site TBD |

### Deploy Process (GitHub → Netlify)
1. Edit files in `C:\Users\philh\Documents\GitHub\philliphimes-website\`
2. Open GitHub Desktop → commit changes → push to main
3. Netlify auto-deploys in ~30 seconds
4. **Note:** If GitHub Desktop shows a `.git/index.lock` error, enable hidden files in File Explorer and delete that file

### IDX Broker Design Panel (middleware.idxbroker.com/mgmt)
Key sections for customization:
- **Design → Branding → Colors** — set #1B3A5C, #2089A0, #C9A455 brand colors (DO THIS FIRST)
- **Design → Website → Custom CSS** — inject brand CSS into all IDX pages
- **Design → Website → Wrappers** — nav/footer already set up by RealtyCandy
- **Design → Widgets → New** — AI Smart Search, Listings Carousel, Listings Showcase, Market Report, Map Search

---

## 5. SITE STRUCTURE

```
PH-Website/
├── index.html              # Homepage
├── buyers.html             # Buyers landing page
├── sellers.html            # Sellers landing page
├── neighborhoods.html      # League City + submarkets (AEO-optimized)
├── primequity.html         # Primequity™ app suite
├── contact.html            # Contact + forms
├── privacy-policy.html     # ⚠️ COMPLIANCE CRITICAL (A2P 10DLC)
├── terms-of-service.html   # ⚠️ COMPLIANCE CRITICAL (A2P 10DLC)
├── thank-you.html          # Post-form confirmation
├── netlify.toml            # Security headers + deployment config
├── css/
│   └── styles.css          # Full design system (~700+ lines)
├── js/
│   └── main.js             # Nav, animations, form handling, stat counters
└── images/
    └── logo.png            # Brand logo (horizontal)
```

---

## 6. BRAND APP SUITE

### Primequity™ (primequity.html)
Three tools targeting sellers in life transitions:

**Rebalance** — For downsizers
- "You've spent 18 years raising your kids. Time to Rebalance."
- Target: empty nesters, retirement-adjacent, people in houses too big for current life
- Message: This is a forward move, not a retreat
- 4-step process: Equity Analysis → Right-Size Plan → Transition Timeline → Launch

**Amplify** — For equity-rich sellers
- Target: homeowners sitting on $200K–$500K+ in equity exploring alternatives
- Tools: equity projection, 1031 exchange guidance, investment scenario modeling
- Message: Your equity is working too hard staying in one place

**Renew** — For divorce situations
- Forward-looking, never dwelling on the hardship
- Neutral language: "life transition" not "divorce"
- Tools: partition analysis, separate purchase guidance, timeline coordination

### TruMarket™
- Branded home valuation tool
- NOT just a Zestimate clone — provides:
  - Value range (not a single number)
  - Positioning analysis vs. active competition
  - Pricing purpose discussion (speed vs. max price vs. certainty)
- Positioned as a relationship deepener, not a traffic driver

### NewBuildIQ™ (newbuildiq.com — domain owned)
- Standalone consumer-first new construction intelligence platform
- Tracks production builder deals: rate buydowns, closing cost credits, upgrade packages
- Builder deals are NOT publicly advertised — this is the intelligence gap we fill
- Key insight: Builder sales agents work for the builder. We work for the buyer.
- Features: Builder Deal Intelligence, True Cost Calculator, School Zone Mapping, Build Timeline Tracker
- Separate from Primequity; own business potential (licensing, expansion beyond Houston)

---

## 7. LIFE EVENT POSITIONING MAP

| Life Event | Tool / Page | Key Message |
|------------|-------------|-------------|
| First-time buyer | buyers.html | "Demystify every step. No jargon, no pressure." |
| Growing family | buyers.html | "More space, better schools — I know every district." |
| Relocation to Houston | buyers.html | "Virtual tours. Neighborhood deep-dives. Low stress." |
| New construction | buyers.html + NewBuildIQ | "Builder's agent works for the builder. I work for you." |
| Investment | buyers.html | "Cap rates, cash flow, appreciation — Houston rental market is strong." |
| Upsizing | buyers.html | "Coordinating sale + purchase simultaneously — I do it all the time." |
| Downsizing / empty nest | sellers.html + Rebalance | "This is a forward move. Let's Rebalance." |
| Equity-rich seller | sellers.html + Amplify | "Your equity is working too hard in one place." |
| Divorce | sellers.html + Renew | "A fresh start. Forward." |
| General seller | sellers.html + TruMarket | "Know your number before you decide anything." |

---

## 8. FORMS & COMPLIANCE

### A2P 10DLC Compliance URLs (for GHL submission)
- Privacy Policy: https://philliphimes.com/privacy-policy.html
- Terms of Service: https://philliphimes.com/terms-of-service.html

### Forms on Site (all Netlify Forms)
| Form | Page | Name attribute |
|------|------|----------------|
| Main contact | contact.html | `contact` |
| TruMarket request | contact.html | `trumarket` |
| Listing alerts | buyers.html | `listing-alerts` |

### SMS Compliance Language (on all forms)
- Checkbox: "I agree to receive texts from Phillip Himes. Msg & data rates may apply. Reply STOP to cancel."
- Footer: "Consent is not a condition of purchase."
- Privacy Policy has full SMS section: frequency (up to 10/mo), STOP/HELP commands, no sharing of mobile numbers

---

## 9. PENDING INTEGRATIONS

### IDX Broker (Next Purchase)
- Buy through **RealtyCandy** (authorized reseller — saves $150 setup fee)
- Plan: **Engage** (includes AI Smart Search)
- MLS: **HAR** (Houston Association of Realtors)
- After purchase: Replace placeholder sections in `index.html` and `buyers.html` with IDX embed code
- Ask RealtyCandy to match IDX page styling to navy/teal/gold color scheme

**Placeholder locations to replace:**
- `index.html` — hero search bar area
- `buyers.html` — the `#search` section (IDX Property Search placeholder)

### GHL Integration (After A2P Approval)
1. Swap phone number (832) 895-7547 for GHL tracking number
2. Connect Netlify form submissions to GHL via webhook or Zapier
3. Build GHL automation sequences per life event (first-time buyer flow, relocation flow, etc.)
4. Eventually migrate site to GHL website builder (optional — Netlify is working well)

### IDXAddons Bridge (After IDX Broker)
- Free tool connecting IDX Broker behavioral data to GHL
- Enables: "Lead viewed 5 listings in Clear Lake under $400K" → trigger specific GHL sequence

---

## 10. CONTENT ROADMAP

### Quick Wins (Do Soon)
- [ ] Add real client testimonials (replace placeholder testimonials)
- [ ] Add Phillip's professional headshot to homepage
- [ ] Update stats as they grow (500+ families, $180M+, etc.)
- [ ] Add real sold properties to TruMarket section

### Medium Term
- [ ] Expand neighborhoods page: add Galveston, Nassau Bay, Kemah
- [ ] Add individual neighborhood subpages (League City/index, Friendswood/index, etc.)
- [ ] Build blog / market updates section (Houston market monthly report)
- [ ] Add video content to hero or about section

### Bigger Plays
- [ ] Build NewBuildIQ as standalone site at newbuildiq.com
- [ ] Launch Primequity as separate app (primequity.io)
- [ ] Add calculator tools (mortgage estimator, rent vs. buy, equity projection)
- [ ] Hyperlocal content: school district deep-dives, HOA comparisons, commute maps

---

## 11. SEO / AEO TARGET KEYWORDS

### Primary (High Intent)
- "homes for sale League City TX"
- "real estate agent League City TX"
- "buy a home in Houston"
- "new construction homes Houston"
- "sell my home League City"

### AEO / Conversational (AI Search)
- "best neighborhoods in League City for families"
- "how much do homes cost in Friendswood TX"
- "is League City a good place to live"
- "new construction vs resale Houston"
- "how to downsize in Houston"
- "relocating to Houston what neighborhood should I live in"

### Brand / Awareness
- "Phillip Himes realtor"
- "Primequity real estate"
- "NewBuildIQ Houston"
- "TruMarket home value"

---

## 12. HOW TO WORK WITH CLAUDE ON THIS PROJECT

When starting a new session, say:
> "I'm working on my real estate website at philliphimes.com. Read the PROJECT_CONTEXT.md file in PH-Website to get up to speed."

Claude will read this file and have full context to continue iterating without re-explaining everything.

### Common Requests
- **"Update the copy on [page]"** → Claude edits the HTML file and you redeploy to Netlify
- **"Add a new section to [page]"** → Claude writes the HTML/CSS and you redeploy
- **"Help me add IDX embed code"** → Paste the embed code from IDX Broker and Claude will integrate it
- **"Add a new testimonial"** → Provide the quote, name, situation and Claude will add it
- **"Build a new page for [topic]"** → Claude creates the full HTML file matching the design system

### Design System Reference
All styles are in `css/styles.css`. Key CSS variables:
```css
--navy: #1B3A5C
--teal: #2089A0
--gold: #C9A455
--font-heading: 'Montserrat', sans-serif
--font-body: 'Open Sans', sans-serif
--font-accent: 'Playfair Display', serif
```

Section patterns already built:
- `.section` — standard white section
- `.section--alt` — light gray background
- `.section--dark` — navy background
- `.life-card` — life event cards (used on index + buyers + sellers)
- `.cta-banner` — full-width navy CTA strip
- `.page-hero` — interior page hero (navy gradient)

---

## 13. VISION STATEMENT (for Claude context)

The goal is to build the best local real estate website in the Houston suburban market — not by out-spending Zillow, but by out-knowing them. 

Zillow knows everything about houses. We know everything about people and the life events that bring them to real estate. A 42-year-old whose kids just left for college isn't searching for "home for sale" — they're searching for what comes next. We meet them there.

The site should feel like talking to the smartest, most empathetic real estate expert in Houston — one who understands that buying and selling homes is rarely about the house itself. It's about the next chapter.

Every page, every section, every word should earn the trust of someone in the middle of a major life decision.

---

## 14. THREE-LAYER ARCHITECTURE (Locked May 2026)

> **"The homepage is the hook. The briefing is the bridge. The portal is where the relationship is built."**

| Layer | Name | What it does | Tools |
|-------|------|--------------|-------|
| 1 | **The Hook** | Give visitors what they want immediately — listings, home value, market data. No friction, no opt-in. | IDX Broker AI Smart Search, Listings Carousel/Showcase, Home Valuation (Plunk), Affordability Calculator |
| 2 | **The Bridge** | Video series that makes them curious about a smarter approach. Answers: "What is my reason for moving?" Leads to the IQ tools. | Phil on camera, 60-90 sec universal video + life-stage branch videos |
| 3 | **The Relationship** | IQ tool portals where Caitlyn engages and conversion happens. | BuyerIQ™, SellerIQ™, reLifeIQ™ (Rebalance/Amplify/Renew) |

### Layer 2 Bridge Video Script (ready to record)
- Opening: "You've researched what's available. You've checked prices. And if I'm right — you're just as unsure as when you started."
- Core insight: "We buy and sell homes for a reason. Life requires it. Understanding your life moment unlocks everything — the timing, the neighborhood, the strategy."
- The pivot: "So what are your reasons... for your next move... that really matter." [pause]
- Introduce reLifeIQ: "reLifeIQ is a family of tools designed to bring clarity to this moment in your life."
- Branch to Rebalance (empty nesters), Amplify (growing family/move-up), Renew (divorce/medical)

---

## 15. IDX BROKER + IDXADDONS STRATEGY (May 2026)

### IDX Broker Engage — What's Live
- philliphimes.idxbroker.com — full HAR MLS with nav/footer wrapper matching philliphimes.com (RealtyCandy)
- philliphimes.idxbroker.com/i/League-City — city-filtered search pages (all 6 cities)
- 250+ League City listings, avg $397K, live data

### Key Widgets to Build (in order)
1. **AI Smart Search** — natural language "3br home near Clear Creek ISD under $450k" → replaces homepage search bar
2. **Listings Carousel** — pre-filtered by city, embed on each city page above the fold
3. **Listings Showcase** — grid for deeper browse sections on city pages
4. **Market Report** — drop into market-insights.html for real data by city/zip

### IDXAddons Arsenal — 127 total addons
Organized by strategy layer:
- **Layer 1 (Hook):** AI Smart Search, Omnisearch 2.0, Home Valuation, Affordability Calculator, Mortgage Calculator, Geolocation Widget, Nearby Listings, Popular Listings, Property AI, RPR AVM
- **Layer 2 (Bridge/Community):** One Click Community, Community Page Creator, Community Enhanced Builder, Community Listings Stats, Data Graph Widget, Market Report Widget, ChatGPT Content Generator
- **Layer 3 (Relationship/GHL):** GHL Dashboard, Dynamic Saved Search, Property Updates for GHL, GHL Text Alerts, GHL Webhook & Workflows, Home Valuation + GHL, Auto Saved Search, Voice AI, CMA Widget
- **SEO/AEO:** SEO Links, Bulk Saved Link Creator, Google Reviews, Testimonials Widget, Bulk Widget Generator, Counts, Popular Searches

---

## 16. CITY PAGE ARCHITECTURE (Pilot: League City)

### Current Structure (all 6 city pages rebuilt May 2026)
All city pages (league-city, friendswood, pearland, clear-lake, dickinson, manvel) now match the same template:
- Full-height hero with city-specific color theme
- WHY section (city-draw two-column)
- NEIGHBORHOODS section (hood-cards with buyeriq.html CTAs)
- SCHOOLS section (two-column with school-items)
- COMMUTE section (commute-times)
- FAQ section (faq-items with schema markup)

### Next: League City Pilot Redesign
Goal: Get IDX listings above the fold, community content below.
1. **Compact hero** — ~220-250px tall (half current height), just city name + tagline
2. **Listings Carousel widget** — pre-filtered to League City, right below fold
3. **"View All League City Listings →"** — links to philliphimes.idxbroker.com/i/League-City
4. **Community content** — existing neighborhoods/schools/commute/FAQ sections
Roll out to all 6 cities after League City is proven.

---

## 17. SELLERS.HTML — TWO-STEP HOME VALUATION (Built May 2026)

New section added between hero and two-door section on sellers.html:
- **Step 1:** Custom-styled address input (dark navy/teal gradient, matches TruMarket aesthetic)
- **Loading state:** Gold spinner + "Pulling your estimate..."
- **Step 2:** Two-column — Left: IDXAddons Plunk result (white card on white background — no conflict); Right: TruMarket™ capture form (name/email/phone/SMS → Netlify form `home-value-lead`)
- JS orchestration: dynamically injects IDXAddons script on submit, tries to pre-fill address, reveals Step 2 after 3s
- "← Try a different address" resets flow

### Pending Next Steps for Sellers Page
- Test the two-step flow after push to GitHub
- If IDXAddons pre-fill works → great. If not → widget shows with blank input, user re-enters address (acceptable)
- Consider replacing IDXAddons with IDX Broker's native valuation once configured

---

## 18. MARKETIQ™ COMP ENGINE — BUILT MAY 2026

### What It Is
MarketIQ™ is an AI-powered CMA (Comparative Market Analysis) tool embedded in the site at `/marketiq.html`. It takes a property address + basic attributes, runs a real comp engine against actual HAR MLS sold data, and delivers a fully structured pricing strategy report written by Claude Haiku. No third-party AVM. No RentCast. Pure HAR data + our logic.

### The Data
| File | What It Is |
|------|-----------|
| `data/MarketIQ.csv` | Master sold comps dataset — 4,394 records total, 1,763 sold comps |
| `data/comp_engine.py` | Python comp engine v1.1 — used for data analysis and testing |
| `data/data_prep.py` | Normalizer + merger script — run when new HAR exports arrive |

**Markets covered:** League City (77573, 77565), Friendswood (77546), Pearland (77584, 77581), Clear Lake / Houston (77058, 77059), Seabrook (77586), Dickinson (77539), Manvel (77578, 77583)

**Total sold comps:** 1,870 across all markets.

**Data refresh workflow:** Export new sold data from HAR MLS → run `python data_prep.py new_export.csv` → commit updated `MarketIQ.csv` to GitHub → Netlify redeploys.

### The Netlify Function
`netlify/functions/marketiq-ai.js` — v4 (no RentCast, pure comp engine)

**Request:** `POST { address, mode, beds, baths, sqft, condition, timeline, budget, lat?, lon?, stories?, yr?, pool?, garage?, community?, mp?, gated?, water?, newco? }`

**Response:** `{ report, area, zip, mode, comps, cma }`

**How it works:**
1. Geocodes address via Nominatim (free) if lat/lon not in request; falls back to ZIP centroid
2. Loads `MarketIQ.csv` at cold start, caches at module level for warm invocations (1,763 comps)
3. Runs 5-phase cascading CMA (+ Phase 6 thin-market extension if < 50 nearby comps)
4. Injects calculated prices directly into Claude Haiku prompt — Claude writes narrative only
5. Returns three price points, comp details, weighted PPSF, and CMA metadata

**Current status:** Both seller and buyer modes fully CMA-powered as of May 26 2026.

### The Comp Engine Logic
| Concept | Detail |
|---------|--------|
| Hard filters (never relaxed) | NewConstruction, WaterAmenity, Gated — all must match subject. **MasterPlanned removed** (was silently blocking all MP comps when form didn't send mp field) |
| Phases | Ph1: same community 90d tight → Ph2: same community 90d adj → Ph3: same community 180d adj → Ph4: 2mi 90d tight → Ph5: 2mi 90d adj → Ph6: 4mi 180d adj |
| Community auto-detect | If community not passed, engine votes from nearest 15 sold comps at 0.5mi→1.0mi→1.5mi radii. ≥2 matching = auto-detected community for Ph1–Ph3 |
| Top N comps | Engine fetches 6 scored candidates, uses best 3 for weighted PPSF baseline. Avoids diluting with weaker matches |
| Scoring | dist×8 + sqft%diff×20 + yr diff×0.4 + beds diff×3 + baths diff×2 + pool mismatch+2 + stories mismatch+5 |
| Weighting | Inverse-score weighted PPSF with 10% minimum weight floor per comp |
| Adjustments | Pool ±$22,500 flat; Stories: community-specific $/sf table; Beds $2,500/ea; Baths $1,500 full / $750 half; Sqft $37/sf marginal; Garage $6,500/stall capped ±2 stalls |
| Net price | ClosePrice − (RepairSeller + SellerToClosingCosts), concessions capped at 15% of close price |
| CommunityName | Normalized from Subdivision using data_prep.py — groups all section variants together (e.g., "Westland Ranch Sec 01" + "Westland Ranch Sec 02" both become "Westland Ranch") |
| Stories premium table | 45+ communities with empirically derived $/sf values from the HAR data; default $10.00/sf |

### Price Output
```
Price to Move:  baseline × 0.975, rounded to nearest $5,000
Price to Sell:  baseline × 1.000, rounded to nearest $5,000
Price to Test:  baseline × 1.025, rounded to nearest $5,000
```
These three prices are hardcoded into the Claude prompt — Claude cannot override them, only write narrative around them.

### Key Data Files
| Column | Source | Notes |
|--------|--------|-------|
| Status | HAR export | Filter = "Sold" |
| CommunityName | Computed by data_prep.py | Normalized from Subdivision |
| MasterPlannedCommunityYN | Computed by data_prep.py | Auto-applied from community name |
| YearBuilt | HAR export (normalized) | Stored as int; pandas float-string bug fixed in data_prep.py |
| WaterAmenity | HAR export | Hard filter — non-empty = waterfront |
| Access | HAR export | Hard filter — contains "Gated" = gated community |
| Stories | HAR export | 1.0 or 2.0 |

---

## 19. MARKETIQ™ — BUYER SIDE (COMPLETE AS OF MAY 26 2026)

Buyer mode is fully CMA-powered. Same comp engine, same phases, same data as seller mode.

**What was built:**
- Form collects: address, list price, beds, baths, sqft, pool (yes/no)
- Engine runs the same 6-phase CMA; community is auto-detected if not supplied
- Buyer verdict: compares list price to CMA baseline → "Fairly Priced / Slightly Over / Significantly Over / Underpriced"
- verdictPct = (listPrice − baseline) / baseline × 100
- Urgency score (1–10) derived from DOM + price reduction signals in market stats
- Offer range: Win It (list price or above), Market Offer (at baseline), Negotiate (below baseline)
- 3 offer strategy cards: **Win It / Market Offer / Negotiate** — each with real price anchors
- Static buyer notes below strategy cards: contingencies, disclosure, pre-approval, CTA
- Report layout: Snapshot → Buyer Verdict → Strategies → Comps → Dead Zone → Can't Tell → Buyer's Guide CTA → Disclaimer
- Buyer's Guide CTA links to `philliphimes.com/buyers-guide` (landing page still needs to be built)

**Validated:** 2818 Soffiano Lane — engine $297,921 vs Phillip's independent CMA $312,850 (<5% apart). Both confirm $379k list price is significantly overpriced.

**Pending:** GHL webhook for buyer lead capture + `/buyers-guide` landing page with PDF delivery.
