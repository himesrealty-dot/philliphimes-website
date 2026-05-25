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
    ? `Generate a MarketIQ™ Seller Pricing Report. Write for a homeowner, not an agent. Short sentences. Plain language. Numbers beat adjectives. Every section must be scannable in 5 seconds.

PROPERTY:
Address: ${address}
Bedrooms: ${beds || 4} | Bathrooms: ${baths || 2.5} | Sqft: ${sqft || 'not provided'}
Condition: ${condition || 'Updated'} | Timeline: ${timeline || '1-3 months'}
District: ${area.district} | Market: ${area.market}

OUTPUT THIS EXACT STRUCTURE — no extra text, no intro, no sign-off:

## Market Snapshot
STATS: DOM: [X days] | List-to-Sale: [X%] | Inventory: [Low/Balanced/High] | Market: [Seller's/Balanced/Buyer's]
[One bold sentence — max 20 words — telling the seller what the market means for them right now.]

## Your Three Strategies

**Strategy 1 — Price to Move**
PRICE: $[specific number]
• Expect: [what happens in week 1 — max 12 words]
• Best for: [who this is for — max 10 words]
• Risk: [one specific downside — max 12 words]

**Strategy 2 — Price to Sell**
PRICE: $[specific number]
• Expect: [what happens — max 12 words]
• Best for: [who — max 10 words]
• Risk: [downside — max 12 words]

**Strategy 3 — Price to Test**
PRICE: $[specific number]
• Expect: [what happens — max 12 words]
• Best for: [who — max 10 words]
• Risk: [downside — max 12 words]

## What Affects Your Price
[4-5 factors, one per line, using this format exactly:]
✅ **[Factor name]:** [One sentence — plain language, max 15 words]
✅ **[Factor name]:** [One sentence]
⚡ **[Factor name]:** [One sentence]
⚠️ **[Factor name]:** [One sentence]

## What This Report Can't Tell You
[Two sentences max. Tell the seller what Phil's eyes-on analysis covers that this tool can't. End with one sentence about booking a call.]`
    : `Generate a MarketIQ™ Buyer Market Report. Write for a homebuyer, not an agent. Short sentences. Plain language. Scannable in 30 seconds.

SEARCH:
Area: ${address} | ZIP: ${zip}
Budget: ${budget || 'not specified'} | Min Beds: ${beds || 3}
District: ${area.district} | Market: ${area.market}

OUTPUT THIS EXACT STRUCTURE — no extra text, no intro, no sign-off:

## Market Snapshot
STATS: DOM: [X days] | List-to-Sale: [X%] | Inventory: [Low/Balanced/High] | Competition: [High/Moderate/Low]
[One bold sentence — max 20 words — what a buyer needs to know about this market right now.]

## Your Four Offer Strategies

**Strategy 1 — Win It**
PRICE: [List price + X% or specific approach]
• When: [what situation calls for this — max 12 words]
• How: [key offer terms — max 12 words]
• Risk: [downside — max 12 words]

**Strategy 2 — Clean Offer**
PRICE: [approach]
• When: [max 12 words]
• How: [max 12 words]
• Risk: [max 12 words]

**Strategy 3 — Test the Seller**
PRICE: [approach]
• When: [max 12 words]
• How: [max 12 words]
• Risk: [max 12 words]

**Strategy 4 — Wait & Watch**
PRICE: Not offering yet
• When: [what you're waiting for — max 12 words]
• Signal: [what tells you to move — max 12 words]
• Risk: [cost of waiting — max 12 words]

## What to Know Before You Offer
[4-5 factors, one per line:]
✅ **[Factor]:** [One sentence — max 15 words]
✅ **[Factor]:** [One sentence]
⚡ **[Factor]:** [One sentence]
⚠️ **[Factor]:** [One sentence]

## What This Report Can't Tell You
[Two sentences max. What Phil sees in person that this tool can't — condition, seller motivation, competition. End with one sentence about booking a call.]`;

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
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                