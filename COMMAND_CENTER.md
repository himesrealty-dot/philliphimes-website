# MarketIQ™ Command Center
**Last Updated:** May 2026 | Start every session by reading this file first.

---

## QUICK-START FOR CLAUDE

> "I'm working on my real estate website at philliphimes.com. Read `COMMAND_CENTER.md` and `PROJECT_CONTEXT.md` to get up to speed."

---

## CURRENT BUILD STATUS

| System | Status | Notes |
|--------|--------|-------|
| philliphimes.com | ✅ LIVE | GitHub → Netlify auto-deploy |
| MarketIQ™ Seller Mode | ✅ WORKING | Real comp engine, no RentCast |
| MarketIQ™ Buyer Mode | ⚠️ NEXT UP | Prompt exists, not CMA-powered yet |
| Comp Engine (Python) | ✅ DONE | v1.1 — used for testing/data work |
| Comp Engine (JS) | ✅ DONE | Ported into marketiq-ai.js v4 |
| MarketIQ.csv | ✅ CURRENT | 4,394 records / 1,763 sold comps |
| data_prep.py | ✅ DONE | Normalizer + merger for new HAR exports |
| IDX Broker | ✅ LIVE | philliphimes.idxbroker.com |
| GHL / CRM | ⏳ PENDING | A2P 10DLC approval in progress |

---

## KEY FILES

### Data Layer
| File | Purpose |
|------|---------|
| `data/MarketIQ.csv` | Master sold comps — 1,763 sold records across 6 markets |
| `data/comp_engine.py` | Python engine v1.1 — test/validate CMA logic here |
| `data/data_prep.py` | Run when new HAR data arrives: `python data_prep.py new.csv` |

### Function
| File | Purpose |
|------|---------|
| `netlify/functions/marketiq-ai.js` | MarketIQ v4 — no RentCast, pure comp engine + Claude Haiku |

### Pages
| File | Purpose |
|------|---------|
| `marketiq.html` | MarketIQ™ tool UI — seller + buyer mode |
| `selleriq.html` | SellerIQ™ portal — links to MarketIQ |
| `buyeriq.html` | BuyerIQ™ portal — links to MarketIQ |
| `PROJECT_CONTEXT.md` | Full project brief — brand, tech stack, architecture |

---

## COMP ENGINE — HOW IT WORKS

```
POST /marketiq-ai
{ address, mode, beds, baths, sqft, + optional: lat, lon, stories, yr,
  pool, garage, community, mp, gated, water, newco }
  
→ Geocode address (Nominatim, free) if lat/lon missing
→ Load MarketIQ.csv (cached after cold start — 1,763 comps)
→ Run 5-phase CMA cascade (+ Phase 6 if thin market)
→ Inject calculated prices into Claude prompt
→ Claude writes narrative only — cannot override prices
→ Return { report, area, zip, mode, comps, cma }
```

### Price Formula
```
Price to Move  = baseline × 0.975  → round to $5,000
Price to Sell  = baseline × 1.000  → round to $5,000
Price to Test  = baseline × 1.025  → round to $5,000
```

### CMA Phases
| Phase | Scope | Notes |
|-------|-------|-------|
| Ph1 | Same community, 90d, tight (±20% sqft, ±10yr, exact beds) | No adjustments |
| Ph2 | Same community, 90d, loose | With adjustments |
| Ph3 | 2mi, 90d, tight | No adjustments |
| Ph4 | 2mi, 90d, loose | With adjustments |
| Ph5 | 4mi, 180d, loose | With adjustments |
| Ph6 | 4mi, 365d, loose (thin market only) | Adds when < 50 nearby comps |

### Hard Filters (never relaxed)
NewConstruction, WaterAmenity (waterfront), Gated, MasterPlanned — all must match subject exactly.

### Adjustments
| Item | Value |
|------|-------|
| Pool | ±$22,500 flat |
| Stories | Community-specific $/sf table (see comp_engine.py) |
| Bedrooms | $2,500/room |
| Bathrooms | $1,500 full / $750 half |
| Sqft | $37/sf marginal |
| Garage | $6,500/stall, capped ±2 stalls |

---

## MARKETS COVERED

| Market | ZIPs | Sold Comps |
|--------|------|-----------|
| League City | 77573, 77565 | ~900 |
| Pearland | 77584, 77581 | ~500 |
| Seabrook | 77586 | 105 |
| Friendswood | 77546 | ~200 |
| Clear Lake | 77058, 77059 | ~137 |
| Dickinson | 77539 | ~26 |
| Manvel | 77578, 77583 | ~trace |
| **TOTAL** | | **1,870** |

> Clear Lake is borderline thin market at the ZIP level but passes the 50-comp threshold when the engine looks at nearby MP communities (Bay Oaks, Brookwood, etc. are all within 4mi).
> Seabrook has 16 waterfront properties correctly flagged — hard filter ensures waterfront comps only match waterfront subjects.

---

## NEXT SESSION: BUYER SIDE OF MARKETIQ

**Goal:** Power the buyer mode with the same comp engine.

**What the buyer is doing:** Entering an address they want to *offer on* (someone else's listing). They want to know what the home is actually worth and what to offer.

**Inputs needed (already in form):** address, beds, baths, sqft (these drive the CMA)
**Missing from form:** stories, yr, pool, garage, community, mp, gated, water, newco

**Plan:**
1. The CMA runs the same way — subject is the listed property, engine finds comps
2. Buyer prompt shifts language: "estimated market value" → offer strategy anchored to that value
3. Buyer strategies (Win It / Clean Offer / Test the Seller / Wait & Watch) get real price anchors
4. Optional enhancement: add price reduction history / DOM to buyer negotiation context

**The form already sends `beds, baths, sqft` for buyer mode** — the CMA will run with geocoded lat/lon + defaults for the optional fields. That's enough for a first version.

---

## DATA REFRESH PROCESS

When Phillip pulls new sold data from HAR:
```
python data_prep.py new_export.csv
```
- Normalizes community names, fixes YearBuilt, applies MP flags
- Deduplicates by MLSNumber
- Merges into `data/MarketIQ.csv`
- Commit + push → Netlify redeploys → function picks up new comps on next cold start

---

## DEPLOY PROCESS

```
1. Edit files in C:\Users\philh\Documents\GitHub\philliphimes-website\
2. GitHub Desktop → commit → push to main
3. Netlify auto-deploys in ~30 seconds
4. (If index.lock error: enable hidden files → delete .git/index.lock)
```

---

## KNOWN ISSUES / WATCH LIST

| Issue | Status |
|-------|--------|
| Buyer mode not CMA-powered | ⚠️ Next session |
| Form doesn't send stories/yr/pool/garage/community | Low priority — defaults work fine for now |
| Clear Lake comp count (137) — thin-market edge cases | Monitor; Phase 6 handles it |
| Nominatim geocoding rate limit (1 req/sec) | Fine for current traffic; upgrade path = Google Maps API |
| MarketIQ.csv needs regular refreshes (data goes stale) | Monthly HAR export + data_prep.py run |
