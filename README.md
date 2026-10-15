# Mebacha Pilot & Operations Admin Portal

Internal administration, merchant fleet management, pilot scorecard tracking, telemetry analytics, and customer triage dashboard for **Mebacha OS**.

## Tech Stack
- **Framework:** React 19 + TypeScript + Vite 8
- **Styling:** Tailwind CSS v4 (Freight Logistics theme)
- **Database & Auth:** Supabase (`@supabase/supabase-js`)
- **Icons:** Lucide React
- **Linter:** Oxlint

---

## Getting Started Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Provide your Supabase URL and public Anon key:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Run local dev server:**
   ```bash
   npm run dev
   ```

4. **Build production bundle:**
   ```bash
   npm run build
   ```

---

## Free Hosting & Deployment

### Option A: Vercel (Recommended for instant deploys)
1. Import this repository in [vercel.com](https://vercel.com).
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy! (`vercel.json` is pre-configured with SPA route rewrites).

### Option B: Cloudflare Pages (Recommended for Zero Trust access)
1. In Cloudflare Dashboard, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select `adonay-poter/mebacha-admin`.
3. Build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy! (`public/_redirects` handles SPA routing).
6. *(Optional)* Add **Cloudflare Access** under Zero Trust to require email PIN or Google login before loading the portal.
