# Deploy Guide: Vercel and Netlify

This guide walks you through launching D.I.Y to production on either Vercel or Netlify.

## 1) Pre-Launch Checklist (Do This First)

1. Install dependencies and verify build locally:

```bash
npm install
npm run build
```

2. Confirm required environment variables are available:

- `VITE_GEMINI_API_KEY`
- `VITE_ADMIN_PASSWORD`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SITE_URL` (your production URL, e.g. `https://your-domain.com`)

Use `.env.example` as reference.

3. In Supabase, run `db/schema.sql` in SQL Editor.

4. In Supabase Authentication settings:

- Enable Email, Google, and Apple providers (as needed).
- Add redirect URL(s):
  - `https://your-domain.com/auth/callback`

5. Replace placeholder domain references before launch:

- `index.html` (canonical and OG URL)
- `public/robots.txt`
- `public/sitemap.xml`
- `public/.well-known/security.txt`

## 2) Deploy on Vercel

This project already includes `vercel.json` with:

- SPA rewrites to `index.html`
- baseline security headers

### Option A: Vercel Dashboard (recommended)

1. Push project to GitHub/GitLab/Bitbucket.
2. Go to Vercel dashboard and click **Add New Project**.
3. Import this repository.
4. Framework preset: **Vite** (usually auto-detected).
5. Build settings (if not auto-set):
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add Environment Variables from the checklist above.
7. Deploy.

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

Then set production env vars:

```bash
vercel env add VITE_GEMINI_API_KEY production
vercel env add VITE_ADMIN_PASSWORD production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_SITE_URL production
```

Deploy production:

```bash
vercel --prod
```

## 3) Deploy on Netlify

Netlify needs SPA fallback routing so React Router routes work on refresh.

### A) Add SPA Redirect Rule

Create `public/_redirects` with:

```txt
/* /index.html 200
```

OR use `netlify.toml` with:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Use either `_redirects` or `netlify.toml` (not both unless you know why).

### B) Deploy via Netlify Dashboard

1. Push repository to your git provider.
2. In Netlify: **Add new site** -> **Import an existing project**.
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables from checklist.
5. Deploy site.

### C) Deploy via Netlify CLI

```bash
npm i -g netlify-cli
netlify login
netlify init
```

Set env vars in Netlify UI (Site settings -> Environment variables), then deploy:

```bash
netlify deploy --build
netlify deploy --build --prod
```

## 4) Post-Deploy Verification

After deployment, test these paths directly in browser:

- `/`
- `/community`
- `/knowledge`
- `/signin`
- `/account`
- `/auth/callback`
- `/privacy`
- `/terms`

Also test:

1. Sign-in with email/password.
2. Google/Apple OAuth callback flow.
3. Community posting and DM actions.
4. AI assistant request path.
5. Admin gate lock/unlock behavior.

## 5) Common Production Issues

1. Blank page or route 404 on refresh:
- Cause: missing SPA redirect.
- Fix: add `_redirects` (Netlify) or rewrite config (Vercel).

2. OAuth redirect mismatch:
- Cause: Supabase callback URL not matching your domain exactly.
- Fix: add exact `https://your-domain.com/auth/callback` in Supabase and provider consoles.

3. API calls failing in production:
- Cause: missing env vars in hosting provider.
- Fix: set all required `VITE_*` variables and redeploy.

4. Social/DM features not persisting:
- Cause: `db/schema.sql` not applied yet.
- Fix: run SQL in Supabase and re-test.

## 6) Recommended Launch Flow

1. Deploy to preview/staging first.
2. Verify auth + community + AI + admin paths.
3. Point custom domain.
4. Update `VITE_SITE_URL` and redeploy production.
5. Re-run verification checklist.

---

If you want, the next step can be adding a ready-to-use `netlify.toml` and `public/_redirects` in this repo so Netlify deployment is one-click consistent.








