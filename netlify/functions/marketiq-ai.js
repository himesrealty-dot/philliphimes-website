// MarketIQ™ v2 — AI-Powered Pricing Strategy Tool
// Anthropic Claude + static area intelligence
// POST { address, mode, beds, baths, sqft, condition, timeline, budget }

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// ─── NEIGHBORHOOD / SCHOOL DISTRICT LOOKUP ───────────────────────
const AREA_DATA = {
  '77573': { city: 'League City',    county: 'Galveston County',  district: 'Clear Creek ISD',  flood: 'Most of 77573 is Zone X (minimal risk). Verify specific parcel on FEMA flood map.', market: 'One of the most balanced markets in the Bay Area — steady demand across all price points.' },
  '77565': { city: 'League City',    county: 'Galveston County',  district: 'Clear Creek ISD',  flood: 'Mostly Zone X. Verify specific parcel.', market: 'League City waterfront corridor — strong lifestyle buyer demand.' },
  '77546': { city: 'Friendswood',    county: 'Galveston/Harris',  district: 'Friendswood ISD',  flood: 'Friendswood sits on higher ground — most areas Zone X, one of the lowest flood risk communities in the Bay Area.', market: 'Friendswood ISD is the #1 demand driver. One of the tightest markets in the region — buyers compete, sellers are in control.' },
  '77584': { city: 'Pearland',       county: 'Brazoria County',   district: 'Pearland ISD',     flood: 'Most areas Zone X. Verify specific parcel.', market: 'Master-planned living at accessible price points. Shadow Creek Ranch and Silverlake drive strong resale demand.' },
  '77581': { city: 'Pearland',       county: 'Brazoria County',   district: 'Pearland ISD',     flood: 'Verify flood zone for specific parcel.', market: 'Established Pearland neighborhoods with mature trees and consistent buyer demand.' },
  '77089': { city: 'Houston / Pearland area', county: 'Harris County', district: 'Pasadena/Pearland ISD', flood: 'Verify flood zone carefully — mixed designations in this ZIP.', market: 'Southeast Houston suburban corridor.' },
  '77058': { city: 'Clear Lake / Houston', county: 'Harris County', district: 'Clear Creek ISD', flood: 'Clear Lake area — many parcels near water carry AE (moderate risk) designation. Verify carefully.', market: 'NASA corridor drives consistent professional buyer demand. Aerospace and medical buyers dominate.' },
  '77059': { city: 'Clear Lake / Houston', county: 'Harris County', district: 'Clear Creek ISD', flood: 'Verify flood zone — proximity to Clear Lake varies by parcel.', market: 'Bay Oaks, Bay Forest — some of the most established neighborhoods in the Houston Bay Area.' },
  '77062': { city: 'Clear Lake / Houston', county: 'Harris County', district: 'Clear Creek ISD', flood: 'Verify flood zone carefully.', market: 'Taylor Lake Village corridor — waterfront access drives premium pricing.' },
  '77539': { city: 'Dickinson',      county: 'Galveston County',  district: 'Dickinson ISD',    flood: 'Galveston County coastal area — flood zones vary significantly. Verify each parcel carefully. Some areas Zone AE.', market: 'Affordable Galveston County access. Bay Colony and Lago Mar drive newer buyer interest.' },
  '77510': { city: 'Santa Fe',       county: 'Galveston County',  district: 'Santa Fe ISD',     flood: 'Verify flood zone — coastal county, varies by location.', market: 'Rural Galveston County — larger lots, country feel.' },
  '77578': { city: 'Manvel',         county: 'Brazoria County',   district: 'Alvin ISD',        flood: 'Most areas Zone X. Some low-lying areas vary.', market: 'One of the fastest-growing markets in Brazoria County. Meridiana, Pomona, and Rodeo Palms drive strong new buyer traffic.' },
  '77583': { city: 'Iowa Colony / Manvel', county: 'Brazoria County', district: 'Alvin ISD',   flood: 'Mostly Zone X. Verify.', market: 'Iowa Colony growth corridor — new construction at accessible prices.' },
  '77568': { city: 'La Marque',      county: 'Galveston County',  district: 'La Marque ISD',    flood: 'Coastal county — verify flood zone carefully.', market: 'Galveston County growth corridor near I-45.' },
  '77590': { city: 'Texas City',     county: 'Galveston County',  district: 'Texas City ISD',   flood: 'Texas City area — verify flood zone carefully.', market: 'Galveston County industrial/residential corridor.' },
};

function getAreaData(zip) {
  return AREA_DATA[zip] || {
    city: 'South Houston Area',
    county: 'Verify',
    district: 'Verify with listing agent',
    flood: 'Verify flood zone on FEMA flood map for specific parcel.',
    market: 'South Houston suburban market — strong long-term demand fundamentals.'
  };
}

// ─── ANTHROPIC API ───────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
}

// ─── SIX-MONTH CUTOFF ────────────────────────────────────────────
function sixMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ─── MAIN HANDLER ────────────────────────────────────────────────
exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { address, mode = 'seller', beds, baths, sqft, condition, timeline, budget } = body;
  if (!address) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Address required' }) };

  // Extract ZIP
  const zipMatch = address.match(/\b(7[0-9]{4})\b/);
  const zip      = zipMatch ? zipMatch[1] : '77573';
  const area     = getAreaData(zip);
  const isSeller = mode === 'seller';
  const cutoff   = sixMonthsAgo();
  const today    = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── SYSTEM PROMPT ────────────────────────────────────────────
  const systemPrompt = `You are MarketIQ™, a real estate pricing strategy tool built for Phillip Himes, REALTOR® at eXp Realty. You serve the South Houston suburbs: League City, Friendswood, Pearland, Clear Lake, Dickinson, and Manvel.

CURRENT DATE: ${today}
REPORT FOR: ${address}
NEIGHBORHOOD CONTEXT:
- City: ${area.city}
- School District: ${area.district}
- County: ${area.county}
- Market Character: ${area.market}
- Flood Zone Note: ${area.flood}

RULES:
1. Generate specific price points — never vague ranges like "$400K–$450K". Pick a number.
2. Base strategies on your knowledge of recent sales in ${area.city} (${area.district}) for the given home specs.
3. Be direct and confident. No disclaimers, no hedging, no asking for more info.
4. The report is the deliverable. Generate it fully and completely every time.
5. Format using markdown with ## section headers exactly as specified.`;

  // ── USER PROMPT ──────────────────────────────────────────────
  const userPrompt = isSeller
    ? `Generate a MarketIQ™ Seller Pricing Report for this property:

Address: ${address}
Bedrooms: ${beds || 4}
Bathrooms: ${baths || 2.5}
Square Footage: ${sqft || 'not provided'}
Condition: ${condition || 'Updated'}
Timeline to Sell: ${timeline || '1-3 months'}
School District: ${area.district}
Market: ${area.market}

Write the full report in this exact structure:

## Market Intelligence
(2-3 sentences on current conditions in ${area.city} for a ${beds || 4}-bed home at this price point. Include what buyers are competing for, typical days on market, and list-to-sale ratio patterns.)

## Three Pricing Strategies

**Strategy 1 — Price to Move**
[specific price] · [what to expect in terms of activity and timeline] · [who this strategy is for] · Risk: [one specific risk]

**Strategy 2 — Price to Sell**
[specific price] · [what to expect] · [who this is for] · Risk: [one risk]

**Strategy 3 — Price to Test**
[specific price] · [what to expect] · [who this is for] · Risk: [one risk]

## What Will Drive Your Sale
(school district value, flood zone status, condition premium/discount, HOA notes if applicable, anything specific to ${area.city} that affects buyer decisions)

## What This Report Can't Tell You
(one honest paragraph explaining what requires a real conversation with Phil — property-specific factors, current competition, timing, prep decisions)`
    : `Generate a MarketIQ™ Buyer Market Report for this area:

Address / Area: ${address}
ZIP: ${zip}
Max Budget: ${budget || 'not specified'}
Min Bedrooms: ${beds || 3}
School District: ${area.district}
Market: ${area.market}

Write the full report in this exact structure:

## What's Selling Right Now
(2-3 sentences on current activity in ${area.city} at this price point — inventory, competition, how fast homes are moving)

## Four Offer Strategies

**Strategy 1 — Aggressive (Win It)**
[specific offer amount relative to list price] · [when to use this] · [what to include — escalation, waived contingencies, etc.] · Risk: [one risk]

**Strategy 2 — Market Rate (Clean Offer)**
[specific offer] · [when to use] · [what a clean offer looks like here] · Risk: [one risk]

**Strategy 3 — Below Ask (Test the Seller)**
[specific offer] · [when this works] · [conditions that make this viable] · Risk: [one risk]

**Strategy 4 — Wait & Watch**
[not an offer — a strategy] · [what you're waiting for] · [signals that tell you to move] · Risk: [one risk]

## What You Need to Know Before Offering
(school district impact on value, flood zone notes, HOA considerations, what ${area.city} sellers typically respond to)

## What This Report Can't Tell You
(one honest paragraph on what requires Phil's read — seller motivation, property condition, active competition)`;

  try {
    const report = await callClaude(systemPrompt, userPrompt);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ report, area, zip })
    };
  } catch (err) {
    console.error('marketiq-ai error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
