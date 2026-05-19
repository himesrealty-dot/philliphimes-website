// reLifeIQ™ — Deck Generator Relay
// Receives POST from rebalance.html → forwards to Google Apps Script
// Avoids browser CORS/redirect issues with Google Apps Script web apps

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby1vV7Fb-v_kihVyWi8czgRduPf21L7UedSx52d4Qm7BAlzUawTIBHh7CxsRhkoTV5Scw/exec';

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: event.body,
      redirect: 'follow'
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('Deck relay error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
