// reLifeIQ™ — Amplify Deck Generator Relay
// Receives POST from amplify.html → forwards to Google Apps Script

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyG3Ruoy_-kpmLI4ubNUTTi_rsmyXW7BnHC9T5mtNI9FnjyaDJa27vrS4zGc0OvX7heRg/exec';

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    await fetch(SCRIPT_URL, {
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
    console.error('Amplify deck relay error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
