// MarketIQ™ — HAR.com Property Data via Firecrawl
// Houston MLS data: beds, baths, sqft, DOM, schools, year built, taxes, HOA
// Accepts: ?address=3870 Summer Manor Dr League City TX 77573

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

  // HAR.com search URL — try active listings first
  const encoded  = encodeURIComponent(address);
  const harUrl   = 'https://www.har.com/search/dosearch?streetaddress=' + encoded
    + '&for_sale=1&sort=listdate%20desc&view=map';

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url:             harUrl,
        formats:         ['markdown'],
        onlyMainContent: false,
        waitFor:         2000   // HAR.com is JS-rendered; wait for listings to populate
      })
    });

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Could not retrieve HAR.com data' })
      };
    }

    const result = await res.json();
    const md = (result.markdown || (result.data && result.data.markdown) || '');

    // ── PARSE HELPERS ──────────────────────────────────────────────
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

    // ── LIST PRICE ────────────────────────────────────────────────
    var listPrice = matchNum(md, /\$([\d,]+)\s*\n.*(?:For Sale|Active)/i);
    if (!listPrice) listPrice = matchNum(md, /List Price[\s\S]{0,20}\$([\d,]+)/i);
    if (!listPrice) {
      // First large dollar amount on the page
      var prices = md.match(/\$([\d,]+)/g) || [];
      for (var i = 0; i < prices.length; i++) {
        var p = firstNum(prices[i]);
        if (p && p > 100000) { listPrice = p; break; }
      }
    }

    // ── BEDS / BATHS / SQFT ───────────────────────────────────────
    var beds  = matchNum(md, /(\d+)\s*(?:Bedroom\(s\)|bedrooms?|bd)/i);
    var baths = null;
    // HAR format: "3 Full & 1 Half Bath(s)" or "3 full & 1 half baths"
    var bathMatch = md.match(/(\d+)\s*Full\s*&\s*(\d+)\s*Half/i);
    if (bathMatch) {
      baths = parseInt(bathMatch[1]) + (parseInt(bathMatch[2]) * 0.5);
    } else {
      baths = matchNum(md, /(\d+\.?\d*)\s*(?:Bath\(s\)|baths?|ba)/i);
    }
    var sqft         = matchNum(md, /([\d,]+)\s*Sqft/i);
    var pricePerSqft = matchNum(md, /\$([\d,]+)\s*\/\s*Sqft/i);
    var lotAcres     = matchNum(md, /([\d.]+)\s*(?:Lot\s*)?Acres?/i);

    // ── DAYS ON MARKET ────────────────────────────────────────────
    var daysOnMarket = matchNum(md, /(\d+)\s*Day\(s\)\s*on\s*Market/i);
    if (!daysOnMarket) daysOnMarket = matchNum(md, /(\d+)\s*days?\s*on\s*(?:the\s*)?market/i);

    // ── YEAR BUILT ────────────────────────────────────────────────
    var yearBuilt = matchNum(md, /(\d{4})\s*year\s*built/i);
    if (!yearBuilt) yearBuilt = matchNum(md, /Year\s*Built[\s\S]{0,10}(\d{4})/i);

    // ── PROPERTY TYPE ─────────────────────────────────────────────
    var propertyType = matchStr(md, /\n(Single-Family|Condo|Townhouse|Multi-Family|Mobile|Manufactured)\n/i);

    // ── SUBDIVISION / AREA ────────────────────────────────────────
    var subdivision = matchStr(md, /Subdivision\s+([\w\s]+?)(?:\n|\/|$)/i);

    // ── COUNTY ───────────────────────────────────────────────────
    var county = matchStr(md, /County\s+([\w\s]+County)/i);

    // ── HOA ───────────────────────────────────────────────────────
    var hoa = matchNum(md, /Maintenance Fee[\s\S]{0,20}\$([\d,]+)/i);
    if (!hoa) hoa = matchNum(md, /\$([\d,]+)\s*\/\s*Annually/i);

    // ── TAXES ─────────────────────────────────────────────────────
    var taxes    = matchNum(md, /Taxes?\s*w\/o\s*Exemp[\s\S]{0,20}\$([\d,]+)/i);
    var taxRate  = matchNum(md, /Tax\s*Rate[\s\S]{0,10}([\d.]+)/i);

    // ── SCHOOLS ───────────────────────────────────────────────────
    // HAR format: school name followed by rating on next line (e.g. "BGood" or "AExcellent")
    var elementary     = null, elementaryRating = null;
    var middle         = null, middleRating      = null;
    var high           = null, highRating        = null;
    var schoolDistrict = null;

    var elemMatch = md.match(/Elementary\s+School\s*\n+([\w\s]+School)\s*\n+([A-F])/i);
    if (!elemMatch) elemMatch = md.match(/Elementary\s+School\s*\n+([\w\s]+(?:Elementary|Primary)[^\n]*)/i);
    if (elemMatch) {
      elementary = elemMatch[1].trim();
      elementaryRating = elemMatch[2] ? elemMatch[2].trim() : null;
    }

    var midMatch = md.match(/Middle\s+School\s*\n+([\w\s]+(?:Intermediate|Middle|Junior)[^\n]*)\s*\n+([A-F])/i);
    if (!midMatch) midMatch = md.match(/Middle\s+School\s*\n+([\w\s]+(?:Intermediate|Middle|Junior)[^\n]*)/i);
    if (midMatch) {
      middle = midMatch[1].trim();
      middleRating = midMatch[2] ? midMatch[2].trim() : null;
    }

    var highMatch = md.match(/High\s+School\s*\n+([\w\s]+High\s+School[^\n]*)\s*\n+([A-F])/i);
    if (!highMatch) highMatch = md.match(/High\s+School\s*\n+([\w\s]+High\s+School[^\n]*)/i);
    if (highMatch) {
      high = highMatch[1].trim();
      highRating = highMatch[2] ? highMatch[2].trim() : null;
    }

    // School district from subdivision/area context
    var distMatch = md.match(/([A-Za-z\s]+(?:ISD|Independent School District))/i);
    if (distMatch) schoolDistrict = distMatch[1].trim();

    // ── MLS NUMBER ────────────────────────────────────────────────
    var mlsNumber = matchStr(md, /MLS#?\s*\n*([\d]+)/i);
    if (!mlsNumber) mlsNumber = matchStr(md, /MLS[#\s]+([\d]+)/i);

    // ── SHORT DESCRIPTION ─────────────────────────────────────────
    var descMatch = md.match(/About this property\s*\n+([\s\S]{100,350})/i);
    var description = descMatch ? descMatch[1].replace(/\n/g, ' ').substring(0, 280) + '…' : null;

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listPrice:        listPrice,
        beds:             beds,
        baths:            baths,
        sqft:             sqft,
        pricePerSqft:     pricePerSqft,
        lotAcres:         lotAcres,
        daysOnMarket:     daysOnMarket,
        yearBuilt:        yearBuilt,
        propertyType:     propertyType,
        subdivision:      subdivision,
        county:           county,
        hoa:              hoa,
        taxes:            taxes,
        taxRate:          taxRate,
        schoolDistrict:   schoolDistrict,
        schools: {
          elementary:     elementary,
          elementaryRating: elementaryRating,
          middle:         middle,
          middleRating:   middleRating,
          high:           high,
          highRating:     highRating
        },
        mlsNumber:        mlsNumber,
        description:      description,
        source:           'har'
      })
    };

  } catch (err) {
    console.error('har-property error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
