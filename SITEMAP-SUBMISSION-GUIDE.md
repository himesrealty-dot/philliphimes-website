# Sitemap Submission Guide — Google & Bing

**Your sitemap URL:** `https://philliphimes.com/sitemap.xml`

You'll set up **Google Search Console** first, then Bing can *import* from it in two clicks — so do Google first.

---

## PART 1 — Google Search Console

### Step 1: Open Search Console
Go to **https://search.google.com/search-console** and sign in with the Google account you want to own the site's data (use a Gmail/Google Workspace account you'll keep — ideally phil@philliphimes.com if it's a Google Workspace account, otherwise your main Gmail).

### Step 2: Add the property
Click **"Add property"** (top-left dropdown). You'll see two options:

- **Domain** (recommended) — covers `philliphimes.com` + all subdomains + http/https. Requires adding a DNS record.
- **URL prefix** — covers only `https://philliphimes.com/`. Verifies via an HTML tag or file (no DNS needed).

**Pick "Domain"** if you can edit your domain's DNS. Pick **"URL prefix"** if you'd rather have me add a verification tag to the site.

### Step 3: Verify ownership

**Option A — Domain property (DNS TXT record):**
1. Google shows a `TXT` record like `google-site-verification=abc123...`
2. Log in to wherever your DNS is managed (your domain registrar, or Netlify if you use Netlify DNS).
3. Add a new **TXT** record: Host/Name = `@` (or blank), Value = the full `google-site-verification=...` string.
4. Save, wait 5–15 min, then click **Verify** in Search Console.

**Option B — URL prefix (HTML tag) — I can do this part for you:**
1. Choose "URL prefix", enter `https://philliphimes.com`
2. Expand **"HTML tag"**. Google shows a `<meta name="google-site-verification" content="..." />` tag.
3. **Paste that tag to me** — I'll add it to the site's `<head>` and push it live.
4. Once it's deployed (~1–2 min on Netlify), click **Verify**.

### Step 4: Submit the sitemap
1. After verification, open the property.
2. Left menu → **Sitemaps**.
3. Under "Add a new sitemap", type **`sitemap.xml`** (the domain is pre-filled) → **Submit**.
4. Status should change to **"Success"** within minutes to a few hours. It'll show the number of discovered URLs.

### Step 5 (optional but smart): Request indexing of the homepage
- Top search bar → paste `https://philliphimes.com/` → **Request Indexing**. Nudges Google to crawl sooner.

---

## PART 2 — Bing Webmaster Tools

### Easiest path: Import from Google (2 minutes)
1. Go to **https://www.bing.com/webmasters** and sign in (Microsoft, Google, or Facebook account).
2. On the welcome screen, choose **"Import from Google Search Console"**.
3. Authorize Bing to read your GSC account → select `philliphimes.com` → **Import**.
4. Bing copies the verified site **and the sitemap** automatically. Done.

### Manual path (if you skip the import)
1. In Bing Webmaster Tools, click **"Add site manually"**, enter `https://philliphimes.com`.
2. Verify ownership — same idea as Google:
   - **XML file** (download `BingSiteAuth.xml`, give it to me, I'll add it to the site root and push), **OR**
   - **Meta tag** (paste it to me, I'll add it to `<head>`), **OR**
   - **DNS CNAME** record at your registrar.
3. After verifying: left menu → **Sitemaps** → **Submit Sitemap** → enter `https://philliphimes.com/sitemap.xml` → **Submit**.

---

## What I can do vs. what only you can do

| Task | Who |
|------|-----|
| Add a Google/Bing **verification meta tag or HTML file** to the site | **Me** — paste me the tag/file and I'll push it |
| Sign in, add the property, click **Verify** and **Submit sitemap** | **You** (needs your Google/Microsoft login) |
| Add a **DNS record** (if using the Domain method) | **You** (at your registrar / Netlify DNS) |

**Fastest route:** Use the **HTML-tag** verification for both. Start Google → copy its meta tag → paste it to me → I add both Google's and (later) Bing's tags in one push → you click Verify on each → submit `sitemap.xml`. Bing's import-from-Google makes step 2 nearly automatic.

---

## After submission — what to expect
- **Indexing isn't instant.** Google typically starts crawling within hours and indexes pages over days to ~2 weeks.
- Check back in Search Console under **Pages** (coverage) and **Sitemaps** to confirm URLs are being indexed.
- Don't resubmit repeatedly — once "Success" shows, Google re-reads the sitemap on its own.
