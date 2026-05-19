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

    // Extract the key metrics we need
    const saleData = data.saleData || {};
    const averages = saleData.averages || {};

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        zipCode:            zipCode,
        averagePrice:       averages.price          || null,
        medianPrice:        averages.pricePerSqFt   || null,
        averageDaysOnMarket: averages.daysOnMarket  || null,
        averagePricePerSqFt: averages.pricePerSqFt  || null,
        totalListings:      saleData.totalListings  || null,
        monthsOfSupply:     saleData.monthsOfSupply || null,
        lastUpdated:        data.lastUpdated        || null
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
