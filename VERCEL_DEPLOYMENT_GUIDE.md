# RTAMS — Vercel Deployment Guide

Deploy the Registrar Task Accomplishment Monitoring System (RTAMS) to Vercel with a Supabase PostgreSQL database.

---

## Overview

- **Frontend (React + Vite)** → Static files served by Vercel CDN
- **Backend (Fastify)** → Single Vercel serverless function at `/api`
- **Database** → Supabase PostgreSQL (external)

All three parts of the monorepo (`shared`, `server`, `client`) build together in one Vercel project.

---

## Prerequisites

- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (sign in with GitHub)
- A [Supabase](https://supabase.com) account with a project created
- The `rtms` folder pushed to a GitHub repository

---

## Part 1 — Prepare the Supabase Database

### 1.1 Get the connection string

1. Open your Supabase project dashboard
2. Go to **Project Settings** (gear icon) → **Database**
3. Scroll to **Connection string**
4. Click the **Transaction pooler** tab (port `6543`) — this is **required** for serverless
5. Copy the URI, which looks like:
   ```
   postgresql://postgres.wqsyssomrigyflhirehc:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with your actual database password
7. Append `?connection_limit=1` to the end:
   ```
   postgresql://postgres.wqsyssomrigyflhirehc:ENKbZprc0zFJbKgY@aws-0-[region].pooler.supabase.com:6543/postgres?connection_limit=1
   ```

**Why the pooler?** Serverless functions spin up many short-lived connections. Direct PostgreSQL connections would exhaust the database's connection limit. Supabase's transaction pooler multiplexes them safely.

### 1.2 Apply the database schema

The tables (User, Student, Transaction, AuditLog) have already been created. If you need to re-apply, run from your local machine:

```powershell
cd rtms/server
$env:DATABASE_URL="<your-pooler-url-from-1.1>"
npx prisma migrate deploy
```

### 1.3 Seed initial data

Still pointed at Supabase, seed the admin user, staff users, and sample students:

```powershell
cd rtms/server
$env:DATABASE_URL="<your-pooler-url-from-1.1>"
npx tsx src/seed.ts
```

This creates:
- `admin` / `admin123` (admin role)
- `staff1` / `staff123`, `staff2` / `staff123` (staff role)
- 8 sample students

---

## Part 2 — Push Code to GitHub

### 2.1 Create the repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository (e.g. `rtams-thesis`) — can be public or private
3. Do **not** initialize with a README

### 2.2 Push your local code

From the thesis folder root:

```bash
git remote add origin https://github.com/YOUR-USERNAME/rtams-thesis.git
git branch -M main
git push -u origin main
```

---

## Part 3 — Deploy to Vercel

### 3.1 Import the project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your `rtams-thesis` repository
3. You'll land on the configuration page

### 3.2 Configure project settings

| Setting | Value |
|---------|-------|
| **Project Name** | `rtams` (or whatever you prefer) |
| **Framework Preset** | `Other` |
| **Root Directory** | Click **Edit** → type `rtms` → click **Continue** |
| **Build Command** | Leave default (uses `vercel.json`) |
| **Output Directory** | Leave default (uses `vercel.json`) |
| **Install Command** | Leave default (uses `vercel.json`) |

> The `vercel.json` in the `rtms` folder already specifies the correct build/output. Do not override it.

### 3.3 Set environment variables

Expand the **Environment Variables** section and add:

| Name | Value | Notes |
|------|-------|-------|
| `DATABASE_URL` | Your Supabase pooler URL with `?connection_limit=1` | From Part 1.1 |
| `JWT_SECRET` | A strong random string of 32+ characters | Generate at [randomkeygen.com](https://randomkeygen.com) (use CodeIgniter Encryption Keys) |
| `NODE_ENV` | `production` | |
| `CORS_ORIGIN` | Leave empty for now | You'll set this after the first deploy |

> Vercel automatically sets `VERCEL=1` which your server code uses to detect the serverless environment.

### 3.4 Deploy

Click **Deploy**. The build takes 2–4 minutes and runs:

1. `npm install` (installs all workspace dependencies)
2. `npm run build` (builds `shared` → `server` → `client` in order)
3. Packages `api/index.mjs` as a serverless function

If the build fails, scroll through the logs to find the error — the most common issues are documented in the **Troubleshooting** section below.

---

## Part 4 — Post-Deployment Configuration

### 4.1 Set the CORS origin

1. Copy your deployment URL (e.g. `https://rtams-abcd1234.vercel.app`)
2. In Vercel: **Settings** → **Environment Variables**
3. Edit `CORS_ORIGIN` and set it to your full deployment URL (no trailing slash):
   ```
   https://rtams-abcd1234.vercel.app
   ```
4. Go to **Deployments** → click the **⋯** on the latest deployment → **Redeploy**

> Without this step, the frontend gets blocked by CORS when calling the API.

### 4.2 (Optional) Set a custom domain

1. **Settings** → **Domains** → **Add**
2. Enter your domain and follow Vercel's DNS instructions
3. Update `CORS_ORIGIN` to include your custom domain (comma-separated if you want both):
   ```
   https://rtams.yourdomain.com,https://rtams-abcd1234.vercel.app
   ```
4. Redeploy

---

## Part 5 — Verify the Deployment

### 5.1 Test the frontend

Open your deployment URL in a browser. You should see the RTAMS login page.

### 5.2 Test login

Log in with:
- Username: `admin`
- Password: `admin123`

You should land on the dashboard.

### 5.3 Test the API end-to-end

From the dashboard:
1. Go to **Students** → verify 8 sample students appear
2. Click **New Transaction** → select a student → create a transaction
3. Review and release the transaction → verify it progresses through statuses

If any of these fail, check the **Troubleshooting** section.

---

## Part 6 — Continuous Deployment

Vercel is now watching your GitHub repo. Every push to `main` triggers a new production deploy. Pull request branches get their own preview URLs.

To deploy a change:

```bash
git add .
git commit -m "your change"
git push
```

The deploy takes ~2 minutes. You can monitor it in the Vercel dashboard.

---

## Troubleshooting

### Build fails with "Cannot find module '@rtms/shared'"

The `shared` package didn't build before `server` or `client`. Check that `rtms/package.json` has:

```json
"scripts": {
  "build": "npm run build -w shared && npm run build -w server && npm run build -w client"
}
```

### API returns 500 with "PrismaClientInitializationError"

`DATABASE_URL` is wrong or the database is unreachable. Verify:
- You're using the **Transaction pooler** string (port `6543`), not the direct connection
- The password in the URL matches your Supabase database password
- `?connection_limit=1` is appended

Check the live error in **Vercel Dashboard → your project → Logs**.

### Frontend loads but login fails with "Network Error"

`CORS_ORIGIN` is missing or wrong. Revisit Part 4.1 — the value must exactly match your deployment URL (including `https://`, no trailing slash).

### "P1001: Can't reach database server"

Supabase database is paused (free tier auto-pauses after inactivity). Open the Supabase dashboard and it will auto-resume, then redeploy.

### Login works but subsequent requests fail with 401

`JWT_SECRET` differs between environments or changed between deploys. Set a single strong value and don't rotate it unless you also invalidate existing tokens.

### Cold start is slow (3–5 seconds on first request)

Normal for Prisma on serverless. Subsequent requests within ~15 minutes will be fast. For consistently fast response times you'd need to either:
- Enable Vercel's [Fluid Compute](https://vercel.com/docs/functions/fluid-compute) (paid feature)
- Use Vercel Cron to ping `/api/health` every 10 minutes to keep warm

### "Function exceeded maximum duration" errors

Vercel's free tier caps functions at 10 seconds. If you have slow queries, you can:
- Upgrade to Vercel Pro (60s limit)
- Add indexes to the database (most queries should be well under 1s)

---

## Architecture Reference

### Request flow

```
Browser
  ↓
Vercel CDN (static React app from client/dist)
  ↓ XHR to /api/*
Vercel Edge Router (matches vercel.json rewrite)
  ↓
api/index.mjs (serverless function, Node runtime)
  ↓ fastify.inject()
Fastify app (imported from server/dist)
  ↓ Prisma Client
Supabase Transaction Pooler :6543
  ↓
Supabase PostgreSQL
```

### Files that make deployment work

- `rtms/vercel.json` — Tells Vercel where the build output and function live
- `rtms/api/index.mjs` — Serverless entry point; wraps Fastify with `inject()`
- `rtms/server/src/app.ts` — Exports `buildApp()` factory (no `.listen()` in serverless)
- `rtms/server/src/lib/prisma.ts` — Singleton Prisma client (survives function reuse)
- `rtms/server/prisma/schema.prisma` — `binaryTargets` includes `rhel-openssl-3.0.x` for Vercel's runtime

---

## Cost

With the stack above:

- **Vercel Hobby** — Free (100 GB bandwidth, 100 GB-hours compute, unlimited deploys)
- **Supabase Free** — Free (500 MB database, 2 GB bandwidth, auto-pause after 1 week idle)

Total: **$0/month** for a thesis project.

Paid upgrades only matter if you exceed bandwidth or need always-on database / longer function timeouts.
