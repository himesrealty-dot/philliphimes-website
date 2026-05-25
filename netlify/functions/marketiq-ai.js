// MarketIQ™ v2 — AI-Powered Pricing Strategy Tool
// Anthropic Claude + HAR.com real comp data
// POST { address, mode, beds, baths, sqft, condition, timeline, budget, zip }

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const FIRECRAWL_API_KEY  = process.env.FIRECRAWL_API_KEY;

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

// ─── HAR SCRAPING ────────────────────────────────────────────────
async function searchHarSold(zip, bedsMin, bedsMax, sqftMin, sqftMax) {
  // Try two HAR URL patterns — the second is a more stable listings path
  const urls = [
    `https://www.har.com/search/dosearch?all_status=closd&property_class_id=1&zip_code=${zip}&sort=listdate%20desc` +
      (bedsMin ? `&bedrooms_min=${bedsMin}` : '') +
      (bedsMax ? `&bedrooms_max=${bedsMax}` : '') +
      (sqftMin ? `&building_sqft_min=${sqftMin}` : '') +
      (sqftMax ? `&building_sqft_max=${sqftMax}` : ''),
    `https://www.har.com/real_estate/listings/?market=0&all_status=closd&zip_code=${zip}` +
      (bedsMin ? `&bedrooms_min=${bedsMin}` : '') +
      (bedsMax ? `&bedrooms_max=${bedsMax}` : '')
  ];

  for (const url of urls) {
    try {
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          formats: ['markdown'],
          onlyMainContent: false,
          waitFor: 8000,
          actions: [{ type: 'wait', milliseconds: 6000 }]
        })
      });
      const data = await res.json();
      const md = data.markdown || (data.data && data.data.markdown) || '';
      // Check if we got actual listing content (look for HAR homedetail URLs or address patterns)
      if (md.includes('homedetail') || md.includes('har.com/homedetail')) {
        return md.substring(0, 10000);
      }
    } catch (e) {
      console.error('Firecrawl attempt failed:', e.message);
    }
  }

  // Return empty — Claude will fall back to market knowledge per system prompt
  return 'No HAR search results retrieved. Use your knowledge of recent market conditions for this ZIP code.';
}

async function getHarPropertyDetail(harUrl) {
  // Direct fetch — HAR homedetail meta tags are server-rendered
  const res = await fetch(harUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  });
  const html = await res.text();

  // Meta description: "Sold: [address] · [price range] · [lot] · [sqft], [beds] beds, [baths]"
  const metaMatch = html.match(/name="description"\s+content="([^"]+)"/i)
                 || html.match(/content="([^"]+)"\s+name="description"/i);
  const metaDesc = metaMatch ? metaMatch[1] : '';

  // Sold date: "Sold\n      on March 31, 2026"
  const soldDateMatch = html.match(/Sold\s+on\s+([A-Z][a-z]+ \d+, \d{4})/i);
  const soldDate = soldDateMatch ? soldDateMatch[1] : null;

  // List price: "It was listed for $499,900"
  const listPriceMatch = html.match(/listed for \$([\d,]+)/i);
  const listPrice = listPriceMatch ? '$' + listPriceMatch[1] : null;

  // Sold price range from meta: "$420,001 - $482,000"
  const priceRangeMatch = metaDesc.match(/\$([\d,]+)\s*[-–]\s*\$([\d,]+)/);
  const soldPriceRange = priceRangeMatch ? `$${priceRangeMatch[1]} – $${priceRangeMatch[2]}` : null;

  // Beds/baths/sqft from meta
  const bedsMatch   = metaDesc.match(/(\d+)\s+beds?/i);
  const sqftMatch   = metaDesc.match(/([\d,]+)\s+Sqft/i);
  const bathsMatch  = metaDesc.match(/(\d+\s+full[^,]+)/i);

  // Pool
  const hasPool = html.toLowerCase().includes('private pool');

  return {
    metaDesc,
    soldDate,
    listPrice,
    soldPriceRange,
    beds:  bedsMatch  ? bedsMatch[1]  : null,
    sqft:  sqftMatch  ? sqftMatch[1]  : null,
    baths: bathsMatch ? bathsMatch[1] : null,
    hasPool,
    url: harUrl
  };
}

// ─── TOOL DEFINITIONS ────────────────────────────────────────────
const TOOLS = [
  {
    name: 'search_comparable_sales',
    description: 'Search HAR.com for recently sold comparable properties by ZIP code, bed count, and sqft range. Returns a list of sold listings with addresses and HAR URLs.',
    input_schema: {
      type: 'object',
      properties: {
        zip_code:  { type: 'string',  description: 'ZIP code of the subject property' },
        beds_min:  { type: 'number',  description: 'Minimum bedrooms (use subject beds - 1)' },
        beds_max:  { type: 'number',  description: 'Maximum bedrooms (use subject beds + 1)' },
        sqft_min:  { type: 'number',  description: 'Min sqft (subject sqft minus 500, or omit if unknown)' },
        sqft_max:  { type: 'number',  description: 'Max sqft (subject sqft plus 500, or omit if unknown)' }
      },
      required: ['zip_code', 'beds_min', 'beds_max']
    }
  },
  {
    name: 'get_comp_detail',
    description: 'Get sold date, sold price range, and property details for a specific HAR.com listing. Use the full HAR homedetail URL.',
    input_schema: {
      type: 'object',
      properties: {
        har_url: { type: 'string', description: 'Full HAR.com homedetail URL, e.g. https://www.har.com/homedetail/...' }
      },
      required: ['har_url']
    }
  }
];

// ─── TOOL EXECUTOR ───────────────────────────────────────────────
async function executeTool(name, input) {
  try {
    if (name === 'search_comparable_sales') {
      const { zip_code, beds_min, beds_max, sqft_min, sqft_max } = input;
      const results = await searchHarSold(zip_code, beds_min, beds_max, sqft_min, sqft_max);
      return { results, source: 'har.com' };
    }
    if (name === 'get_comp_detail') {
      const detail = await getHarPropertyDetail(input.har_url);
      return detail;
    }
    return { error: `Unknown tool: ${name}` };
  } catch (err) {
    return { error: err.message };
  }
}

// ─── ANTHROPIC API ───────────────────────────────────────────────
async function callClaude(messages, system) {
  const payload = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    tools: TOOLS,
    messages
  };
  if (system) payload.system = system;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  return res.json();
}

// ─── SIX-MONTH CUTOFF ────────────────────────────────────────────
function sixMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ─── MAIN HANDLER ────────────────────────────────────────────────
exports.handler = async function(event) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...headers, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
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

  // Extract ZIP from address
  const zipMatch = address.match(/\b(7[0-9]{4})\b/);
  const zip      = zipMatch ? zipMatch[1] : '77573';
  const area     = getAreaData(zip);
  const isSeller = mode === 'seller';
  const cutoff   = sixMonthsAgo();

  // ── BUILD PROMPT ─────────────────────────────────────────────
  const systemPrompt = `You are MarketIQ™, a real estate market intelligence tool for Phillip Himes, REALTOR® at eXp Realty, serving the South Houston suburbs (League City, Friendswood, Pearland, Clear Lake, Dickinson, Manvel).

RULES:
- Attempt to search for real HAR.com comps first using the search tool
- If real comp data IS available: use it. Report sold price RANGES exactly as shown (e.g. "$420,001 – $482,000") — never invent exact figures. Only use comps sold after ${cutoff}. Flag comps with pools or premium features.
- If HAR search returns no results or the search tool fails: DO NOT stop. Instead, generate the full report using your knowledge of current market conditions in ${area.city}, ${area.district}. Clearly note at the top of the Comparable Sales section: "Live comp data unavailable — strategies based on ${area.city} market knowledge (Clear Creek ISD corridor, ZIP ${zip})."
- Either way, provide specific price points in the strategies — never give ranges like "$400K–$450K". Pick a specific number.
- Be direct and specific — no fluff, no generic real estate language
- Never ask the user to provide data. Always generate the full report.

NEIGHBORHOOD CONTEXT FOR ${address}:
- City: ${area.city}
- School District: ${area.district}
- County: ${area.county}
- Flood Zone Note: ${area.flood}
- Market Character: ${area.market}`;

  const userPrompt = isSeller
    ? `Generate a MarketIQ™ Seller Pricing Report for:

Property: ${address}
Bedrooms: ${beds || 'not provided'}
Bathrooms: ${baths || 'not provided'}
Square Footage: ${sqft || 'not provided'}
Condition: ${condition || 'not specified'}
Timeline to Sell: ${timeline || 'not specified'}

INSTRUCTIONS:
1. Call search_comparable_sales for ZIP ${zip}, beds ${beds || 4}±1, sqft ${sqft ? `${parseInt(sqft)-500}–${parseInt(sqft)+500}` : 'any'}
2. From the results, identify the 3 most similar properties (match on beds and sqft first)
3. Call get_comp_detail for each of those 3 HAR URLs to get sold date + price range
4. Discard any comp sold before ${cutoff}
5. Write the report in this exact structure:

## Comparable Sales
(table: address | beds/baths | sqft | listed | sold range | sold date | notes)

## What the Market Is Telling You
(2-3 sentences interpreting the comp data — price per sqft range, market temp, key patterns)

## Three Pricing Strategies

**Strategy 1 — Price to Move**
[specific price] · [what to expect] · [who this is for] · [risk]

**Strategy 2 — Price to Sell**
[specific price] · [what to expect] · [who this is for] · [risk]

**Strategy 3 — Price to Test**
[specific price] · [what to expect] · [who this is for] · [risk]

## Key Factors That Will Impact Your Sale
(school district value, flood zone, HOA, condition adjustment, any comp anomalies)

## What This Report Can't Tell You
(one honest paragraph about what requires a real conversation)`
    : `Generate a MarketIQ™ Buyer Market Report for:

Area of Interest: ${address}
Budget: ${budget || 'not specified'}
ZIP: ${zip}

INSTRUCTIONS:
1. Call search_comparable_sales for ZIP ${zip} within budget range
2. Get details on 3 representative recent sales
3. Write the report in this exact structure:

## What's Selling Right Now
(summary of recent sales activity in this ZIP)

## Recent Comparable Sales
(table: address | beds/baths | sqft | listed | sold range | sold date)

## Four Offer Strategies

**Strategy 1 — Aggressive (Win It)**
**Strategy 2 — Market Rate (Clean Offer)**
**Strategy 3 — Below Ask (Test the Seller)**
**Strategy 4 — Wait & Watch**

## What You Need to Know Before Making an Offer
(school district, flood zone, market temp, days on market patterns)

## What This Report Can't Tell You`;

  // ── TOOL USE LOOP ─────────────────────────────────────────────
  let messages = [{ role: 'user', content: userPrompt }];
  let finalReport = '';
  let iterations   = 0;

  try {
    while (iterations < 8) {
      iterations++;
      const resp = await callClaude(messages, systemPrompt);

      