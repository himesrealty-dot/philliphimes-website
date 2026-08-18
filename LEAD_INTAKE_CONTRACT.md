# Lead Intake Contract — website ⇄ Agentic OS

**Status:** **LIVE — backend built 2026-08-18** · **Version:** 1.3.1

> The backend half of this contract is implemented and deployed: `contact.<key>` fields
> map to GHL custom fields by key, unknown keys are preserved in a contact note plus an
> Action Center warning (never auto-created), and the `source → side` safety net is in
> place. Forms can rely on everything described below. The only open item is on the
> website side: `listing-template.html`'s showing form (see Q8).

This is the single source of truth for how website forms send leads to the Agentic OS
backend. It exists so the two builds — the **website** (forms) and the **Agentic OS
backend** (`/lead` endpoint) — meet in the middle without touching each other's code.

## Ownership (read this first)
- **The backend owns this contract.** The Agentic OS session is the ONLY editor of this
  file's body. The website session treats everything above "Open Questions" as read-only.
- **The website consumes it.** Build the forms to match; do not edit the backend.
- **The backend never edits the website forms.**
- If the website needs a change or has a question, add it under **Open Questions** at the
  bottom (the only section the website session may edit). Phil relays it; the backend
  answers by updating the contract.

---

## The endpoint
- **`POST /lead`** on the Agentic OS Railway backend (the same endpoint the seller
  home-value form already posts to). Public, no auth (it's for public forms).
- Body: `application/json` **or** `application/x-www-form-urlencoded` (form POST). Both work.
- Response: `200 {"ok": true}` on success (also returned for a honeypot hit, silently).
  Errors: `400 {"error":"missing_contact"}` (no email or phone), `502 capture_failed`,
  `503 unavailable`.

## Standard fields (handled specially — send as plain top-level keys)
| Field | Notes |
|---|---|
| `name` (or `firstName` + `lastName`) | Contact name |
| `email` | **email OR phone is required** |
| `phone` | **email OR phone is required** |
| `consent` | boolean — `true` records SMS consent (as a tag) |
| `source` | e.g. `"home-value"`, `"seller-guide"`, `"newbuild"` — first-touch attribution |
| `tag` and/or `tags` | funnel tag(s): a string, comma-separated string, or array. Tells the AI *why* they came in |
| `message` | free text — saved as the lead note / description |
| `company` | **honeypot** — see below |

The contact is **upserted**: a returning lead who resubmits updates their record (no duplicate).

### The honeypot (`company`)
`company` is an anti-bot **decoy**, not a real field. A human never sees or fills it; a bot
fills every field including hidden ones, so if `company` arrives non-empty the submission is
dropped silently. Requirements: include a hidden `<input name="company">` in **every** form,
truly hidden (off-screen CSS, not `type=hidden` if you can help it — bots skip obvious ones),
no label, `autocomplete="off"`, always empty. **Do not** use the name `company` for a real
field you want filled.

## Custom fields (the generic part — this is how ANY new field works)
**Convention: name the input with its GHL custom-field key, prefixed `contact.`**

Example inputs on a form:
```html
<input name="contact.lead_property_street" value="2718 Bolgheri Lane">
<input name="contact.lead_property_city"   value="League City">
<input name="contact.lead_property_zip"    value="77573">
<input name="contact.lead_property_sqft"   value="2748">
<input name="contact.lead_beds"            value="4">
<input name="contact.lead_baths"           value="2.5">
<input name="contact.lead_property_pool"       value="true">   <!-- yes/no -->
<input name="contact.lead_property_gated"      value="false">
<input name="contact.lead_property_waterfront" value="false">
```
Any top-level body key that starts with **`contact.`** is treated as a GHL contact custom
field and written **by key** (never by a hardcoded field ID — this is why the whole thing
survives a GHL location move).

**What the backend does with each `contact.*` field:**
1. **GHL has a custom field with that key** → the value is written to it.
2. **GHL does NOT have that key** → the value is **preserved** (appended to the lead note so
   nothing is lost) **and** Phil gets an Action Center warning: *"Form sent `contact.<key>`
   but GHL has no matching custom field — create it."* One warning per key (no spam).

> **The backend never creates GHL custom fields.** It only writes to fields that already
> exist, and warns on the rest. Phil creates fields deliberately in GHL.

So: **add a field to any form and it just works** — captured if the GHL field exists,
flagged for creation if it doesn't. Never silently dropped. Home Value is simply the first
consumer of this; it is not special-cased.

### GHL keys currently in use (Home Value)
`contact.lead_property_street`, `contact.lead_property_city`, `contact.lead_property_zip`,
`contact.lead_property_sqft`, `contact.lead_beds`, `contact.lead_baths`,
`contact.lead_property_pool`, `contact.lead_property_gated`,
`contact.lead_property_waterfront`. The backend also writes the computed estimate to
`contact.lead_est_property_value`.

**Combined address (recommended for conversion):** a form may send the whole address as one
field, **`contact.lead_property_address`** (e.g. "2718 Bolgheri Lane, League City, TX 77573"),
instead of the separate `_street`/`_city`/`_zip` — the backend parses street/city/zip from it.
Either style works; use whichever converts better on a given form. (For the value engine the
**city** must be parseable, so format it "Street, City, ST ZIP".)

## Value formats
- Everything is sent as a **string**; the backend coerces (numbers, and booleans from
  `true`/`false`/`yes`/`no`).
- For pool/gated/waterfront use `true`/`false` (or `yes`/`no`).

## Lead type & tagging (how each contact gets routed)
Every form declares two things — **who the lead is** and **what they expect** — and those two
tags are what make the response both right and fast.

**1. Side (required) = who they are.** Exactly one of: `buyer`, `seller`, or `both`.
This picks Caitlyn's qualification path.

**2. Intent (required) = what they expect, based on the form they filled.** Set `source` to
the intent and include a matching intent tag. This drives her opener and the value she leads
with. Intents: `home-value`, `cash-offer`, `seller-guide`, `listing-appointment`, `rebalance`,
`renew`, `new-construction`, `buyer-search`, `amplify`, `relocation`, `showing-request` (add
more over time).

**When side = `both`,** Caitlyn opens with the side the **intent** implies, while acknowledging
they're also the other:
- Seller-leaning intents — `home-value`, `cash-offer`, `seller-guide`, `listing-appointment`,
  `rebalance`, `renew` → open as a **seller**
- Buyer-leaning intents — `new-construction`, `buyer-search`, `amplify`, `relocation`,
  `showing-request` → open as a **buyer**

So a move-up client who came through the home-value form (`side: both`, intent `home-value`)
is opened as a seller — "let's get you your home's value" — and she notes she can line up
their next home too. One clear starting point, driven by what they asked for.

The backend always adds a base `website-lead` tag; the form's tags merge on top.

**Per-form table** (this is the taxonomy — match it exactly):

| Form / entry point | side (`tags`) | intent (`source` + tag) |
|---|---|---|
| Home value | `seller` | `home-value` |
| SellerIQ / wealth-calculator | `seller` | `home-value` |
| Cash offer | `seller` | `cash-offer` |
| Seller guide / list-with-me | `seller` | `seller-guide` |
| Listing appointment / seller intake (ready to list) | `seller` | `listing-appointment` |
| Rebalance™ (downsizing) | `seller` | `rebalance` |
| Renew™ (divorce / loss / hardship reset) | `seller` | `renew` |
| New construction | `buyer` | `new-construction` |
| Buyer guide / home search | `buyer` | `buyer-search` |
| Amplify™ (upgrade to a bigger home) | `buyer` | `amplify` |
| Relocation ("relocating to Houston") | `buyer` | `relocation` |
| Showing request (tour a specific listing) | `buyer` | `showing-request` |
| Market report (area QR landing) | `buyer` | `buyer-search` (+ `src:market-report-<area>`) |
| Move-up (sell + buy) | `both` | their form's intent (e.g. `home-value`) |
| General contact / home page / "just curious" | *(omit — Caitlyn discovers it)* | `website` |

Notes on specific ones:
- **SellerIQ / wealth-calculator** maps to the `home-value` intent (it's a home-value ask).
- **Cash offer** — the `cash-offer` **intent** triggers Caitlyn's dedicated cash-offer flow
  (honor the cash request, get the address, never bait-and-switch to a listing pitch).
- **Showing request** — send the listing's address in `contact.lead_property_address` so she
  knows which home they want to tour. For **generated listing pages** the showing form must post
  exactly: `source: "showing-request"`, `tags: ["buyer", "showing-request", "src:listing-<slug>"]`,
  and `"contact.lead_property_address": "<Street>, <City>, TX <ZIP>"`. The OS fills the address
  into a `{{LISTING_ADDRESS}}` placeholder (it already knows it). Do **not** use the old
  `source: "listing:<slug>"` / `community` + `city` shape — that predates v1.3 and is off-contract.
- **Market report** — area report QR landings map to `buyer` / `buyer-search` with an additive
  `src:market-report-<area>` attribution tag (e.g. `src:market-report-benders-landing`). No new
  intent, no new GHL field — it filters in GHL and routing ignores non-intent/side tags.
- **Newsletter subscribe** does **not** go through `/lead` — it's an SOI subscribe, not a
  sales lead. Keep it on its existing mechanism (no Caitlyn outreach).

**Backend safety net:** if a form forgets the side but sends a known `source`, the backend
infers it — seller-leaning intents → `seller`, buyer-leaning intents → `buyer` — so a lead
can never fall into the generic bucket by accident. Forms should still send the side
explicitly; this only covers a miss.

**Adding a new lead type later:** pick a `source`/intent, decide its natural side (and its
lean for `both`), add a row to this table (backend session edits it), and send those tags from
the form. If it needs Caitlyn behavior beyond side + intent, note it in Open Questions.

## Why the tags matter (why the website must get this right)
The tags capture the lead's **expectation at the moment they hit submit**, and carry it into
the AI so the very first reply is on-target and immediate — never a generic "just checking in."

- **Side → the conversation path.** `seller` runs seller qualification, `buyer` runs buyer
  qualification, `both` leans by intent (above). This is deterministic; no guessing.
- **Intent → the opener + the value.** Caitlyn opens *about what they asked for* — a
  `home-value` lead hears about their home's value (and gets the instant range), a
  `new-construction` lead hears about builds and incentives, a `cash-offer` lead gets the
  cash-offer flow. No wasted round-trip discovering why they're there.
- **Fast.** The moment the form posts, speed-to-lead fires an instant text (and queues a call
  for call-worthy intents). Because the intent is already known, the first message lands on
  the topic instead of asking "what brings you here?".

**The failure this prevents:** a hot seller who asked "what's my home worth" getting a slow,
generic hello and losing interest in the first 30 seconds. A missing or wrong tag = a missed
expectation. That is why the form must set side + intent on every submission (and why the
backend has the source→side safety net as a backstop).

## What each side owns
**Website (forms):**
- Point every lead form at `POST /lead`.
- On every form set the **side** (`buyer`/`seller`/`both` in `tags`) and the **intent**
  (`source` + matching tag), per the taxonomy table.
- Name custom-field inputs with their `contact.<key>` GHL key.
- Keep the hidden `company` honeypot in every form.
- **Remove** GHL inbound-webhook URLs and any GHL location ID from the site — leads flow
  only through `/lead` now.

**Backend (`/lead`):**
- Upsert the contact; apply consent + the base `website-lead` tag + the form's side/intent tags.
- Map every `contact.*` field to its GHL custom field **by key**; preserve-in-note + warn on
  unknown; never auto-create a GHL field.
- Apply the `source → side` safety net for `both`/missing-side leads.
- Stay location-agnostic — a GHL move is a Railway env change only, no site or code edits.

---

## Open Questions (WEBSITE session may edit ONLY this section)
_Add questions or requested changes here; Phil relays to the backend session, which answers
by updating the contract above._

**Still open (website session, 2026-08-16):**

_(none — Q8 and Q9 answered below in v1.3.1)_

### Resolved — v1.3.1 (2026-08-16, backend)

8. **Generated listing pages (`listing-template.html`) — CONFIRMED.** Yes: OS-filled listing
   pages inject `source: "showing-request"`, `tags: ["buyer", "showing-request", "src:listing-<slug>"]`,
   and the listing address into `contact.lead_property_address`, and the OS exposes a
   `{{LISTING_ADDRESS}}` placeholder for the address field. This is now specified in the
   "Notes on specific ones → Showing request" bullet above. **Action for the website session:**
   the master `listing-template.html` form JS still posts the pre-v1.3 shape
   (`source: '{{LEAD_SOURCE}}'` = `listing:{{SLUG}}`, plus `community`/`city`) — update its
   showing-form block to the shape the static pages (2222, 6310) already use, and drop the
   `{{LEAD_SOURCE}}`/`{{LEAD_TAG}}` header lines in favor of the hardcoded values + `{{SLUG}}` /
   `{{LISTING_ADDRESS}}`. The OS fills `{{SLUG}}` and `{{LISTING_ADDRESS}}`.

9. **Market-report QR landing pages → `buyer` / `buyer-search`.** Phil chose the website's
   proposed mapping (no dedicated intent). Add an additive `src:market-report-<area>` tag for
   attribution (e.g. `src:market-report-benders-landing`, `src:market-report-seabrook-island`).
   Added to the taxonomy table and the "Market report" note above.

### Resolved — v1.3 (2026-08-16)
The website session's 18-form inventory (Q1–Q7) is answered in the body above:

1. **Combined address** → added `contact.lead_property_address` (backend parses street/city/zip); the separate keys still work.
2. **New intents** added to the taxonomy table: `rebalance` (seller — downsizing), `amplify` (buyer — upgrade to a bigger home), `renew` (seller — divorce / loss / hardship reset), `relocation` (buyer), `showing-request` (buyer; send the listing address in `contact.lead_property_address`), `listing-appointment` (seller — ready to list, hotter than `seller-guide`).
3. **SellerIQ / wealth-calculator** → maps to the `home-value` intent (seller).
4. **Home page general form** → `website` intent, no side (Caitlyn discovers).
5. **Newsletter** → NOT `/lead`. It's an SOI subscribe, not a sales lead — keep it on its existing mechanism (no Caitlyn outreach).
6. **Renames** approved: `home-valuation`→`home-value`, `home-finder`→`buyer-search`, `builder-incentives`/`new-construction-report`→`new-construction`.
7. **Campaign / PPC attribution** → keep `source` = the intent (drives Caitlyn + first-touch funnel). Send the granular value as an **additive tag prefixed `src:`** (e.g. `src:ppc-nc-report`, `src:newbuildiq-hub`). No new GHL field, it's filterable in GHL, and routing ignores non-intent/side tags. If you later want structured reporting, create `contact.lead_source_detail` and we'll route it there instead.
