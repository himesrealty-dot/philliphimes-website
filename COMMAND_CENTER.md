# MarketIQ™ Command Center
**Last Updated:** May 26 2026 | Start every session by reading this file first.

---

## QUICK-START FOR CLAUDE

> "I'm working on my real estate website at philliphimes.com. Read `COMMAND_CENTER.md` and `PROJECT_CONTEXT.md` to get up to speed."

---

## CURRENT BUILD STATUS

| System | Status | Notes |
|--------|--------|-------|
| philliphimes.com | ✅ LIVE | GitHub → Netlify auto-deploy |
| MarketIQ™ Seller Mode | ✅ WORKING | Real comp engine, no RentCast |
| MarketIQ™ Buyer Mode | ✅ WORKING | CMA-powered as of May 26 2026 |
| Comp Engine (Python) | ✅ DONE | v1.1 — used for testing/data work |
| Comp Engine (JS) | ✅ DONE | Ported into marketiq-ai.js v5 |
| MarketIQ.csv | ✅ CURRENT | 4,394 records / 1,870 sold comps |
| data_prep.py | ✅ DONE | Normalizer + merger for new HAR exports |
| IDX Broker | ✅ LIVE | philliphimes.idxbroker.com |
| GHL / CRM | ⏳ PENDING | A2P 10DLC approval in progress |
| Buyers_Guide_2026.pdf | ✅ BUILT | 12-page PDF — needs landing page at /buyers-guide |

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
| Ph3 | Same community, 180d, loose | With adjustments — exhausts community before going wide |
| Ph4 | 2mi, 90d, tight | No adjustments |
| Ph5 | 2mi, 90d, loose | With adjustments |
| Ph6 | 4mi, 180d, loose | With adjustments |

**Community auto-detect:** If no community is passed in the request, the engine looks at the nearest 15 sold comps within progressive radii (0.5mi → 1.0mi → 1.5mi) and votes by frequency. If ≥2 of the nearest comps share a community name, that community is used for Ph1–Ph3. This means community phases reliably fire even when the form doesn't send a community.

**Top 3 comps only:** Engine fetches up to 6 scored candidates but uses only the best 3 for the weighted PPSF baseline. This avoids diluting the average with weaker matches.

### Hard Filters (never relaxed)
NewConstruction, WaterAmenity (waterfront), Gated — all must match subject exactly. **MasterPlanned removed from hard filters** (was silently blocking all MP community comps when the form didn't send the mp field).

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

## NEXT SESSION: PENDING WORK

### High Priority
1. **GHL webhook + calendar for MarketIQ lead capture** — When a user runs a report, capture name/phone/email/address, tag as "MarketIQ Seller Lead" or "MarketIQ Buyer Lead", trigger appointment calendar + prep guide send + add to nurture sequence
2. **Buyers Guide landing page** — Build `philliphimes.com/buyers-guide` with name + email capture form, deliver the PDF, tag lead in GHL as buyer lead. The CTA on buyer reports already links to this URL.

### Done This Session (May 26 2026)
- ✅ Buyer mode fully CMA-powered — same comp engine as seller, real price anchors on offer strategies
- ✅ Offer strategies reduced to 3 cards: **Win It / Market Offer / Negotiate** (removed "Wait & Watch")
- ✅ Static buyer notes below strategy cards (contingencies, disclosure, pre-approval, CTA)
- ✅ CMA phases reordered — community-first (Ph1–Ph3 exhaust neighborhood before going wide)
- ✅ Community auto-detect from nearest comps (no form field needed)
- ✅ MasterPlanned removed from hard filters (was blocking all MP comps)
- ✅ Top 3 comps only for baseline (fetch 6, use best 3)
- ✅ Buyer report layout: Snapshot → Verdict → Strategies → Comps → Dead Zone → Can't Tell → Buyer Guide CTA
- ✅ Buyers_Guide_2026.pdf built — 12 pages, brand colors, updated 2026 stats
- ✅ Validated CMA accuracy: 2818 Soffiano Lane — engine $297,921 vs Phillip's CMA $312,850 (<5% apart; both confirm $379k list is overpriced)

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
