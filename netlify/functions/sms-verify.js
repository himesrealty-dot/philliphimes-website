/**
 * sms-verify.js — Netlify Serverless Function
 * Amplify™ | reLifeIQ™ | philliphimes.com
 *
 * Handles SMS verification for the Amplify lead capture flow.
 * Generates a 4-digit code, sends it via Twilio SMS, and validates
 * submissions using a stateless HMAC token (no database needed).
 *
 * ── REQUIRED ENV VARS (set in Netlify → Site Settings → Environment Variables) ──
 *
 *   SMS_VERIFY_SECRET       Random string used to sign tokens. Generate one:
 *                           node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 *   TWILIO_ACCOUNT_SID      From your Twilio console (starts with AC...)
 *   TWILIO_AUTH_TOKEN       From your Twilio console
 *   TWILIO_FROM_NUMBER      Your Twilio phone number in E.164 format: +18325360000
 *
 * ── OPTIONAL ──
 *   SMS_VERIFY_EXPIRY_MS    Code expiry in milliseconds. Default: 600000 (10 min)
 *
 * ── DEV MODE ──
 * If Twilio env vars are not set, the function runs in dev mode:
 *   - Code is logged to Netlify function logs (visible in Netlify dashboard)
 *   - A valid token is still returned so the full UI flow can be tested
 *   - The browser UI will work end-to-end; you enter the code from the logs
 */

const crypto = require('crypto');

const SECRET  = process.env.SMS_VERIFY_SECRET || 'amplify-dev-secret-set-SMS_VERIFY_SECRET-in-netlify';
const EXPIRY  = parseInt(process.env.SMS_VERIFY_EXPIRY_MS || '600000', 10); // 10 min default

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_FROM_NUMBER;

const ALLOWED_ORIGINS = [
  'https://philliphimes.com',
  'https://www.philliphimes.com',
  'http://localhost:8888', // Netlify dev
  'http://localhost:3000'
];

// ── HELPERS ──────────────────────────────────────────────────────────────────

function generateCode() {
  // Cryptographically random 4-digit code (1000–9999)
  const buf = crypto.randomBytes(4);
  return (1000 + (buf.readUInt32BE(0) % 9000)).toString();
}

function makeToken(digits, code, ts) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`${digits}:${code}:${ts}`)
    .digest('hex');
}

async function sendViaTwilio(digits, code) {
  const toE164   = '+1' + digits;
  const fromNum  = TWILIO_FROM;
  const message  = `Your Amplify™ verification code is: ${code}\n\nExpires in 10 minutes.\n\n- Phil Himes Real Estate`;
  const auth     = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
  const formBody = [
    `To=${encodeURIComponent(toE164)}`,
    `From=${encodeURIComponent(fromNum)}`,
    `Body=${encodeURIComponent(message)}`
  ].join('&');

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formBody
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twilio ${res.status}: ${errBody}`);
  }
  return true;
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Content-Type':                 'application/json',
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function respond(statusCode, body, origin) {
  return { statusCode, headers: corsHeaders(origin), body: JSON.stringify(body) };
}

// ── HANDLER ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const origin = event.headers['origin'] || event.headers['Origin'] || '';

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(origin), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'Method not allowed' }, origin);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { error: 'Invalid JSON body' }, origin);
  }

  const { action, phone, code, token, timestamp } = body;
  const digits = (phone || '').replace(/\D/g, '');

  // ── SEND ──────────────────────────────────────────────────────────────────
  if (action === 'send') {
    if (!digits || digits.length !== 10) {
      return respond(400, { error: 'A valid 10-digit US phone number is required.' }, origin);
    }

    const verifyCode = generateCode();
    const ts         = Date.now();
    const tok        = makeToken(digits, verifyCode, ts);
    let   sent       = false;

    if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
      try {
        await sendViaTwilio(digits, verifyCode);
        sent = true;
      } catch (err) {
        // Log error but don't expose internals to the browser
        console.error('[sms-verify] Twilio send failed:', err.message);
      }
    } else {
      // DEV MODE — find this in Netlify Function logs
      console.log(`[sms-verify DEV] Code for +1${digits} → ${verifyCode}`);
    }

    return respond(200, { token: tok, timestamp: ts, sent }, origin);
  }

  // ── VERIFY ────────────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!digits || !code || !token || !timestamp) {
      return respond(400, { error: 'Missing required fields: phone, code, token, timestamp' }, origin);
    }

    // Check expiry first (cheap)
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > EXPIRY || age < 0) {
      return respond(200, { valid: false, reason: 'expired' }, origin);
    }

    // Constant-time token comparison (prevents timing attacks)
    const expected = makeToken(digits, code.trim(), parseInt(timestamp, 10));
    let valid = false;
    try {
      // Both buffers must be same length for timingSafeEqual
      const bufA = Buffer.from(token.padEnd(64, '0').slice(0, 64), 'hex');
      const bufB = Buffer.from(expected.padEnd(64, '0').slice(0, 64), 'hex');
      valid = crypto.timingSafeEqual(bufA, bufB) && token === expected;
    } catch {
      valid = false;
    }

    return respond(200, { valid }, origin);
  }

  // ── UNKNOWN ACTION ────────────────────────────────────────────────────────
  return respond(400, { error: 'Unknown action. Expected "send" or "verify".' }, origin);
};
