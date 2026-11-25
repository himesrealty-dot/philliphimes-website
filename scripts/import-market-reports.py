#!/usr/bin/env python3
"""Import one month's Market Report System build into philliphimes.com.

    python scripts/import-market-reports.py "E:\\Market-Report-System\\staging\\2026-10\\site"
    python scripts/import-market-reports.py <site-folder> --dry-run

What it does, every month, from the raw build:

  1. Checks the build: only the expected folders, only safe file types, every
     page in the shape this script knows how to wrap. Any surprise stops the
     run before a single file is written.
  2. Copies the tree into the repo root (the Netlify publish root), overwriting
     last month. Dated PDFs are new files; the "latest" PDFs are overwritten.
  3. Wraps every page in the site template: the builder's placeholder
     <header class="top"> is replaced by the live site nav, and the site footer
     is added after </main>. Both are read from market-insights.html at import
     time, so the report pages always carry the current nav.
  4. Scopes assets/market-report/site.css to <main class="wrap"> so its generic
     class names (.card, .btn, .row) cannot touch the nav or footer.
  5. Makes sure robots.txt carries the two market-report lines.

What it never touches: the page <head> content (title, description, canonical,
robots meta, Open Graph, JSON-LD), anything inside <main>, any iframe or script,
and any file in the repo outside the market-report paths. Three <link> tags
(favicon, site CSS, isolation CSS) and the site's Meta Pixel block are ADDED to
the head; nothing is removed.

Standard library only. Safe to re-run: the output depends only on the build
folder and the current site nav.
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# The page whose nav + footer are stamped onto the report pages. It is the
# market reports hub, so its nav already marks "Market Reports" as active.
CHROME_SOURCE = "market-insights.html"

# ── What a build is allowed to contain ───────────────────────────────────────
CITY_DIR = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*-tx-housing-market$")
FIXED_DIRS = {"sellsmart", "buyright", "market-report", "market-reports", "assets"}
ROOT_FILES = {"sitemap-market-reports.xml", "robots-market-reports.txt"}
SKIP_FILES = {"robots-market-reports.txt"}          # merged into robots.txt instead
SAFE_EXT = {".html", ".pdf", ".css", ".xml", ".png", ".jpg", ".jpeg",
            ".webp", ".svg", ".woff2"}

ROBOTS_DISALLOW = "Disallow: /market-reports/"
ROBOTS_SITEMAP = "Sitemap: https://philliphimes.com/sitemap-market-reports.xml"

# ── The exact builder markup this script replaces ────────────────────────────
CSS_LINK = '<link rel="stylesheet" href="/assets/market-report/site.css">'
BODY_OPEN = "<body>"
HEADER_RE = re.compile(r'<header class="top">.*?</header>', re.S)
PAGE_TAIL = "</main></body></html>"

HEAD_ADDITIONS = (
    '<link rel="icon" type="image/x-icon" href="/images/favicon.ico">'
    '<link rel="stylesheet" href="/css/styles.css">'
    '<link rel="stylesheet" href="/css/market-report-shell.css">'
)
NAV_SCRIPT = '<script src="/js/market-report-nav.js"></script>'
SCOPED_MARK = "/* scoped to <main class=\"wrap\"> by scripts/import-market-reports.py - do not edit, re-run the import */\n"


class ImportError_(Exception):
    """A problem with the build or the repo that must stop the import."""


# ═════════════════════════════════════════════════════════════════════════════
# Site chrome (nav + footer) from the live site
# ═════════════════════════════════════════════════════════════════════════════

_URL_ATTR = re.compile(r'\b(href|src)="([^"]*)"')
_ABSOLUTE = re.compile(r"^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|//|/|#)")


def root_relative(html: str) -> str:
    """Rewrite relative href/src to root-relative.

    The site's pages live at the repo root and link to each other relatively
    (href="buyers.html"). The report pages are one and two folders deep, so the
    same markup needs a leading slash to resolve.
    """
    def fix(m: re.Match) -> str:
        attr, url = m.group(1), m.group(2)
        if not url or _ABSOLUTE.match(url):
            return m.group(0)
        return f'{attr}="/{url}"'
    return _URL_ATTR.sub(fix, html)


def load_chrome() -> tuple[str, str, str, str]:
    """Return (nav_html, footer_html, trailing_scripts, meta_pixel) from the hub page."""
    src_path = REPO / CHROME_SOURCE
    if not src_path.is_file():
        raise ImportError_(f"{CHROME_SOURCE} not found - cannot read the site nav/footer.")
    src = src_path.read_text(encoding="utf-8")

    navs = re.findall(r'<nav class="nav".*?</nav>', src, re.S)
    footers = re.findall(r'<footer class="footer".*?</footer>', src, re.S)
    if len(navs) != 1 or len(footers) != 1:
        raise ImportError_(
            f"Expected exactly one <nav class=\"nav\"> and one <footer class=\"footer\"> "
            f"in {CHROME_SOURCE}; found {len(navs)} and {len(footers)}.")

    # The site-wide chat widget rides along with the footer on every site page.
    chat = re.search(
        r'<script src="https://widgets\.leadconnectorhq\.com/loader\.js"[^>]*></script>', src)
    scripts = NAV_SCRIPT + ("\n" + chat.group(0) if chat else "")

    # The Meta Pixel block, exactly as the site pages carry it, so the report
    # pages track in the same pixel. Read from the hub rather than hardcoded:
    # if the pixel id ever changes site-wide, the next import picks it up.
    pixels = re.findall(r"<!-- Meta Pixel Code -->.*?<!-- End Meta Pixel Code -->", src, re.S)
    if len(pixels) != 1:
        raise ImportError_(
            f"Expected exactly one Meta Pixel block in {CHROME_SOURCE}; found {len(pixels)}.")
    return root_relative(navs[0]), root_relative(footers[0]), scripts, pixels[0]


# ═════════════════════════════════════════════════════════════════════════════
# Page wrap
# ═════════════════════════════════════════════════════════════════════════════

def wrap_page(html: str, nav: str, footer: str, scripts: str, pixel: str, name: str) -> str:
    """Swap the placeholder header for the site nav and append the site footer."""
    checks = {
        "site.css <link>": html.count(CSS_LINK),
        "</head>": html.count("</head>"),
        "<body>": html.count(BODY_OPEN),
        '<header class="top">': len(HEADER_RE.findall(html)),
        '<main class="wrap">': html.count('<main class="wrap">'),
        '<footer class="foot">': html.count('<footer class="foot">'),
        "closing </main></body></html>": html.count(PAGE_TAIL),
    }
    bad = {k: v for k, v in checks.items() if v != 1}
    if bad or not html.rstrip().endswith(PAGE_TAIL):
        raise ImportError_(
            f"{name}: page is not in the expected shape "
            f"(each of these should appear exactly once: {bad or 'page tail not at end'}). "
            "The builder template has changed - update wrap_page() to match before importing.")

    html = html.replace(CSS_LINK, HEAD_ADDITIONS + CSS_LINK)
    html = html.replace("</head>", f"\n{pixel}\n</head>")
    html = html.replace(BODY_OPEN, '<body class="mr-page">')
    html = HEADER_RE.sub(lambda _m: nav, html)
    head, _sep, _tail = html.rpartition(PAGE_TAIL)
    return f"{head}</main>\n{footer}\n{scripts}\n</body></html>\n"


# ═════════════════════════════════════════════════════════════════════════════
# CSS scoping
# ═════════════════════════════════════════════════════════════════════════════

def _split_top_level(text: str, sep: str) -> list[str]:
    """Split on `sep`, ignoring separators inside (), [] or quotes."""
    parts, depth, quote, cur = [], 0, "", []
    for ch in text:
        if quote:
            cur.append(ch)
            if ch == quote:
                quote = ""
        elif ch in "\"'":
            quote = ch
            cur.append(ch)
        elif ch in "([":
            depth += 1
            cur.append(ch)
        elif ch in ")]":
            depth -= 1
            cur.append(ch)
        elif ch == sep and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    parts.append("".join(cur))
    return parts


def scope_selector(sel: str) -> str:
    """Confine one selector to <main class="wrap"> without changing its specificity.

    :where() contributes no specificity, so the cascade between the report's own
    rules, and against third-party widget styles, stays exactly as authored.
    """
    sel = sel.strip()
    if sel == "*":
        return "main:where(.wrap), :where(main.wrap) :is(*, i)"
    m = re.match(r"^(body|html)(?![\w-])(.*)$", sel, re.S)
    if m:
        rest = m.group(2)
        if not rest.strip():
            return "main:where(.wrap)"          # same weight as `body`
        if rest[0].isspace() or rest[0] in ">+~":
            return f":where(main.wrap){rest}"
        raise ImportError_(f"site.css: cannot scope selector {sel!r}")
    if sel[0] in ".[:#":
        # May sit on a descendant of <main> or on <main> itself.
        return f":where(main.wrap) {sel}, :where(main.wrap){sel}"
    return f":where(main.wrap) {sel}"


def scope_css(css: str) -> str:
    """Scope every style rule; leave @font-face and other at-rules as they are."""
    out, i, n = [], 0, len(css)
    while i < n:
        if css.startswith("/*", i):
            end = css.find("*/", i)
            end = n if end == -1 else end + 2
            out.append(css[i:end])
            i = end
            continue
        if css[i].isspace():
            out.append(css[i])
            i += 1
            continue
        brace = css.find("{", i)
        semi = css.find(";", i)
        if brace == -1 or (semi != -1 and semi < brace):
            # Statement at-rule (@import, @charset) or trailing junk: copy through.
            end = n if semi == -1 else semi + 1
            out.append(css[i:end])
            i = end
            continue
        prelude = css[i:brace]
        depth, j = 1, brace + 1
        while j < n and depth:
            depth += {"{": 1, "}": -1}.get(css[j], 0)
            j += 1
        if depth:
            raise ImportError_("site.css: unbalanced braces")
        body = css[brace + 1:j - 1]
        head = prelude.strip()
        if head.startswith(("@media", "@supports", "@container", "@layer")):
            out.append(f"{prelude}{{{scope_css(body)}}}")
        elif head.startswith("@"):
            out.append(css[i:j])                # @font-face, @keyframes, ...
        else:
            scoped = ", ".join(scope_selector(s) for s in _split_top_level(prelude, ","))
            out.append(f"{scoped}{{{body}}}")
        i = j
    return "".join(out)


# ═════════════════════════════════════════════════════════════════════════════
# Build validation + import
# ═════════════════════════════════════════════════════════════════════════════

def collect(site: Path) -> list[Path]:
    """Validate the build and return the relative paths of files to publish."""
    if not site.is_dir():
        raise ImportError_(f"Not a folder: {site}")
    if not (site / "sitemap-market-reports.xml").is_file():
        raise ImportError_(
            f"{site} has no sitemap-market-reports.xml - pass the build's site/ folder "
            r"(for example E:\Market-Report-System\staging\2026-10\site).")

    problems, files = [], []
    for entry in sorted(site.iterdir()):
        ok = (entry.name in FIXED_DIRS or CITY_DIR.match(entry.name)) if entry.is_dir() \
            else entry.name in ROOT_FILES
        if not ok:
            problems.append(f"unexpected top-level entry: {entry.name}")
    for path in sorted(site.rglob("*")):
        rel = path.relative_to(site)
        if path.is_symlink():
            problems.append(f"symlink not allowed: {rel}")
        elif path.is_file():
            if rel.parts[0] == "assets" and rel.parts[:2] != ("assets", "market-report"):
                problems.append(f"asset outside assets/market-report/: {rel}")
            elif path.suffix.lower() not in SAFE_EXT and rel.name not in ROOT_FILES:
                problems.append(f"file type not allowed: {rel}")
            elif rel.name not in SKIP_FILES:
                files.append(rel)
    if problems:
        raise ImportError_("Build rejected:\n  - " + "\n  - ".join(problems))
    return files


def update_robots(dry_run: bool) -> list[str]:
    """Make sure robots.txt has the two market-report lines. Returns notes."""
    path = REPO / "robots.txt"
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    present = {ln.strip() for ln in lines}
    notes = []

    for ln in lines:
        if re.match(r"\s*Disallow:\s*/(sellsmart|buyright)", ln, re.I):
            notes.append(f"WARNING robots.txt blocks a download path ({ln.strip()}). "
                         "Remove it: those pages rely on a noindex tag Google must be able to crawl.")

    if ROBOTS_DISALLOW not in present:
        last = max((i for i, ln in enumerate(lines) if ln.strip().lower().startswith("disallow:")),
                   default=None)
        if last is None:
            lines += ["", "User-agent: *", ROBOTS_DISALLOW]
        else:
            lines.insert(last + 1, ROBOTS_DISALLOW)
        notes.append(f"robots.txt: added '{ROBOTS_DISALLOW}'")
    if ROBOTS_SITEMAP not in present:
        lines.append(ROBOTS_SITEMAP)
        notes.append("robots.txt: added the market-reports sitemap line")

    new_text = "\n".join(lines) + "\n"
    if new_text != text and not dry_run:
        path.write_text(new_text, encoding="utf-8", newline="\n")
    return notes


def self_check(outputs: dict[Path, bytes | None]) -> list[str]:
    """Cross-check the finished set: sitemap URLs and PDF links must resolve."""
    def text_of(rel: Path) -> str:
        return (outputs[rel] or b"").decode("utf-8")

    published = {p.as_posix() for p in outputs}
    issues = []

    sitemap = text_of(Path("sitemap-market-reports.xml"))
    locs = re.findall(r"<loc>https://philliphimes\.com/([^<]*)</loc>", sitemap)
    for loc in locs:
        if f"{loc}index.html" not in published:
            issues.append(f"sitemap URL has no page: /{loc}")

    for rel in outputs:
        if rel.suffix != ".html":
            continue
        page = text_of(rel)
        for pdf in re.findall(r'href="/(market-reports/[^"]+\.pdf)"', page):
            if pdf not in published:
                issues.append(f"{rel.as_posix()} links a missing PDF: /{pdf}")
        if rel.parts[0] in ("sellsmart", "buyright", "market-report"):
            if '<meta name="robots" content="noindex,follow">' not in page:
                issues.append(f"{rel.as_posix()} is missing its noindex tag")
    return issues + [f"OK sitemap lists {len(locs)} URLs"] if not issues else issues


def main() -> int:
    ap = argparse.ArgumentParser(description="Import a Market Report System site/ build.")
    ap.add_argument("site", type=Path, help=r"path to the build's site/ folder")
    ap.add_argument("--dry-run", action="store_true",
                    help="validate and report, but write nothing")
    args = ap.parse_args()

    try:
        site = args.site.resolve()
        files = collect(site)
        nav, footer, scripts, pixel = load_chrome()

        # Build everything in memory first, so a bad page stops the run before
        # any file in the repo has changed. None = copy the file byte-for-byte.
        outputs: dict[Path, bytes | None] = {}
        for rel in files:
            src = site / rel
            if rel.suffix == ".html":
                wrapped = wrap_page(src.read_text(encoding="utf-8"), nav, footer, scripts,
                                    pixel, rel.as_posix())
                outputs[rel] = wrapped.encode("utf-8")
            elif rel.as_posix() == "assets/market-report/site.css":
                outputs[rel] = (SCOPED_MARK + scope_css(src.read_text(encoding="utf-8"))
                                ).encode("utf-8")
            elif rel.suffix == ".xml":
                outputs[rel] = src.read_bytes()
            else:
                outputs[rel] = None

        check = self_check(outputs)
        if not check[-1].startswith("OK"):
            raise ImportError_("Build is inconsistent:\n  - " + "\n  - ".join(check))

        for rel, data in outputs.items():
            dest = REPO / rel
            if REPO not in dest.resolve().parents:
                raise ImportError_(f"refusing to write outside the repo: {rel}")
            if args.dry_run:
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            if data is None:
                shutil.copyfile(site / rel, dest)
            else:
                dest.write_bytes(data)
        robots_notes = update_robots(args.dry_run)
    except ImportError_ as exc:
        print(f"IMPORT STOPPED - nothing further was written.\n{exc}", file=sys.stderr)
        return 1

    pages = [p for p in outputs if p.suffix == ".html"]
    pdfs = [p for p in outputs if p.suffix == ".pdf"]
    print(("DRY RUN - nothing written.\n" if args.dry_run else "") +
          f"Imported from {site}\n"
          f"  {len(pages)} pages wrapped in the site nav + footer (from {CHROME_SOURCE})\n"
          f"  {len(pdfs)} PDFs\n"
          f"  {len(outputs) - len(pages) - len(pdfs)} other files (CSS, fonts, logos, sitemap)\n"
          f"  {check[-1]}")
    for note in robots_notes:
        print("  " + note)
    if not args.dry_run:
        print("Next: review `git status`, then commit. Nothing has been committed or pushed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
