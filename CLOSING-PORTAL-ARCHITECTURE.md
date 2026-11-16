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
| **Phone OTP (recommended)** | Low friction, familiar (every bank does it), reuses `sms-verify.js` almost as-is. "Possession of the link **+** possession of the phone." The client needs no password and nothing to remember. |
| **Magic link** | The link *is* already a magic link today — that's the problem. A *proper* magic link means single-use + short expiry + server-side tracking, which pushes state and minting onto BrokerIQ. More work, and still single-factor (whoever holds the link wins). |
| **Signed, expiring key** | Good *hardening* (a leaked old link dies), and worth doing regardless, but it's still a bare bearer token — no second factor. Pairs well with OTP; doesn't replace it. |

A lighter variant if Phil wants minimal friction: **confirm the last 4 digits of the phone on file** instead of a full OTP round-trip. Weaker (last-4 is guessable/discoverable), but still raises the bar from "anyone with the link" to "someone who knows whose phone it is." OTP is the right default; last-4 is the fallback for friction complaints.

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
- **Phase 1 — close the privacy hole:** stand up the serverless proxy + OTP gate. Can ship on the **current** site infra under `/closing/` (reuses `sms-verify.js`), or directly on the new subdomain. The browser stops calling BrokerIQ; PII gets gated. **This is the fix that makes the bandaid a real thing.**
- **Phase 2 — decouple:** move to its own repo + Netlify project + `closings.philliphimes.com`. 301 the old path. Retire the coupled page.

Doing Phase 1 first means the privacy fix doesn't wait on the repo-split ceremony.

---

## 6. What the BrokerIQ team / session must do (propose only — do NOT change from here)

> The BrokerIQ transaction-coordinator system is a **separate repo.** None of this was changed by this design pass. These are asks to coordinate with whoever owns it.

1. **Accept a server-to-server credential.** `/closing-data` should authenticate the portal's proxy function via a **shared secret header** (or mTLS / signed service token), so the data flows proxy→BrokerIQ, not browser→BrokerIQ. Once that exists, the **browser-origin CORS lock is no longer the access boundary** and can be relaxed or dropped for the proxy path.
2. **Expose the client's phone to the proxy (server-to-server only).** For OTP, the portal needs to send a code to the number on file. Two ways, smallest-ask first:
   - **(Preferred, less BrokerIQ work):** include the client's mobile (or an E.164 number) in the **server-to-server** `/closing-data` response. The portal sends its *own* OTP via the existing Twilio infra and verifies it. BrokerIQ then only needs #1 + one field.
   - **(More BrokerIQ work):** BrokerIQ exposes `send-otp?k=` and `verify-otp` endpoints and owns the OTP lifecycle itself.
3. **(Optional hardening, independently valuable):** mint keys as **signed tokens with an embedded expiry** so a leaked or forwarded old link stops resolving. Helps even before the portal ships.
4. **Provide a staging/test endpoint or a mock mode** so the portal can be developed against something other than live client data — this is how problem #3 (prod-only testability) actually dies.

**The single smallest viable BrokerIQ change** that unblocks the recommended design: *#1 (accept a shared secret) + the preferred half of #2 (include the phone in the server-to-server response).* Everything else is optional or lives entirely on the portal side.

---

## 7. Constraints honored

- **No client data in any repo, ever.** Preserved and strengthened — the live-fetch pattern stays, and with the proxy the data passes through a function's memory without ever being written to the repo or a client-cached URL.
- **BrokerIQ untouched.** This pass changed nothing in that system; §6 is a proposal to hand to its owner.
- **Design only.** Nothing here is built.

---

## 8. Open questions for Phil

1. **Friction tolerance.** Are you OK asking clients for a one-time code texted to their phone before they see the timeline? (Recommended.) Or do you want it frictionless, accepting a weaker "last-4 of your phone" check — or even just hardened bearer links with an expiry and no second factor?
2. **BrokerIQ ownership & timeline.** Who can make the endpoint changes in §6, and on what timeline? Is there a BrokerIQ repo/session to coordinate with, or is that you too? The recommended design is blocked on at least ask #1 there.
3. **Phone-on-file reliability.** The TC texts clients, so it clearly has a mobile per deal — but is it always the *client's* number (vs. a co-agent, a spouse, a landline)? OTP is only as good as the number it's sent to.
4. **Subdomain name.** `closings.philliphimes.com`? Or `my.philliphimes.com` / `portal.`? (Affects DNS + the BrokerIQ link the TC texts.)
5. **Scope creep check.** Is this *only* the closing timeline, or is it the seed of a broader client portal (document sharing, e-sign status, past-closing archive)? That changes whether to build minimally or lay a foundation.
6. **Effort appetite.** Full separate-project build now, or Phase 1 (auth fix on current infra) now and decouple later? (Recommended: Phase 1 first — it's the fix with a live privacy exposure.)
7. **Link lifetime.** How long must already-texted `/closing/?k=` links keep resolving after cutover? (Drives the 301-then-retire window.)
8. **Completed closings.** Should a portal stop resolving some days after a closing completes, or stay as a permanent "here's your timeline" keepsake? (Affects retention + whether old links are a standing exposure.)

---

*Prepared as a design proposal. The live `/closing/` page is unchanged. Recommend reviewing §3 (target architecture) and §8 (open questions), then deciding Phase 1 scope before any build.*
