/**
 * agent-session.js — shared auth helpers for Phil's private /agent/ tools.
 *
 * Stateless sessions: after a correct passphrase, the browser gets an
 * HttpOnly cookie holding "<expiry>.<hmac>". No database needed. Rotating
 * AGENT_SESSION_SECRET signs every device out at once.
 *
 * ── REQUIRED ENV VARS (Netlify → Site configuration → Environment variables) ──
 *   AGENT_PASSWORD         The passphrase Phil types on /agent/. Use a long one.
 *   AGENT_SESSION_SECRET   Random string used to sign the cookie. Generate one:
 *                          node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Both unset → every agent endpoint refuses with 503 (fails closed).
 */

const crypto = require('crypto');

const COOKIE = 'phh_agent';
const SESSION_HOURS = 12;

const ALLOWED_ORIGINS = [
  'https://philliphimes.com',
  'https://www.philliphimes.com',
  'http://localhost:8888', // netlify dev
];

function configured() {
  return Boolean(process.env.AGENT_PASSWORD && process.env.AGENT_SESSION_SECRET);
}

function sign(value) {
  return crypto
    .createHmac('sha256', process.env.AGENT_SESSION_SECRET)
    .update(value)
    .digest('hex');
}

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Compare passphrases via their HMACs so length differences don't leak. */
function passwordMatches(input) {
  if (!configured() || typeof input !== 'string' || !input) return false;
  return safeEqual(sign('pw:' + input), sign('pw:' + process.env.AGENT_PASSWORD));
}

function readCookie(event) {
  const header = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE) return rest.join('=');
  }
  return '';
}

function isLocal(event) {
  const host = (event.headers && (event.headers.host || '')) || '';
  return /^localhost(:\d+)?$/.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host);
}

function sessionCookie(event) {
  const expires = Date.now() + SESSION_HOURS * 3600 * 1000;
  const payload = String(expires);
  const value = `${payload}.${sign('session:' + payload)}`;
  const secure = isLocal(event) ? '' : ' Secure;';
  return `${COOKIE}=${value}; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}`;
}

function clearCookie(event) {
  const secure = isLocal(event) ? '' : ' Secure;';
  return `${COOKIE}=; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=0`;
}

function hasSession(event) {
  if (!configured()) return false;
  const raw = readCookie(event);
  const dot = raw.indexOf('.');
  if (dot < 1) return false;
  const payload = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  if (!safeEqual(mac, sign('session:' + payload))) return false;
  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

/**
 * Same-origin guard for state-changing requests. SameSite=Strict already
 * keeps the cookie off cross-site requests; this is a second lock.
 */
function originAllowed(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  if (!origin) return true; // same-origin fetches from some browsers omit it on GET
  return ALLOWED_ORIGINS.includes(origin);
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

module.exports = {
  configured,
  passwordMatches,
  sessionCookie,
  clearCookie,
  hasSession,
  originAllowed,
  json,
};
