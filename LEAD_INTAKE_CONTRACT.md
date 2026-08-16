# Lead Intake Contract — website ⇄ Agentic OS

**Status:** proposed (backend build pending) · **Version:** 1.1

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

## Value formats
- Everything is sent as a **string**; the backend coerces (numbers, and booleans from
  `true`/`false`/`yes`/`no`).
- For pool/gated/waterfront use `true`/`false` (or `yes`/`no`).

## Lead type & tagging (how each contact gets routed)
Tags are what route a contact to the right Caitlyn flow, so **every form declares who the
lead is and why they came in.** Two pieces per form:

1. **Side (required)** — put `seller` OR `buyer` in `tags`. This picks Caitlyn's
   qualification path. A **cash-offer** lead is a seller sub-type: send **both** `seller`
   and `cash-offer` (she has a dedicated cash-offer flow).
2. **Intent** — set `source` to the reason they came in, and (recommended) include a matching
   intent tag. This drives her opener and the right offer/value.

The backend always adds a base `website-lead` tag; the form's tags are merged on top.

**Per-form table** (this is the taxonomy — match it exactly):

| Form / entry point | `source` | `tags` |
|---|---|---|
| Home value (seller) | `home-value` | `seller`, `home-value` |
| Cash offer (seller) | `cash-offer` | `seller`, `cash-offer` |
| Seller guide / list-with-me | `seller-guide` | `seller` |
| New construction (buyer) | `new-construction` | `buyer`, `new-construction` |
| Buyer guide / home search | `buyer-guide` | `buyer` |
| General contact / "just curious" | `website` | *(none — Caitlyn discovers side in chat)* |

**Backend safety net:** if a form forgets the side tag but sends a known `source`, the backend
infers it — `home-value` / `cash-offer` / `seller-guide` → `seller`; `new-construction` /
`buyer-guide` → `buyer` (and `cash-offer` source also adds the `cash-offer` tag). Forms should
still send the tags explicitly; this only prevents a mis-tag when one is missed.

**Adding a new lead type later:** pick a `source`, decide the side, list it in this table
(backend session edits it), and send those tags from the form. If it needs its own Caitlyn
behavior beyond side/cash-offer, note it in Open Questions.

## What each side owns
**Website (forms):**
- Point every lead form at `POST /lead`.
- Name custom-field inputs with their `contact.<key>` GHL key.
- Keep the hidden `company` honeypot in every form.
- **Remove** GHL inbound-webhook URLs and any GHL location ID from the site — leads flow
  only through `/lead` now.

**Backend (`/lead`):**
- Upsert the contact; apply consent + funnel tags.
- Map every `contact.*` field to its GHL custom field **by key**; preserve + warn on unknown.
- Stay location-agnostic — a GHL move is a Railway env change only, no site or code edits.

---

## Open Questions (WEBSITE session may edit ONLY this section)
_Add questions or requested changes here; Phil relays to the backend session, which answers
by updating the contract above._

- _(none yet)_
