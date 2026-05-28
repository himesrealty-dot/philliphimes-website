// MarketIQ™ Stats — Lightweight market snapshot for TruMarket™ widget
// No Claude call — reads MLS CSV directly and returns computed stats
// POST { lat, lon }  →  { neighborhood, avgPrice, medDom, avgLts, activeEstimate, soldLast90, temp, tempLabel }

'use strict';

const fs   = require('fs');
const path = require('path');

// Same CSV path logic as marketiq-ai.js
const DATA_PATH = process.env.LAMBDA_TASK_ROOT
  ? path.join(process.env.LAMBDA_TASK_ROOT, 'data/MarketIQ.csv')
  : path.join(__dirname, '../../data/MarketIQ.csv');

const BOOL_VALS = new Set(['true', 'yes', '1', 'y']);

// Module-level cache — persists across warm Lambda invocations
let _soldComps   = null;
let _failedComps = null;

// ─── CSV PARSER (no npm deps) ─────────────────────────────────────────────────
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
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

// ─── HAVERSINE (miles) ────────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R   = 3958.8;
  const toR = d => d * Math.PI / 180;
  const dLat = toR(lat2 - lat1);
  const dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── MEDIAN ───────────────────────────────────────────────────────────────────
function median(arr) {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ─── LOAD SOLD COMPS ──────────────────────────────────────────────────────────
function loadSoldComps() {
  if (_soldComps) return _soldComps;

  let text;
  try { text = fs.readFileSync(DATA_PATH, 'utf-8'); }
  catch (e) {
    console.error('marketiq-stats: cannot read CSV:', e.message);
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
      const net = close - conc;

      const subd      = (r.Subdivision   || '').trim();
      const community = (r.CommunityName || '').trim() || subd;
      const poolRaw   = (r.PoolPrivate   || '').trim().toLowerCase();

      sold.push({
        daysAgo,
        lat, lon,
        close,
        net,
        orig:      parseFloat(r.OriginalListPrice || r.ListPrice || 0) || 0,
        dom:       r.DOM || '',
        city:      (r.City || '').trim(),
        subd,
        community,
        pool:      BOOL_VALS.has(poolRaw),
      });
    } catch (_) { continue; }
  }

  console.log(`marketiq-stats: loaded ${sold.length} sold comps`);
  _soldComps = sold;
  return _soldComps;
}

// ─── LOAD FAILED LISTINGS ─────────────────────────────────────────────────────
function loadFailedComps() {
  if (_failedComps) return _failedComps;

  let text;
  try { text = fs.readFileSync(DATA_PATH, 'utf-8'); }
  catch (e) { _failedComps = []; return _failedComps; }

  const rows   = parseCSV(text);
  const today  = new Date();
  const failed = [];
  const FAILED = new Set(['terminated', 'expired', 'withdrawn']);

  for (const r of rows) {
    if (!FAILED.has((r.Status || '').trim().toLowerCase())) continue;
    try {
      const lat = parseFloat(r.Latitude  || 0);
      const lon = parseFloat(r.Longitude || 0);
      if (!lat || !lon) continue;

      const dateStr = (r.OffMarketDate || r.ListingContractDate || '').slice(0, 10);
      if (!dateStr || dateStr.length < 10) continue;
      const offDate = new Date(dateStr + 'T12:00:00Z');
      const daysAgo = Math.round((today - offDate) / 86400000);
      if (daysAgo < 0 || daysAgo > 730) continue;

      failed.push({ lat, lon, daysAgo });
    } catch (_) { continue; }
  }

  _failedComps = failed;
  return _failedComps;
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
function fmtPrice(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return '$' + Math.round(n / 1000) + 'K';
  return '$' + Math.round(n);
}

function fmtPct(n) {
  return n.toFixed(1) + '%';
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { body = {}; }

  const lat = parseFloat(body.lat);
  const lon = parseFloat(body.lon);

  if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'lat and lon are required' }),
    };
  }

  const RADIUS_MI = 5.0;

  const soldComps   = loadSoldComps();
  const failedComps = loadFailedComps();

  // All nearby sold
  const nearby = soldComps.filter(c =>
    haversine(c.lat, c.lon, lat, lon) <= RADIUS_MI
  );

  // 90-day sold (TruMarket window)
  const recent = nearby.filter(c => c.daysAgo <= 90);

  if (!recent.length) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        error: 'no_comps',
        message: 'No recent sold comps found within 5 miles',
      }),
    };
  }

  // ── Avg close price ──────────────────────────────────────────────────────────
  const avgClose = recent.reduce((s, c) => s + c.close, 0) / recent.length;

  // ── Median DOM ───────────────────────────────────────────────────────────────
  const doms   = recent.filter(c => c.dom && parseInt(c.dom) > 0).map(c => parseInt(c.dom));
  const medDom = doms.length ? Math.round(median(doms)) : null;

  // ── Avg list-to-sale ratio ───────────────────────────────────────────────────
  const ltsList = recent
    .filter(c => c.orig && c.orig > c.close * 0.5 && c.orig < c.close * 2)
    .map(c => c.close / c.orig * 100);
  const avgLts = ltsList.length
    ? ltsList.reduce((s, v) => s + v, 0) / ltsList.length
    : null;

  // ── Active estimate: velocity × (medDom / 30) ────────────────────────────────
  const velocityPerMonth = recent.length / 3;
  const activeEstimate   = medDom
    ? Math.max(1, Math.round(velocityPerMonth * (medDom / 30)))
    : Math.max(1, Math.round(velocityPerMonth));

  // ── Listing success rate ──────────────────────────────────────────────────────
  const sold12   = nearby.filter(c => c.daysAgo <= 365);
  const failed12 = failedComps.filter(f =>
    f.daysAgo <= 365 &&
    haversine(f.lat, f.lon, lat, lon) <= RADIUS_MI
  );
  const total12      = sold12.length + failed12.length;
  const successRate  = total12 ? Math.round(sold12.length / total12 * 100) : null;

  // ── Market temperature ───────────────────────────────────────────────────────
  const md  = medDom;
  const lts = avgLts;
  let temp;
  if      (md !== null && lts !== null && md <= 30 && lts >= 98) temp = 'Hot';
  else if (md !== null && lts !== null && md <= 45 && lts >= 96) temp = 'Warm';
  else if (md !== null && lts !== null && md <= 70 && lts >= 93) temp = 'Balanced';
  else if (md !== null && lts !== null)                           temp = 'Soft';
  else if (md !== null && md <= 30)                               temp = 'Warm';
  else if (md !== null && md <= 60)                               temp = 'Balanced';
  else                                                            temp = 'Balanced';

  const tempLabel =
    temp === 'Hot'      ? "Seller's Market" :
    temp === 'Warm'     ? "Seller's Market" :
    temp === 'Balanced' ? 'Balanced Market' : "Buyer's Market";

  // ── Neighborhood name — most frequent community among recent nearby comps ─────
  const commCounts = {};
  for (const c of recent) {
    const name = c.community || c.subd || '';
    if (name && name.length > 2) {
      commCounts[name] = (commCounts[name] || 0) + 1;
    }
  }
  let neighborhood = '';
  if (Object.keys(commCounts).length) {
    neighborhood = Object.entries(commCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
  }
  // If community name is very generic or missing, fall back to most common city
  if (!neighborhood || neighborhood.length < 3) {
    const cityCounts = {};
    for (const c of recent) {
      const cy = c.city || '';
      if (cy) cityCounts[cy] = (cityCounts[cy] || 0) + 1;
    }
    if (Object.keys(cityCounts).length) {
      neighborhood = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])[0][0] + ', TX';
    }
  }
  if (!neighborhood) neighborhood = 'Your Area';

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      neighborhood,
      avgPrice:       fmtPrice(avgClose),
      medDom:         medDom !== null ? String(medDom) : '—',
      avgLts:         avgLts !== null ? fmtPct(avgLts) : '—',
      activeEstimate: String(activeEstimate),
      soldLast90:     String(recent.length),
      temp,
      tempLabel,
      successRate,
      _debug: {
        recentCount: recent.length,
        nearbyCount: nearby.length,
        radiusMi:    RADIUS_MI,
      },
    }),
  };
};
