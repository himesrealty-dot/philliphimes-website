// reLifeIQ™ — Mapbox Geocoding Proxy
// Keeps the Mapbox token server-side in Netlify env vars
// Called by sellers.html: /.netlify/functions/mapbox-geocode?q=ADDRESS

exports.handler = async function(event) {
  const q = (event.queryStringParameters && event.queryStringParameters.q) || '';
  if (!q || q.length < 3) {
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
      + '&autocomplete=true&country=US&types=address'
      + '&proximity=-95.22,29.73';

    const res  = await fetch(url);
    const data = await res.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    console.error('Mapbox geocode error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ features: [], error: err.message })
    };
  }
};
