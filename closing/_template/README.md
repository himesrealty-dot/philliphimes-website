# Seller closing timeline template

One private page per transaction, sent to the seller the day the contract is signed. Weekly updates stop when an offer is accepted; this page replaces them. Every page under `/closing/` is served with `X-Robots-Tag: noindex` (netlify.toml) and carries a `noindex` meta tag.

## New transaction

1. Copy `closing/_template/` to `closing/<street-slug>/`.
2. Edit only the JSON in `<script id="closing-data">`:
   - `contract.effective`, `optionDays`, `financing`, `financingDays`, `closing` from the executed contract.
   - `title` block: company, escrow officer, phone. This phone is the one the wire fraud warning tells the seller to call.
3. Check every calculated date against the executed contract. Put any date that differs in `overrides`, keyed by milestone id (`"overrides": {"closing": "2026-12-22"}`).
4. Send the seller the link.

## Keeping it current

- When a milestone is finished, add its id to `completed`. The first unfinished milestone is marked "Happening now" and shown as "Next" in the header.
- Anything the seller should know about a milestone goes in `updates` (e.g. `"option": "The buyer asked for two repairs. We agreed to the HVAC service and declined the rest."`).
- If closing moves, change `contract.closing`; the closing-relative milestones move with it.
- Cash purchase: set `financing` to `"Cash"` and the appraisal and loan approval milestones drop off.

## Milestones and date rules

| id | Milestone | Date rule | Phil calls |
|---|---|---|---|
| accepted | Offer accepted | Effective date | ★ |
| earnest | Earnest money and option fee | Effective + 3 days | |
| inspection | Buyer's inspection | During option period | |
| title | Title work begins | First week | |
| option | Option period ends | Effective + option days, 5 p.m. | ★ |
| appraisal | Appraisal | Effective + 14–21 days | (★ if low) |
| financing | Buyer's loan approved | Effective + financing days | |
| prep | Getting ready to close | Closing − 10 days | ★ |
| walkthrough | Final walkthrough | Closing − 1–2 days | |
| closing | Closing day | Closing date | ★ |
| after | After closing | Closing + 30 days | ★ |

The SOP text for each milestone (what happens, what the seller does, what Phil handles) lives in the `M` array in the page script. Change it there and every future timeline uses it.

## For the transaction coordinator agent

- Source of truth: the JSON block in each `closing/<slug>/index.html`.
- The page also exposes `window.CLOSING_SCHEDULE`: `[{id, title, date, philCalls, done}]` after the dates and overrides are applied.
- Agent jobs: remind Phil before each ★ milestone, flag any deadline within 2 days, add ids to `completed` and text to `updates` when Phil confirms them.
- Phil's own checklist (not shown to the seller): confirm the buyer's loan with their loan officer on Day 0; order the HOA resale certificate; deliver survey and T-47; schedule the sign removal when closing is scheduled; remove the lockbox on closing day; photo and Google review request after closing.
