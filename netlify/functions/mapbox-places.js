// MarketIQ™ — Mapbox Places Geocoding Proxy
// Searches for zip codes, cities, and neighborhoods
// Called by sellers.html MarketIQ tool: /.netlify/functions/mapbox-places?q=QUERY

exports.handler = async function(event) {
  const q = (event.queryStringParameters && event.queryStringParameters.q) || '';
  if (!q || q.length < 2) {
    return {
      statusCode: 400,
      body: JSON.stringify({ features: [] })
    };
  }

  const token = process.env.MAPBOX_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Mapbox token not configured' })
    };
  }

  try {
    const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
      + encodeURIComponent(q)
      + '.json?access_token=' + token
      + '&autocomplete=true'
      + '&country=US'
      + '&types=postcode,place,neighborhood,locality'
      + '&proximity=-95.22,29.73';

    const res  = await fetch(url);
    const data = await res.json();

    // Enhance each feature with extracted zip code
    const features = (data.features || []).map(function(f) {
      var zip = null;

      // If the feature itself is a postcode
      if (f.place_type && f.place_type.includes('postcode')) {
        zip = f.text;
      }

      // Otherwise look in context for postcode
      if (!zip && f.context) {
        var postcodeCtx = f.context.find(function(c) {
          return c.id && c.id.startsWith('postcode');
        });
        if (postcodeCtx) zip = postcodeCtx.text;
      }

      return Object.assign({}, f, { zipCode: zip });
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ features: features })
    };
  } catch (err) {
    console.error('Mapbox places error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ features: [], error: err.message })
    };
  }
};
