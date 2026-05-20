// MarketIQ™ — Mapbox Places Geocoding Proxy
// Supports two modes:
//   Forward:  ?q=QUERY                     → search by text (zip/city/neighborhood)
//   Reverse:  ?lat=29.4831&lng=-95.0944    → get primary zip for coordinates

exports.handler = async function(event) {
  const params = event.queryStringParameters || {};
  const token  = process.env.MAPBOX_TOKEN;

  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Mapbox token not configured' }) };
  }

  // ── REVERSE MODE: lat + lng → find the primary postcode ──────────────────
  if (params.lat && params.lng) {
    try {
      var coord = encodeURIComponent(params.lng + ',' + params.lat);
      var revUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
        + coord
        + '.json?access_token=' + token
        + '&types=postcode'
        + '&limit=1';

      var revRes  = await fetch(revUrl);
      var revData = await revRes.json();
      var zip     = null;
      var feat    = (revData.features || [])[0];
      if (feat && feat.place_type && feat.place_type.includes('postcode')) {
        zip = feat.text;
      }

      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode: zip })
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ zipCode: null, error: err.message })
      };
    }
  }

  // ── FORWARD MODE: text → places autocomplete ─────────────────────────────
  const q = params.q || '';
  if (!q || q.length < 2) {
    return { statusCode: 400, body: JSON.stringify({ features: [] }) };
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

    const features = (data.features || []).map(function(f) {
      var zip = null;

      // Feature IS a postcode
      if (f.place_type && f.place_type.includes('postcode')) {
        zip = f.text;
      }

      // Look in context for a postcode entry
      if (!zip && f.context) {
        var postcodeCtx = f.context.find(function(c) {
          return c.id && (
            c.id.startsWith('postcode') ||
            c.id.indexOf('.postcode') !== -1 ||
            c.id.startsWith('us-zip')
          );
        });
        if (postcodeCtx) zip = postcodeCtx.text;
      }

      // Fallback: extract 5-digit zip from place_name string
      if (!zip && f.place_name) {
        var zipMatch = f.place_name.match(/\b(\d{5})\b/);
        if (zipMatch) zip = zipMatch[1];
      }

      return Object.assign({}, f, { zipCode: zip });
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
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
