// MarketIQ™ v4 — AI-Powered Pricing Strategy Tool
// Anthropic Claude + Local Comp Engine (HAR MLS data — no RentCast)
// POST { address, mode, beds, baths, sqft, condition, timeline, budget,
//        lat?, lon?, stories?, yr?, pool?, garage?, community?, mp?, gated?, water?, newco? }
// Returns { report, area, zip, mode, comps, cma }

'use strict';

const fs   = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Module-level comp cache — persists across warm Lambda invocations
let _soldComps   = null;
let _failedComps = null;

// ─── CSV PARSER (no npm deps) ─────────────────────────────────────────────────
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip BOM
  const lines = text.split(/\r?\n/);
  if (!lines.length) return [];

  function parseLine(line) {
    const fields = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = !inQ; }
      } else if (ch === ',' && !inQ) {
        fields.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    return fields;
  }

  const headers = parseLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

// ─── LOAD AND CACHE SOLD COMPS ────────────────────────────────────────────────
// In Netlify Lambda, LAMBDA_TASK_ROOT=/var/task and included_files land there
// Locally, the CSV is two levels up from netlify/functions/
const DATA_PATH = process.env.LAMBDA_TASK_ROOT
  ? path.join(process.env.LAMBDA_TASK_ROOT, 'data/MarketIQ.csv')
  : path.join(__dirname, '../../data/MarketIQ.csv');
const BOOL_VALS = new Set(['true', 'yes', '1', 'y']);

function loadSoldComps() {
  if (_soldComps) return _soldComps;

  let text;
  try { text = fs.readFileSync(DATA_PATH, 'utf-8'); }
  catch (e) {
    console.error('MarketIQ: cannot read CSV:', e.message);
    _soldComps = [];
    return _soldComps;
  }

  const rows  = parseCSV(text);
  const today = new Date();
  const sold  = [];

  for (const r of rows) {
    if ((r.Status || '').trim() !== 'Sold') continue;
    try {
      const lat = parseFloat(r.Latitude  || 0);
      const lon = parseFloat(r.Longitude || 0);
      if (!lat || !lon) continue;

      const sqft  = parseFloat(r.SqFtTotal  || 0);
      const close = parseFloat(r.ClosePrice || 0);
      if (sqft < 100 || close < 1000) continue;

      const closeDateStr = (r.CloseDate || '').slice(0, 10);
      if (!closeDateStr || closeDateStr.length < 10) continue;
      const closeDate = new Date(closeDateStr + 'T12:00:00Z');
      const daysAgo   = Math.round((today - closeDate) / 86400000);
      if (daysAgo < 0) continue;

      let conc = (parseFloat(r.RepairSeller || 0) || 0)
               + (parseFloat(r.SellerToClosingCosts || 0) || 0);
      if (conc > close * 0.15) conc = 0;
      const net  = close - conc;
      const ppsf = net / sqft;

      const stories  = parseFloat(r.Stories || '1') || 1.0;
      const subd     = (r.Subdivision   || '').trim();
      const community= (r.CommunityName || '').trim() || subd;
      const poolRaw  = (r.PoolPrivate      || '').trim().toLowerCase();
      const mpRaw    = (r.MasterPlannedCommunityYN || '').trim().toLowerCase();
      const gatedRaw = (r.Access            || '').trim().toLowerCase();
      const waterRaw = (r.WaterAmenity      || '').trim();
      const newcoRaw = (r.NewConstruction   || '').trim().toLowerCase();
      const yr       = parseInt(parseFloat(r.YearBuilt || 0)) || 0;

      sold.push({
        mls:       r.MLSNumber || '',
        subd,
        community,
        daysAgo,
        lat,  lon,
        sqft,
        beds:    parseFloat(r.BedsTotal     || 0) || 0,
        baths:   parseFloat(r.BathsTotal    || 0) || 0,
        garage:  parseFloat(r.NoOfGarageCap || 0) || 0,
        pool:    BOOL_VALS.has(poolRaw),
        stories,
        yr,
        ppsf,
        net,
        close,
        conc,
        mp:    BOOL_VALS.has(mpRaw),
        gated: gatedRaw.includes('gated'),
        water: !!waterRaw && waterRaw !== '0',
        newco: BOOL_VALS.has(newcoRaw),
        closeDate: closeDateStr,
        dom:   r.DOM  || '',
        city:  (r.City || '').trim(),
        orig:  parseFloat(r.OriginalListPrice || r.ListPrice || 0) || 0,
      });
    } catch (_) { continue; }
  }

  console.log(`MarketIQ: loaded ${sold.length} sold comps from CSV`);
  _soldComps = sold;
  return _soldComps;
}

// ─── LOAD AND CACHE FAILED LISTINGS (Terminated / Expired / Withdrawn) ────────
function loadFailedComps() {
  if (_failedComps) return _failedComps;

  let text;
  try { text = fs.readFileSync(DATA_PATH, 'utf-8'); }
  catch (e) { _failedComps = []; return _failedComps; }

  const rows   = parseCSV(text);
  const today  = new Date();
  const failed = [];
  const FAILED_STATUSES = new Set(['terminated', 'expired', 'withdrawn']);

  for (const r of rows) {
    const status = (r.Status || '').trim().toLowerCase();
    if (!FAILED_STATUSES.has(status)) continue;
    try {
      const lat  = parseFloat(r.Latitude  || 0);
      const lon  = parseFloat(r.Longitude || 0);
      if (!lat || !lon) continue;

      const sqft = parseFloat(r.SqFtTotal || 0);
      const lp   = parseFloat(r.OriginalListPrice || r.ListPrice || 0);
      if (sqft < 100 || lp < 1000) continue;

      // Use OffMarketDate → ListingContractDate → skip
      const dateStr = (r.OffMarketDate || r.ListingContractDate || '').slice(0, 10);
      if (!dateStr || dateStr.length < 10) continue;
      const offDate  = new Date(dateStr + 'T12:00:00Z');
      const daysAgo  = Math.round((today - offDate) / 86400000);
      if (daysAgo < 0 || daysAgo > 730) continue; // keep up to 2 years, filter tighter in getDeadZone

      const poolRaw  = (r.PoolPrivate      || '').trim().toLowerCase();
      const mpRaw    = (r.MasterPlannedCommunityYN || '').trim().toLowerCase();
      const gatedRaw = (r.Access            || '').trim().toLowerCase();
      const waterRaw = (r.WaterAmenity      || '').trim();
      const newcoRaw = (r.NewConstruction   || '').trim().toLowerCase();
      const subd     = (r.Subdivision   || '').trim();
      const community= (r.CommunityName || '').trim() || subd;

      failed.push({
        mls:       r.MLSNumber || '',
        subd,
        community,
        daysAgo,
        lat,  lon,
        sqft,
        beds:    parseFloat(r.BedsTotal     || 0) || 0,
        baths:   parseFloat(r.BathsTotal    || 0) || 0,
        garage:  parseFloat(r.NoOfGarageCap || 0) || 0,
        stories: parseFloat(r.Stories || '1') || 1.0,
        yr:      parseInt(parseFloat(r.YearBuilt || 0)) || 0,
        pool:    BOOL_VALS.has(poolRaw),
        mp:      BOOL_VALS.has(mpRaw),
        gated:   gatedRaw.includes('gated'),
        water:   !!waterRaw && waterRaw !== '0',
        newco:   BOOL_VALS.has(newcoRaw),
        listPrice: lp,
        dom:     parseInt(r.DOM || 0) || 0,
        status:  (r.Status || '').trim(),
        city:    (r.City || '').trim(),
      });
    } catch (_) { continue; }
  }

  console.log(`MarketIQ: loaded ${failed.length} failed listings from CSV`);
  _failedComps = failed;
  return _failedComps;
}

// ─── DEAD ZONE: find comparable failed listings near subject ──────────────────
function getDeadZone(subject) {
  const failed = loadFailedComps();
  const RADIUS_MI   = 2.0;
  const SQFT_MARGIN = 0.30;   // ±30%
  const MAX_DAYS    = 365;    // last 12 months
  const TOP_N       = 3;

  const sqftLo = subject.sqft * (1 - SQFT_MARGIN);
  const sqftHi = subject.sqft * (1 + SQFT_MARGIN);

  const candidates = [];

  for (const f of failed) {
    // Recency
    if (f.daysAgo > MAX_DAYS) continue;
    // Hard filters — must match subject exactly
    if (!passesHard(f, subject)) continue;
    // Size filter
    if (f.sqft < sqftLo || f.sqft > sqftHi) continue;
    // Distance filter
    const dist = haversine(f.lat, f.lon, subject.lat, subject.lon);
    if (dist > RADIUS_MI) continue;

    // Similarity score (lower = better match)
    let score = dist * 2;
    score += Math.abs(f.sqft - subject.sqft) / Math.max(subject.sqft, 1) * 20;
    score += Math.abs(f.yr   - subject.yr)   * 0.4;
    score += Math.abs(f.beds - subject.beds) * 3;
    if (f.pool !== subject.pool) score += 2;

    candidates.push({ ...f, dist, score });
  }

  if (!candidates.length) return null;

  // Sort by similarity, take top N
  candidates.sort((a, b) => a.score - b.score);
  const top = candidates.slice(0, TOP_N);

  // Price ceiling = highest list price among matched failed comps
  const priceCeiling = Math.max(...top.map(f => f.listPrice));
  const avgDom       = Math.round(top.reduce((s, f) => s + f.dom, 0) / top.length);

  return {
    failedComps: top.map(f => ({
      sqft:       Math.round(f.sqft),
      beds:       f.beds,
      baths:      f.baths,
      stories:    f.stories,
      yr:         f.yr,
      pool:       f.pool,
      listPrice:  f.listPrice,
      dom:        f.dom,
      outcome:    f.status,
      community:  f.community,
      dist:       parseFloat(f.dist.toFixed(2)),
    })),
    priceCeiling,
    failCount:   top.length,
    avgDom,
  };
}

// ─── MEDIAN HELPER ───────────────────────────────────────────────────────────
function median(arr) {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ─── MARKET STATS: real comp-based snapshot ───────────────────────────────────
function getMarketStats(subject) {
  // Market stats measure macro neighborhood health — distance only, no hard-feature filtering
  // (passesHard is too strict for gated/water properties; market conditions are area-wide)
  const RADIUS_MI = 5.0;

  const soldComps = loadSoldComps();   // uses module-level cache
  const nearby = soldComps.filter(c =>
    haversine(c.lat, c.lon, subject.lat, subject.lon) <= RADIUS_MI
  );

  const recent = nearby.filter(c => c.daysAgo <= 90);
  const prior  = nearby.filter(c => c.daysAgo > 90 && c.daysAgo <= 180);

  function bucketStats(comps) {
    if (!comps.length) return null;
    const ppsfs = comps.map(c => c.ppsf);
    const doms  = comps.filter(c => c.dom && parseInt(c.dom) > 0).map(c => parseInt(c.dom));
    const ltss  = comps.filter(c => c.orig && c.orig > c.close * 0.5 && c.orig < c.close * 2)
                       .map(c => c.close / c.orig * 100);
    const fast  = doms.filter(d => d <= 30);
    const sumPpsf = ppsfs.reduce((s, v) => s + v, 0);
    const sumLts  = ltss.reduce((s, v) => s + v, 0);
    return {
      n:               comps.length,
      medPpsf:         parseFloat((median(ppsfs) || 0).toFixed(2)),
      avgPpsf:         parseFloat((sumPpsf / ppsfs.length).toFixed(2)),
      medDom:          doms.length ? Math.round(median(doms)) : null,
      avgDom:          doms.length ? Math.round(doms.reduce((s, v) => s + v, 0) / doms.length) : null,
      avgLts:          ltss.length ? parseFloat((sumLts / ltss.length).toFixed(1)) : null,
      velocityPerMonth:parseFloat((comps.length / 3).toFixed(1)),
      fastPct:         doms.length ? Math.round(fast.length / doms.length * 100) : null,
    };
  }

  let recentStats, priorStats;
  try {
    recentStats = bucketStats(recent);
    priorStats  = bucketStats(prior);
  } catch (buckErr) {
    console.error('getMarketStats bucketStats error:', buckErr.message, buckErr.stack);
    return null;
  }
  if (!recentStats) {
    console.log('getMarketStats: no recent comps (nearby=' + nearby.length + ', recent=' + recent.length + ')');
    return null;
  }

  const ppsfChgPct = priorStats && priorStats.avgPpsf
    ? parseFloat(((recentStats.avgPpsf - priorStats.avgPpsf) / priorStats.avgPpsf * 100).toFixed(1))
    : null;
  const domChgDays = (priorStats && priorStats.medDom && recentStats.medDom)
    ? recentStats.medDom - priorStats.medDom
    : null;
  const ltsChgPts  = (priorStats && priorStats.avgLts && recentStats.avgLts)
    ? parseFloat((recentStats.avgLts - priorStats.avgLts).toFixed(1))
    : null;

  // Listing success rate — sold vs failed in same radius, last 12 months
  const failed12 = loadFailedComps().filter(f =>
    f.daysAgo <= 365 &&
    haversine(f.lat, f.lon, subject.lat, subject.lon) <= RADIUS_MI
  );
  const sold12    = nearby.filter(c => c.daysAgo <= 365);
  const total12   = sold12.length + failed12.length;
  const successRate = total12 ? Math.round(sold12.length / total12 * 100) : null;

  // Market temperature from real data
  const md  = recentStats.medDom;
  const lts = recentStats.avgLts;
  let temp = 'Balanced';
  if      (md !== null && lts !== null && md <= 30 && lts >= 98) temp = 'Hot';
  else if (md !== null && lts !== null && md <= 45 && lts >= 96) temp = 'Warm';
  else if (md !== null && lts !== null && md <= 70 && lts >= 93) temp = 'Balanced';
  else if (md !== null && lts !== null)                           temp = 'Soft';
  else if (md !== null && md <= 30)                               temp = 'Warm';
  else if (md !== null && md <= 60)                               temp = 'Balanced';
  else                                                            temp = 'Soft';

  return {
    recent:       recentStats,
    prior:        priorStats,
    ppsfChgPct,
    domChgDays,
    ltsChgPts,
    successRate,
    failureRate:  successRate !== null ? 100 - successRate : null,
    failedCount:  failed12.length,
    soldCount12:  sold12.length,
    temp,
    radiusMi:     RADIUS_MI,
  };
}

// ─── STORIES PREMIUM ($/sf: 1-story premium over 2-story) ────────────────────
const STORIES_PREMIUM = {
  // League City
  'westland ranch': 29.30,  'hidden lakes': 18.84,     'brittany lakes': 18.16,
  'south shore harbour': 16.53, 'south shore lake': 16.53, 'westover park': 13.86,
  'victory lakes': 13.00,   'magnolia creek': 11.96,   'westwood': 11.04,
  'mar bella': 2.50,        'tuscan lakes': -1.63,
  // Pearland
  'riverstone ranch': 34.45, 'southwyck': 21.55,       'shadow creek ranch': 17.99,
  'silverlake': 10.89,      'southern trails': 10.89,  'ashford cove': 10.89,
  'sedgefield': 10.89,      'lakepointe': 10.89,       'parkside': 10.89,
  'fieldstone village': 10.89, 'shadow grove': 10.89,  'the gardens': 10.89,
  'countryplace': 12.00,    'highland glen': 12.00,
  // Friendswood
  'heritage park': 12.92,   'west ranch': 6.50,
  'avalon at friendswood': 4.56, 'avalon': 4.56,
  // Clear Lake
  'university green': 27.01, 'the reserve at clear lake': 22.04, 'the reserve': 22.04,
  'brookwood': 12.75,       'el dorado clear lake city': 11.97, 'pine brook': 8.14,
  'northfork': 5.02,        'brook forest': 2.16,      'bay oaks': 15.00,
  'middlebrook': 10.00,     'nassau bay': 0.00,
  // Seabrook (77586)
  'mystic village at lake mija': 16.58, 'clear lake forest': 5.45,
};
const DEFAULT_STORIES_PREMIUM = 10.00;

function getStoriesPremium(community) {
  const c = (community || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(STORIES_PREMIUM)) {
    if (c.includes(key) || key.includes(c)) return val;
  }
  return DEFAULT_STORIES_PREMIUM;
}

// ─── HAVERSINE (miles) ────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R    = 3958.8;
  const toR  = d => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ─── HARD FILTERS (never relaxed) ────────────────────────────────────────────
function passesHard(comp, subject) {
  // Hard filters: only block on traits that fundamentally change comparability.
  // mp (master planned) is NOT a hard filter — it's a soft community trait that
  // varies within the same neighborhood and doesn't make homes incomparable.
  // water, gated, newco DO fundamentally change value and buyer pool.
  return comp.newco === subject.newco
      && comp.water === subject.water
      && comp.gated === subject.gated;
}

// ─── SIMILARITY SCORE (lower = more similar) ─────────────────────────────────
function scoreComp(comp, subject) {
  const dist = haversine(comp.lat, comp.lon, subject.lat, subject.lon);
  let pts = dist * 2;  // reduced from 8 — avoids over-penalizing adjacent communities
  pts += Math.abs(comp.sqft  - subject.sqft)  / Math.max(subject.sqft, 1) * 20;
  pts += Math.abs(comp.yr    - subject.yr)    * 0.4;
  pts += Math.abs(comp.beds  - subject.beds)  * 3;
  pts += Math.abs(comp.baths - subject.baths) * 2;
  if (comp.pool !== subject.pool)                       pts += 2;
  if (Math.abs(comp.stories - subject.stories) > 0.5)  pts += 5;
  return pts;
}

// ─── ADJUSTMENTS ──────────────────────────────────────────────────────────────
function adjustPpsf(comp, subject) {
  let adj   = 0;
  const sqft = subject.sqft;
  const notes = [];

  // Pool ($22,500 flat)
  if (comp.pool !== subject.pool) {
    const d = (subject.pool ? 22500 : -22500) / sqft;
    adj += d;
    notes.push(`Pool: ${subject.pool ? '+' : '-'}$22,500`);
  }

  // Stories (community-specific $/sf premium)
  const storyDiff = comp.stories - subject.stories;
  if (Math.abs(storyDiff) > 0.5) {
    const premium = getStoriesPremium(subject.community || subject.subd || '');
    if (Math.abs(premium) >= 3.0) {
      const d = premium * storyDiff;
      adj += d;
      notes.push(`Stories: ${d >= 0 ? '+' : ''}${d.toFixed(2)}/sf`);
    }
  }

  // Bedrooms ($2,500 each)
  const bedDiff = subject.beds - comp.beds;
  if (bedDiff !== 0) {
    const d = bedDiff * 2500 / sqft;
    adj += d;
    notes.push(`Beds: ${d >= 0 ? '+' : ''}${d.toFixed(2)}/sf (${bedDiff > 0 ? '+' : ''}${bedDiff}br)`);
  }

  // Bathrooms ($1,500 full / $750 half)
  const bathDiff = subject.baths - comp.baths;
  if (Math.abs(bathDiff) >= 0.1) {
    const full   = Math.trunc(bathDiff);
    const half   = Math.round((bathDiff - full) / 0.1);
    const dollar = full * 1500 + half * 750;
    const d = dollar / sqft;
    adj += d;
    notes.push(`Baths: ${d >= 0 ? '+' : ''}${d.toFixed(2)}/sf (${bathDiff >= 0 ? '+' : ''}${bathDiff.toFixed(1)}ba)`);
  }

  // Square footage ($37/sf marginal)
  const sqftDiff = subject.sqft - comp.sqft;
  if (sqftDiff !== 0) {
    const d = sqftDiff * 37 / sqft;
    adj += d;
    notes.push(`Sqft: ${d >= 0 ? '+' : ''}${d.toFixed(2)}/sf (${sqftDiff > 0 ? '+' : ''}${Math.round(sqftDiff)}sf)`);
  }

  // Garage ($6,500/stall, capped ±2)
  const garageDiff = (subject.garage || 0) - (comp.garage || 0);
  if (garageDiff !== 0) {
    const stalls = Math.max(-2, Math.min(2, garageDiff));
    const d = stalls * 6500 / sqft;
    adj += d;
    notes.push(`Garage: ${d >= 0 ? '+' : ''}${d.toFixed(2)}/sf (${stalls > 0 ? '+' : ''}${stalls} stall)`);
  }

  return { adjPpsf: comp.ppsf + adj, notes };
}

// ─── INVERSE-SCORE WEIGHTED PPSF (10% floor) ─────────────────────────────────
function weightedPpsf(ppsfVals, scores, floor = 0.10) {
  const raw   = scores.map(s => 1.0 / Math.max(s, 0.001));
  const total = raw.reduce((a, b) => a + b, 0);
  let weights = raw.map(w => w / total);

  for (let iter = 0; iter < 20; iter++) {
    const below = weights.reduce((acc, w, i) => (w < floor ? [...acc, i] : acc), []);
    if (!below.length) break;
    below.forEach(i => { weights[i] = floor; });
    const leftover = 1.0 - below.length * floor;
    const above    = weights.reduce((acc, w, i) => (w > floor ? [...acc, i] : acc), []);
    const atSum    = above.reduce((a, i) => a + weights[i], 0);
    if (atSum > 0) above.forEach(i => { weights[i] = weights[i] / atSum * leftover; });
  }

  const wPpsf = ppsfVals.reduce((a, p, i) => a + p * weights[i], 0);
  return { wPpsf, weights };
}

// ─── THIN MARKET DETECTION ────────────────────────────────────────────────────
function countNearby(subject, sold, maxDist = 4.0, maxDays = 365) {
  return sold.filter(c =>
    c.daysAgo <= maxDays
    && passesHard(c, subject)
    && haversine(c.lat, c.lon, subject.lat, subject.lon) <= maxDist
  ).length;
}

// ─── PHASE RUNNER ─────────────────────────────────────────────────────────────
function runPhase(subject, sold, maxDist, maxDays, tight, adjustments,
                  communityOnly = false, n = 6) {
  const subjCommunity = (subject.community || subject.subd || '').toLowerCase();
  const candidates = [];

  for (const comp of sold) {
    if (comp.daysAgo > maxDays) continue;
    const dist = haversine(subject.lat, subject.lon, comp.lat, comp.lon);
    if (dist > maxDist) continue;

    if (communityOnly) {
      const cc = (comp.community || comp.subd || '').toLowerCase();
      if (cc !== subjCommunity) continue;
    }

    if (tight) {
      if (Math.abs(comp.sqft - subject.sqft) / subject.sqft > 0.20) continue;
      if (Math.abs(comp.yr   - subject.yr)   > 10)                   continue;
      if (comp.beds !== subject.beds)                                 continue;
    }

    if (!passesHard(comp, subject)) continue;

    const sc = scoreComp(comp, subject);
    let adjPpsf, notes;
    if (adjustments) {
      const a = adjustPpsf(comp, subject);
      adjPpsf = a.adjPpsf; notes = a.notes;
    } else {
      adjPpsf = comp.ppsf; notes = [];
    }

    candidates.push({ ...comp, score: sc, adjPpsf, adjNotes: notes, dist });
  }

  candidates.sort((a, b) => a.score - b.score);
  return candidates.slice(0, n);
}

// ─── CMA PHASES ───────────────────────────────────────────────────────────────
// Community phases run first and exhaust all neighborhood options before going outside.
// "tight" = hard filter on sqft/yr/beds; "adj" = adjustments applied for adjustable traits.
// We stay in-community as long as possible — traits we can adjust (sqft, beds, pool, stories)
// should never be a reason to leave the neighborhood.
const BASE_PHASES = [
  { label: 'Ph1: Same community, 90d, tight',  commOnly: true,  maxDist: 2.0, maxDays:  90, tight: true,  adj: false },
  { label: 'Ph2: Same community, 90d, adj',    commOnly: true,  maxDist: 2.0, maxDays:  90, tight: false, adj: true  },
  { label: 'Ph3: Same community, 180d, adj',   commOnly: true,  maxDist: 2.0, maxDays: 180, tight: false, adj: true  },
  { label: 'Ph4: 2mi, 90d, tight',             commOnly: false, maxDist: 2.0, maxDays:  90, tight: true,  adj: false },
  { label: 'Ph5: 2mi, 90d, adj',               commOnly: false, maxDist: 2.0, maxDays:  90, tight: false, adj: true  },
  { label: 'Ph6: 4mi, 180d, adj',              commOnly: false, maxDist: 4.0, maxDays: 180, tight: false, adj: true  },
];
const THIN_PHASE = {
  label: 'Ph6: 4mi, 365d, adj [thin market]', commOnly: false, maxDist: 4.0, maxDays: 365, tight: false, adj: true
};
const THIN_THRESHOLD = 50;
const MIN_COMPS = 3;

// ─── MAIN CMA RUNNER ──────────────────────────────────────────────────────────
function runCma(subject, sold) {
  // Auto-detect community from nearest sold comps when the caller didn't supply one.
  // This is the common case for web-form submissions where the community field is blank.
  if (!subject.community || !subject.community.trim()) {
    // Try progressively wider radii until we find enough nearby comps to vote on community
    const DETECT_RADII = [0.5, 1.0, 1.5];
    let detected = null;
    for (const radius of DETECT_RADII) {
      const nearest = sold
        .filter(c => haversine(c.lat, c.lon, subject.lat, subject.lon) < radius)
        .sort((a, b) => haversine(a.lat, a.lon, subject.lat, subject.lon)
                      - haversine(b.lat, b.lon, subject.lat, subject.lon));
      if (nearest.length >= 3) {
        const freq = {};
        nearest.slice(0, 15).forEach(c => {
          const n = (c.community || '').trim();
          if (n) freq[n] = (freq[n] || 0) + 1;
        });
        const best = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        if (best && best[1] >= 2) { detected = { name: best[0], count: best[1], total: nearest.slice(0,15).length, radius }; break; }
      }
    }
    if (detected) {
      subject = { ...subject, community: detected.name, subd: detected.name };
      console.log('MarketIQ: auto-detected community →', detected.name, '(', detected.count, 'of', detected.total, 'nearest comps, radius='+detected.radius+'mi)');
    }
  }

  const nearby  = countNearby(subject, sold);
  const thin    = nearby < THIN_THRESHOLD;
  const phases  = thin ? [...BASE_PHASES, THIN_PHASE] : [...BASE_PHASES];

  let bestComps = [], bestLabel = '';
  for (const ph of phases) {
    const comps = runPhase(subject, sold, ph.maxDist, ph.maxDays,
                           ph.tight, ph.adj, ph.commOnly);
    if (comps.length >= MIN_COMPS) {
      bestComps = comps; bestLabel = ph.label; break;
    }
  }

  if (!bestComps.length) {
    bestComps = runPhase(subject, sold, 4.0, 365, false, true, false);
    bestLabel = 'Fallback: 4mi/365d';
  }
  if (!bestComps.length) return null;

  // Use only the top 3 scoring comps for the weighted baseline.
  // Fetching 6 candidates then trimming to 3 gives a better pool to score against
  // without diluting accuracy with weaker matches.
  const TOP_N = 3;
  const topComps  = bestComps.slice(0, TOP_N);
  const ppsfVals  = topComps.map(c => c.adjPpsf);
  const scoreVals = topComps.map(c => c.score);
  const { wPpsf, weights } = weightedPpsf(ppsfVals, scoreVals);
  const baseline = wPpsf * subject.sqft;

  return {
    phase:       bestLabel,
    comps:       topComps,
    weights,
    wPpsf,
    baseline,
    compCount:   bestComps.length,
    rangeLow:    Math.min(...ppsfVals),
    rangeHigh:   Math.max(...ppsfVals),
    thinMarket:  thin,
    nearbyComps: nearby,
  };
}

// ─── GEOCODE (Nominatim) ──────────────────────────────────────────────────────
const ZIP_CENTROIDS = {
  '77573': { lat: 29.4953, lon: -95.0941 },
  '77565': { lat: 29.5490, lon: -95.0290 },
  '77546': { lat: 29.5089, lon: -95.2024 },
  '77584': { lat: 29.5675, lon: -95.3225 },
  '77581': { lat: 29.5568, lon: -95.2743 },
  '77089': { lat: 29.6178, lon: -95.2158 },
  '77058': { lat: 29.5651, lon: -95.1168 },
  '77059': { lat: 29.5782, lon: -95.0936 },
  '77062': { lat: 29.5895, lon: -95.1423 },
  '77539': { lat: 29.4511, lon: -95.0586 },
  '77578': { lat: 29.4761, lon: -95.3582 },
  '77583': { lat: 29.4418, lon: -95.3749 },
  '77586': { lat: 29.5656, lon: -95.0207 },
};

async function geocodeAddress(address) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`,
      { headers: { 'User-Agent': 'MarketIQ-CMA/1.0 (phil@philliphimes.com)' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (_) { return null; }
}

// ─── AREA DATA ────────────────────────────────────────────────────────────────
const AREA_DATA = {
  '77573': { city: 'League City',           county: 'Galveston County', district: 'Clear Creek ISD',   flood: 'Most of 77573 is Zone X (minimal risk). Verify specific parcel on FEMA flood map.', market: 'One of the most balanced markets in the Bay Area — steady demand across all price points.' },
  '77565': { city: 'League City',           county: 'Galveston County', district: 'Clear Creek ISD',   flood: 'Mostly Zone X. Verify specific parcel.', market: 'League City waterfront corridor — strong lifestyle buyer demand.' },
  '77546': { city: 'Friendswood', county: 'Galveston/Harris', district: 'Friendswood ISD', flood: 'Friendswood sits on higher ground. Most areas Zone X, lowest flood risk in the Bay Area.', market: 'Friendswood ISD is the #1 demand driver. One of the tightest markets in the region.' },
  '77584': { city: 'Pearland', county: 'Brazoria County', district: 'Pearland ISD', flood: 'Most areas Zone X. Verify specific parcel.', market: 'Master-planned living at accessible price points. Shadow Creek Ranch and Silverlake drive strong resale demand.' },
  '77581': { city: 'Pearland', county: 'Brazoria County', district: 'Pearland ISD', flood: 'Verify flood zone for specific parcel.', market: 'Established Pearland neighborhoods with mature trees and consistent buyer demand.' },
  '77089': { city: 'Houston / Pearland area', county: 'Harris County', district: 'Pasadena/Pearland ISD', flood: 'Verify flood zone carefully. Mixed designations in this ZIP.', market: 'Southeast Houston suburban corridor.' },
  '77058': { city: 'Clear Lake / Houston', county: 'Harris County', district: 'Clear Creek ISD', flood: 'Clear Lake area. Many parcels near water carry AE designation. Verify carefully.', market: 'NASA corridor drives consistent professional buyer demand. Aerospace and medical buyers dominate.' },
  '77059': { city: 'Clear Lake / Houston', county: 'Harris County', district: 'Clear Creek ISD', flood: 'Verify flood zone. Proximity to Clear Lake varies by parcel.', market: 'Bay Oaks, Bay Forest. Some of the most established neighborhoods in the Houston Bay Area.' },
  '77062': { city: 'Clear Lake / Houston', county: 'Harris County', district: 'Clear Creek ISD', flood: 'Verify flood zone carefully.', market: 'Taylor Lake Village corridor. Waterfront access drives premium pricing.' },
  '77539': { city: 'Dickinson', county: 'Galveston County', district: 'Dickinson ISD', flood: 'Galveston County coastal area. Flood zones vary significantly. Verify each parcel carefully.', market: 'Affordable Galveston County access. Bay Colony and Lago Mar drive newer buyer interest.' },
  '77510': { city: 'Santa Fe', county: 'Galveston County', district: 'Santa Fe ISD', flood: 'Verify flood zone. Coastal county, varies by location.', market: 'Rural Galveston County. Larger lots, country feel.' },
  '77578': { city: 'Manvel', county: 'Brazoria County', district: 'Alvin ISD', flood: 'Most areas Zone X. Some low-lying areas vary.', market: 'One of the fastest-growing markets in Brazoria County. Meridiana, Pomona, and Rodeo Palms drive strong new buyer traffic.' },
  '77583': { city: 'Iowa Colony / Manvel', county: 'Brazoria County', district: 'Alvin ISD', flood: 'Mostly Zone X. Verify.', market: 'Iowa Colony growth corridor. New construction at accessible prices.' },
  '77568': { city: 'La Marque', county: 'Galveston County', district: 'La Marque ISD', flood: 'Coastal county. Verify flood zone carefully.', market: 'Galveston County growth corridor near I-45.' },
  '77590': { city: 'Texas City', county: 'Galveston County', district: 'Texas City ISD', flood: 'Texas City area. Verify flood zone carefully.', market: 'Galveston County industrial/residential corridor.' },
  '77586': { city: 'Seabrook', county: 'Harris County', district: 'Clear Creek ISD', flood: 'Seabrook sits on Galveston Bay. Many parcels carry AE or VE flood designations. Verify every parcel carefully.', market: 'Waterfront community feel with Clear Creek ISD schools. Strong buyer demand for canal and bay-access properties.' },
};

function getAreaData(zip) {
  return AREA_DATA[zip] || {
    city:     'South Houston Area',
    county:   'Verify',
    district: 'Verify with listing agent',
    flood:    'Verify flood zone on FEMA flood map for specific parcel.',
    market:   'South Houston suburban market. Strong long-term demand fundamentals.',
  };
}

// --- ANTHROPIC API -----------------------------------------------------------
async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!res.ok) throw new Error('Anthropic API error ' + res.status + ': ' + (await res.text()));
  const data = await res.json();
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
}

function extractJSON(raw) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : raw.trim();
}

// --- FORMAT CMA FOR CLAUDE ---------------------------------------------------
function buildCompContext(cma) {
  if (!cma) return '';
  const b = cma.baseline;
  const priceMkt  = Math.round(b / 5000) * 5000;
  const priceLow  = Math.round(b * 0.975 / 5000) * 5000;
  const priceHigh = Math.round(b * 1.025 / 5000) * 5000;

  const lines = [
    'COMP ENGINE RESULTS -- use these EXACT numbers in your pricing strategies (do not substitute):',
    '  Weighted PPSF:        $' + cma.wPpsf.toFixed(2) + '/sf  (' + cma.compCount + ' comps, ' + cma.phase + ')',
    '  Baseline value:       $' + Math.round(b).toLocaleString(),
    '  Price to Move (-2.5%):$' + priceLow.toLocaleString(),
    '  Price to Sell (mkt):  $' + priceMkt.toLocaleString(),
    '  Price to Test (+2.5%):$' + priceHigh.toLocaleString(),
    '  Adj $/sf range:       $' + cma.rangeLow.toFixed(2) + ' -- $' + cma.rangeHigh.toFixed(2) + '/sf',
    cma.thinMarket ? '  WARNING: THIN MARKET -- only ' + cma.nearbyComps + ' nearby comps. Wider confidence range.' : null,
    '',
    'COMPARABLE SALES USED (' + cma.compCount + '):',
  ];

  cma.comps.slice(0, 6).forEach(function(c, i) {
    var wt = cma.weights[i] != null ? ' | Wt ' + (cma.weights[i] * 100).toFixed(1) + '%' : '';
    lines.push(
      '  ' + (i + 1) + '. ' + (c.community || c.subd) +
      ' | Sold $' + Math.round(c.net).toLocaleString() +
      ' | ' + Math.round(c.sqft).toLocaleString() + 'sf' +
      ' | ' + c.beds + 'bd/' + c.baths + 'ba' +
      ' | ' + (c.pool ? 'Pool' : 'No Pool') +
      ' | ' + c.stories + '-story | Built ' + c.yr +
      ' | $' + c.ppsf.toFixed(2) + '/sf raw -> $' + c.adjPpsf.toFixed(2) + '/sf adj' + wt +
      ' | ' + c.daysAgo + 'd ago | ' + c.dist.toFixed(1) + 'mi'
    );
    if (c.adjNotes && c.adjNotes.length) {
      lines.push('     Adjustments: ' + c.adjNotes.join(' | '));
    }
  });

  return lines.filter(function(l) { return l !== null; }).join('\n');
}

// --- MAIN HANDLER ------------------------------------------------------------
exports.handler = async function(event) {
  try {
    return await _handlerInner(event);
  } catch (fatalErr) {
    console.error('MarketIQ FATAL:', fatalErr.message, fatalErr.stack);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Server error: ' + fatalErr.message }) };
  }
};

async function _handlerInner(event) {
  var headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: Object.assign({}, headers, {
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }),
      body: '',
    };
  }
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers: headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  if (!ANTHROPIC_API_KEY)
    return { statusCode: 500, headers: headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };

  var body;
  try { body = JSON.parse(event.body); }
  catch (_) { return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  var address   = body.address;
  var mode      = body.mode      || 'seller';
  var beds      = body.beds      || 4;
  var baths     = body.baths     || 2.5;
  var sqft      = body.sqft;
  var condition = body.condition || 'Updated';
  var timeline  = body.timeline  || '1-3 months';
  var budget    = body.budget;
  var listPrice = body.listPrice ? parseFloat(String(body.listPrice).replace(/[$,]/g, '')) : 0;
  var reqLat    = body.lat;
  var reqLon    = body.lon;
  var stories   = body.stories   || 1.0;
  var yr        = body.yr        || 2005;
  var pool      = body.pool      || false;
  var garage    = body.garage    || 2;
  var community = body.community || '';
  var mp        = body.mp        || false;
  var gated     = body.gated     || false;
  var water     = body.water     || false;
  var newco     = body.newco     || false;

  if (!address)
    return { statusCode: 400, headers: headers, body: JSON.stringify({ error: 'Address required' }) };

  var zipMatch = address.match(/\b(7[0-9]{4})\b/);
  var zip      = zipMatch ? zipMatch[1] : '77573';
  var area     = getAreaData(zip);
  var isSeller = mode === 'seller';
  var today    = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Resolve lat/lon
  var lat = reqLat ? parseFloat(reqLat) : 0;
  var lon = reqLon ? parseFloat(reqLon) : 0;

  if (!lat || !lon) {
    var geo = await geocodeAddress(address);
    if (geo) { lat = geo.lat; lon = geo.lon; }
  }
  if (!lat || !lon) {
    var cent = ZIP_CENTROIDS[zip];
    if (cent) { lat = cent.lat; lon = cent.lon; }
  }

  // Run CMA + dead zone
  var cma         = null;
  var deadZone    = null;
  var marketStats = null;
  var compContext = '';

  // Market stats only need lat/lon — run whenever we have coordinates
  if (lat && lon) {
    try {
      marketStats = getMarketStats({ lat: lat, lon: lon });
      console.log('MarketIQ market stats: temp=' + (marketStats ? marketStats.temp : 'n/a') + ', medDom=' + (marketStats ? (marketStats.recent && marketStats.recent.medDom) : 'n/a'));
    } catch (e) {
      console.error('Market stats error:', e.message);
    }
  }

  // CMA + dead zone require sqft as well
  if (lat && lon && sqft && parseFloat(sqft) > 100) {
    var toBool = function(v) { return v === true || v === 'true' || v === '1' || v === 'yes'; };
    var subject = {
      lat:       lat,
      lon:       lon,
      sqft:      parseFloat(sqft),
      beds:      parseFloat(beds)    || 4,
      baths:     parseFloat(baths)   || 2.5,
      stories:   parseFloat(stories) || 1.0,
      yr:        parseInt(yr)        || 2005,
      pool:      toBool(pool),
      garage:    parseFloat(garage)  || 2,
      community: (community || '').trim(),
      subd:      (community || '').trim(),
      mp:        toBool(mp),
      gated:     toBool(gated),
      water:     toBool(water),
      newco:     toBool(newco),
    };

    try {
      var sold = loadSoldComps();
      cma = runCma(subject, sold);
      if (cma) compContext = buildCompContext(cma);
      console.log('MarketIQ CMA: ' + (cma ? cma.compCount + ' comps, phase=' + cma.phase : 'no result'));
    } catch (e) {
      console.error('CMA error:', e.message);
    }

    try {
      deadZone = getDeadZone(subject);
      console.log('MarketIQ dead zone: ' + (deadZone ? deadZone.failCount + ' failed comps, ceiling=$' + deadZone.priceCeiling : 'none found'));
    } catch (e) {
      console.error('Dead zone error:', e.message);
    }

  } else if (!lat || !lon) {
    console.log('MarketIQ: skipping CMA -- missing lat/lon');
  } else {
    console.log('MarketIQ: skipping CMA -- missing sqft');
  }

  var hasCompData = !!cma;

  var priceLow  = cma ? (Math.round(cma.baseline * 0.975 / 5000) * 5000) : 0;
  var priceMkt  = cma ? (Math.round(cma.baseline / 5000) * 5000)          : 0;
  var priceHigh = cma ? (Math.round(cma.baseline * 1.025 / 5000) * 5000)  : 0;

  // ── BUYER: verdict + offer range ──────────────────────────────────
  var verdict = null, verdictPct = 0, offerRangeLow = 0, offerRangeHigh = 0, urgencyScore = 50;
  if (!isSeller && cma && listPrice > 0) {
    var diff = (listPrice - cma.baseline) / cma.baseline;
    verdictPct = Math.round(diff * 100);
    verdict = diff > 0.04 ? 'above' : diff < -0.04 ? 'below' : 'fair';

    // Urgency: based on DOM + market temp
    var domNow = marketStats && marketStats.recent && marketStats.recent.medDom != null
      ? marketStats.recent.medDom : 30;
    var temp = marketStats ? marketStats.temp : 'Balanced';
    if (temp === 'Hot')           urgencyScore = 80;
    else if (temp === 'Warm')     urgencyScore = 60;
    else if (temp === 'Balanced') urgencyScore = 40;
    else                          urgencyScore = 20;
    if (domNow < 15) urgencyScore = Math.min(urgencyScore + 20, 95);
    if (domNow > 45) urgencyScore = Math.max(urgencyScore - 20, 10);

    // Offer range: anchored to CMA baseline
    var discountLow, discountHigh;
    if (urgencyScore >= 70)      { discountLow = 0.00; discountHigh = 0.01; }
    else if (urgencyScore >= 50) { discountLow = 0.01; discountHigh = 0.025; }
    else if (urgencyScore >= 30) { discountLow = 0.02; discountHigh = 0.04; }
    else                         { discountLow = 0.03; discountHigh = 0.06; }

    offerRangeLow  = Math.round(cma.baseline * (1 - discountHigh) / 1000) * 1000;
    offerRangeHigh = Math.round(cma.baseline * (1 - discountLow)  / 1000) * 1000;
    // If market value > list price, it's a deal — offer near list
    if (cma.baseline > listPrice) {
      offerRangeLow  = Math.round(listPrice * 0.985 / 1000) * 1000;
      offerRangeHigh = listPrice;
    }
  }

  // System prompt
  var systemPrompt = 'You are MarketIQ(tm), a real estate pricing strategy AI built for Phillip Himes, REALTOR(r) at eXp Realty. You serve the South Houston suburbs: League City, Friendswood, Pearland, Clear Lake, Dickinson, and Manvel.\n\n' +
    'CURRENT DATE: ' + today + '\n' +
    'PROPERTY/AREA: ' + address + '\n' +
    'NEIGHBORHOOD CONTEXT:\n' +
    '- City: ' + area.city + '\n' +
    '- School District: ' + area.district + '\n' +
    '- County: ' + area.county + '\n' +
    '- Market Character: ' + area.market + '\n\n' +
    'CRITICAL RULES:\n' +
    '1. Output ONLY valid JSON -- no markdown, no explanation, no code fences, no intro text.\n' +
    '2. Generate SPECIFIC price points -- never vague ranges. Pick one number.\n' +
    '3. Be direct and confident. No hedging. No disclaimers.\n' +
    '4. Every text value must be a plain string -- no markdown formatting inside strings.\n' +
    '5. Keep all text values short and scannable -- bullet text max 15 words.\n' +
    (hasCompData
      ? '6. REAL COMP DATA IS PROVIDED. The prices in the comp engine block are AUTHORITATIVE -- copy them exactly into your pricing strategies. Do not substitute your own price estimates.'
      : '6. No comp data available -- use your knowledge of ' + area.city + ' (' + area.district + ') market conditions to estimate realistic prices.');

  var compBlock = hasCompData
    ? '\n\n--- MARKETIQ COMP ENGINE DATA ---\n' + compContext + '\n--- END COMP DATA ---\n'
    : '';

  // Build market stats block for Claude prompt
  var statsBlock = '';
  if (marketStats) {
    var ms = marketStats;
    var r  = ms.recent;
    var tempLabel = ms.temp === 'Hot' ? "Seller's Market" : ms.temp === 'Warm' ? "Seller's Market (Cooling)" : ms.temp === 'Balanced' ? 'Balanced Market' : "Buyer's Market";
    statsBlock =
      '\n\n--- MARKET CONTEXT (for snapshot summary only — DO NOT use for pricing) ---\n' +
      'Market Temperature: ' + ms.temp + ' (' + tempLabel + ')\n' +
      'Median Days on Market: ' + (r.medDom !== null ? r.medDom + ' days' : 'n/a') +
        (ms.domChgDays !== null ? ' (' + (ms.domChgDays > 0 ? '+' : '') + ms.domChgDays + ' vs prior 90d)' : '') + '\n' +
      'Avg List-to-Sale Ratio: ' + (r.avgLts !== null ? r.avgLts.toFixed(1) + '%' : 'n/a') +
        (ms.ltsChgPts !== null ? ' (' + (ms.ltsChgPts > 0 ? '+' : '') + ms.ltsChgPts + 'pts vs prior 90d)' : '') + '\n' +
      'Sales Velocity: ' + r.velocityPerMonth + ' homes/month\n' +
      'Fast Sales (≤30 days): ' + (r.fastPct !== null ? r.fastPct + '%' : 'n/a') + ' of sales\n' +
      'Listing Success Rate: ' + (ms.successRate !== null ? ms.successRate + '%' : 'n/a') + ' of listings sold in 12mo\n' +
      'CRITICAL: These are broad area stats. For pricing strategy prices, use ONLY the comp engine data above.\n' +
      '--- END MARKET CONTEXT ---\n';
  }

  var userPrompt;
  if (isSeller) {
    var snapDom = marketStats && marketStats.recent && marketStats.recent.medDom != null
      ? marketStats.recent.medDom + ' days'
      : (area.city + ' market estimate');
    var snapLts = marketStats && marketStats.recent && marketStats.recent.avgLts != null
      ? marketStats.recent.avgLts.toFixed(1) + '%'
      : 'market estimate';
    var snapInventory = marketStats ? (marketStats.temp === 'Hot' || marketStats.temp === 'Warm' ? 'Low' : marketStats.temp === 'Balanced' ? 'Balanced' : 'High') : 'Low / Balanced / High';
    var snapMarket    = marketStats ? (marketStats.temp === 'Hot' ? "Seller's Market" : marketStats.temp === 'Warm' ? "Seller's Market (Cooling)" : marketStats.temp === 'Balanced' ? 'Balanced Market' : "Buyer's Market") : 'Sellers / Balanced / Buyers';
    userPrompt =
      'Generate a MarketIQ(tm) Seller Pricing Report for this property:\n\n' +
      'Address: ' + address + '\n' +
      'Bedrooms: ' + beds + ' | Bathrooms: ' + baths + ' | Square Feet: ' + (sqft || 'not provided') + '\n' +
      'Stories: ' + stories + ' | Year Built: ' + yr + ' | Pool: ' + (pool ? 'Yes' : 'No') + ' | Garage: ' + garage + ' cars\n' +
      'Community: ' + (community || 'not specified') + ' | Master Planned: ' + (mp ? 'Yes' : 'No') + '\n' +
      'Condition: ' + condition + ' | Timeline: ' + timeline + '\n' +
      'School District: ' + area.district + '\n' +
      compBlock + statsBlock + '\n' +
      'Return ONLY this JSON structure -- no other text:\n\n' +
      '{\n' +
      '  "snapshot": {\n' +
      '    "dom": "' + snapDom + '",\n' +
      '    "listToSale": "' + snapLts + '",\n' +
      '    "inventory": "' + snapInventory + '",\n' +
      '    "market": "' + snapMarket + '",\n' +
      '    "summary": "One punchy sentence max 20 words what this market means for this seller"\n' +
      '  },\n' +
      '  "strategies": [\n' +
      '    {\n' +
      '      "name": "Price to Move",\n' +
      '      "price": "' + (hasCompData ? '$' + priceLow.toLocaleString() : '$[your estimate]') + '",\n' +
      '      "row1": { "label": "Expect", "text": "what happens in week 1 max 12 words" },\n' +
      '      "row2": { "label": "Best for", "text": "who this strategy is for max 10 words" },\n' +
      '      "row3": { "label": "Risk", "text": "one specific downside max 12 words" }\n' +
      '    },\n' +
      '    {\n' +
      '      "name": "Price to Sell",\n' +
      '      "price": "' + (hasCompData ? '$' + priceMkt.toLocaleString() : '$[your estimate]') + '",\n' +
      '      "row1": { "label": "Expect", "text": "what happens max 12 words" },\n' +
      '      "row2": { "label": "Best for", "text": "who max 10 words" },\n' +
      '      "row3": { "label": "Risk", "text": "downside max 12 words" }\n' +
      '    },\n' +
      '    {\n' +
      '      "name": "Price to Test",\n' +
      '      "price": "' + (hasCompData ? '$' + priceHigh.toLocaleString() : '$[your estimate]') + '",\n' +
      '      "row1": { "label": "Expect", "text": "what happens max 12 words" },\n' +
      '      "row2": { "label": "Best for", "text": "who max 10 words" },\n' +
      '      "row3": { "label": "Risk", "text": "downside max 12 words" }\n' +
      '    }\n' +
      '  ],\n' +
      '  "factors": [\n' +
      '    { "emoji": "checkmark", "label": "Factor name", "text": "One plain-language sentence max 15 words" },\n' +
      '    { "emoji": "checkmark", "label": "Factor name", "text": "One sentence" },\n' +
      '    { "emoji": "warning", "label": "Factor name", "text": "One sentence" }\n' +
      '  ],\n' +
      '  "cantTell": "Two sentences max. What Phils in-person walkthrough covers that this tool cannot. End with a line about booking a call with Phil."\n' +
      '}';
  } else {
    var buyerSnapDom = marketStats && marketStats.recent && marketStats.recent.medDom != null
      ? marketStats.recent.medDom + ' days' : (area.city + ' market estimate');
    var buyerSnapLts = marketStats && marketStats.recent && marketStats.recent.avgLts != null
      ? marketStats.recent.avgLts.toFixed(1) + '%' : 'market estimate';
    var buyerSnapInventory = marketStats ? (marketStats.temp === 'Hot' || marketStats.temp === 'Warm' ? 'Low' : marketStats.temp === 'Balanced' ? 'Balanced' : 'High') : 'Balanced';
    var buyerSnapMarket    = marketStats ? (marketStats.temp === 'Hot' ? "Seller's Market" : marketStats.temp === 'Warm' ? "Seller's Market (Cooling)" : marketStats.temp === 'Balanced' ? 'Balanced Market' : "Buyer's Market") : 'Balanced Market';

    var verdictContext = verdict
      ? 'Pricing verdict: ' + (verdict === 'above' ? verdictPct + '% above market value' : verdict === 'below' ? Math.abs(verdictPct) + '% below market — potential deal' : 'fairly priced at market') + '\n'
      : '';
    var offerContext = offerRangeLow
      ? 'Data-based offer range: $' + offerRangeLow.toLocaleString() + ' – $' + offerRangeHigh.toLocaleString() + '\n'
      : '';

    userPrompt =
      'Generate a MarketIQ(tm) Buyer Offer Analysis for this specific property:\n\n' +
      'Address: ' + address + '\n' +
      'List Price: $' + (listPrice ? listPrice.toLocaleString() : 'not provided') + '\n' +
      'Property: ' + beds + ' bed / ' + baths + ' bath / ' + (sqft || 'unknown') + ' sf / ' + (pool ? 'Pool' : 'No pool') + '\n' +
      'School District: ' + area.district + '\n' +
      verdictContext + offerContext +
      compBlock + statsBlock + '\n' +
      'Return ONLY this JSON -- no markdown, no code fences:\n\n' +
      '{\n' +
      '  "snapshot": {\n' +
      '    "dom": "' + buyerSnapDom + '",\n' +
      '    "listToSale": "' + buyerSnapLts + '",\n' +
      '    "inventory": "' + buyerSnapInventory + '",\n' +
      '    "market": "' + buyerSnapMarket + '",\n' +
      '    "summary": "One punchy sentence max 20 words — what a buyer needs to know about this market right now"\n' +
      '  },\n' +
      '  "signals": [\n' +
      '    { "type": "positive OR caution OR warning", "text": "specific market signal relevant to this buyer max 15 words" },\n' +
      '    { "type": "positive OR caution OR warning", "text": "another signal max 15 words" },\n' +
      '    { "type": "positive OR caution OR warning", "text": "another signal max 15 words" },\n' +
      '    { "type": "positive OR caution OR warning", "text": "another signal max 15 words" }\n' +
      '  ],\n' +
      '  "strategies": [\n' +
      '    {\n' +
      '      "name": "Win It",\n' +
      '      "price": "' + (offerRangeHigh ? '$' + (offerRangeHigh + 5000).toLocaleString() + '+' : '$[above market]') + '",\n' +
      '      "row1": { "label": "When to use", "text": "hot competition or must-have home max 12 words" },\n' +
      '      "row2": { "label": "Include",     "text": "escalation clause, short option period max 12 words" },\n' +
      '      "row3": { "label": "Risk",        "text": "may overpay if no competing offers max 10 words" }\n' +
      '    },\n' +
      '    {\n' +
      '      "name": "Market Offer",\n' +
      '      "price": "' + (offerRangeHigh ? '$' + offerRangeHigh.toLocaleString() : '$[market value]') + '",\n' +
      '      "row1": { "label": "When to use", "text": "moderate competition, strong terms win max 12 words" },\n' +
      '      "row2": { "label": "Include",     "text": "standard contingencies, flexible close date max 12 words" },\n' +
      '      "row3": { "label": "Risk",        "text": "may lose in multi-offer situation max 10 words" }\n' +
      '    },\n' +
      '    {\n' +
      '      "name": "Negotiate",\n' +
      '      "price": "' + (offerRangeLow ? '$' + offerRangeLow.toLocaleString() : '$[below list]') + '",\n' +
      '      "row1": { "label": "When to use", "text": "property sitting or overpriced max 12 words" },\n' +
      '      "row2": { "label": "Include",     "text": "standard contingencies, request closing cost help max 12 words" },\n' +
      '      "row3": { "label": "Risk",        "text": "seller may reject if anchored to list price max 10 words" }\n' +
      '    }\n' +
      '  ],\n' +
      '  "cantTell": "Two sentences. What an in-person walkthrough reveals about value that this data cannot show. End with a call to schedule with Phil."\n' +
      '}';
  }

  // Call Claude
  var claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!claudeRes.ok) {
    var errText = await claudeRes.text();
    console.error('Claude API error:', claudeRes.status, errText);
    return { statusCode: 502, headers: headers, body: JSON.stringify({ error: 'Claude API error: ' + claudeRes.status }) };
  }

  var claudeData = await claudeRes.json();
  var rawText    = (claudeData.content && claudeData.content[0] && claudeData.content[0].text) || '';

  var jsonMatch = rawText.match(/\{[\s\S]*\}/);
  var report    = null;
  if (jsonMatch) {
    try { report = JSON.parse(jsonMatch[0]); } catch (_) { report = null; }
  }

  var comps = cma ? cma.comps.slice(0, 5).map(function(c) {
    return {
      mls:       c.mls,
      community: c.community,
      sqft:      Math.round(c.sqft),
      beds:      c.beds,
      baths:     c.baths,
      yr:        c.yr,
      pool:      c.pool,
      close:     Math.round(c.close),
      net:       Math.round(c.net),
      ppsf:      parseFloat(c.ppsf.toFixed(2)),
      adjPpsf:   parseFloat(c.adjPpsf.toFixed(2)),
      daysAgo:   c.daysAgo,
      dom:       c.dom,
      dist:      parseFloat(c.dist.toFixed(2)),
      score:     parseFloat(c.score.toFixed(2)),
      adjNotes:  c.adjNotes || [],
    };
  }) : [];

  // ── BUYER PAYLOAD ────────────────────────────────────────────────────────
  var buyerPayload = !isSeller ? {
    verdict:         verdict,
    verdictPct:      verdictPct,
    listPrice:       listPrice,
    marketValueLow:  priceLow,
    marketValueHigh: priceHigh,
    offerRangeLow:   offerRangeLow,
    offerRangeHigh:  offerRangeHigh,
    urgencyScore:    urgencyScore,
  } : null;

  var cmaData = cma ? {
    baseline:       Math.round(cma.baseline),
    low:            Math.round(cma.baseline * 0.975 / 5000) * 5000,
    high:           Math.round(cma.baseline * 1.025 / 5000) * 5000,
    wPpsf:          parseFloat(cma.wPpsf.toFixed(2)),
    phase:          cma.phase,
    comps:          comps,
  } : null;

  return {
    statusCode: 200,
    headers:    headers,
    body:       JSON.stringify({
      report:      report,
      area:        area,
      zip:         zip,
      mode:        mode,
      comps:       comps,
      cma:         cmaData,
      deadZone:    deadZone,
      marketStats: marketStats,
      buyer:       buyerPayload,
      _debug:      { lat: lat, lon: lon, soldCompsLoaded: loadSoldComps().length },
    }),
  };
}
