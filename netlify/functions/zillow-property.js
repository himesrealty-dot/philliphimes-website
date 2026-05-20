// MarketIQ™ — Zillow Property Data via Firecrawl
// Uses fast markdown scrape + regex parsing (no AI extraction = stays under 10s timeout)

exports.handler = async function(event) {
  const params  = event.queryStringParameters || {};
  const address = (params.address || '').trim();

  if (!address) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Address is required' }) };
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Firecrawl API key not configured' }) };
  }

  // Build Zillow search URL
  const slug      = address.replace(/,/g, '').replace(/\s+/g, '-');
  const zillowUrl = 'https://www.zillow.com/homes/' + encodeURIComponent(slug) + '_rb/';

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url:     zillowUrl,
        formats: ['markdown'],
        onlyMainContent: false
      })
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Could not retrieve property data' })
      };
    }

    const result = await res.json();
    const md = (result.markdown || (result.data && result.data.markdown) || '');

    // ── PARSE MARKDOWN WITH REGEX ─────────────────────────────────

    function firstNum(str) {
      if (!str) return null;
      var n = Number(String(str).replace(/[$,]/g, ''));
      return isNaN(n) ? null : n;
    }

    function matchNum(text, pattern) {
      var m = text.match(pattern);
      return m ? firstNum(m[1]) : null;
    }

    function matchStr(text, pattern) {
      var m = text.match(pattern);
      return m ? m[1].trim() : null;
    }

    // Zestimate — "776,000 Zestimate" or "$776,000 Zestimate"
    var zestimate = matchNum(md, /\$([\d,]+)\s*Zestimate/i);

    // List price — first large dollar amount near "price" or before beds/baths line
    var listPrice = matchNum(md, /(?:list\s*price|asking\s*price|price)[:\s]+\$([\d,]+)/i);
    if (!listPrice) {
      // Fallback: find the first standalone large price (>$100k)
      var priceMatches = md.match(/\$([\d,]+)/g) || [];
      for (var i = 0; i < priceMatches.length; i++) {
        var p = firstNum(priceMatches[i]);
        if (p && p > 100000) { listPrice = p; break; }
      }
    }

    // Beds / baths / sqft
    var beds  = matchNum(md, /(\d+)\s*(?:bd|bed|beds|bedrooms?)/i);
    var baths = matchNum(md, /(\d+\.?\d*)\s*(?:ba|bath|baths|bathrooms?)/i);
    var sqft  = matchNum(md, /([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)/i);

    // Price per sqft
    var pricePerSqft = matchNum(md, /\$([\d,]+)\s*\/\s*(?:sq\s*ft|sqft)/i);
    if (!pricePerSqft) pricePerSqft = matchNum(md, /Price per square foot[:\s]+\$([\d,]+)/i);

    // Days on market
    var daysOnMarket = matchNum(md, /(\d+)\s*days?\s*on\s*(?:the\s*)?market/i);
    if (!daysOnMarket) daysOnMarket = matchNum(md, /(\d+)\s*days?\s*(?:ago|active)/i);

    // Year built
    var yearBuilt = matchNum(md, /(?:year\s*built|built\s*in)[:\s]+(\d{4})/i);
    if (!yearBuilt) yearBuilt = matchNum(md, /(\d{4})\s*(?:year\s*built|built)/i);

    // Flood zone
    var floodZone   = matchStr(md, /(?:Flood\s*zone|FEMA\s*Zone)[:\s]+([A-Z0-9]+(?:\s*\([^)]*\))?)/i);
    var floodDetail = matchStr(md, /((?:In\s*)?FEMA Zone\s*\w+[^.\n]{10,80}(?:flood|risk)[^.\n]{0,80})/i);

    // School district
    var schoolDistrict = matchStr(md, /([A-Za-z\s]+(?:ISD|Independent School District|School District))/i);

    // Schools — look for "Elementary", "Intermediate", "Middle", "High" followed by school name
    var elementary = matchStr(md, /([A-Za-z\s]+(?:Elementary|Primary|Elem)(?:\s+School)?)/i);
    var middle     = matchStr(md, /([A-Za-z\s]+(?:Intermediate|Middle|Junior\s*High)(?:\s+School)?)/i);
    var high       = matchStr(md, /([A-Za-z\s]+(?:High\s*School|Senior\s*High))/i);

    // Property type
    var propertyType = matchStr(md, /(?:Property\s*type|Type)[:\s]+(Single[- ]Family|Condo|Townhouse|Multi[- ]Family|Mobile|Manufactured)/i);

    // Short description — first 200 chars of main body text
    var descMatch = md.match(/([A-Z][^#\n]{80,400})/);
    var description = descMatch ? descMatch[1].substring(0, 250) + '…' : null;

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zestimate:      zestimate,
        listPrice:      listPrice,
        beds:           beds,
        baths:          baths,
        sqft:           sqft,
        pricePerSqft:   pricePerSqft,
        daysOnMarket:   daysOnMarket,
        yearBuilt:      yearBuilt,
        floodZone:      floodZone,
        floodDetail:    floodDetail,
        schoolDistrict: schoolDistrict,
        schools: {
          elementary: elementary,
          middle:     middle,
          high:       high
        },
        propertyType:   propertyType,
        description:    description,
        source:         'zillow'
      })
    };

  } catch (err) {
    console.error('zillow-property error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
