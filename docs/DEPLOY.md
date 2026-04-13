# Deployment Guide

## Overview

| Part     | Host      | Method                        |
|----------|-----------|-------------------------------|
| Backend  | Vercel    | Serverless Python (`@vercel/python`) |
| Frontend | Hostinger | Static files uploaded to `public_html` |
| Database | Supabase  | PostgreSQL + Storage          |

---

## Step 1 — Run Database Migrations (Supabase)

1. Go to your Supabase project → **SQL Editor**
2. Open `migrations/001_initial.sql` from this repo
3. Paste the full contents and click **Run**
4. Create a storage bucket named `product-images` (or whatever `SUPABASE_STORAGE_BUCKET` is set to):
   - Supabase → **Storage** → **New bucket** → name: `product-images` → Public: **yes**

---

## Step 2 — Deploy Backend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import from GitHub: `ShehanHD/alienz-store`
3. **Framework Preset**: `Other` (not Vite — the repo has `vercel.json` which handles it)
4. **Root Directory**: leave as `/` (repo root)
5. Add these **Environment Variables**:

| Variable                  | Value                                                              |
|---------------------------|--------------------------------------------------------------------|
| `DATABASE_URL`            | Supabase connection string (Session mode, port 5432 or 6543)       |
| `JWT_SECRET`              | A long random string (e.g. output of `openssl rand -hex 32`)       |
| `ADMIN_EMAIL`             | Email for the owner account you want to create                     |
| `ADMIN_PASSWORD`          | Password for the owner account                                     |
| `SUPABASE_URL`            | Your Supabase project URL (`https://xxxx.supabase.co`)             |
| `SUPABASE_SERVICE_KEY`    | Supabase service role key (Settings → API → service_role)          |
| `SUPABASE_STORAGE_BUCKET` | `product-images`                                                   |

6. Click **Deploy**
7. Note the deployment URL (e.g. `https://alienz-store.vercel.app`)

---

## Step 3 — Bootstrap the Owner Account

After the backend is deployed, call the `/setup` endpoint **once**:

```bash
curl -X POST https://alienz-store.vercel.app/setup
```

This creates the owner account using `ADMIN_EMAIL` + `ADMIN_PASSWORD` from env vars.
It only works once — subsequent calls return an error if an owner already exists.

---

## Step 4 — Build & Deploy Frontend to Hostinger

1. Update `VITE_API_URL` in `frontend/.env.production` to your actual Vercel URL:
   ```
   VITE_API_URL=https://alienz-store.vercel.app
   ```

2. Build the frontend:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   Output goes to `frontend/dist/`

3. Upload the **contents** of `dist/` to your Hostinger `public_html/` via File Manager or FTP.
   - The `.htaccess` file inside `dist/public/` must also be uploaded — it handles SPA routing.

4. Verify: visit your Hostinger domain — the shop should load.

---

## Environment Variables Reference

### Backend (Vercel)
```
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=<random 32+ char string>
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=<strong password>
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=product-images
```

### Frontend (`.env.production` — used at build time only)
```
VITE_API_URL=https://alienz-store.vercel.app
```

---

## Post-Deploy Checklist

- [ ] Migration SQL ran successfully in Supabase
- [ ] `product-images` storage bucket created and set to public
- [ ] Backend deployed on Vercel, all env vars set
- [ ] `POST /setup` called once to create owner account
- [ ] Frontend built with correct `VITE_API_URL`
- [ ] `dist/` contents uploaded to Hostinger `public_html/`
- [ ] Login works at your Hostinger domain with owner credentials
