"""
MarketIQ™ Data Prep v1.0
Phillip Himes | eXp Realty
------------------------------------------------------------
Normalizes HAR MLS CSV exports and merges them into the master dataset.

Usage:
  python data_prep.py                        # normalize MarketIQ.csv in-place
  python data_prep.py new_export.csv         # merge new export into MarketIQ.csv
  python data_prep.py new_export.csv --dry-run   # preview without saving

What it fixes:
  - YearBuilt stored as '1967.0' -> 1967 (pandas float issue)
  - MasterPlannedCommunityYN auto-applied from community name lookup
  - CommunityName column added — strips section suffixes, collapses variants
  - Duplicate MLSNumbers dropped on merge
  - Trailing whitespace and encoding artifacts cleaned
  - Concessions capped at 15% of close price
"""

import pandas as pd
import re
import os
import sys

MASTER_PATH = os.path.join(os.path.dirname(__file__), 'MarketIQ.csv')

# ─── COMMUNITY NAME NORMALIZATION ─────────────────────────────────────────────
# Step 1: Suffix substitutions — strip from anywhere in the string
SUFFIX_SUBS = [
    # "At Silverlake" / "At Silver Lake" (handles truncated names like "Silverla")
    (re.compile(r'\s+At\s+Silver(?:lake|la\w*|l?\s+Lake)\b.*$', re.I), ''),
    # Parenthetical suffixes like "(PEARLAND)" or "(A0300HT&B)"
    (re.compile(r'\s*\(.*\).*$'), ''),
]

# Step 2: Full-match replacements — must match the whole string
FULL_REPLACEMENTS = [
    (re.compile(r'^(Riverstone Ranch)\s*[/\s].+$', re.I),           'Riverstone Ranch'),
    (re.compile(r'^(Shadow Creek Ranch)\s+Sf[-\s0-9].+$', re.I),    'Shadow Creek Ranch'),
    (re.compile(r'^Shadow Creek Ranch\s+Sf1-Sf2.+$', re.I),         'Shadow Creek Ranch'),
    (re.compile(r'^The Reserve\s+At\s+Clear Lake.*$', re.I),        'The Reserve at Clear Lake'),
    (re.compile(r'^The Reserve\s+Sec\s+.+$', re.I),                 'The Reserve at Clear Lake'),
    (re.compile(r'^The Reserve$', re.I),                             'The Reserve at Clear Lake'),
    (re.compile(r'^Arbor Gate\s*/\s*West Ranch.*$', re.I),          'West Ranch'),
    (re.compile(r'^Austin Chase\s*/\s*West Ranch.*$', re.I),        'West Ranch'),
    (re.compile(r'^West Ranch\s*/\s*Sierra.*$', re.I),              'West Ranch'),
    (re.compile(r'^(?:Stonecreek|Creekside)\s+At\s+West Ranch.*$', re.I), 'West Ranch'),
    (re.compile(r'^West Ranch\s+(?:Estates|Lake|Lakeside|West Lake).*$', re.I), 'West Ranch'),
    (re.compile(r'^Marbella$', re.I),                               'Mar Bella'),
    (re.compile(r'^NASSAU BAY\s+SEC\s+\d+$'),                       'Nassau Bay'),
    (re.compile(r'^Pine Brook\s+Patio Homes.*$', re.I),             'Pine Brook'),
    (re.compile(r'^Bellavita(?:\s*/?\s*Green Tee|\s+At\s+Green Tee).*$', re.I), 'Bellavita At Green Tee'),
    (re.compile(r'^GREEN TEE TERRAN[CE]+.*$', re.I),                'Green Tee Terrace'),
    (re.compile(r'^Silverlake\s+Area.*$', re.I),                    'Silverlake'),
]

# Step 3: Strip section / phase / year suffixes
SECTION_STRIPS = [
    re.compile(r'\s+Sec(?:tion)?\s+\w+.*$', re.I),         # Sec 01, Sec 01 R/P, Sec 01 Corr Pla
    re.compile(r'\s+Sf[-\s]\w+.*$', re.I),                 # SF-61, SF 42
    re.compile(r'\s+Ph(?:ase)?\s+(?:\d+|[IVX]+).*$', re.I),# Ph 1, Phase II, Ph 2 Sec
    re.compile(r'\s+R/P$', re.I),                          # Replat
    re.compile(r'\s+Amd(?:ended)?$', re.I),                # Amd, Amended
    re.compile(r'\s+Corr(?:ected)?\s*Pla.*$', re.I),       # Corr Pla, Corr Plat
    re.compile(r'\s+U/R$', re.I),                          # Unrestricted
    re.compile(r'\s+Rep(?:lat)?\s*\d*$', re.I),            # Rep, Replat 1
    re.compile(r'\s+Sub\s*$', re.I),                       # trailing "Sub"
    re.compile(r'\s+\d{2,4}$'),                            # trailing year: 1994, 2011, 91
    re.compile(r'\s+\d+[A-Za-z]?$'),                       # trailing: "1", "01a", "01b"
]

def normalize_community(subd: str) -> str:
    """
    Normalize a raw MLS subdivision name to a canonical community name.
    Groups all sections of the same community under one name.
    """
    if not isinstance(subd, str) or not subd.strip():
        return ''

    s = subd.strip()

    # 1. Apply suffix substitutions (before title-casing — handles raw ALL CAPS strings)
    for pat, repl in SUFFIX_SUBS:
        new_s = pat.sub(repl, s).strip()
        if new_s != s:
            s = new_s
            break

    # 2. Title-case if the whole string is uppercase (common in older MLS exports)
    if s == s.upper() and len(s) > 3:
        s = s.title()

    # 3. Apply full-match replacements (post title-case — handles both cases)
    for pat, repl in FULL_REPLACEMENTS:
        if pat.match(s):
            s = repl
            break

    # 4. Strip section / phase / year suffixes one by one
    for strip_re in SECTION_STRIPS:
        new_s = strip_re.sub('', s).strip()
        if new_s and new_s != s:
            s = new_s

    # 5. Final cleanup
    return re.sub(r'\s{2,}', ' ', s).strip()


# ─── MASTER PLANNED COMMUNITY LOOKUP ──────────────────────────────────────────
MP_COMMUNITIES = {
    # League City
    'south shore harbour', 'tuscan lakes', 'mar bella', 'hidden lakes',
    'magnolia creek', 'westland ranch', 'westover park', 'westwood',
    'brittany lakes', 'victory lakes',
    # Pearland
    'shadow creek ranch', 'silverlake', 'southern trails', 'riverstone ranch',
    'southwyck', 'countryplace', 'the lakes at countryplace',
    'highland glen', 'the lakes at highland glen', 'preserve at highland glen',
    # Friendswood
    'heritage park', 'west ranch', 'avalon at friendswood', 'the forest',
    'the forest of friendswood',
    # Clear Lake
    'bay oaks', 'brook forest', 'brookwood', 'pine brook',
    'northfork', 'middlebrook', 'the reserve at clear lake',
    'university green', 'el dorado clear lake city',
}

def is_mp(community_name: str) -> bool:
    """Return True if community_name matches a known master-planned community."""
    c = community_name.lower().strip()
    return c in MP_COMMUNITIES


# ─── DATAFRAME NORMALIZATION ───────────────────────────────────────────────────
def normalize_df(df: pd.DataFrame) -> pd.DataFrame:
    """Apply all data quality fixes to a MarketIQ DataFrame. Returns cleaned copy."""
    df = df.copy()

    # 1. Fix YearBuilt: pandas saves as '1967.0' when column has NaN values
    def safe_year(v):
        try:
            f = float(v)
            return int(f) if f > 0 else 0
        except (ValueError, TypeError):
            return 0
    df['YearBuilt'] = df['YearBuilt'].apply(safe_year)

    # 2. Add / refresh CommunityName column
    df['CommunityName'] = df['Subdivision'].apply(normalize_community)

    # 3. Auto-apply MasterPlannedCommunityYN from community name lookup
    df['MasterPlannedCommunityYN'] = df['CommunityName'].apply(is_mp)

    # 4. Normalize numeric columns that pandas may store as mixed types
    for col in ['BedsTotal', 'BathsTotal', 'NoOfGarageCap']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    # 5. Normalize boolean text columns to consistent True/False
    BOOL_MAP = {'true': True, '1': True, 'yes': True, 'y': True,
                'false': False, '0': False, 'no': False, 'n': False,
                'nan': False, '': False}
    for col in ['PoolPrivate', 'NewConstruction']:
        if col in df.columns:
            df[col] = (df[col].astype(str).str.strip().str.lower()
                       .map(BOOL_MAP).fillna(False))

    # 6. Strip whitespace from key string columns
    for col in ['Status', 'Subdivision', 'CommunityName', 'City',
                'WaterAmenity', 'Access', 'PostalCode']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().replace('nan', '')

    # 7. Cap seller concessions at 15% of close price
    close = pd.to_numeric(df.get('ClosePrice', 0), errors='coerce').fillna(0)
    rep   = pd.to_numeric(df.get('RepairSeller', 0), errors='coerce').fillna(0)
    cc    = pd.to_numeric(df.get('SellerToClosingCosts', 0), errors='coerce').fillna(0)
    bad   = (rep + cc) > (close * 0.15)
    if bad.any():
        df.loc[bad, 'RepairSeller']         = 0
        df.loc[bad, 'SellerToClosingCosts'] = 0

    return df


# ─── MERGE NEW EXPORT INTO MASTER ─────────────────────────────────────────────
def merge_into_master(new_csv: str, master_csv: str = MASTER_PATH,
                      dry_run: bool = False) -> dict:
    """
    Load a new HAR export, normalize it, dedup against master, and append.
    Returns summary dict with row counts.
    """
    print(f"Loading new export:  {new_csv}")
    new_df = pd.read_csv(new_csv, low_memory=False)
    print(f"  Rows: {len(new_df):,}")

    print(f"Loading master:      {master_csv}")
    master = pd.read_csv(master_csv, low_memory=False)
    print(f"  Rows: {len(master):,}")

    print("Normalizing...")
    new_df = normalize_df(new_df)
    master = normalize_df(master)

    # Drop records already in master
    existing_mls = set(master['MLSNumber'].astype(str))
    new_dedup = new_df[~new_df['MLSNumber'].astype(str).isin(existing_mls)].copy()
    dups = len(new_df) - len(new_dedup)
    print(f"  Duplicates dropped: {dups:,}")
    print(f"  New records:        {len(new_dedup):,}")

    # Align columns
    for col in master.columns:
        if col not in new_dedup.columns:
            new_dedup[col] = None
    new_dedup = new_dedup[master.columns]

    merged = pd.concat([master, new_dedup], ignore_index=True)
    sold_n = int((merged['Status'] == 'Sold').sum())
    summary = {'rows_added': len(new_dedup), 'dups_dropped': dups,
               'total_rows': len(merged), 'sold_comps': sold_n}

    if not dry_run:
        merged.to_csv(master_csv, index=False)
        print(f"\nSaved {master_csv}")
    else:
        print("\n[DRY RUN — no file written]")

    print(f"  Total rows:  {len(merged):,}  |  Sold comps: {sold_n:,}")
    return summary


# ─── NORMALIZE IN PLACE ────────────────────────────────────────────────────────
def normalize_master(master_csv: str = MASTER_PATH, dry_run: bool = False) -> dict:
    """Normalize the master CSV in place — fixes types, adds CommunityName, corrects MP flags."""
    print(f"Loading: {master_csv}")
    df = pd.read_csv(master_csv, low_memory=False)
    print(f"  Rows: {len(df):,}")

    cleaned = normalize_df(df)
    sold_n  = int((cleaned['Status'] == 'Sold').sum())
    summary = {
        'total_rows':        len(cleaned),
        'sold_comps':        sold_n,
        'mp_true':           int(cleaned['MasterPlannedCommunityYN'].sum()),
        'unique_communities': cleaned['CommunityName'].nunique(),
    }

    if not dry_run:
        cleaned.to_csv(master_csv, index=False)
        print(f"Saved: {master_csv}")
    else:
        print("[DRY RUN]")

    print(f"  Total rows:          {summary['total_rows']:,}")
    print(f"  Sold comps:          {summary['sold_comps']:,}")
    print(f"  MP=True records:     {summary['mp_true']:,}")
    print(f"  Unique communities:  {summary['unique_communities']:,}")
    return summary


# ─── CLI ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    args    = [a for a in sys.argv[1:] if not a.startswith('--')]

    if args:
        merge_into_master(args[0], dry_run=dry_run)
    else:
        normalize_master(dry_run=dry_run)
