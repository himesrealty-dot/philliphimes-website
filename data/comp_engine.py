"""
MarketIQ(tm) Comp Engine v1.1
Phillip Himes | eXp Realty
------------------------------------------------------------
Usage:
    python comp_engine.py   (edit SUBJECT block below, then run)

Or import and call run_cma(subject_dict) directly.
"""

import csv, math, datetime, sys, os

DATA_PATH = os.path.join(os.path.dirname(__file__), 'MarketIQ.csv')

# ─── STORIES PREMIUM TABLE ($/sf: 1-story premium over 2-story) ───────────────
STORIES_PREMIUM = {
    # League City
    'westland ranch':            29.30,
    'hidden lakes':              18.84,
    'brittany lakes':            18.16,
    'south shore harbour':       16.53,
    'south shore lake':          16.53,
    'westover park':             13.86,
    'victory lakes':             13.00,
    'magnolia creek':            11.96,
    'westwood':                  11.04,
    'mar bella':                  2.50,
    'tuscan lakes':              -1.63,
    # Pearland
    'riverstone ranch':          34.45,
    'southwyck':                 21.55,
    'shadow creek ranch':        17.99,
    'silverlake':                10.89,
    'southern trails':           10.89,
    'ashford cove':              10.89,
    'sedgefield':                10.89,
    'lakepointe':                10.89,
    'parkside':                  10.89,
    'fieldstone village':        10.89,
    'shadow grove':              10.89,
    'the gardens':               10.89,
    'countryplace':              12.00,
    'highland glen':             12.00,
    # Friendswood
    'heritage park':             12.92,
    'west ranch':                 6.50,
    'avalon at friendswood':      4.56,
    'avalon':                     4.56,
    # Clear Lake (77058 / 77059)
    'university green':          27.01,
    'the reserve at clear lake': 22.04,
    'the reserve':               22.04,
    'brookwood':                 12.75,
    'el dorado clear lake city': 11.97,
    'pine brook':                 8.14,
    'northfork':                  5.02,
    'brook forest':               2.16,
    'bay oaks':                  15.00,
    'middlebrook':               10.00,
    'nassau bay':                 0.00,
    # Seabrook (77586)
    'mystic village at lake mija': 16.58,
    'clear lake forest':           5.45,
    # Default
    '__default__':               10.00,
}

def get_stories_premium(community: str) -> float:
    c = community.lower().strip()
    for key, val in STORIES_PREMIUM.items():
        if key == '__default__': continue
        if key in c or c in key:
            return val
    return STORIES_PREMIUM['__default__']

# ─── MASTER PLANNED COMMUNITIES ───────────────────────────────────────────────
ALL_MP_COMMUNITIES = [
    # League City
    'south shore harbour', 'tuscan lakes', 'mar bella', 'hidden lakes',
    'magnolia creek', 'westland ranch', 'westover park', 'westwood',
    'brittany lakes', 'victory lakes',
    # Pearland
    'shadow creek ranch', 'silverlake', 'southern trails', 'riverstone ranch',
    'southwyck', 'countryplace', 'highland glen',
    # Friendswood
    'heritage park', 'west ranch', 'avalon at friendswood',
    # Clear Lake
    'bay oaks', 'brook forest', 'brookwood', 'pine brook',
    'northfork', 'middlebrook', 'the reserve at clear lake',
    'university green',
]

# ─── HAVERSINE DISTANCE ───────────────────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2):
    R = 3958.8
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

# ─── HARD FILTERS (never relaxed) ────────────────────────────────────────────
def passes_hard(comp, subject):
    return (
        comp['newco']  == subject['newco']  and
        comp['water']  == subject['water']  and
        comp['gated']  == subject['gated']  and
        comp['mp']     == subject['mp']
    )

# ─── SIMILARITY SCORE (lower = more similar) ─────────────────────────────────
def score(comp, subject):
    dist = haversine(comp['lat'], comp['lon'], subject['lat'], subject['lon'])
    pts  = dist * 8
    pts += abs(comp['sqft'] - subject['sqft']) / max(subject['sqft'], 1) * 20
    pts += abs(comp['yr']   - subject['yr'])   * 0.4
    pts += abs(comp['beds'] - subject['beds']) * 3
    pts += abs(comp['baths']- subject['baths'])* 2
    if comp['pool']    != subject['pool']:                pts += 2
    if abs(comp['stories'] - subject['stories']) > 0.5:  pts += 5
    return pts

# ─── ADJUSTMENTS ──────────────────────────────────────────────────────────────
def adjust_ppsf(comp, subject):
    """
    Adjust comp's net ppsf to estimate subject's value.
    + = subject has superior feature (worth more than comp)
    - = comp has superior feature (subject worth less)
    """
    adj, sqft, notes = 0.0, subject['sqft'], []

    # Pool ($22,500 flat)
    if comp['pool'] != subject['pool']:
        d = (22500 if subject['pool'] else -22500) / sqft
        adj += d
        notes.append("Pool: {}$22,500".format('+' if subject['pool'] else '-'))

    # Stories (community-specific $/sf premium)
    story_diff = comp['stories'] - subject['stories']
    if abs(story_diff) > 0.5:
        community = subject.get('community', subject.get('subd', ''))
        premium   = get_stories_premium(community)
        if abs(premium) >= 3.0:
            d = premium * story_diff
            adj += d
            notes.append("Stories: {}{:.2f}/sf ({})".format('+' if d>0 else '', d, community))

    # Bedrooms ($2,500 each)
    bed_diff = subject['beds'] - comp['beds']
    if bed_diff != 0:
        d = bed_diff * 2500 / sqft
        adj += d
        notes.append("Beds: {}{:.2f}/sf ({:+.0f}br)".format('+' if d>0 else '', d, bed_diff))

    # Bathrooms ($1,500 full / $750 half)
    bath_diff = subject['baths'] - comp['baths']
    if abs(bath_diff) >= 0.1:
        full   = int(bath_diff)
        half   = round((bath_diff - full) / 0.1)
        dollar = full * 1500 + half * 750
        d = dollar / sqft
        adj += d
        notes.append("Baths: {}{:.2f}/sf ({:+.1f}ba)".format('+' if d>0 else '', d, bath_diff))

    # Square footage ($37/sf)
    sqft_diff = subject['sqft'] - comp['sqft']
    if sqft_diff != 0:
        d = sqft_diff * 37 / sqft
        adj += d
        notes.append("Sqft: {}{:.2f}/sf ({:+.0f}sf)".format('+' if d>0 else '', d, sqft_diff))

    # Garage ($6,500/stall, capped at +/-2 stalls)
    garage_diff = subject.get('garage', 0) - comp.get('garage', 0)
    if garage_diff != 0:
        stalls = max(-2, min(2, garage_diff))
        d = stalls * 6500 / sqft
        adj += d
        notes.append("Garage: {}{:.2f}/sf ({:+.0f} stall)".format('+' if d>0 else '', d, stalls))

    return comp['ppsf'] + adj, notes

# ─── INVERSE-SCORE WEIGHTED PPSF (10% floor) ─────────────────────────────────
def weighted_ppsf(ppsf_vals, scores, floor=0.10):
    raw     = [1.0 / s for s in scores]
    total   = sum(raw)
    weights = [w / total for w in raw]
    for _ in range(20):
        below = [i for i, w in enumerate(weights) if w < floor]
        if not below: break
        for i in below: weights[i] = floor
        leftover = 1.0 - len(below) * floor
        above = [i for i, w in enumerate(weights) if w > floor]
        at    = sum(weights[i] for i in above)
        if at > 0:
            for i in above: weights[i] = weights[i] / at * leftover
    return sum(p * w for p, w in zip(ppsf_vals, weights)), weights

# ─── LOAD SOLD COMPS FROM CSV ─────────────────────────────────────────────────
def load_sold_comps(csv_path=DATA_PATH):
    today = datetime.date.today()
    sold  = []
    with open(csv_path, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            if r.get('Status', '').strip() != 'Sold': continue
            try:
                lat  = float(r.get('Latitude',  0) or 0)
                lon  = float(r.get('Longitude', 0) or 0)
                if lat == 0 or lon == 0: continue

                sqft  = float(r.get('SqFtTotal', 0)  or 0)
                close = float(r.get('ClosePrice', 0)  or 0)
                if sqft < 100 or close < 1000: continue

                close_date = datetime.datetime.strptime(
                    r['CloseDate'][:10], '%Y-%m-%d').date()
                days_ago = (today - close_date).days

                rep  = float(r.get('RepairSeller',         '0') or 0)
                cc   = float(r.get('SellerToClosingCosts', '0') or 0)
                conc = rep + cc
                if conc > close * 0.15: conc = 0
                net  = close - conc
                ppsf = net / sqft

                stories_raw = r.get('Stories', '').strip()
                try:   stories = float(stories_raw)
                except: stories = 1.0

                subd      = r.get('Subdivision', '').strip()
                community = r.get('CommunityName', '').strip() or subd
                mp_raw    = r.get('MasterPlannedCommunityYN', '').strip().lower()
                gated_raw = r.get('Access', '').strip().lower()
                water_raw = r.get('WaterAmenity', '').strip()
                newco_raw = r.get('NewConstruction', '').strip().lower()
                pool_raw  = r.get('PoolPrivate', '').strip().lower()

                sold.append({
                    'mls':        r.get('MLSNumber', ''),
                    'subd':       subd,
                    'community':  community,          # normalized community name
                    'days_ago':   days_ago,
                    'lat': lat,   'lon': lon,
                    'sqft':       sqft,
                    'beds':       float(r.get('BedsTotal',    0) or 0),
                    'baths':      float(r.get('BathsTotal',   0) or 0),
                    'garage':     float(r.get('NoOfGarageCap',0) or 0),
                    'pool':       pool_raw  in ('true','yes','1','y'),
                    'stories':    stories,
                    'yr':         int(float(r.get('YearBuilt', 0) or 0)),
                    'ppsf':       ppsf,
                    'net':        net,
                    'close':      close,
                    'conc':       conc,
                    'mp':         mp_raw    in ('true','yes','1','y'),
                    'gated':      'gated'   in gated_raw,
                    'water':      bool(water_raw and water_raw not in ('0', '')),
                    'newco':      newco_raw in ('true','yes','1','y'),
                    'close_date': r['CloseDate'][:10],
                    'dom':        r.get('DOM', ''),
                    'city':       r.get('City', '').strip(),
                })
            except Exception:
                continue
    return sold

# ─── THIN MARKET DETECTION ────────────────────────────────────────────────────
def count_nearby(subject, sold, max_dist=4.0, max_days=365):
    """Count hard-filter-passing sold comps within max_dist miles and max_days."""
    n = 0
    for c in sold:
        if c['days_ago'] > max_days: continue
        if not passes_hard(c, subject): continue
        if haversine(c['lat'], c['lon'], subject['lat'], subject['lon']) <= max_dist:
            n += 1
    return n

# ─── PHASE DEFINITIONS ────────────────────────────────────────────────────────
#  (label, community_only, max_dist_mi, max_days, tight_filters, use_adjustments)
BASE_PHASES = [
    ('Ph1: Same community, 90d, tight, no adj',  True,  0.5,  90,  True,  False),
    ('Ph2: Same community, 90d, loose, adj',     True,  0.5,  90,  False, True),
    ('Ph3: 2mi, 90d, tight, no adj',             False, 2.0,  90,  True,  False),
    ('Ph4: 2mi, 90d, loose, adj',                False, 2.0,  90,  False, True),
    ('Ph5: 4mi, 180d, loose, adj',               False, 4.0,  180, False, True),
]
THIN_PHASE = ('Ph6: 4mi, 365d, loose, adj [thin market]', False, 4.0, 365, False, True)
THIN_THRESHOLD = 50   # nearby sold comps within 4mi/365d; below this = thin market

# ─── PHASE RUNNER ─────────────────────────────────────────────────────────────
def run_phase(subject, sold, max_dist, max_days, tight, adjustments,
              community_only=False, n=6):
    candidates = []
    subj_community = subject.get('community', subject.get('subd', '')).lower()

    for comp in sold:
        if comp['days_ago'] > max_days: continue

        dist = haversine(subject['lat'], subject['lon'], comp['lat'], comp['lon'])
        if dist > max_dist: continue

        # Phase 1/2: match on normalized CommunityName (groups all sections together)
        if community_only:
            comp_community = comp.get('community', comp.get('subd', '')).lower()
            if comp_community != subj_community: continue

        if tight:
            if abs(comp['sqft'] - subject['sqft']) / subject['sqft'] > 0.20: continue
            if abs(comp['yr']   - subject['yr'])   > 10: continue
            if comp['beds'] != subject['beds']: continue

        if not passes_hard(comp, subject): continue

        sc = score(comp, subject)
        adj_ppsf, notes = adjust_ppsf(comp, subject) if adjustments else (comp['ppsf'], [])
        candidates.append({**comp, 'score': sc, 'adj_ppsf': adj_ppsf,
                           'adj_notes': notes, 'dist': dist})

    candidates.sort(key=lambda x: x['score'])
    return candidates[:n]

# ─── MAIN CMA RUNNER ──────────────────────────────────────────────────────────
def run_cma(subject, sold=None, min_comps=3, verbose=True):
    """
    Run the 5-phase (+ optional thin-market phase 6) cascading CMA.

    subject dict keys:
      lat, lon, sqft, beds, baths, stories, yr, pool, garage,
      subd, community, mp, gated, water, newco
    """
    if sold is None:
        sold = load_sold_comps()

    # Detect thin market (< THIN_THRESHOLD hard-filter-passing comps within 4mi/365d)
    nearby = count_nearby(subject, sold)
    thin   = nearby < THIN_THRESHOLD
    phases = list(BASE_PHASES) + ([THIN_PHASE] if thin else [])

    if verbose and thin:
        print(f"  [thin market: {nearby} nearby comps — adding Phase 6 (365d)]")

    best_comps, best_label = [], ''

    for label, comm_only, max_dist, max_days, tight, adj in phases:
        comps = run_phase(subject, sold, max_dist, max_days, tight, adj,
                          community_only=comm_only)
        found = len(comps)
        if verbose:
            mark = 'OK' if found >= min_comps else '--'
            print(f'  [{mark}] {label} -> {found} comps')
        if found >= min_comps:
            best_comps = comps
            best_label = label
            break

    if not best_comps:
        if verbose: print('  [!!] No phase reached minimum -- returning best available')
        best_comps = run_phase(subject, sold, 4.0, 365, False, True)
        best_label = 'Fallback: 4mi/365d'

    if not best_comps:
        return None

    ppsf_vals  = [c['adj_ppsf'] for c in best_comps]
    score_vals = [c['score']    for c in best_comps]
    w_ppsf, weights = weighted_ppsf(ppsf_vals, score_vals)
    baseline = w_ppsf * subject['sqft']

    return {
        'phase':         best_label,
        'comps':         best_comps,
        'weights':       weights,
        'w_ppsf':        w_ppsf,
        'weighted_ppsf': w_ppsf,
        'baseline':      baseline,
        'comp_count':    len(best_comps),
        'range_low':     min(c['adj_ppsf'] for c in best_comps),
        'range_high':    max(c['adj_ppsf'] for c in best_comps),
        'thin_market':   thin,
        'nearby_comps':  nearby,
    }

# ─── PRINT REPORT ─────────────────────────────────────────────────────────────
def print_report(subject, result):
    if result is None:
        print('No result.'); return

    thin_tag = ' [THIN MARKET]' if result.get('thin_market') else ''
    print("\n" + "="*80)
    print("MarketIQ CMA  --  {} | {:.0f}sf | {:.0f}BR/{:.1f}BA | {} | {:.0f}-car | {} | {:.0f}-story{}".format(
        subject.get('subd',''), subject['sqft'], subject['beds'], subject['baths'],
        'Pool' if subject['pool'] else 'No Pool',
        subject.get('garage', 0), subject['yr'], subject['stories'], thin_tag))
    print("Phase: {}  |  Nearby comps: {}".format(result['phase'], result['nearby_comps']))
    print("="*80)

    hdr = ("{:<3} {:<12} {:<26} {:>6} {:>3} {:>4} {:>5} {:>4} {:>5} {:>4} "
           "{:>10} {:>7} {:>8} {:>7} {:>6} {:>5} {:>5}").format(
        '#','MLS','Community','SqFt','Br','Ba','Pool','Gar','Yr','St',
        'Net$','$/sf','Adj$/sf','Wt','Score','DOM','Ago')
    print(hdr)
    print('-' * len(hdr))

    for i, (comp, w) in enumerate(zip(result['comps'], result['weights'])):
        pool_s   = 'Yes' if comp['pool'] else 'No'
        comm_s   = comp.get('community', comp['subd'])[:25]
        line = ("{:<3} {:<12} {:<26} {:>6.0f} {:>3.0f} {:>4.1f} {:>5} {:>4.0f} {:>5} {:>4.1f} "
                "{:>10,.0f} {:>7.2f} {:>8.2f} {:>7.1%} {:>6.2f} {:>5} {:>5}").format(
            i+1, comp['mls'], comm_s,
            comp['sqft'], comp['beds'], comp['baths'],
            pool_s, comp['garage'], comp['yr'], comp['stories'],
            comp['net'], comp['ppsf'], comp['adj_ppsf'],
            w, comp['score'], comp['dom'], comp['days_ago'])
        print(line)
        if comp.get('adj_notes'):
            print("    Adj: {}".format(' | '.join(comp['adj_notes'])))

    print()
    print("Weighted PPSF:  ${:.2f}/sf".format(result['w_ppsf']))
    print("Baseline Value: ${:,.0f}".format(result['baseline']))
    b = result['baseline']
    print()
    print("List at market: ${:>10,.0f}".format(round(b       /5000)*5000))
    print("Aggressive low: ${:>10,.0f}  (-2.5%)".format(round(b*0.975/5000)*5000))
    print("Top of range:   ${:>10,.0f}  (+2.5%)".format(round(b*1.025/5000)*5000))
    print()

# ─── CLI ENTRY POINT ──────────────────────────────────────────────────────────
if __name__ == '__main__':
    # Edit this subject block and run: python comp_engine.py
    SUBJECT = {
        'lat':  29.5197, 'lon': -95.0535,
        'sqft': 1560, 'beds': 3, 'baths': 2.0,
        'stories': 1.0, 'yr': 1982,
        'pool': False, 'garage': 2,
        'subd':      'Meadow Bend',
        'community': 'Meadow Bend',
        'mp': False, 'gated': False, 'water': False, 'newco': False,
    }

    print(f"\nLoading comps from {DATA_PATH}...")
    sold_comps = load_sold_comps()
    print(f"Loaded {len(sold_comps)} sold comps\n")

    print("Running CMA phases:")
    result = run_cma(SUBJECT, sold_comps, verbose=True)
    print_report(SUBJECT, result)
