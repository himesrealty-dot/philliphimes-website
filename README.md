# philliphimes.com

Static HTML/CSS/JS site for Phillip Himes, REALTOR® | Brokered by eXp Realty. No build
step. Netlify publishes the repo root from `main`, so **a push to `main` is a deploy**.

Project conventions (page templates, neighborhoods, footers, compliance links) are in
[CLAUDE.md](CLAUDE.md).

## Monthly market reports

Each month the Market Report System (`E:\Market-Report-System`) builds a `site/` folder:
city pages, download pages, a thanks router and PDFs for 12 cities. One command publishes it
here.

```powershell
python scripts/import-market-reports.py "E:\Market-Report-System\staging\2026-10\site"
```

Change `2026-10` to the month being published. Then review and commit:

```powershell
git status
```

```powershell
git add -A; git commit -m "Market reports: 2026-10"
```

Get Phil's OK before pushing. To check a build without writing anything, add `--dry-run`.

### What the import does

1. **Checks the build first.** Only the expected folders and safe file types are accepted,
   and every page must be in the shape the script knows how to wrap. If anything is off it
   stops before writing a file and says why.
2. **Copies the tree into the repo root**, overwriting last month. Dated PDFs
   (`...-2026-10.pdf`) are new files; the "latest" PDFs are overwritten.
3. **Wraps every page in the site template.** The builder's placeholder header is replaced
   with the live site nav, and the site footer is added below the report. Both are read from
   `market-insights.html` at import time, so a nav change reaches the report pages on the
   next import. To push a nav change sooner, re-run the import on the current month.
4. **Scopes `assets/market-report/site.css`** to the report body so its generic class names
   (`.card`, `.btn`, `.row`) cannot restyle the nav or footer.
5. **Keeps `robots.txt` right**: `Disallow: /market-reports/` and the
   `sitemap-market-reports.xml` line.

It does not touch page titles, descriptions, canonicals, robots meta, Open Graph, JSON-LD,
anything inside `<main>`, or any form, iframe or script. It adds three `<link>` tags to each
page's head (favicon, site CSS, isolation CSS) and nothing else.

### What it owns in the repo

| Path | Contents |
|---|---|
| `<city>-tx-housing-market/` (+ `selling/`, `buying/`) | 36 indexed SEO pages |
| `sellsmart/<city>/`, `buyright/<city>/` | 24 download pages (`noindex`) |
| `market-report/thanks/` | GHL redirect router (`noindex`) |
| `market-reports/<city>/*.pdf` | The PDFs (blocked in `robots.txt`) |
| `assets/market-report/` | Report CSS, fonts, logos |
| `sitemap-market-reports.xml` | The 36 indexed URLs |

**Do not hand-edit these.** The next import overwrites them. Content or data changes belong
in the Market Report System. Do not rename or move the URLs either: they are printed on the
PDFs as QR codes, set in GHL, and used in emails.

### Supporting files (hand-maintained, not overwritten)

| File | Role |
|---|---|
| `scripts/import-market-reports.py` | The import |
| `css/market-report-shell.css` | Keeps the site's reset and `.card` / `.btn` / `.badge` rules out of the report body |
| `js/market-report-nav.js` | Nav menu behaviour for the report pages (they do not load `js/main.js`) |
| `market-insights.html` | The hub. Lists the 12 cities; the thanks page links here as its fallback |

### After a build-template change

If the Market Report System changes its page template or stylesheet, check one page of each
type at desktop and phone width before committing: a city page, a `selling/` page, a
`buyright/` page and a `sellsmart/` page. New class names in `site.css` that also exist in
`css/styles.css` need an entry in `css/market-report-shell.css`.

`/sellsmart/` and `/buyright/` must **not** be disallowed in `robots.txt`. They rely on a
`noindex` tag, which Google can only read if it is allowed to crawl the page.
