# Closing Portal — Architecture & Decision Doc

**Status:** Design proposal. *Nothing in here is built yet.* The current `/closing/` page stays live and untouched until Phil approves a direction.
**Author:** Claude Code design pass, 2026-11-15.
**Audience:** Phil, plus whoever owns the BrokerIQ transaction-coordinator repo.

---

## 1. What exists today (the "bandaid")

`closing/index.html` in *this* repo is served at `https://philliphimes.com/closing/?k=<key>`. The BrokerIQ transaction-coordinator (TC) agent texts that link to a client. The page:

1. reads `?k=` from the URL,
2. fetches `https://brokeriq-agentic-system-production.up.railway.app/closing-data?k=<key>` **client-side**,
3. renders a seller **or** buyer timeline by branching on the payload's `side` field.

**Data contract (unchanged target):**
```
{ status, side, client_first_name, address,
  dates:[{label,date}], completed_steps, update_notes,
  title:{name,phone}, lender }
```

**Protection today:** `X-Robots-Tag: noindex` + `Referrer-Policy: no-referrer` (the `netlify.toml` `/closing/*` header block) + an unguessable key. The BrokerIQ endpoint's CORS is locked to the `https://philliphimes.com` origin.

It works. It rendered a real seller (388 Dover Lane) in prod. Phil's read is right, though: *"a bandaid, not a complete fix that can stand on its own."*

### Why it's a bandaid — the four real problems

| # | Problem | Consequence |
|---|---------|-------------|
| **1** | **No authentication.** The key *is* the credential — a bearer token sitting in a URL. | Anyone who gets the link (forwarded text, screenshot, phone-carrier link preview, shoulder-surf, browser history on a shared device) sees the client's **name, address, closing dates, and the title company's name + phone**. The repo itself already says the quiet part: this is *"search hygiene, NOT access control."* |
| **2** | **A per-transaction client portal is coupled to the marketing site.** | Every closing-portal change ships through the brochure site's repo and Netlify deploy. The blast radius of a portal bug includes the public site, and vice-versa. Different thing, different cadence, different risk profile — same pipeline. |
| **3** | **Prod-only testability.** The CORS origin lock means `*.netlify.app` deploy previews and `localhost` are blocked. | The only real end-to-end test is *after* merging to the live domain. You can't safely iterate. |
| **4** | **The key leaks by design.** A URL query param is the single worst place to put a secret — it lands in referrers, server logs, analytics, and SMS link-preview fetchers. | Even without problem #1, the one credential is in the most-logged part of the request. |

**The key insight:** problems #1 and #4 (auth) are *independent* from problem #2 (coupling). CORS does **not** fix either — CORS only restricts which *browser origins* may read a response; a plain `curl` with the key ignores CORS completely. So today the key is the *only* real gate, and it's a permanent, un-expiring, un-revocable bearer token.

---

## 2. A relevant asset you already own

This matters enough to call out before the recommendation: **the marketing site already runs Netlify Functions**, and one of them is `netlify/functions/sms-verify.js` — a working **Twilio SMS one-time-passcode** flow that validates codes with a **stateless HMAC token (no database)**. It already keeps an `ALLOWED_ORIGINS` list and a signed-token expiry.

Translation: the hardest pieces of a real auth gate — serverless runtime, an SMS sender, and a DB-free signed-token scheme — are **already built, paid for, and deployed on this exact infrastructure.** The "real" portal is mostly assembly, not invention.

---

## 3. The target architecture (recommended)

```
  Client's phone
        │  taps the texted link
        ▼
  closings.philliphimes.com/?k=<key>         ← separate Netlify project + subdomain
        │  (static shell: brand + renderer, NO data yet)
        ▼
  [ Auth gate ]  "To protect your information, confirm the phone number
        │          Phil has on file." → OTP sent to that phone
        ▼
  /api/session   (serverless function, same project)
        │  • verifies OTP
        │  • sets an HttpOnly, Secure, SameSite=Strict session cookie,
        │    short TTL, scoped to this one transaction key
        ▼
  /api/closing-data   (serverless function)
        │  • requires the valid session cookie
        │  • calls BrokerIQ **server-to-server** with a shared secret
        │    (the browser NEVER calls BrokerIQ, and the key never rides a URL to it)
        ▼
  BrokerIQ /closing-data  (unchanged contract)
        │  returns { status, side, client_first_name, ... }
        ▼
  Existing renderer draws the seller/buyer timeline client-side
```

Three properties make this "stand on its own":

- **The browser never touches BrokerIQ.** The serverless proxy does, server-to-server. That single change dissolves problem #3 (no browser Origin to lock, so previews and localhost work against a *staging* BrokerIQ or a mock) and problem #4 (the key travels in a server-side request body/header, not a client URL that gets logged).
- **PII is gated.** No name, address, or title-company contact reaches the browser until the session cookie exists. Problem #1 solved.
- **It's its own thing.** Separate repo, separate deploy, separate secrets, its own strict CSP. Problem #2 solved.

### The renderer barely changes

This is the best part of the reuse story. The existing `renderActive()` + the `SOP_SELLER`/`SOP_BUYER`/`LISTS_*` maps + the shape-tolerant normalizers (`doneSet`, `notesMap`, `norm`) port over **verbatim**. The *only* change to the view layer is the data source:

```diff
- fetch(ENDPOINT + '?k=' + encodeURIComponent(k), { credentials:'omit', ... })
+ fetch('/api/closing-data', { credentials:'same-origin' })   // key is in the session cookie now
```

Roughly 100% of the ~400 lines of approved copy and rendering logic survives. We're changing the plumbing under a finished faucet.

---

## 4. The decisions, each with a recommendation

### 4.1 Separate repo + separate Netlify project? → **Yes.**

**Recommend:** a new repo (`philliphimes-closings` or similar) deployed as its own Netlify site.

- **For:** independent deploy cadence; isolated blast radius; its own environment variables and secrets (the BrokerIQ shared secret should *not* share a project with the public marketing build); a strict, portal-specific CSP and header set; auth cookies scoped to a subdomain that carries nothing else.
- **Against:** a second repo and deploy to maintain; brand tokens (`--navy`, `--gold`, fonts) get duplicated. Minor — the portal is one page and a couple of functions, and the brand tokens are ~10 CSS variables that rarely change.

**Honest caveat / the faster path:** because the auth machinery already lives on the marketing site (§2), the *single highest-value fix* — closing the auth hole — could ship on the **current** site infra first (add the function + gate under `/closing/`), and the repo split can follow. See the phasing in §5. The target is the subdomain; the first commit doesn't have to be.

### 4.2 Dedicated subdomain + the CORS change it implies → **Yes: `closings.philliphimes.com`.**

- Clean, client-facing URL ("closings dot …" is speakable and trustworthy).
- Cookie isolation: the session cookie lives on `closings.philliphimes.com` and is never sent to the marketing site or any of its functions.
- **The CORS change on BrokerIQ depends on which model wins:**
  - **Server-to-server proxy (recommended):** the browser never calls BrokerIQ, so **there is no browser Origin to allow — the CORS origin lock becomes irrelevant to the client.** BrokerIQ instead authenticates the *proxy* (shared secret / mTLS / service token). This is strictly better: CORS was never access control anyway.
  - **If BrokerIQ keeps being called directly from the browser** (not recommended): then BrokerIQ must add `https://closings.philliphimes.com` to its allowed origins, and *also* add a staging origin so previews can be tested. This keeps the bearer-key-in-URL problem alive, so it's a fallback only.

### 4.3 Auth model → **OTP to the phone the TC already has, layered on the key.**

The TC agent *texts* the client — so it already holds a verified mobile number for every deal. That's the identity to lean on.

**Recommend:** keep the unguessable key as the **transaction router** (which closing to load), but gate the *data* behind a second factor the client already possesses: a **6-digit OTP sent to the phone on file**, verified by the proxy, which then mints a short-lived session.

Why this over the alternatives:

| Option | Verdict |
|--------|---------|
| **Phone OTP (recommended — and now built on the BrokerIQ side, §6)** | Low friction, familiar (every bank does it). "Possession of the link **+** possession of the phone." The client needs no password and nothing to remember. **BrokerIQ sends the code** (it owns the phone + GHL), so the phone and raw code never reach the portal; the portal reuses the `sms-verify.js` HMAC pattern only to **sign its own session cookie**. |
| **Magic link** | The link *is* already a magic link today — that's the problem. A *proper* magic link means single-use + short expiry + server-side tracking, which pushes state and minting onto BrokerIQ. More work, and still single-factor (whoever holds the link wins). |
| **Signed, expiring key** | Good *hardening* (a leaked old link dies), and worth doing regardless, but it's still a bare bearer token — no second factor. Pairs well with OTP; doesn't replace it. |

A lighter variant if Phil wants minimal friction: **confirm the last 4 digits of the phone on file** instead of a full OTP round-trip. Weaker (last-4 is guessable/discoverable), but still raises the bar from "anyone with the link" to "someone who knows whose phone it is." (The built `/closing-send-code` already returns those last 4 as its `hint`, so this variant is a small portal-side change, not a BrokerIQ one.) OTP is the right default; last-4 is the fallback for friction complaints.

**Where auth state lives:** server-issued **HttpOnly, Secure, SameSite=Strict cookie**, short TTL (e.g. 2–8 hours — a client checks their timeline, they don't live in it), scoped to the one transaction key. **Not** `localStorage` (XSS-readable) and **not** a token the page can see. The OTP verification is the only thing that mints it. This mirrors the existing HMAC-token pattern, upgraded to a cookie.

### 4.4 Stay static-fetch, or move to server-rendered-behind-auth? → **Hybrid: gate + proxy on the server, render on the client.**

- **Auth + data fetch:** server-side (the function). Non-negotiable — that's what makes it real.
- **Rendering:** stays client-side, reusing the built renderer.

Full server-side rendering (ship HTML already populated) is marginally more secure — no data in a client JSON response at all — but it throws away the finished, Phil-approved renderer and adds server templating for no proportional gain, since the data is already gated behind the session. **Keep the renderer; gate its input.** If Phil later wants belt-and-braces (e.g. no PII ever in a cacheable response), server-rendering is a clean future step on the same architecture.

### 4.5 Reuse of the data contract and the seller/buyer renderer → **100%, by design.**

- **Contract:** unchanged. The proxy passes `{status, side, client_first_name, address, dates, completed_steps, update_notes, title, lender}` straight through. BrokerIQ needn't change its *output* shape at all (it only needs to change how it *authenticates the caller* — §6).
- **Renderer:** ported verbatim, data source swapped (§3). The shape-tolerant normalizers already absorb contract wobble, which de-risks the move.

### 4.6 Cutover from the current `/closing/` bandaid → **301 redirect, then retire.**

Texted links live in clients' phones for months; they must keep working.

1. **Ship** the portal at `closings.philliphimes.com`.
2. **Point the TC agent** at the new URL for all *new* deals immediately.
3. **301** `philliphimes.com/closing/?k=…` → `https://closings.philliphimes.com/?k=…` (preserve the `k` param). Old texted links now land on the gated portal — which is exactly the upgrade: they become authenticated instead of open.
4. **Retire** the marketing-site `/closing/` page after a safe window (suggest ~90 days, or once the oldest open deal that received an old link has closed). Replace with the redirect only.

Netlify preserves query strings on a `301` with a splat; the exact rule goes in the marketing site's `netlify.toml` at cutover.

---

## 5. Suggested phasing (highest-value first)

The four problems aren't equally urgent. **Auth (#1/#4) is the one with a live privacy exposure.** Decoupling (#2) and testability (#3) are engineering health. Phase accordingly:

- **Phase 0 — now:** nothing changes; the bandaid stays live. (Optional 10-minute hardening: have BrokerIQ switch to *signed, expiring* keys so the current open links at least age out — see §6.)
- **Phase 1 — close the privacy hole:** stand up the serverless proxy + OTP gate. The BrokerIQ half is **already built** (§6, PR #1 unmerged); the portal half is sketched concretely in **Appendix A**. Can ship on the **current** site infra under `/closing/` first, or directly on the new subdomain. The browser stops calling BrokerIQ; PII gets gated. **This is the fix that makes the bandaid a real thing.**
- **Phase 2 — decouple:** move to its own repo + Netlify project + `closings.philliphimes.com`. 301 the old path. Retire the coupled page.

Doing Phase 1 first means the privacy fix doesn't wait on the repo-split ceremony. And because the server side already exists behind a dark flag, Phase 1 is now mostly **portal-side** work (Appendix A) plus a reviewed merge and one env flag.

---

## 6. The BrokerIQ API changes — **already built** (BrokerIQ PR #1, not merged)

> The BrokerIQ transaction-coordinator system is a **separate repo** and **nothing in it was changed by this design pass.** A separate session already built the server side on its own branch: **[BrokerIQ-Agentic-System PR #1](https://github.com/himesrealty-dot/BrokerIQ-Agentic-System/pull/1)** (branch `claude/exciting-thompson-523f91`), **not merged / not deployed** — Phil reviews it there. The portal (this repo's side) must be built to the contract below.

It chose the **BrokerIQ-owns-the-OTP** model: because BrokerIQ already holds the client's phone and already sends SMS via GHL, *it* texts the code. **The client's phone and the raw code never reach the portal or the browser at all** — the portal only ever sees a masked hint and a pass/fail. That's cleaner than the "portal sends its own OTP" idea floated earlier in §4.3, so it's the model the rest of this doc now assumes.

### 6.1 The two new endpoints (exact contract)

Both are server-to-server only and require a shared secret:

```
Authorization: Bearer <CLOSING_PORTAL_SECRET>      # set in Railway; the portal holds the same value
```

**`POST /closing-send-code`**  — texts the client their code
```
request:   { "k": "<key>" }
200:       { "ok": true, "hint": "•••1234" }        # last 4 of the phone on file, for the UI to show
404:       unknown k
429:       resend attempted within ~30s (cooldown)
```
Sends *"Your closing verification code is NNNNNN"* to the client via GHL. 6-digit code, **10-minute TTL**.

**`POST /closing-verify-code`**  — checks a code
```
request:   { "k": "<key>", "code": "<6 digits>" }
200 ok:    { "ok": true }                            # ONE-TIME use — a verified code is spent
200 fail:  { "ok": false, "reason": "expired" | "locked" | "invalid" }
```
**Locks after 5 wrong attempts.** Code store is **Redis-backed** on Railway (`otp:<k>`, native 600s expiry; `otp:cd:<k>` 30s resend marker), with an in-memory fallback for local/CI.

**Dev/test seam (this is what finally kills prod-only testability):**
```
k == "TEST123"  →  send returns hint "•••0000" WITHOUT texting anyone
                   verify accepts code "000000"
```
So the whole portal flow — send, show hint, verify, mint session, fetch data — is runnable on `localhost` and deploy previews against `TEST123`, with no live client and no SMS. Problem #3 solved for real.

### 6.2 The `/closing-data` enforcement flag (the cutover lever)

- `/closing-data` is **still open** (no secret required) and its **response shape is unchanged** — the live public page and the 388 Dover client are unaffected right now.
- A guard exists but is **dark behind an env flag `ENFORCE_PORTAL_SECRET` (default OFF).** When ON, `/closing-data` will `401` unless called with `Authorization: Bearer <CLOSING_PORTAL_SECRET>`.
- **⚠️ Cutover ordering is load-bearing:** flip `ENFORCE_PORTAL_SECRET` **ON only after** the portal proxy is live and calling `/closing-data` with the Bearer secret. Turning it on earlier **401s the current live page**. (Until then the portal can already call the secret-authenticated send/verify endpoints; only the data-fetch enforcement waits.)

### 6.3 What is still open on the BrokerIQ side

- **Merge + deploy** BrokerIQ PR #1 (Phil's review).
- **Set `CLOSING_PORTAL_SECRET`** to the same value in both Railway and the portal's Netlify project.
- Confirm **`REDIS_URL`** is set on Railway (the OTP store needs it in production; it was exercised only via `fakeredis` in CI).
- **Optional hardening, independent of the above:** mint `k` as a signed, expiring token so leaked/forwarded old links age out.
- **Not needed after all:** adding the phone to `/closing-data` — the OTP-owns-the-phone model means the portal never needs it.

---

## 7. Constraints honored

- **No client data in any repo, ever.** Preserved and strengthened — the live-fetch pattern stays, and with the proxy the data passes through a function's memory without ever being written to the repo or a client-cached URL. With the OTP-owns-the-phone model, the client's phone and raw code never even reach the portal.
- **BrokerIQ untouched by this pass.** This design pass changed nothing in that repo. The server-side endpoints in §6 were built by a *separate* session on its own branch (BrokerIQ PR #1) and are unmerged; they remain Phil's to review and deploy.
- **Design only (this repo).** No portal code is built here — Appendix A is a build sketch, not an implementation.

---

## 8. Open questions for Phil

1. **Friction tolerance.** Are you OK asking clients for a one-time code texted to their phone before they see the timeline? (Recommended.) Or do you want it frictionless, accepting a weaker "last-4 of your phone" check — or even just hardened bearer links with an expiry and no second factor?
2. **BrokerIQ PR #1 review.** The server endpoints (§6) are already built and waiting in [BrokerIQ PR #1](https://github.com/himesrealty-dot/BrokerIQ-Agentic-System/pull/1). Will you review/merge it, and is `REDIS_URL` set on Railway (the OTP store needs it in prod)? Phase 1 unblocks the moment that merges and `CLOSING_PORTAL_SECRET` is shared with the portal.
3. **Phone-on-file reliability.** The TC texts clients, so it clearly has a mobile per deal — but is it always the *client's* number (vs. a co-agent, a spouse, a landline)? OTP is only as good as the number it's sent to.
4. **Subdomain name.** `closings.philliphimes.com`? Or `my.philliphimes.com` / `portal.`? (Affects DNS + the BrokerIQ link the TC texts.)
5. **Scope creep check.** Is this *only* the closing timeline, or is it the seed of a broader client portal (document sharing, e-sign status, past-closing archive)? That changes whether to build minimally or lay a foundation.
6. **Effort appetite.** Full separate-project build now, or Phase 1 (auth fix on current infra) now and decouple later? (Recommended: Phase 1 first — it's the fix with a live privacy exposure.)
7. **Link lifetime.** How long must already-texted `/closing/?k=` links keep resolving after cutover? (Drives the 301-then-retire window.)
8. **Completed closings.** Should a portal stop resolving some days after a closing completes, or stay as a permanent "here's your timeline" keepsake? (Affects retention + whether old links are a standing exposure.)

---

*Prepared as a design proposal. The live `/closing/` page is unchanged. Recommend reviewing §3 (target architecture), §6 (the now-built BrokerIQ contract), Appendix A (the Phase 1 build sketch), and §8 (open questions), then deciding Phase 1 scope before any build.*

---

## Appendix A — Phase 1 build sketch (portal side)

This is the concrete portal build against the §6 contract. It's a sketch for review, **not built**. It targets the current site infra (`netlify/functions/*` + a page under `/closing/`) so Phase 1 can ship before the repo split; the same three files move to the standalone project in Phase 2 unchanged.

### A.1 Files

```
netlify/functions/
  closing-session.js     # POST — proxies send/verify to BrokerIQ; mints the session cookie
  closing-data.js        # GET  — requires the cookie; proxies BrokerIQ /closing-data
closing/
  index.html             # the OTP gate + the EXISTING renderer (data source swapped)
```

Three functions' worth of logic, but folded into two endpoints. All three BrokerIQ calls (`send`, `verify`, `data`) happen **server-side inside these functions**, each carrying `Authorization: Bearer <CLOSING_PORTAL_SECRET>`. The browser never holds the secret and never calls Railway.

### A.2 Request flow (what happens, in order)

```
1. Client taps texted link → closing/index.html?k=<key>
2. Page shows "Verify it's you" screen, posts {k} to /.netlify/functions/closing-session
   with action=send.
3. closing-session.js → POST BrokerIQ /closing-send-code {k} (Bearer).
   Returns the masked hint to the page: "We texted a code to the phone ending •••1234."
4. Client types the 6-digit code → page posts {k, code, action:"verify"} to closing-session.js.
5. closing-session.js → POST BrokerIQ /closing-verify-code {k, code} (Bearer).
      ok:false  → relay reason (expired / locked / invalid) to the UI, let them retry/resend.
      ok:true   → mint a signed session cookie (A.3) and return 200.
6. Page now calls GET /.netlify/functions/closing-data (credentials:"same-origin").
7. closing-data.js validates the cookie, extracts k from it, → GET BrokerIQ /closing-data?k=<k>
   (Bearer), returns the JSON.
8. The EXISTING renderActive() draws the seller/buyer timeline. (Only the fetch line changed.)
```

The only change to the ~400-line approved renderer is its data source:

```diff
- fetch(ENDPOINT + '?k=' + encodeURIComponent(k), { credentials:'omit', ... })  // browser → Railway
+ fetch('/.netlify/functions/closing-data', { credentials:'same-origin' })        // browser → our function
```

### A.3 The session (how auth state is held)

On `verify ok:true`, `closing-session.js` sets:

```
Set-Cookie: phh_closing=<token>; HttpOnly; Secure; SameSite=Strict;
            Path=/; Max-Age=14400                      # 4h — long enough to read, short enough to expire
```

`<token>` is an **HMAC-signed value** carrying `{k, iat, exp}`, signed with a portal secret — the exact pattern already proven in `sms-verify.js` (`crypto.createHmac('sha256', SECRET)`), just stored as a cookie instead of returned to JS. Key properties:

- **Scoped to one `k`.** `closing-data.js` reads `k` *from the verified cookie*, never from a query param — so a valid session for closing A can't be replayed against closing B's key.
- **HttpOnly** → not readable by page JS, so an XSS bug can't lift it. **SameSite=Strict** → not sent on cross-site navigations.
- **Stateless** → no session DB on the portal side (BrokerIQ's Redis handles OTP state; the portal just verifies its own signature). Same no-DB philosophy as `sms-verify.js`.
- Re-verification is only needed after the 4h expiry; a page refresh inside the window reuses the cookie.

### A.4 Environment variables (portal side)

```
CLOSING_PORTAL_SECRET   # SAME value as Railway's — the Bearer token for all BrokerIQ calls
PHH_SESSION_SECRET      # signs the session cookie (independent of the above; rotate freely)
BROKERIQ_BASE_URL       # https://brokeriq-agentic-system-production.up.railway.app
```

`CLOSING_PORTAL_SECRET` is the one shared secret that must match Railway. It lives only in the function runtime's env — never in the repo, never in client JS. (This is a concrete reason to prefer the Phase-2 standalone Netlify project: that secret shouldn't share an environment with the public marketing build.)

### A.5 Build-and-verify path (no live client needed)

Thanks to the `TEST123` / `000000` dev seam (§6.1), the whole flow is testable off-prod:

1. `netlify dev` locally (or a deploy preview). Open `…/closing/?k=TEST123`.
2. Gate posts `{k:"TEST123"}` → `send` returns hint `•••0000`, no SMS fires.
3. Enter `000000` → `verify` returns `ok:true` → cookie minted.
4. `closing-data` fetches the test record → renderer draws it.

This is the first time the portal can be exercised end-to-end without merging to the live domain — the direct answer to bandaid problem #3.

### A.6 Cutover checklist (Phase 1 → live)

1. Merge + deploy **BrokerIQ PR #1** (endpoints go live, still with `ENFORCE_PORTAL_SECRET` **OFF**).
2. Set `CLOSING_PORTAL_SECRET` (both sides), `PHH_SESSION_SECRET`, `BROKERIQ_BASE_URL` on the portal.
3. Ship the portal (`closing-session.js`, `closing-data.js`, gated `closing/index.html`). It now proxies `/closing-data` **with** the Bearer secret.
4. Verify a real deal end-to-end (OTP texts, timeline renders).
5. **Flip `ENFORCE_PORTAL_SECRET` → ON** on Railway. From this moment `/closing-data` requires the secret, so the old un-gated direct-fetch page would 401 — which is why step 3 must be live first. The gate is now mandatory for everyone.
6. (Phase 2) Move these three files to the standalone project + subdomain; 301 the old path.

Step 5 is the single irreversible-feeling switch, and it's cleanly ordered after the portal is proven in step 4.
