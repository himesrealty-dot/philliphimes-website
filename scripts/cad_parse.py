"""Parse a Texas county appraisal roll into a queryable SQLite table.

Powers two things at once:
  · the member dashboard on The Front Porch (appraised value, cap, exemptions,
    five-year history)
  · the public lookup on front-porch-pass.html (address autocomplete + snapshot)

Currently handles the **PACS 8.0.34** export format, which Galveston CAD uses.
Harris (own format), Fort Bend (Orion) and Brazoria (ProTax) need their own
readers — the schema and the loader below are shared, so adding one means
writing a row-iterator and nothing else.

The roll is fixed-width and enormous (Galveston's APPRAISAL_INFO.TXT is ~2 GB
uncompressed), so it is streamed straight out of the zip a line at a time and
only the ~15 columns we actually use are kept. Nothing is held in memory.

Usage
-----
    python scripts/cad_parse.py --zip <roll.zip> --county "Galveston CAD" --year 2026
    python scripts/cad_parse.py --zip <roll.zip> --county "Galveston CAD" --year 2026 --db data/cad.sqlite

Then:
    python scripts/cad_parse.py --lookup "1428 Tuscan"
"""

from __future__ import annotations

import argparse
import os
import re
import sqlite3
import sys
import zipfile
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "cad.sqlite"

# ── PACS 8.0.34 · APPRAISAL_INFO.TXT ─────────────────────────────────────────
# (start, end) are 1-indexed inclusive, exactly as the export layout states them.
# Verified against the layout workbook shipped inside Galveston's roll zip.
PACS_FIELDS = {
    "prop_id":         (1, 12),
    "owner_name":      (609, 678),
    "situs_street_prefx":  (1040, 1049),
    "situs_street":    (1050, 1099),
    "situs_street_sfx":    (1100, 1109),
    "situs_city":      (1110, 1139),
    "situs_zip":       (1140, 1149),
    # The house number lives 3,300 characters away from the street name.
    # Without it every Galveston address is just "Seawall Blvd".
    "situs_num":       (4460, 4474),
    "situs_unit":      (4475, 4479),
    "legal_desc":      (1150, 1404),
    "abs_subdv_cd":    (1676, 1685),
    "legal_acreage":   (1660, 1675),
    "land_hstd_val":   (1796, 1810),
    "imprv_hstd_val":  (1826, 1840),
    "appraised_val":   (1916, 1930),
    "ten_percent_cap": (1931, 1945),
    "assessed_val":    (1946, 1960),
    "hs_exempt":       (2609, 2609),
    "ov65_exempt":     (2610, 2610),
    "dp_exempt":       (2662, 2662),
    "dv1_exempt":      (2663, 2663),
    "dv2_exempt":      (2665, 2665),
    "dv3_exempt":      (2667, 2667),
    "dv4_exempt":      (2669, 2669),
}
PACS_MIN_LEN = 4480  # must reach situs_num at 4460-4474, not just the value block

SCHEMA = """
CREATE TABLE IF NOT EXISTS parcel (
    county        TEXT NOT NULL,
    tax_year      INTEGER NOT NULL,
    prop_id       TEXT NOT NULL,
    situs_street  TEXT,
    situs_city    TEXT,
    situs_zip     TEXT,
    subdivision   TEXT,
    legal_desc    TEXT,
    state_class   TEXT,
    acreage       REAL,
    appraised     INTEGER,
    assessed      INTEGER,
    cap_adjust    INTEGER,
    hs_exempt     INTEGER,
    ov65_exempt   INTEGER,
    disabled      INTEGER,
    vet_exempt    INTEGER,
    PRIMARY KEY (county, tax_year, prop_id)
);
-- Drives the type-ahead on the public lookup.
CREATE INDEX IF NOT EXISTS idx_parcel_addr ON parcel (situs_street, situs_city);
CREATE INDEX IF NOT EXISTS idx_parcel_prop ON parcel (prop_id);
-- Year-over-year history for one property is a primary-key range scan.
CREATE INDEX IF NOT EXISTS idx_parcel_hist ON parcel (county, prop_id, tax_year);
"""


def _slice(line: str, span: tuple[int, int]) -> str:
    return line[span[0] - 1:span[1]].strip()


def _int(raw: str) -> int | None:
    raw = raw.strip().lstrip("0")
    if not raw:
        return 0
    try:
        return int(raw)
    except ValueError:
        return None


def _flag(raw: str) -> int:
    return 1 if raw.strip().upper() == "T" else 0


def _norm_street(s: str) -> str:
    """Collapse whitespace and title-case for display. Deliberately does NOT
    expand abbreviations — the roll is the source of truth and users pick from
    a list, so there is no fuzzy match to defend against."""
    return re.sub(r"\s+", " ", s).title().strip()


def iter_pacs(zip_path: Path):
    """Yield normalised dicts from a PACS roll zip, streaming line by line."""
    with zipfile.ZipFile(zip_path) as z:
        names = [n for n in z.namelist() if n.upper().endswith("APPRAISAL_INFO.TXT")]
        if not names:
            raise SystemExit(
                "No APPRAISAL_INFO.TXT in that zip — is it a PACS export?\n"
                "Contents: " + ", ".join(z.namelist()[:12])
            )
        member = names[0]
        with z.open(member) as fh:
            for raw in fh:
                line = raw.decode("latin-1").rstrip("\r\n")
                if len(line) < PACS_MIN_LEN:
                    continue
                g = {k: _slice(line, v) for k, v in PACS_FIELDS.items()}
                street = _norm_street(" ".join(x for x in (
                    g["situs_num"], g["situs_street_prefx"], g["situs_street"],
                    g["situs_street_sfx"], g["situs_unit"]) if x))
                if not street or not g["situs_street"].strip():
                    continue  # no situs address: minerals, personal property, etc.
                acre_raw = _int(g["legal_acreage"])
                yield {
                    "prop_id":      g["prop_id"].lstrip("0") or g["prop_id"],
                    "situs_street": street,
                    "situs_city":   _norm_street(g["situs_city"]),
                    "situs_zip":    g["situs_zip"][:5],
                    "subdivision":  g["abs_subdv_cd"],
                    "legal_desc":   re.sub(r"\s+", " ", g["legal_desc"])[:180],
                    "state_class":  None,
                    "acreage":      (acre_raw / 10000.0) if acre_raw else None,
                    "appraised":    _int(g["appraised_val"]),
                    "assessed":     _int(g["assessed_val"]),
                    "cap_adjust":   _int(g["ten_percent_cap"]),
                    "hs_exempt":    _flag(g["hs_exempt"]),
                    "ov65_exempt":  _flag(g["ov65_exempt"]),
                    "disabled":     _flag(g["dp_exempt"]),
                    "vet_exempt":   1 if any(_flag(g[k]) for k in
                                             ("dv1_exempt", "dv2_exempt", "dv3_exempt", "dv4_exempt")) else 0,
                }



# ── HARRIS (HCAD) ────────────────────────────────────────────────────────────
# Tab-delimited with a header row, spread across TWO downloads:
#   Real_acct_owner.zip  -> real_acct.txt      (addresses + values, ~890 MB)
#   Real_jur_exempt.zip  -> jur_exempt_cd.txt  (acct -> exemption code)
#
# CAREFUL — HCAD's column names mean the OPPOSITE of PACS's:
#   tot_mkt_val   = market value          (PACS calls this "appraised")
#   tot_appr_val  = capped taxable value  (PACS calls this "assessed")
#   assessed_val  = market value again, NOT the taxable figure
# Mapping these by name would show a taxable value ABOVE market, which is
# nonsense. Verified against a Cap_acct='Y' parcel: mkt 524,819 / appr 376,607.
HCAD_HS   = {"RES", "PAR"}                       # residential homestead (full / partial)
HCAD_OV65 = {"OVR", "POV", "SUR", "APO"}
HCAD_DIS  = {"DIS", "PDS", "APD", "SSD"}
HCAD_VET  = {"V11","V12","V13","V14","V21","V22","V23","V24",
             "VS1","VS2","VS3","VS4","VCH","STX","SSP","SST","STT","SSA"}


def _hcad_exemptions(exempt_zip: Path):
    """acct -> set of exemption categories. Only the codes we care about are
    kept, so this stays a few tens of MB rather than the whole 30 MB file."""
    keep = HCAD_HS | HCAD_OV65 | HCAD_DIS | HCAD_VET
    out: dict[str, set] = {}
    with zipfile.ZipFile(exempt_zip) as z:
        names = [n for n in z.namelist() if n.lower().endswith("jur_exempt_cd.txt")]
        if not names:
            raise SystemExit("No jur_exempt_cd.txt in the exemption zip.")
        with z.open(names[0]) as fh:
            next(fh, None)  # header
            for raw in fh:
                parts = raw.decode("latin-1").rstrip("\r\n").split("\t")
                if len(parts) < 2:
                    continue
                acct, cat = parts[0].strip(), parts[1].strip()
                if cat in keep:
                    out.setdefault(acct, set()).add(cat)
    print(f"  {len(out):,} accounts carry an exemption we track", file=sys.stderr)
    return out


def iter_hcad(zip_path: Path, exempt_zip: Path | None = None):
    ex = _hcad_exemptions(exempt_zip) if exempt_zip else {}
    with zipfile.ZipFile(zip_path) as z:
        names = [n for n in z.namelist() if n.lower().endswith("real_acct.txt")]
        if not names:
            raise SystemExit("No real_acct.txt in that zip — expected Real_acct_owner.zip.")
        with z.open(names[0]) as fh:
            header = [c.strip() for c in fh.readline().decode("latin-1").split("\t")]
            ix = {c: i for i, c in enumerate(header)}

            def col(parts, name):
                i = ix.get(name)
                return parts[i].strip() if i is not None and i < len(parts) else ""

            for raw in fh:
                parts = raw.decode("latin-1").rstrip("\r\n").split("\t")
                if len(parts) < len(header) - 4:
                    continue
                street = _norm_street(col(parts, "site_addr_1"))
                if not street:
                    continue
                market = _int(col(parts, "tot_mkt_val")) or 0
                taxable = _int(col(parts, "tot_appr_val")) or 0
                if market == 0 and taxable == 0:
                    continue  # fully exempt, vacant or not yet valued
                acct = col(parts, "acct")
                cats = ex.get(acct, ())
                lgl = " ".join(col(parts, f"lgl_{i}") for i in (1, 2, 3, 4)).strip()
                acre = col(parts, "acreage")
                yield {
                    "prop_id":      acct,
                    "situs_street": street,
                    "situs_city":   _norm_street(col(parts, "site_addr_2")),
                    "situs_zip":    col(parts, "site_addr_3")[:5],
                    "subdivision":  col(parts, "Neighborhood_Code"),
                    "legal_desc":   re.sub(r"\s+", " ", lgl)[:180],
                    "state_class":  col(parts, "state_class"),
                    "acreage":      float(acre) if acre else None,
                    # market first, taxable second — see the warning above
                    "appraised":    market,
                    "assessed":     taxable,
                    # Only a homesteaded parcel can carry a homestead cap. The raw
                    # market-minus-taxable gap also shows up on ag land, abatements
                    # and commercial limitations — calling those a "cap" would put a
                    # wrong number in front of a homeowner.
                    "cap_adjust":   max(0, market - taxable) if (HCAD_HS & set(cats)) else 0,
                    "hs_exempt":    1 if HCAD_HS   & set(cats) else 0,
                    "ov65_exempt":  1 if HCAD_OV65 & set(cats) else 0,
                    "disabled":     1 if HCAD_DIS  & set(cats) else 0,
                    "vet_exempt":   1 if HCAD_VET  & set(cats) else 0,
                }


READERS = {"pacs": iter_pacs, "hcad": iter_hcad}




# ── Members filter ───────────────────────────────────────────────────────────
# The Front Porch serves enrolled clients, not the public, so there is no reason
# to keep 1.86M parcels to serve a few hundred. Parse the whole roll (it streams,
# it is fast), keep only the matches, discard the rest.
#
# data/members.csv columns (header required, extras ignored):
#   name,county,prop_id,situs_street,situs_city
# prop_id is authoritative when present. On first enrolment it is usually blank,
# so the street+city fallback finds it — then write the prop_id back into the
# file and every future year is an exact match with no address guessing.

def load_members(path: Path):
    import csv
    by_prop, by_addr, rows = set(), {}, []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            row = { (k or "").strip().lower(): (v or "").strip() for k, v in row.items() }
            if not any(row.values()):
                continue
            rows.append(row)
            if row.get("prop_id"):
                by_prop.add(row["prop_id"].lstrip("0") or row["prop_id"])
            elif row.get("situs_street"):
                key = (_norm_street(row["situs_street"]).lower(),
                       _norm_street(row.get("situs_city", "")).lower())
                by_addr[key] = row
    return by_prop, by_addr, rows


def _member_match(rec, by_prop, by_addr):
    if rec["prop_id"] in by_prop:
        return True
    key = (rec["situs_street"].lower(), (rec["situs_city"] or "").lower())
    return key in by_addr


def _migrate(con: sqlite3.Connection) -> None:
    """Additive column migrations. CREATE TABLE IF NOT EXISTS silently does
    nothing on an existing table, so a DB built by an older version of this
    script would be missing newer columns and fail on insert."""
    have = {r[1] for r in con.execute("PRAGMA table_info(parcel)")}
    for col, decl in (("state_class", "TEXT"),):
        if col not in have:
            con.execute(f"ALTER TABLE parcel ADD COLUMN {col} {decl}")
            print(f"  migrated: added parcel.{col}", file=sys.stderr)
    con.commit()


def load(zip_path: Path, county: str, year: int, db_path: Path,
         fmt: str = "pacs", limit: int | None = None,
         exempt_zip: Path | None = None, members: Path | None = None) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db_path)
    con.executescript(SCHEMA)
    _migrate(con)

    reader = READERS[fmt]
    cols = ("county", "tax_year", "prop_id", "situs_street", "situs_city", "situs_zip",
            "subdivision", "legal_desc", "state_class", "acreage", "appraised", "assessed",
            "cap_adjust", "hs_exempt", "ov65_exempt", "disabled", "vet_exempt")
    sql = f"INSERT OR REPLACE INTO parcel ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})"

    batch, n = [], 0
    by_prop = by_addr = None
    if members:
        by_prop, by_addr, member_rows = load_members(members)
        print(f"  filtering to {len(member_rows)} enrolled propert"
              f"{'y' if len(member_rows) == 1 else 'ies'}", file=sys.stderr)

    seen_props = set()
    stream = reader(zip_path, exempt_zip) if fmt == "hcad" else reader(zip_path)
    for rec in stream:
        if by_prop is not None and not _member_match(rec, by_prop, by_addr):
            continue
        if by_prop is not None:
            seen_props.add((rec["situs_street"].lower(), (rec["situs_city"] or "").lower()))
        batch.append((county, year) + tuple(rec[c] for c in cols[2:]))
        n += 1
        if len(batch) >= 5000:
            con.executemany(sql, batch); batch.clear()
            print(f"\r  {n:,} parcels…", end="", file=sys.stderr, flush=True)
        if limit and n >= limit:
            break
    if batch:
        con.executemany(sql, batch)
    con.commit()
    print(f"\r  {n:,} parcels loaded.        ", file=sys.stderr)

    size = os.path.getsize(db_path) / 1024 / 1024
    print(f"  {db_path} — {size:.1f} MB", file=sys.stderr)

    # The operational bit: say which enrolled properties did NOT turn up, so a
    # typo or a re-platted parcel gets noticed now rather than when a member
    # opens a dashboard with no numbers on it.
    if members:
        missing = [r for r in member_rows
                   if not r.get("prop_id")
                   and (_norm_street(r.get("situs_street", "")).lower(),
                        _norm_street(r.get("situs_city", "")).lower()) not in seen_props]
        if missing:
            print(f"\n!! {len(missing)} enrolled propert"
                  f"{'y' if len(missing) == 1 else 'ies'} not found in this roll:",
                  file=sys.stderr)
            for r in missing:
                print(f"       {r.get('name','?'):24} {r.get('situs_street','?')}, "
                      f"{r.get('situs_city','?')}", file=sys.stderr)
            print("     Check the spelling against the county, or the parcel may have "
                  "split/merged.\n", file=sys.stderr)
        else:
            print("  all enrolled properties matched.", file=sys.stderr)
    con.close()
    return n


def lookup(q: str, db_path: Path, limit: int = 8):
    """The autocomplete query, exactly as the public page will call it."""
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        """SELECT prop_id, situs_street, situs_city, situs_zip, county,
                  appraised, assessed, cap_adjust, hs_exempt
           FROM parcel
           WHERE tax_year = (SELECT MAX(tax_year) FROM parcel)
             AND (situs_street LIKE ? OR situs_city LIKE ?)
           ORDER BY situs_city, situs_street
           LIMIT ?""",
        (q + "%", q + "%", limit),
    ).fetchall()
    con.close()
    return [dict(r) for r in rows]


def history(prop_id: str, db_path: Path):
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        """SELECT tax_year, appraised, assessed, cap_adjust, hs_exempt
           FROM parcel WHERE prop_id = ? ORDER BY tax_year DESC""",
        (prop_id,),
    ).fetchall()
    con.close()
    return [dict(r) for r in rows]


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--zip", type=Path, help="County roll export (.zip)")
    ap.add_argument("--county", help='e.g. "Galveston CAD"')
    ap.add_argument("--year", type=int, help="Tax year of this roll")
    ap.add_argument("--format", default="pacs", choices=sorted(READERS))
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--exempt-zip", type=Path, help="HCAD only: Real_jur_exempt.zip")
    ap.add_argument("--members", type=Path,
                    help="CSV of enrolled properties — keep only these (see load_members)")
    ap.add_argument("--limit", type=int, help="Stop after N parcels (for testing)")
    ap.add_argument("--lookup", help="Test the autocomplete query")
    ap.add_argument("--history", help="Show every year on file for a prop_id")
    a = ap.parse_args()

    if a.lookup:
        for r in lookup(a.lookup, a.db):
            cap = r["cap_adjust"] or 0
            print(f'  {r["situs_street"]}, {r["situs_city"]} {r["situs_zip"]} '
                  f'· {r["county"]} · prop {r["prop_id"]}\n'
                  f'      appraised ${r["appraised"]:,}  assessed ${r["assessed"]:,}  '
                  f'cap ${cap:,}  homestead={"Y" if r["hs_exempt"] else "N"}')
        return

    if a.history:
        for r in history(a.history, a.db):
            print(f'  {r["tax_year"]}  appraised ${r["appraised"]:,}  '
                  f'assessed ${r["assessed"]:,}  cap ${r["cap_adjust"] or 0:,}  '
                  f'homestead={"Y" if r["hs_exempt"] else "N"}')
        return

    if not (a.zip and a.county and a.year):
        ap.error("--zip, --county and --year are required to load a roll")
    load(a.zip, a.county, a.year, a.db, a.format, a.limit, a.exempt_zip, a.members)


if __name__ == "__main__":
    main()
