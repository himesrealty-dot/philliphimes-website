// MarketIQ™ — Zillow Property Data via Firecrawl
// Accepts: ?address=3870 Summer Manor Dr League City TX 77573
// Returns: zestimate, listPrice, beds, baths, sqft, pricePerSqft,
//          daysOnMarket, floodZone, floodDetail, schools, description

exports.handler = async function(event) {
  const params  = event.queryStringParameters || {};
  const address = (params.address || '').trim();

  if (!address) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Address is required' })
    };
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Firecrawl API key not configured' })
    };
  }

  // Build Zillow search URL from address
  // e.g. "3870 Summer Manor Dr League City TX 77573"
  //   → "3870-Summer-Manor-Dr-League-City-TX-77573"
  const slug     = address.replace(/,/g, '').replace(/\s+/g, '-');
  const zillowUrl = 'https://www.zillow.com/homes/' + encodeURIComponent(slug) + '_rb/';

  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method:  'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        url:     zillowUrl,
        formats: ['extract'],
        extract: {
          prompt: [
            'Extract the following fields from this Zillow property page:',
            '- zestimate: the Zestimate value as a number (no $ or commas)',
            '- listPrice: the list/asking price as a number',
            '- beds: number of bedrooms as a number',
            '- baths: number of bathrooms as a number',
            '- sqft: total square footage as a number',
            '- pricePerSqft: price per square foot as a number',
            '- daysOnMarket: days on market as a number',
            '- yearBuilt: year built as a number',
            '- floodZone: FEMA flood zone code (e.g. "Zone X", "Zone AE")',
            '- floodDetail: the full flood zone description sentence from the page',
            '- schoolDistrict: the school district name',
            '- elementarySchool: name of the elementary school',
            '- middleSchool: name of the middle/intermediate school',
            '- highSchool: name of the high school',
            '- propertyType: property type (e.g. Single Family, Condo)',
            '- description: first 2 sentences of the property description'
          ].join('\n')
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Firecrawl error:', res.status, errText);
      return {
        statusCode: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Could not retrieve property data' })
      };
    }

    const result = await res.json();

    // Firecrawl returns extracted data under result.extract or result.data.extract
    const extracted = result.extract || (result.data && result.data.extract) || {};

    // Normalise numeric fields — strip any stray $ , chars if Firecrawl returns strings
    function num(v) {
      if (v === null || v === undefined) return null;
      var n = Number(String(v).replace(/[$,]/g, ''));
      return isNaN(n) ? null : n;
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        zestimate:      num(extracted.zestimate),
        listPrice:      num(extracted.listPrice),
        beds:           num(extracted.beds),
        baths:          num(extracted.baths),
        sqft:           num(extracted.sqft),
        pricePerSqft:   num(extracted.pricePerSqft),
        daysOnMarket:   num(extracted.daysOnMarket),
        yearBuilt:      num(extracted.yearBuilt),
        floodZone:      extracted.floodZone      || null,
        floodDetail:    extracted.floodDetail    || null,
        schoolDistrict: extracted.schoolDistrict || null,
        schools: {
          elementary: extracted.elementarySchool || null,
          middle:     extracted.middleSchool     || null,
          high:       extracted.highSchool       || null
        },
        propertyType:   extracted.propertyType   || null,
        description:    extracted.description    || null,
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
