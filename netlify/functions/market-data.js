// MarketIQ™ — Market Statistics
// Receives zipCode → calls Rentcast /v1/markets → returns market data

exports.handler = async function(event) {
  const params  = event.queryStringParameters || {};
  const zipCode = params.zipCode || '';

  if (!zipCode) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Zip code is required' })
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
    const url = 'https://api.rentcast.io/v1/markets?zipCode='
      + encodeURIComponent(zipCode)
      + '&dataType=Sale&historyRange=6';

    const res  = await fetch(url, {
      headers: {
        'X-Api-Key': token,
        'Accept':    'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Rentcast market error:', res.status, err);
      return {
        statusCode: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Could not retrieve market data for this area' })
      };
    }

    const data = await res.json();

    // Log the raw response so we can see what Rentcast is actually returning
    console.log('Rentcast raw response keys:', JSON.stringify(Object.keys(data)));
    console.log('Rentcast raw response:', JSON.stringify(data).slice(0, 800));

    // Rentcast /v1/markets response structure varies by plan.
    // Check top-level fields first, then nested saleData, then saleData.averages.
    const saleData = data.saleData || {};
    const averages = saleData.averages || {};

    function pick() {
      for (var i = 0; i < arguments.length; i++) {
        var v = arguments[i];
        if (v !== null && v !== undefined && v !== '' && !isNaN(Number(v))) return v;
      }
      return null;
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        zipCode:             zipCode,
        averagePrice:        pick(data.averagePrice,        saleData.averagePrice,        averages.price),
        averageDaysOnMarket: pick(data.averageDaysOnMarket, saleData.averageDaysOnMarket, averages.daysOnMarket),
        averagePricePerSqFt: pick(data.averagePricePerSqFt, saleData.averagePricePerSqFt, averages.pricePerSqFt),
        totalListings:       pick(data.totalListings,       saleData.totalListings),
        monthsOfSupply:      pick(data.monthsOfSupply,      saleData.monthsOfSupply),
        lastUpdated:         data.lastUpdated || null,
        // Debug: expose what we actually received (remove after confirming)
        _debug: { keys: Object.keys(data), saleDataKeys: Object.keys(saleData) }
      })
    };
  } catch (err) {
    console.error('Market data error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
