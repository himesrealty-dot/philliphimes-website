/**
 * agent-searches.js — create and manage IDX Broker saved searches for clients.
 * Backs Phil's private /agent/ page. Every action requires a signed-in session.
 *
 *   POST /.netlify/functions/agent-searches  { action, ...params }
 *
 * Actions:
 *   findLead      { email }                          → { leads: [...] }
 *   createLead    { firstName, lastName, email, phone? } → { leadID }
 *   listSearches  { leadID }                         → { searches: [...], info }
 *   createSearch  { leadID, searchName, searchUrl, receiveUpdates? } → { searchID, criteria }
 *   deleteSearch  { leadID, searchID }               → { deleted: true }
 *   fields        { leadID? }                        → IDX's own description of the
 *                                                       accepted lead / search fields
 *
 * How a search is defined: Phil builds the search on search.philliphimes.com,
 * copies the results-page URL, and pastes it. Its query string IS the IDX
 * search definition (idxID, pt, lp, hp, bd, tb, city[], ...), so every field
 * IDX supports works without this file knowing about it.
 *
 * IDX API (v1.8): https://middleware.idxbroker.com/docs/api/overview.php
 *   - header `accesskey`, body application/x-www-form-urlencoded
 *   - PUT creates, POST updates, DELETE removes
 *   - an empty PUT returns the list of accepted fields (used by `fields`)
 *
 * ── REQUIRED ENV VAR ──
 *   IDX_API_KEY   22-character access key from the IDX control panel (API Control).
 * Plus AGENT_PASSWORD / AGENT_SESSION_SECRET — see netlify/lib/agent-session.js.
 */

const session = require('../lib/agent-session');

// Override exists only for local testing against a mock server; leave unset in Netlify.
const IDX_BASE = process.env.IDX_API_BASE_OVERRIDE || 'https://api.idxbroker.com';

// Hosts a pasted search URL may come from.
const SEARCH_HOSTS = [/^search\.philliphimes\.com$/i, /\.idxbroker\.com$/i, /\.idxsecure\.com$/i];
// Paging / display params that aren't part of the search itself.
const NON_CRITERIA = new Set(['start', 'per', 'page', 'pg', 'view', 'mode']);

// ── IDX helpers ─────────────────────────────────────────────────────────────

class IdxError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const IDX_STATUS_MESSAGES = {
  400: 'IDX rejected the request (a required field is missing or invalid).',
  401: 'IDX says the API key is not valid or was revoked.',
  403: 'IDX says this API method is not available on your account.',
  406: 'The IDX API key is missing.',
  409: 'IDX says that record already exists.',
  412: 'The IDX hourly API limit has been reached. Try again in a bit.',
  500: 'IDX returned a system error.',
  503: 'IDX is down for maintenance. Try again shortly.',
};

async function idx(method, path, form) {
  const key = process.env.IDX_API_KEY;
  if (!key) throw new IdxError(503, 'IDX_API_KEY is not set in Netlify.');

  const res = await fetch(IDX_BASE + path, {
    method,
    headers: {
      accesskey: key,
      outputtype: 'json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form === undefined ? undefined : form,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const detail = typeof data === 'string' ? data : data && (data.message || data.error);
    const base = IDX_STATUS_MESSAGES[res.status] || `IDX returned HTTP ${res.status}.`;
    // Report upstream failures as 502 so the page never mistakes IDX's
    // 401 (bad API key) for an expired agent session.
    const err = new IdxError(502, detail ? `${base} (${String(detail).slice(0, 200)})` : base);
    err.upstream = res.status;
    throw err;
  }
  return data;
}

/** Turn whatever shape GET /leads/lead returns into a flat array of leads. */
function normalizeLeads(data) {
  if (!data) return [];
  let list = data;
  if (!Array.isArray(list) && Array.isArray(data.data)) list = data.data;
  if (!Array.isArray(list) && typeof list === 'object') {
    list = 'id' in list || 'leadID' in list ? [list] : Object.values(list);
  }
  return (Array.isArray(list) ? list : [])
    .filter((l) => l && typeof l === 'object')
    .map((l) => ({
      leadID: String(l.id ?? l.leadID ?? ''),
      firstName: l.firstName || '',
      lastName: l.lastName || '',
      email: l.email || '',
      phone: l.phone || '',
      subscribeDate: l.subscribeDate || '',
    }))
    .filter((l) => l.leadID);
}

function normalizeSearches(data) {
  if (!data || typeof data !== 'object') return { searches: [], info: null };
  let list = data.searchInformation ?? data;
  if (list && !Array.isArray(list) && typeof list === 'object') list = Object.values(list);
  const searches = (Array.isArray(list) ? list : [])
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      searchID: String(s.id ?? s.searchID ?? ''),
      searchName: s.searchName || s.name || '(unnamed)',
      receiveUpdates: s.receiveUpdates ?? null,
      created: s.created || s.timestamp || '',
      criteria: s.search || s.searchQuery || s.queryString || null,
    }))
    .filter((s) => s.searchID);
  return { searches, info: data.info || null };
}

// ── Search URL → IDX form body ──────────────────────────────────────────────

/**
 * Parse a pasted IDX results URL into a criteria object, e.g.
 *   ?idxID=d025&pt=sfr&lp=300000&city[]=1234&city[]=5678
 *   → { idxID: 'd025', pt: 'sfr', lp: '300000', city: ['1234', '5678'] }
 */
function parseSearchUrl(raw) {
  let url;
  try {
    url = new URL(String(raw || '').trim());
  } catch {
    throw new IdxError(400, 'That doesn’t look like a full URL. Copy it from the browser address bar.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new IdxError(400, 'The search link must be a web address.');
  }
  if (!SEARCH_HOSTS.some((re) => re.test(url.hostname))) {
    throw new IdxError(400, 'Paste a results link from search.philliphimes.com.');
  }

  const criteria = {};
  for (const [rawKey, value] of url.searchParams) {
    if (value === '') continue;
    const isArray = /\[\d*\]$/.test(rawKey);
    const key = rawKey.replace(/\[\d*\]$/, '');
    if (!key || NON_CRITERIA.has(key)) continue;
    if (!/^[A-Za-z0-9_]+$/.test(key)) continue; // ignore anything odd
    if (isArray) {
      (criteria[key] = Array.isArray(criteria[key]) ? criteria[key] : []).push(value);
    } else {
      criteria[key] = value;
    }
  }

  if (!criteria.idxID) {
    throw new IdxError(
      400,
      'That link has no search criteria in it. Run the search, then copy the URL of the results page.'
    );
  }
  return criteria;
}

/** Same encoding as PHP's http_build_query, which the IDX docs use. */
function buildSearchForm({ searchName, criteria, receiveUpdates }) {
  const p = new URLSearchParams();
  p.append('searchName', searchName);
  if (receiveUpdates !== undefined) p.append('receiveUpdates', receiveUpdates ? 'y' : 'n');
  for (const [key, value] of Object.entries(criteria)) {
    if (Array.isArray(value)) {
      value.forEach((v, i) => p.append(`search[${key}][${i}]`, v));
    } else {
      p.append(`search[${key}]`, value);
    }
  }
  return p.toString();
}

// ── Validation ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireId(value, label) {
  const s = String(value ?? '').trim();
  if (!/^\d+$/.test(s)) throw new IdxError(400, `Missing or invalid ${label}.`);
  return s;
}

function cleanText(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

// ── Actions ─────────────────────────────────────────────────────────────────

const actions = {
  async findLead({ email }) {
    const e = cleanText(email, 200).toLowerCase();
    if (!EMAIL_RE.test(e)) throw new IdxError(400, 'Enter a valid email address.');
    const data = await idx('GET', `/leads/lead?email=${encodeURIComponent(e)}`);
    // The email filter is exact-match per the docs; re-check in case an
    // account/version ignores it and returns the full list.
    const leads = normalizeLeads(data).filter((l) => l.email.toLowerCase() === e);
    return { leads };
  },

  async createLead({ firstName, lastName, email, phone }) {
    const f = cleanText(firstName, 60);
    const l = cleanText(lastName, 60);
    const e = cleanText(email, 200).toLowerCase();
    const ph = cleanText(phone, 30).replace(/[^\d+]/g, '');
    if (!f || !l) throw new IdxError(400, 'First and last name are required.');
    if (!EMAIL_RE.test(e)) throw new IdxError(400, 'Enter a valid email address.');

    // Don't create a duplicate if the client already has an account.
    const existing = await actions.findLead({ email: e });
    if (existing.leads.length) {
      return { leadID: existing.leads[0].leadID, existed: true };
    }

    const form = new URLSearchParams({ firstName: f, lastName: l, email: e });
    if (ph) form.append('phone', ph);
    try {
      const data = await idx('PUT', '/leads/lead', form.toString());
      const leadID = String((data && (data.newID ?? data.leadID ?? data.id)) ?? data ?? '');
      if (!/^\d+$/.test(leadID)) throw new IdxError(502, 'IDX did not return a lead ID.');
      return { leadID, existed: false };
    } catch (err) {
      if (err.upstream === 500) {
        // Per IDX docs, most 500s on lead create are a rejected email
        // (bad format or the domain has no mail server).
        throw new IdxError(400, 'IDX rejected that email address. Double-check it with the client.');
      }
      throw err;
    }
  },

  async listSearches({ leadID }) {
    const id = requireId(leadID, 'lead ID');
    const data = await idx('GET', `/leads/search/${id}`);
    return normalizeSearches(data);
  },

  async createSearch({ leadID, searchName, searchUrl, receiveUpdates = true }) {
    const id = requireId(leadID, 'lead ID');
    const name = cleanText(searchName, 100);
    if (!name) throw new IdxError(400, 'Give the search a name.');
    const criteria = parseSearchUrl(searchUrl);
    const form = buildSearchForm({ searchName: name, criteria, receiveUpdates: Boolean(receiveUpdates) });
    const data = await idx('PUT', `/leads/search/${id}`, form);
    const searchID = String((data && (data.newID ?? data.searchID ?? data.id)) ?? data ?? '');
    return { searchID: /^\d+$/.test(searchID) ? searchID : null, criteria };
  },

  async deleteSearch({ leadID, searchID }) {
    const id = requireId(leadID, 'lead ID');
    const sid = requireId(searchID, 'search ID');
    await idx('DELETE', `/leads/search/${id}/${sid}`);
    return { deleted: true };
  },

  /** Diagnostics: ask IDX which fields it accepts (empty PUT returns the schema). */
  async fields({ leadID }) {
    const out = { lead: await idx('PUT', '/leads/lead', '') };
    if (leadID) out.search = await idx('PUT', `/leads/search/${requireId(leadID, 'lead ID')}`, '');
    return out;
  },
};

// ── Handler ─────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return session.json(405, { error: 'Method not allowed' });
  if (!session.originAllowed(event)) return session.json(403, { error: 'Forbidden' });
  if (!session.configured()) {
    return session.json(503, { error: 'Agent tools are not set up yet (missing environment variables).' });
  }
  if (!session.hasSession(event)) return session.json(401, { error: 'Please sign in again.' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return session.json(400, { error: 'Bad request' });
  }

  const fn = Object.prototype.hasOwnProperty.call(actions, body.action) && actions[body.action];
  if (!fn) return session.json(400, { error: 'Unknown action' });

  try {
    return session.json(200, await fn(body));
  } catch (err) {
    const status = err instanceof IdxError ? err.status : 500;
    if (!(err instanceof IdxError)) console.error('agent-searches error:', err);
    return session.json(status >= 400 && status < 600 ? status : 500, {
      error: err instanceof IdxError ? err.message : 'Something went wrong. Try again.',
    });
  }
};

// Exposed for local tests only.
exports._test = { parseSearchUrl, buildSearchForm, normalizeLeads, normalizeSearches };
