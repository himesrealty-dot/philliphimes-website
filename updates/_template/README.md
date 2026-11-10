# Seller update page template

One private update page per listing, built from a JSON block. `/updates/` is disallowed in `robots.txt` and every page carries `noindex,nofollow`.

## New listing update

1. Copy `updates/_template/index.html` to `updates/<street-slug>/index.html`.
2. Edit only the JSON inside `<script id="update-data">`. Nothing else on the page needs to change.
3. Put the hero photo in `images/listings/<street-slug>/` and set `heroImage`.
4. Optional: add a short redirect in `netlify.toml` if the seller should get a friendly URL.

## Two formats

- `"type": "weekly"`: the Monday update. Shows headline, stats, where we stand (three outcomes), market changes, activity and funnel, buyer feedback, pricing table, and what Phil is doing.
- `"type": "review"`: the Day 21/28 review. Adds the comparison table, "What I considered first", and the recommendation.

Any section set to `null` or removed from the JSON is not shown.

## Calculated for you

- Price per sq ft in the pricing table and in the recommendation
- Funnel percentages (seen, clicked, showings)
- Reduction amount and percent
- Feedback count per lever (Position, Value, Price, Positive)

## Notes

- `outcome.current` is 1, 2 or 3: the first-21-days outcome the listing is tracking toward.
- Feedback `lever` must be one of `Position`, `Value`, `Price`, `Positive`.
- Home `kind` sets the status chip color: `pend`, `sold`, `new`, `cut`.
- The 6310 Star Light Court Day 28 review is filled in as the worked example. Replace all of it for a new listing.
