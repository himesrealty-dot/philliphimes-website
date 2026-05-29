// reLifeIQ™ — Home Value Estimator
// GET /.netlify/functions/home-value?address=...
// 1) Tries Rentcast AVM (if RENTCAST_API_KEY is set and works)
// 2) Falls back: geocodes address via Mapbox → uses MLS CSV comps nearby

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_PATH = process.env.LAMBDA_TASK_ROOT
  ? path.join(process.env.LAMBDA_TASK_ROOT, 'data/MarketIQ.csv')
  : path.join(__dirname, '../../data/MarketIQ.csv');

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

// ─── CSV PARSER ───────────────────────────────────────────────────────────────
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

// ─── CSV CACHE ────────────────────────────────────────────────────────────────
let _soldComps = null;

function loadSoldComps() {
  if (_soldComps) return _soldComps;
  let text;
  try { text = fs.readFileSync(DATA_PATH, 'utf-8'); }
  catch (e) {
    console.error('home-value: cannot read CSV:', e.message);
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

      const close = parseFloat(r.ClosePrice || 0);
      if (close < 10000) continue;

      const closeDateStr = (r.CloseDate || '').slice(0, 10);
      if (!closeDateStr || closeDateStr.length < 10) continue;
      const closeDate = new Date(closeDateStr + 'T12:00:00Z');
      const daysAgo   = Math.round((today - closeDate) / 86400000);
      if (daysAgo < 0 || daysAgo > 180) continue;

      sold.push({ lat, lon, close, daysAgo });
    } catch (_) { continue; }
  }

  console.log(`home-value: loaded ${sold.length} sold comps`);
  _soldComps = sold;
  return sold;
}

// ─── MAPBOX GEOCODE ───────────────────────────────────────────────────────────
async function geocodeAddress(address) {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
      + encodeURIComponent(address)
      + '.json?access_token=' + token
      + '&country=US&types=address&limit=1&proximity=-95.22,29.73';
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = (data.features || [])[0];
    if (!f || !f.center) return null;
    return { lon: f.center[0], lat: f.center[1] };
  } catch (e) {
    console.warn('home-value: Mapbox geocode failed:', e.message);
    return null;
  }
}

// ─── MLS ESTIMATE from nearby comps ──────────────────────────────────────────
function mlsEstimate(lat, lon) {
  const sold = loadSoldComps();

  // Try 2-mile radius first, expand to 5 if too few
  let nearby = sold.filter(c => haversine(c.lat, c.lon, lat, lon) <= 2.0);
  if (nearby.length < 5) {
    nearby = sold.filter(c => haversine(c.lat, c.lon, lat, lon) <= 5.0);
  }
  if (!nearby.length) return null;

  const prices  = nearby.map(c => c.close).sort((a, b) => a - b);
  const avg     = prices.reduce((s, p) => s + p, 0) / prices.length;
  const p20idx  = Math.floor(prices.length * 0.20);
  const p80idx  = Math.min(Math.floor(prices.length * 0.80), prices.length - 1);

  return {
    price:          Math.round(avg),
    priceRangeLow:  Math.round(prices[p20idx] || avg * 0.88),
    priceRangeHigh: Math.round(prices[p80idx] || avg * 1.12),
  };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────
exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS };
  }

  const params  = event.queryStringParameters || {};
  const address = (params.address || '').trim();

  if (!address) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Address is required' }) };
  }

  // ── 1. Try Rentcast AVM ───────────────────────────────────────────────────
  const rentcastKey = process.env.RENTCAST_API_KEY;
  if (rentcastKey) {
    try {
      const res = await fetch(
        'https://api.rentcast.io/v1/avm/value?address=' + encodeURIComponent(address),
        { headers: { 'X-Api-Key': rentcastKey, 'Accept': 'application/json' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.price) {
          return {
            statusCode: 200,
            headers: HEADERS,
            body: JSON.stringify({
              price:          data.price,
              priceRangeLow:  data.priceRangeLow,
              priceRangeHigh: data.priceRangeHigh,
            }),
          };
        }
      } else {
        console.warn('home-value: Rentcast returned', res.status);
      }
    } catch (err) {
      console.warn('home-value: Rentcast error:', err.message);
    }
  }

  // ── 2. Geocode the address → MLS CSV estimate ─────────────────────────────
  const coords = await geocodeAddress(address);
  if (!coords) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ error: 'Could not locate this address. Try selecting a suggestion from the dropdown.' }),
    };
  }

  const est = mlsEstimate(coords.lat, coords.lon);
  if (!est) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ error: 'No recent comparable sales found near this address.' }),
    };
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify(est),
  };
};
