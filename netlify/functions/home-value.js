// reLifeIQ™ — Home Value Estimator
// Receives address from sellers.html → calls Rentcast AVM → returns estimate

exports.handler = async function(event) {
  const params = event.queryStringParameters || {};
  const address = params.address || '';

  if (!address) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Address is required' })
    };
  }

  const token = process.env.RENTCAST_API_KEY;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Rentcast API key not configured' })
    };
  }

  try {
    const url = 'https://api.rentcast.io/v1/avm/value?address='
      + encodeURIComponent(address);

    const res  = await fetch(url, {
      headers: {
        'X-Api-Key': token,
        'Accept':    'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Rentcast error:', res.status, err);
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: 'Could not retrieve estimate for this address' })
      };
    }

    const data = await res.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        price:      data.price,
        priceRangeLow:  data.priceRangeLow,
        priceRangeHigh: data.priceRangeHigh,
        latitude:   data.latitude,
        longitude:  data.longitude
      })
    };
  } catch (err) {
    console.error('Home value error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
