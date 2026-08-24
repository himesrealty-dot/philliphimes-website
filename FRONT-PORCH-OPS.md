# The Front Porch — how it runs

Operating manual for the members' portal, The Note, and the guest pass.
Written to be followed a year from now when the details have gone.

**The shape of it:** The Front Porch is a **members-only** value-add for past
clients and SOI. It is not a lead magnet and it does not recruit strangers —
that was tried and dropped, deliberately. Growth comes from word of mouth and
guest passes, not from search.

The only public page is **The Note** (`front-porch-newsletter.html`), which
anyone can read and forward.

---

## 1 · Enrolment — the one habit the whole thing depends on

Nobody enrols themselves. If this doesn't become automatic, the portal quietly
dies. **Two triggers, no exceptions:**

- **Every closing.** Before the file is put away.
- **Any SOI conversation** where someone mentions their house.

**What you collect** (five minutes, once):

| | Where it comes from |
|---|---|
| Name, email, mobile | You have it |
| Property address | You have it |
| County | Address tells you — mind the straddlers below |
| Loan: original amount, rate, term, first payment | **Their Closing Disclosure**, already in your file |

Then add a row to `data/members.csv`:

```
name,county,prop_id,situs_street,situs_city,enrolled
Sarah & Mike Chen,Galveston CAD,,710 E Wilkins St,League City,2021-03
```

Leave `prop_id` blank. The parser finds it by address the first time; write the
number it returns back into the file and every future year is an exact match
with no address guessing.

**Cities that straddle two districts** — get the county right or the match fails:
League City, Friendswood and Pearland all sit in two. Clear Lake addresses are
recorded by HCAD as **Houston**, not Clear Lake.

---

## 2 · The annual roll refresh — once a year, about twenty minutes

County appraisal rolls certify in **July**. Do this in **August**.

**Download** (free, public, no login):

| County | Where |
|---|---|
| Galveston | `galvestoncad.org` → Preliminary and Certified Roll Export |
| Harris | `download.hcad.org/data/CAMA/<year>/Real_acct_owner.zip` **and** `Real_jur_exempt.zip` |
| Brazoria | *blocked — see §6* |
| Fort Bend | *blocked — see §6* |

**Load** — only enrolled properties are kept, so the database stays tiny:

```bash
python scripts/cad_parse.py --zip <galveston-roll.zip> \
    --county "Galveston CAD" --year 2026 \
    --members data/members.csv --db data/porch.sqlite

python scripts/cad_parse.py --zip <hcad-real_acct.zip> \
    --exempt-zip <hcad-real_jur_exempt.zip> --format hcad \
    --county "Harris CAD" --year 2026 \
    --members data/members.csv --db data/porch.sqlite
```

**Then read the output.** It prints every enrolled property it could *not* find:

```
!! 2 enrolled properties not found in this roll:
     Pat & Jo Nguyen          1700 St Charles St, Houston
     Someone Mistyped         999 Nowhere Rd, League City
```

A member in the wrong county shows up here (harmless — they match on the other
county's pass). A typo shows up here too, and that one matters: unfixed, that
member opens a dashboard with no numbers on it.

**Back-years.** History needs prior rolls loaded the same way with `--year`
changed. Galveston publishes back to 2017. About 94.5% of parcel IDs persist
year to year; the rest are splits, merges and new construction.

---

## 3 · The Note — monthly

Public page, forwardable, no gate. Four standing departments:

| | What goes in it |
|---|---|
| **Over Coffee** | The lead. A story — *"I watched this happen hundreds of times and only understood it when it happened to me."* Sometimes it's nothing more than who you ran into at HEB. Variety is what makes it read as real. |
| **One Thing Worth Knowing** | Local history or discovery. Interesting travels; useful doesn't. Sources: Handbook of Texas Online, Portal to Texas History, the THC historical-marker atlas. **Verify before publishing.** |
| **Worth the Drive** | A place you have actually been. Often reader-submitted — credit them by name. |
| **Cooking with Phil** | The dish, and the ask. Video where you can. |

Ends on a **P.S.**, never a referral box. The ask is for a fact, a place, or a
recipe — reader contributions are the engine, and naming people is what makes
them forward the issue.

**Bank the Over Coffee ideas.** Realisations don't arrive on the 28th. Keep a
running note; three sentences the moment one lands.

---

## 4 · The annual check-in — every January

One email. Three jobs at once, so it never feels like data collection:

1. **Confirm the loan** — pre-filled from their Closing Disclosure, they just say yes
2. **Ask about refinances or a HELOC** — otherwise the equity maths is wrong
3. **Ask for the year's improvement receipts** — raises their cost basis, and
   builds the improvement history you'll list the house on one day

---

## 5 · Guest passes

A member shares their link. The friend claims it, **enters their own details**,
and gets a snapshot. The member never hands over somebody else's address.

At twenty or thirty a year this is manual and that's fine — look up the address,
send the snapshot, then ask if they'd like it kept current.

Seasonal framing: the **exemption check** works year-round, **protest comps**
run March–15 May, the **vendor list** any time.

**Never pay for referrals.** Texas Occupations Code §1101.351 prohibits
compensating an unlicensed person for brokerage services. Gratitude, not bounty.

---

## 6 · Known blockers

- **Brazoria** — their public download is a ProTax operational dump with no
  layout document for the property file, and the only file carrying addresses is
  a 523 MB mixed-year ARB export. **Do not guess at the columns.** Email BCAD and
  ask for the layout, or whether they publish a standard certified roll export.
  Until then, enter Pearland and Manvel members' figures by hand at enrolment.
- **Fort Bend** — Orion format; newest export findable on their site is 2024.
  Try their ArcGIS open-data hub first.

---

## 7 · Traps already hit, so nobody hits them twice

- **HCAD's column names mean the opposite of PACS's.** `tot_appr_val` is the
  *capped taxable* figure; `assessed_val` is *market*. Mapping by name shows a
  taxable value above market.
- **PACS keeps the house number at offset 4460**, 3,300 characters from the street
  name at 1050. Miss it and every Galveston address is just "Seawall Blvd".
- **A cap only exists with a homestead.** Market-minus-taxable also appears on ag
  land, abatements and commercial limits — don't call those a homestead cap.
- **`X-Robots-Tag` beats a page `<meta robots>`.** The noindex headers in
  `netlify.toml` are listed per page on purpose. A `/front-porch*` wildcard once
  silently overrode the page-level tag on the guest pass while it was being built
  as an indexable page. All four pages are noindex today, so keep the per-page
  form: it forces the next page added to this family to opt in deliberately.
- **`url()` in a stylesheet resolves against the stylesheet, not the page.**
  Moving CSS from inline into `css/` broke the hero image for several hours.

---

## 8 · What is deliberately manual

Not everything should be automated, and these shouldn't:

- **Vendor vetting.** The value is your judgement. Automate it and it's a directory.
- **Protest packets and street reports.** Request-driven, so you only fulfil what
  you can do well — and a request is a stronger buying signal than any open rate.
- **Guest-pass fulfilment.** Low volume, high touch.
- **Enrolment.** See §1. This is the one that matters.
