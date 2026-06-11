/**
 * neighborhoods.js
 * Single source of truth for all 36 neighborhoods across 6 cities.
 * Used by city pages, BuyerIQ, and any other page that displays neighborhood cards.
 *
 * To update a neighborhood: edit this file once — all pages update automatically.
 *
 * Usage:
 *   <script src="js/neighborhoods.js"></script>
 *   <div class="city-hoods__grid" id="hoods-grid"></div>
 *   <script>renderNeighborhoodCards('hoods-grid', 'league-city');</script>
 */

const NEIGHBORHOODS = [

  /* ─── LEAGUE CITY ──────────────────────────────────────── */
  {
    id:        'tuscan-lakes',
    name:      'Tuscan Lakes',
    city:      'league-city',
    cityName:  'League City',
    tag:       'Master-Planned',
    desc:      'Resort-style amenities, scenic lakes, walking trails, and a clubhouse. One of League City\'s most in-demand communities with a strong HOA and meticulously maintained streets.',
    price:     '$315K – $1.5M+',
    href:      'tuscan-lakes.html',
    live:      true,
    tags:      ['Master-Planned', 'Pool & Trails', 'Resort Amenities'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Resort-style amenities, scenic lakes, walking trails, and a clubhouse. One of League City\'s most in-demand communities.',
  },
  {
    id:        'westover-park',
    name:      'Westover Park',
    city:      'league-city',
    cityName:  'League City',
    tag:       'Master-Planned · CCISD',
    desc:      'Family-oriented master-planned community with two pools, tennis complex, parks, lakes, and trails. Fully within top-rated Clear Creek ISD — and more attainable than most League City master-planned options.',
    price:     '$335K – $600K+',
    href:      'westover-park.html',
    live:      true,
    tags:      ['Master-Planned', 'Family-Friendly', 'Two Pools'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Family-oriented community with two pools, tennis complex, parks, lakes, and trails — fully within CCISD.',
  },
  {
    id:        'south-shore-harbour',
    name:      'South Shore Harbour',
    city:      'league-city',
    cityName:  'League City',
    tag:       'Waterfront · Golf · Marina',
    desc:      'A premier waterfront golf community on Clear Lake. Custom homes, marina access, 27-hole golf, and a resort atmosphere — one of the most prestigious addresses in the Houston Bay Area.',
    price:     '$305K – $1.3M+',
    href:      'south-shore-harbour.html',
    live:      true,
    tags:      ['Waterfront', 'Golf & Marina', 'Prestige Address'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Premier waterfront golf community on Clear Lake — marina access, 27-hole golf, and a resort atmosphere.',
  },
  {
    id:        'mar-bella',
    name:      'Mar Bella',
    city:      'league-city',
    cityName:  'League City',
    tag:       'Mediterranean · Lakes · CCISD',
    desc:      'Spanish Mediterranean–inspired master-planned community with 40 acres of lakes, resort pool and splash pad, and palm-lined streets. The most visually distinctive neighborhood in League City — fully within top-rated CCISD.',
    price:     '$335K – $800K+',
    href:      'mar-bella.html',
    live:      true,
    tags:      ['Mediterranean', '40-Acre Lakes', 'Resort Pool'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Spanish Mediterranean–inspired community with 40 acres of lakes and resort pool — the most visually distinctive in League City.',
  },
  {
    id:        'brittany-lakes',
    name:      'Brittany Lakes',
    city:      'league-city',
    cityName:  'League City',
    tag:       'Established · Lakes · CCISD',
    desc:      'Mature, tree-lined community with three kayakable lakes, resort pool with splash pad, and miles of walking trails. One of the lowest HOA fees in League City\'s established neighborhoods — and fully within top-rated CCISD.',
    price:     '$290K – $530K',
    href:      'brittany-lakes.html',
    live:      true,
    tags:      ['Established', 'Kayakable Lakes', 'Low HOA'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Mature tree-lined community with three kayakable lakes, resort pool, and trails — one of the lowest HOAs in League City.',
  },
  {
    id:        'magnolia-creek',
    name:      'Magnolia Creek',
    city:      'league-city',
    cityName:  'League City',
    tag:       'Golf · Master-Planned · CCISD',
    desc:      'League City\'s only golf-course community. A 27-hole private club winds through the neighborhood, with pools, walking trails, and a clubhouse restaurant — Lone Pine Grill. Zoned to Clear Springs High School.',
    price:     '$360K – $750K+',
    href:      'magnolia-creek.html',
    live:      true,
    tags:      ['Golf Community', 'Master-Planned', 'CCISD'],
    schoolTag: '🏫 Clear Springs HS (CCISD)',
    detail:    'League City\'s only golf-course community — 27-hole private club, pools, and the Lone Pine Grill clubhouse.',
  },

  /* ─── FRIENDSWOOD ──────────────────────────────────────── */
  {
    id:        'avalon',
    name:      'Avalon',
    city:      'friendswood',
    cityName:  'Friendswood',
    tag:       'Master-Planned · Lakes',
    desc:      'Friendswood\'s most prestigious address — resort-style amenities, stocked lakes, and homes that hold their value. The zip code everyone recognizes.',
    price:     '$600K – $1.4M+',
    href:      'avalon.html',
    live:      true,
    tags:      ['Master-Planned', 'Lakes', 'Prestige'],
    schoolTag: '🏫 Friendswood ISD — Excellent',
    detail:    'Friendswood\'s most prestigious address — resort amenities, stocked lakes, and homes that consistently hold their value.',
  },
  {
    id:        'friendswood-lakes',
    name:      'Friendswood Lakes',
    city:      'friendswood',
    cityName:  'Friendswood',
    tag:       'Lakeside · Family',
    desc:      'Waterfront lots, neighborhood fishing piers, and top-rated Friendswood ISD schools — a rare combination that keeps demand high and inventory low.',
    price:     '$470K – $1.3M+',
    href:      'friendswood-lakes.html',
    live:      true,
    tags:      ['Lakeside', 'Fishing Piers', 'Top Schools'],
    schoolTag: '🏫 Friendswood ISD — Excellent',
    detail:    'Waterfront lots, neighborhood fishing piers, and top-rated Friendswood ISD schools — rare combination, high demand.',
  },
  {
    id:        'falcon-ridge',
    name:      'Falcon Ridge',
    city:      'friendswood',
    cityName:  'Friendswood',
    tag:       'Established · Value',
    desc:      'Generous lots, mature trees, and solid construction in a quiet Friendswood neighborhood. Great entry point into the district without sacrificing quality.',
    price:     '$360K – $620K',
    href:      'falcon-ridge.html',
    live:      true,
    tags:      ['Established', 'Generous Lots', 'Value Entry'],
    schoolTag: '🏫 Friendswood ISD — Excellent',
    detail:    'Generous lots, mature trees, and solid construction — a great entry point into Friendswood ISD without sacrificing quality.',
  },
  {
    id:        'west-ranch',
    name:      'West Ranch',
    city:      'friendswood',
    cityName:  'Friendswood',
    tag:       'New Builds · Modern',
    desc:      'One of Friendswood\'s newest master-planned communities — resort amenities, modern floor plans, and top-tier Friendswood ISD schools all in one address.',
    price:     '$500K – $1.4M+',
    href:      'west-ranch.html',
    live:      true,
    tags:      ['New Builds', 'Modern Floorplans', 'Resort Pool'],
    schoolTag: '🏫 Friendswood ISD — Excellent',
    detail:    'One of Friendswood\'s newest master-planned communities — resort amenities and top-tier Friendswood ISD schools.',
  },
  {
    id:        'heritage-park',
    name:      'Heritage Park',
    city:      'friendswood',
    cityName:  'Friendswood',
    tag:       'Established · Trees',
    desc:      'Mature oak trees, generous lots, and a strong sense of community. Heritage Park offers timeless character and excellent resale history near Clear Creek ISD schools.',
    price:     '$220K – $410K',
    href:      'heritage-park.html',
    live:      true,
    tags:      ['Mature Oaks', 'Character', 'Established'],
    schoolTag: '🏫 Clear Brook HS (CCISD)',
    detail:    'Mature oak trees, generous lots, and a strong sense of community with timeless character and excellent resale history.',
  },
  {
    id:        'wilderness-trails',
    name:      'Wilderness Trails',
    city:      'friendswood',
    cityName:  'Friendswood',
    tag:       'Nature · Trails',
    desc:      'Wooded lots, hike-and-bike trails, and a peaceful pace — Wilderness Trails is Friendswood\'s hidden gem for buyers who want nature without giving up top schools.',
    price:     '$340K – $600K',
    href:      'wilderness-trails.html',
    live:      true,
    tags:      ['Wooded Lots', 'Nature Trails', 'Hidden Gem'],
    schoolTag: '🏫 Friendswood ISD — Excellent',
    detail:    'Wooded lots, hike-and-bike trails, and a peaceful pace — Friendswood\'s hidden gem for buyers who want nature and top schools.',
  },

  /* ─── PEARLAND ─────────────────────────────────────────── */
  {
    id:        'shadow-creek-ranch',
    name:      'Shadow Creek Ranch',
    city:      'pearland',
    cityName:  'Pearland',
    tag:       'Master-Planned · Resort',
    desc:      'Pearland\'s flagship master-planned community — resort pools, scenic lakes, top-rated schools, and the kind of amenities that keep resale values strong year after year.',
    price:     '$285K – $800K+',
    href:      'shadow-creek-ranch.html',
    live:      true,
    tags:      ['Master-Planned', 'Resort Pools', 'Value'],
    schoolTag: '🏫 Alvin ISD — Shadow Creek HS',
    detail:    'Pearland\'s flagship master-planned community — resort pools, scenic lakes, and amenities that hold resale values strong.',
  },
  {
    id:        'silverlake',
    name:      'Silverlake',
    city:      'pearland',
    cityName:  'Pearland',
    tag:       'Golf · Lakes',
    desc:      'A golf and lake community with winding streets, mature landscaping, and an active HOA. Resort lifestyle at a price point well below comparable communities north of Houston.',
    price:     '$335K – $800K',
    href:      'silverlake.html',
    live:      true,
    tags:      ['Golf', 'Scenic Lakes', 'Active HOA'],
    schoolTag: '🏫 Alvin ISD — Growing',
    detail:    'Golf and lake community with winding streets, mature landscaping, and an active HOA at a Pearland price point.',
  },
  {
    id:        'riverstone-ranch',
    name:      'Riverstone Ranch',
    city:      'pearland',
    cityName:  'Pearland',
    tag:       'Master-Planned · Lakes',
    desc:      'A scenic master-planned community with resort-style amenities, walking trails, and lakes. One of Pearland\'s most popular newer communities with strong builder variety and resale values.',
    price:     '$315K – $600K',
    href:      'riverstone-ranch.html',
    live:      true,
    tags:      ['Master-Planned', 'Lakes', 'Builder Variety'],
    schoolTag: '🏫 Alvin ISD — Shadow Creek HS',
    detail:    'Scenic master-planned community with resort amenities, walking trails, and strong builder variety and resale values.',
  },
  {
    id:        'southern-trails',
    name:      'Southern Trails',
    city:      'pearland',
    cityName:  'Pearland',
    tag:       'Master-Planned · New Construction',
    desc:      'A well-planned community in south Pearland with resort pool, splash pad, hike-and-bike trails, and easy highway access. Popular with families and move-up buyers seeking newer construction.',
    price:     '$285K – $950K+',
    href:      'southern-trails.html',
    live:      true,
    tags:      ['Master-Planned', 'New Construction', 'Resort Pool'],
    schoolTag: '🏫 Alvin ISD — Shadow Creek HS',
    detail:    'Well-planned community with resort pool, splash pad, and hike-and-bike trails — popular with families and move-up buyers.',
  },
  {
    id:        'southgate',
    name:      'Southgate',
    city:      'pearland',
    cityName:  'Pearland',
    tag:       'Established · Value',
    desc:      'One of Pearland\'s original neighborhoods — mature trees, wide lots, and genuine character. Great for buyers who want Pearland ISD schools without the master-planned premium.',
    price:     '$395K – $525K',
    href:      'southgate.html',
    live:      true,
    tags:      ['Established', 'Wide Lots', 'Pearland ISD'],
    schoolTag: '🏫 Pearland ISD',
    detail:    'One of Pearland\'s original neighborhoods — mature trees, wide lots, and character without the master-planned premium.',
  },
  {
    id:        'country-place',
    name:      'Country Place',
    city:      'pearland',
    cityName:  'Pearland',
    tag:       '55+ · Golf Community',
    desc:      'Pearland\'s premier 55+ active adult community — golf-cart-friendly streets, tree-lined fairways, and a peaceful pace. Popular with empty nesters and retirees seeking an active lifestyle.',
    price:     '$220K – $560K',
    href:      'country-place.html',
    live:      true,
    tags:      ['55+', 'Golf Community', 'Active Adult'],
    schoolTag: '🏫 Pearland ISD',
    detail:    'Pearland\'s premier 55+ active adult community — golf-cart-friendly streets, tree-lined fairways, and a peaceful pace.',
  },

  /* ─── CLEAR LAKE ────────────────────────────────────────── */
  {
    id:        'bay-oaks',
    name:      'Bay Oaks',
    city:      'clear-lake',
    cityName:  'Clear Lake',
    tag:       'Established · Golf',
    desc:      'One of Clear Lake\'s most prestigious established communities — mature trees, generous lots, and an active country club atmosphere. Bay Oaks has some of the highest resale values in the 77059 ZIP code.',
    price:     '$475K – $1.4M+',
    href:      'bay-oaks.html',
    live:      true,
    tags:      ['Golf Country Club', 'Prestige', 'Established'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'One of Clear Lake\'s most prestigious communities — mature trees, generous lots, and country club atmosphere.',
  },
  {
    id:        'bay-forest',
    name:      'Bay Forest',
    city:      'clear-lake',
    cityName:  'Clear Lake',
    tag:       'Waterfront · Trees',
    desc:      'A serene waterfront-adjacent community with mature landscaping, winding streets, and a strong community identity. Popular with NASA professionals and long-term Clear Lake residents.',
    price:     '$320K – $650K+',
    href:      'bay-forest.html',
    live:      true,
    tags:      ['Waterfront-Adjacent', 'Mature Trees', 'NASA Corridor'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Serene community popular with NASA professionals — winding streets, mature landscaping, and strong community identity.',
  },
  {
    id:        'bay-knoll',
    name:      'Bay Knoll',
    city:      'clear-lake',
    cityName:  'Clear Lake',
    tag:       'Family · Value',
    desc:      'A well-maintained neighborhood offering Clear Creek ISD schools at a more accessible price point. Bay Knoll attracts families who want the Clear Lake lifestyle without the Bay Oaks premium.',
    price:     '$315K – $450K',
    href:      'bay-knoll.html',
    live:      true,
    tags:      ['Family-Friendly', 'CCISD Value', 'Established'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Well-maintained neighborhood with CCISD schools at an accessible price — Clear Lake lifestyle without the Bay Oaks premium.',
  },
  {
    id:        'brookwood',
    name:      'Brookwood',
    city:      'clear-lake',
    cityName:  'Clear Lake',
    tag:       'Established · CCISD',
    desc:      'A well-established Clear Lake neighborhood with mature trees, solid lot sizes, and easy access to NASA Rd 1 and I-45. Popular with families and long-time Houston Bay Area residents.',
    price:     '$340K – $565K',
    href:      'brookwood.html',
    live:      true,
    tags:      ['Established', 'CCISD', 'Easy Access'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Established Clear Lake neighborhood with mature trees and easy access to NASA Rd 1 and I-45.',
  },
  {
    id:        'taylor-lake',
    name:      'Taylor Lake',
    city:      'clear-lake',
    cityName:  'Clear Lake',
    tag:       'Lakefront · Waterfront',
    desc:      'A scenic lakefront community offering waterfront living, boat access, and a relaxed pace. One of the most sought-after water-access neighborhoods in the Clear Lake area.',
    price:     '$315K – $750K',
    href:      'taylor-lake.html',
    live:      true,
    tags:      ['Lakefront', 'Boat Access', 'Waterfront Living'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Scenic lakefront community offering waterfront living, boat access, and one of the most sought-after addresses in Clear Lake.',
  },
  {
    id:        'the-reserve-at-clear-lake',
    name:      'The Reserve at Clear Lake',
    city:      'clear-lake',
    cityName:  'Clear Lake',
    tag:       'Gated · Upscale',
    desc:      'A private gated community offering upscale homes, manicured grounds, and a quiet retreat from the surrounding urban activity. One of Clear Lake\'s premier addresses for discerning buyers.',
    price:     '$500K – $1M+',
    href:      'the-reserve-at-clear-lake.html',
    live:      true,
    tags:      ['Gated', 'Upscale', 'Private Community'],
    schoolTag: '🏫 Top-Rated CCISD',
    detail:    'Private gated community with upscale homes and manicured grounds — one of Clear Lake\'s premier addresses for discerning buyers.',
  },

  /* ─── DICKINSON ─────────────────────────────────────────── */
  {
    id:        'nicholstone',
    name:      'Nicholstone',
    city:      'dickinson',
    cityName:  'Dickinson',
    tag:       'Established · Family',
    desc:      'An established Dickinson neighborhood with solid single-family homes, good school access, and a strong community feel. A reliable, affordable entry point into Galveston County real estate.',
    price:     '$200K – $370K',
    href:      'nicholstone.html',
    live:      true,
    tags:      ['Established', 'Affordable', 'Family'],
    schoolTag: '🏫 Dickinson ISD',
    detail:    'Established Dickinson neighborhood with solid homes, good school access, and a strong community feel.',
  },
  {
    id:        'bay-colony',
    name:      'Bay Colony',
    city:      'dickinson',
    cityName:  'Dickinson',
    tag:       'Master-Planned · Lakes',
    desc:      'An established inland master-planned community with community lakes, parks, and many home sections. A standout combo: a League City address, Dickinson ISD schools, and lower Galveston County taxes.',
    price:     '$210K – $400K',
    href:      'bay-colony.html',
    live:      true,
    tags:      ['Master-Planned', 'Community Lakes', 'Established'],
    schoolTag: '🏫 Dickinson ISD',
    detail:    'Established inland master-planned community with lakes and parks — League City address, Dickinson ISD schools, Galveston County taxes.',
  },
  {
    id:        'pedregal',
    name:      'Pedregal',
    city:      'dickinson',
    cityName:  'Dickinson',
    tag:       'New Construction · Big Lots',
    desc:      'The Dickinson area\'s newest community — single-story Cervelle Homes on oversized lots with serious garage space, a community pond, and Galveston County taxes. New construction with land, a rare combination here.',
    price:     '$410K – $710K',
    href:      'pedregal.html',
    live:      true,
    tags:      ['New Construction', 'Oversized Lots', 'Single-Story'],
    schoolTag: '🏫 Dickinson ISD',
    detail:    'The area\'s newest community — single-story Cervelle Homes on oversized lots with big garages and a community pond.',
  },
  {
    id:        'peacock-isle',
    name:      'Peacock Isle',
    city:      'dickinson',
    cityName:  'Dickinson',
    tag:       'New · Bayou-Front',
    desc:      'A new-construction waterfront enclave by Bayway Homes — 50 homesites, 23 with direct Dickinson Bayou frontage, and no MUD or PID tax. Genuine bayou living in Dickinson ISD.',
    price:     '$340K – $760K',
    href:      'peacock-isle.html',
    live:      true,
    tags:      ['New Construction', 'Bayou-Front', 'No MUD/PID Tax'],
    schoolTag: '🏫 Dickinson ISD',
    detail:    'New Bayway Homes waterfront enclave on Dickinson Bayou — 23 of 50 homesites have direct frontage, with no MUD or PID tax.',
  },
  {
    id:        'bayou-maison',
    name:      'Bayou Maison',
    city:      'dickinson',
    cityName:  'Dickinson',
    tag:       'Gated · New Construction',
    desc:      'A gated new-construction community by Adams, Colina, and Censeo Homes, walkable to Dickinson ISD campuses. Modern single-family homes at an accessible price with Galveston County taxes.',
    price:     '$240K – $340K',
    href:      'bayou-maison.html',
    live:      true,
    tags:      ['Gated', 'New Construction', 'Dickinson ISD'],
    schoolTag: '🏫 Dickinson ISD',
    detail:    'Gated new-construction community by Adams, Colina & Censeo Homes — modern homes walkable to Dickinson ISD schools.',
  },
  {
    id:        'bayou-bend-estate',
    name:      'Bayou Bend Estate',
    city:      'dickinson',
    cityName:  'Dickinson',
    tag:       'New · Bayou Boat Ramp',
    desc:      'A new-construction community by Adams and Gehan Homes with spacious 4-bedroom homes and a private resident boat ramp on Dickinson Bayou. New build with genuine water access in Dickinson ISD.',
    price:     '$330K – $400K',
    href:      'bayou-bend-estate.html',
    live:      true,
    tags:      ['New Construction', 'Bayou Boat Ramp', 'Spacious'],
    schoolTag: '🏫 Dickinson ISD',
    detail:    'New-construction community by Adams & Gehan Homes — spacious 4-bed homes and a private resident boat ramp on Dickinson Bayou.',
  },

  /* ─── MANVEL ────────────────────────────────────────────── */
  {
    id:        'pomona',
    name:      'Pomona',
    city:      'manvel',
    cityName:  'Manvel',
    tag:       'Master-Planned · Resort Pools',
    desc:      'Manvel\'s premier master-planned community by Hillwood — resort-style pools, an amenity center, fishing, and trails along Mustang Bayou, with modern homes from top Houston builders. One of the most talked-about communities in Brazoria County.',
    price:     '$365K – $1.2M+',
    href:      'pomona.html',
    live:      true,
    tags:      ['Master-Planned', 'Resort Pools', 'New Builds'],
    schoolTag: '🏫 Alvin ISD — Manvel HS',
    detail:    'Manvel\'s premier master-planned community by Hillwood — resort-style pools, amenity center, and trails along Mustang Bayou, with modern builders.',
  },
  {
    id:        'rodeo-palms',
    name:      'Rodeo Palms',
    city:      'manvel',
    cityName:  'Manvel',
    tag:       'Established · Value',
    desc:      'One of Manvel\'s original master-planned communities with mature landscaping, community amenities, and a proven track record. Rodeo Palms offers genuine value for buyers who want the master-planned lifestyle at accessible prices.',
    price:     '$235K – $500K',
    href:      'rodeo-palms.html',
    live:      true,
    tags:      ['Established', 'Value', 'Mature Landscaping'],
    schoolTag: '🏫 Alvin ISD — Manvel HS',
    detail:    'One of Manvel\'s original master-planned communities with mature landscaping, community amenities, and proven resale value.',
  },
  {
    id:        'del-bello-lakes',
    name:      'Del Bello Lakes',
    city:      'manvel',
    cityName:  'Manvel',
    tag:       'Master-Planned · Lakes',
    desc:      'A scenic lakefront master-planned community in Manvel with resort-style amenities, walking trails, and new construction from top Houston builders. One of the fastest-growing communities in Brazoria County.',
    price:     '$410K – $800K',
    href:      'del-bello-lakes.html',
    live:      true,
    tags:      ['Lakefront', 'New Construction', 'Brazoria County'],
    schoolTag: '🏫 Alvin ISD — Manvel HS',
    detail:    'Scenic lakefront master-planned community with resort amenities and new construction from top Houston builders.',
  },
  {
    id:        'meridiana',
    name:      'Meridiana',
    city:      'manvel',
    cityName:  'Manvel',
    tag:       'Luxury · Amenities',
    desc:      'A premier master-planned community straddling the Manvel/Iowa Colony border — featuring a surf wave pool, resort amenities, and upscale new construction. One of the most amenity-rich communities in the entire south Houston market.',
    price:     '$330K – $950K+',
    href:      'meridiana.html',
    live:      true,
    tags:      ['Surf Wave Pool', 'Luxury Amenities', 'New Builds'],
    schoolTag: '🏫 Alvin ISD — Manvel HS',
    detail:    'Premier community with a surf wave pool, resort amenities, and upscale new construction in Manvel/Iowa Colony.',
  },
  {
    id:        'sedona-lakes',
    name:      'Sedona Lakes',
    city:      'manvel',
    cityName:  'Manvel',
    tag:       'Master-Planned · Lakes',
    desc:      'A well-maintained master-planned community in Manvel featuring scenic lakes, resort amenities, and a relaxed suburban pace. Sedona Lakes offers strong value for families seeking space and community in Brazoria County.',
    price:     '$385K – $800K',
    href:      'sedona-lakes.html',
    live:      true,
    tags:      ['Scenic Lakes', 'Master-Planned', 'Resort Amenities'],
    schoolTag: '🏫 Alvin ISD — Manvel HS',
    detail:    'Well-maintained master-planned community with scenic lakes, resort amenities, and strong value in Brazoria County.',
  },
  {
    id:        'valencia',
    name:      'Valencia',
    city:      'manvel',
    cityName:  'Manvel',
    tag:       'New Construction · Master-Planned',
    desc:      'One of Manvel\'s newest master-planned communities offering modern new construction, resort-style amenities, and easy highway access. Valencia is attracting buyers who want brand-new at accessible Brazoria County prices.',
    price:     '$365K – $1.2M+',
    href:      'valencia.html',
    live:      true,
    tags:      ['New Construction', 'Modern Builds', 'Resort Pool'],
    schoolTag: '🏫 Alvin ISD — Manvel HS',
    detail:    'One of Manvel\'s newest master-planned communities — modern new construction, resort amenities, and easy highway access.',
  },

]; // end NEIGHBORHOODS


/* ─── LOOKUP HELPERS ────────────────────────────────────────── */

/** Get all neighborhoods for a given city slug */
const NEIGHBORHOODS_BY_CITY = NEIGHBORHOODS.reduce((acc, n) => {
  (acc[n.city] = acc[n.city] || []).push(n);
  return acc;
}, {});

/** Get a neighborhood by its ID */
function getNeighborhood(id) {
  return NEIGHBORHOODS.find(n => n.id === id) || null;
}


/* ─── CARD RENDERER ─────────────────────────────────────────── */

/**
 * Build a single neighborhood card HTML string.
 * @param {Object} n - Neighborhood object from NEIGHBORHOODS
 * @returns {string} HTML string
 */
function buildNeighborhoodCard(n) {
  if (n.live && n.href) {
    return `
      <a href="${n.href}" class="hood-card">
        <div class="hood-card__name">${n.name}</div>
        <span class="hood-card__tag">${n.tag}</span>
        <p class="hood-card__desc">${n.desc}</p>
        <p class="hood-card__price">Homes from <span>${n.price}</span></p>
        <div class="hood-card__cta">View Full Neighborhood Guide →</div>
      </a>`.trim();
  } else {
    return `
      <div class="hood-card">
        <div class="hood-card__name">${n.name}</div>
        <span class="hood-card__tag">${n.tag}</span>
        <p class="hood-card__desc">${n.desc}</p>
        <p class="hood-card__price">Homes from <span>${n.price}</span></p>
        <div class="hood-card__soon">Neighborhood guide coming soon</div>
      </div>`.trim();
  }
}

/**
 * Render neighborhood cards into a container element.
 * @param {string|HTMLElement} containerOrId - Element or ID string
 * @param {string} [cityFilter] - Optional city slug to filter (e.g. 'league-city')
 * @param {string[]} [onlyIds] - Optional array of specific neighborhood IDs to render
 */
function renderNeighborhoodCards(containerOrId, cityFilter, onlyIds) {
  const el = typeof containerOrId === 'string'
    ? document.getElementById(containerOrId)
    : containerOrId;

  if (!el) {
    console.warn('[neighborhoods.js] Container not found:', containerOrId);
    return;
  }

  let hoods = NEIGHBORHOODS;

  if (cityFilter) {
    hoods = hoods.filter(n => n.city === cityFilter);
  }

  if (onlyIds && onlyIds.length) {
    const idSet = new Set(onlyIds);
    hoods = hoods.filter(n => idSet.has(n.id));
    // Preserve requested order
    hoods.sort((a, b) => onlyIds.indexOf(a.id) - onlyIds.indexOf(b.id));
  }

  el.innerHTML = hoods.map(buildNeighborhoodCard).join('\n');
}
