/**
 * agent-auth.js — sign in / sign out / status for Phil's private /agent/ tools.
 *
 *   GET  /.netlify/functions/agent-auth            → { signedIn, configured }
 *   POST /.netlify/functions/agent-auth  {password} → sets session cookie
 *   POST /.netlify/functions/agent-auth  {logout:true} → clears it
 *
 * Env vars: see netlify/lib/agent-session.js.
 */

const session = require('../lib/agent-session');

exports.handler = async function (event) {
  if (event.httpMethod === 'GET') {
    return session.json(200, {
      signedIn: session.hasSession(event),
      configured: session.configured(),
    });
  }

  if (event.httpMethod !== 'POST') {
    return session.json(405, { error: 'Method not allowed' });
  }
  if (!session.originAllowed(event)) {
    return session.json(403, { error: 'Forbidden' });
  }
  if (!session.configured()) {
    return session.json(503, { error: 'Agent sign-in is not set up yet (missing environment variables).' });
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return session.json(400, { error: 'Bad request' });
  }

  if (body.logout) {
    return session.json(200, { signedIn: false }, { 'Set-Cookie': session.clearCookie(event) });
  }

  if (!session.passwordMatches(body.password)) {
    // Slow down guessing. Functions are stateless, so this is a speed bump,
    // not a lockout — the real protection is a long passphrase.
    await new Promise((r) => setTimeout(r, 1500));
    return session.json(401, { error: 'Incorrect passphrase.' });
  }

  return session.json(200, { signedIn: true }, { 'Set-Cookie': session.sessionCookie(event) });
};
