# Deploy to Netlify — Step by Step

## Tonight's Goal
Get philliphimes.com live on Netlify so you can submit for GHL A2P 10DLC compliance.

---

## Step 1: Create a Netlify Account (if you don't have one)
Go to https://app.netlify.com → Sign up (free)

---

## Step 2: Deploy the PH-Website Folder

**Option A — Drag & Drop (fastest):**
1. Go to https://app.netlify.com
2. Click "Add new site" → "Deploy manually"
3. Drag the entire **PH-Website** folder onto the upload zone
4. Wait ~30 seconds → your site is live at a `.netlify.app` URL

**Option B — GitHub (recommended for future updates):**
1. Create a GitHub repo (free at github.com)
2. Upload the PH-Website folder to the repo
3. In Netlify: "Add new site" → "Import from Git" → connect GitHub → select repo
4. Deploy automatically

---

## Step 3: Set Custom Domain (philliphimes.com)

1. In Netlify: Go to **Site Settings** → **Domain Management**
2. Click "Add a domain" → enter `philliphimes.com`
3. Netlify will show you DNS records to add

**In your domain registrar (GoDaddy/Namecheap/etc.):**
- Delete existing A records for @ (root domain)
- Add new records that Netlify gives you
- OR: Point nameservers to Netlify's nameservers

DNS propagation takes 15 min to 24 hours. Netlify also handles free SSL automatically.

---

## Step 4: Verify the Site Is Live

Check these URLs work:
- https://philliphimes.com
- https://philliphimes.com/privacy-policy.html ← CRITICAL for compliance
- https://philliphimes.com/terms-of-service.html ← CRITICAL for compliance
- https://philliphimes.com/contact.html ← Has SMS opt-in language

---

## Step 5: Submit for GHL A2P 10DLC Compliance

When submitting your business in GHL for phone number compliance, provide:
- **Business Website**: https://philliphimes.com
- **Privacy Policy URL**: https://philliphimes.com/privacy-policy.html
- **Terms of Service URL**: https://philliphimes.com/terms-of-service.html
- **Business Name**: Phillip Himes | Brokered by EXP Realty
- **Business Phone**: (832) 895-7547
- **Business Email**: phil@philliphimes.com

---

## Site File Structure

```
PH-Website/
├── index.html              ← Homepage
├── buyers.html             ← Buyers page
├── sellers.html            ← Sellers page
├── neighborhoods.html      ← Neighborhoods
├── primequity.html         ← Primequity tools
├── contact.html            ← Contact + SMS opt-in forms
├── privacy-policy.html     ← COMPLIANCE CRITICAL
├── terms-of-service.html   ← COMPLIANCE CRITICAL
├── thank-you.html          ← Form submission confirmation
├── netlify.toml            ← Netlify config
├── css/
│   └── styles.css          ← Full design system
├── js/
│   └── main.js             ← Navigation, forms, animations
└── DEPLOY.md               ← This file
```

---

## Notes

- Forms use Netlify Forms (built-in, no server needed). Submissions will appear in your Netlify dashboard.
- When IDX Broker Engage is ready, replace the search placeholder in buyers.html and index.html with their embed code.
- When GHL is ready, update form action URLs to point to GHL webhooks.
- Phone number (832) 895-7547 is used throughout. Swap to GHL tracking number later.

---

## Support
Questions? Call/text Phillip anytime at (832) 895-7547 or phil@philliphimes.com
