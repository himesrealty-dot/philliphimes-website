// MarketIQ™ v3 — AI-Powered Pricing Strategy Tool
// Anthropic Claude + RentCast live market data
// POST { address, mode, beds, baths, sqft, condition, timeline, budget }
// Returns structured JSON — no markdown, direct template injection

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RENTCAST_API_KEY  = process.env.RENTCAST_API_KEY;

// ─── AREA DATA ────────────────────────────────────────────────────
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

// ─── RENTCAST: PROPERTY AVM + COMPARABLE SALES ───────────────────
async function callRentcastAVM(address, beds, baths, sqft, lookupAttrs) {
  if (!RENTCAST_API_KEY) return null;
  try {
    const params = new URLSearchParams({
      address,
      propertyType: 'Single Family',
      compCount: '5'
    });
    if (lookupAttrs) {
      params.set('lookupSubjectAttributes', 'true');
    } else {
      if (beds)              params.set('bedrooms',      String(beds));
      if (baths)             params.set('bathrooms',     String(baths));
      if (sqft && +sqft > 0) params.set('squareFootage', String(parseInt(sqft)));
    }
    const res = await fetch(`https://api.rentcast.io/v1/avm/value?${params}`, {
      headers: { 'X-Api-Key': RENTCAST_API_KEY, 'Accept': 'application/json' }
    });
    if (!res.ok) {
      console.error(`RentCast AVM ${res.status}:`, await res.text());
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('RentCast AVM error:', e.message);
    return null;
  }
}

// ─── RENTCAST: ZIP-LEVEL MARKET STATISTICS ────────────────────────
async function callRentcastMarket(zip) {
  if (!RENTCAST_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.rentcast.io/v1/markets?zipCode=${zip}&dataType=Sale`,
      { headers: { 'X-Api-Key': RENTCAST_API_KEY, 'Accept': 'application/json' } }
    );
    if (!res.ok) {
      console.error(`RentCast Market ${res.status}:`, await res.text());
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error('RentCast Market error:', e.message);
    return null;
  }
}

// ─── FORMAT RENTCAST DATA FOR CLAUDE PROMPT ──────────────────────
function buildRentcastContext(avm, market, zip, isSeller) {
  const parts = [];

  if (market) {
    // Handle both nested (market.saleData) and flat response shapes
    const sd  = market.saleData || market.sale || market;
    const dom = sd.averageDaysOnMarket  ?? sd.medianDaysOnMarket   ?? null;
    const lts = sd.saleToListRatio      ?? null;
    const tot = sd.totalListings        ?? sd.activeSaleListings   ?? null;
    const avg = sd.averageSalePrice     ?? sd.medianSalePrice      ?? null;

    // Derive inventory + market type from real data
    let inventory   = 'Balanced';
    let marketLabel = isSeller ? 'Balanced' : 'Moderate';
    if (dom !== null) {
      if (dom < 28)  { inventory = 'Low';  marketLabel = isSeller ? "Seller's" : 'High'; }
      else if (dom > 55) { inventory = 'High'; marketLabel = isSeller ? "Buyer's" : 'Low'; }
    } else if (tot !== null) {
      if (tot < 15)  { inventory = 'Low';  marketLabel = isSeller ? "Seller's" : 'High'; }
      else if (tot > 60) { inventory = 'High'; marketLabel = isSeller ? "Buyer's" : 'Low'; }
    }

    const domStr = dom !== null ? `${dom} days` : null;
    const ltsStr = lts !== null ? `${(lts * 100).toFixed(1)}%` : null;

    parts.push(`REAL MARKET DATA FOR ZIP ${zip} — copy these EXACT values into the snapshot JSON:`);
    if (domStr) parts.push(`  "dom": "${domStr}"`);
    if (ltsStr) parts.push(`  "listToSale": "${ltsStr}"`);
    parts.push(`  "inventory": "${inventory}"`);
    parts.push(`  "market": "${marketLabel}"`);
    if (avg) parts.push(`  Context: avg/median sale price in ZIP = $${avg.toLocaleString()}`);
  }

  if (avm) {
    parts.push('');
    if (avm.price) {
      const lo = avm.priceRangeLow  ? `$${avm.priceRangeLow.toLocaleString()}`  : '?';
      const hi = avm.priceRangeHigh ? `$${avm.priceRangeHigh.toLocaleString()}` : '?';
      parts.push(`RENTCAST AVM ESTIMATE: $${avm.price.toLocaleString()} (range: ${lo}–${hi})`);
      parts.push('Anchor your pricing/offer strategies to this estimate and the comps below.');
    }
    const comps = (avm.listings || []).filter(c => c.price).slice(0, 5);
    if (comps.length) {
      parts.push('RECENT COMPARABLE SALES:');
      comps.forEach((c, i) => {
        const ppsf = c.squareFootage ? ` | $${Math.round(c.price / c.squareFootage)}/sqft` : '';
        const sqftStr = c.squareFootage ? `${c.squareFootage.toLocaleString()} sqft` : '? sqft';
        parts.push(
          `  ${i + 1}. ${c.address || 'Nearby'} — Sold $${c.price.toLocaleString()}` +
          ` | ${c.bedrooms || '?'}bd/${c.bathrooms || '?'}ba | ${sqftStr}${ppsf}` +
          ` | ${c.daysOnMarket || '?'} DOM | ${Math.round((c.correlation || 0) * 100)}% match`
        );
      });
    }
  }

  return parts.length ? parts.join('\n') : '';
}

// ─── ANTHROPIC API ────────────────────────────────────────────────
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
      max_tokens: 2000,
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

// ─── STRIP CODE FENCES IF CLAUDE WRAPS IN ```json ────────────────
function extractJSON(raw) {
  const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : raw.trim();
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────
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
  const today    = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // ── FETCH RENTCAST DATA IN PARALLEL ────────────────────────────
  // Seller: pass beds/baths/sqft from form; Buyer: let RentCast look up property attributes
  const [avm, market] = await Promise.all([
    callRentcastAVM(address, isSeller ? beds : null, isSeller ? baths : null, isSeller ? sqft : null, !isSeller),
    callRentcastMarket(zip)
  ]);

  const rentcastContext = buildRentcastContext(avm, market, zip, isSeller);
  const hasRealData     = rentcastContext.length > 0;

  // ── SYSTEM PROMPT ───────────────────────────────────────────────
  const systemPrompt = `You are MarketIQ™, a real estate pricing strategy AI built for Phillip Himes, REALTOR® at eXp Realty. You serve the South Houston suburbs: League City, Friendswood, Pearland, Clear Lake, Dickinson, and Manvel.

CURRENT DATE: ${today}
PROPERTY/AREA: ${address}
NEIGHBORHOOD CONTEXT:
- City: ${area.city}
- School District: ${area.district}
- County: ${area.county}
- Market Character: ${area.market}

CRITICAL RULES:
1. Output ONLY valid JSON — no markdown, no explanation, no code fences, no intro text.
2. Generate SPECIFIC price points — never vague ranges. Pick one number.
3. Be direct and confident. No hedging. No disclaimers.
4. Every text value must be a plain string — no markdown formatting inside strings.
5. Keep all text values short and scannable — bullet text max 15 words.${hasRealData ? `
6. REAL DATA IS PROVIDED BELOW. Use the exact dom, listToSale, inventory, and market values specified — do not substitute your own estimates for these fields. Anchor price strategies to the RentCast AVM and comps provided.` : `
6. No live data available — use your knowledge of ${area.city} (${area.district}) market conditions.`}`;

  // ── USER PROMPT ─────────────────────────────────────────────────
  const realDataBlock = hasRealData
    ? `\n\n--- LIVE RENTCAST DATA ---\n${rentcastContext}\n--- END LIVE DATA ---\n`
    : '';

  const userPrompt = isSeller
    ? `Generate a MarketIQ™ Seller Pricing Report for this property:

Address: ${address}
Bedrooms: ${beds || 4} | Bathrooms: ${baths || 2.5} | Square Feet: ${sqft || 'not provided'}
Condition: ${condition || 'Updated'} | Timeline: ${timeline || '1-3 months'}
School District: ${area.district}
${realDataBlock}
Return ONLY this JSON structure — no other text:

{
  "snapshot": {
    "dom": "[use real data if provided, else estimate for this ZIP/specs]",
    "listToSale": "[use real data if provided, else estimate]",
    "inventory": "[use real data if provided: Low / Balanced / High]",
    "market": "[use real data if provided: Seller's / Balanced / Buyer's]",
    "summary": "[One punchy sentence, max 20 words, telling the seller what this market means for them right now]"
  },
  "strategies": [
    {
      "name": "Price to Move",
      "price": "$[specific number anchored to RentCast AVM/comps if available]",
      "row1": { "label": "Expect", "text": "[what happens in week 1 — max 12 words]" },
      "row2": { "label": "Best for", "text": "[who this strategy is for — max 10 words]" },
      "row3": { "label": "Risk", "text": "[one specific downside — max 12 words]" }
    },
    {
      "name": "Price to Sell",
      "price": "$[specific number]",
      "row1": { "label": "Expect", "text": "[what happens — max 12 words]" },
      "row2": { "label": "Best for", "text": "[who — max 10 words]" },
      "row3": { "label": "Risk", "text": "[downside — max 12 words]" }
    },
    {
      "name": "Price to Test",
      "price": "$[specific number]",
      "row1": { "label": "Expect", "text": "[what happens — max 12 words]" },
      "row2": { "label": "Best for", "text": "[who — max 10 words]" },
      "row3": { "label": "Risk", "text": "[downside — max 12 words]" }
    }
  ],
  "factors": [
    { "emoji": "✅", "label": "[Factor name]", "text": "[One plain-language sentence, max 15 words]" },
    { "emoji": "✅", "label": "[Factor name]", "text": "[One sentence]" },
    { "emoji": "⚡", "label": "[Factor name]", "text": "[One sentence]" },
    { "emoji": "⚠️", "label": "[Factor name]", "text": "[One sentence]" }
  ],
  "cantTell": "[Two sentences max. What Phil's in-person walkthrough covers that this tool cannot. End with a line about booking a call with Phil.]"
}`
    : `Generate a MarketIQ™ Buyer Market Report for this property:

Address: ${address} | ZIP: ${zip}
Budget: ${budget || 'not specified'} | Minimum Bedrooms: ${beds || 3}
School District: ${area.district}
${realDataBlock}
Return ONLY this JSON structure — no other text:

{
  "snapshot": {
    "dom": "[use real data if provided, else estimate for this ZIP]",
    "listToSale": "[use real data if provided, else estimate]",
    "inventory": "[use real data if provided: Low / Balanced / High]",
    "market": "[use real data if provided: High / Moderate / Low competition]",
    "summary": "[One punchy sentence, max 20 words, what a buyer needs to know about this market right now]"
  },
  "strategies": [
    {
      "name": "Win It",
      "price": "[List price + X% or specific guidance anchored to AVM if available]",
      "row1": { "label": "When", "text": "[what situation calls for this — max 12 words]" },
      "row2": { "label": "How", "text": "[key offer terms to include — max 12 words]" },
      "row3": { "label": "Risk", "text": "[downside — max 12 words]" }
    },
    {
      "name": "Clean Offer",
      "price": "[approach]",
      "row1": { "label": "When", "text": "[max 12 words]" },
      "row2": { "label": "How", "text": "[max 12 words]" },
      "row3": { "label": "Risk", "text": "[max 12 words]" }
    },
    {
      "name": "Test the Seller",
      "price": "[approach]",
      "row1": { "label": "When", "text": "[max 12 words]" },
      "row2": { "label": "How", "text": "[max 12 words]" },
      "row3": { "label": "Risk", "text": "[max 12 words]" }
    },
    {
      "name": "Wait & Watch",
      "price": "Not offering yet",
      "row1": { "label": "When", "text": "[what you're waiting for — max 12 words]" },
      "row2": { "label": "Signal", "text": "[what tells you it's time to move — max 12 words]" },
      "row3": { "label": "Risk", "text": "[cost of waiting — max 12 words]" }
    }
  ],
  "factors": [
    { "emoji": "✅", "label": "[Factor name]", "text": "[One plain-language sentence, max 15 words]" },
    { "emoji": "✅", "label": "[Factor name]", "text": "[One sentence]" },
    { "emoji": "⚡", "label": "[Factor name]", "text": "[One sentence]" },
    { "emoji": "⚠️", "label": "[Factor name]", "text": "[One sentence]" }
  ],
  "cantTell": "[Two sentences max. What Phil sees in person that this tool can't — condition, seller motivation, competition level. End with a line about booking a call.]"
}`;

  try {
    const raw   = await callClaude(systemPrompt, userPrompt);
    const clean = extractJSON(raw);
    let report;
    try {
      report = JSON.parse(clean);
    } catch (parseErr) {
      console.error('JSON parse failed. Raw output:', raw);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI returned invalid JSON. Please try again.' }) };
    }

    // ── Prepare comps for frontend display ────────────────────────
    const comps = avm
      ? (avm.listings || []).filter(c => c.price).slice(0, 5).map(c => ({
          address : c.address   || '',
          price   : c.price,
          beds    : c.bedrooms  || null,
          baths   : c.bathrooms || null,
          sqft    : c.squareFootage || null,
          dom     : c.daysOnMarket  || null,
          match   : Math.round((c.correlation || 0) * 100)
        }))
      : [];

    const avmData = (avm && avm.price)
      ? { price: avm.price, low: avm.priceRangeLow || null, high: avm.priceRangeHigh || null }
      : null;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ report, area, zip, mode, comps, avm: avmData })
    };
  } catch (err) {
    console.error('marketiq-ai error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
