# RetireMeter — web app

Next.js 14 · TypeScript · Tailwind · Framer Motion · Supabase client.
This repo is what goes on **GitHub** and deploys to **Vercel**.

The database lives in a separate package (`retiremeter-supabase`). Set that up first —
this app needs the schema and the env vars before it will do anything useful.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in from your Supabase project
npm run test                   # 29 engine tests — run these first
npm run dev                    # http://localhost:3000
```

## Deploy to Vercel

```bash
npx vercel --prod
```

Or push to GitHub and import the repo in the Vercel dashboard — it auto-detects Next.js.

**Environment variables** (Project → Settings → Environment Variables):

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | all | from Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all | safe in the browser; RLS protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **never** prefix with `NEXT_PUBLIC_` |
| `KITE_API_KEY` | server | optional — Zerodha sync |
| `KITE_API_SECRET` | server | **never** expose; the checksum is computed server-side |
| `NEXT_PUBLIC_APP_URL` | all | your deployed URL |

`vercel.json` pins the region to `bom1` (Mumbai) so the serverless functions sit next
to the database. If your Supabase project is elsewhere, change it to match — a
cross-region hop adds latency to every query.

### Zerodha redirect URL

In the Kite developer console set the redirect to:

```
https://<your-domain>/api/kite/callback
```

---

## What's in here

```
src/lib/engine/     pure financial engine — no deps, no framework, fully tested
src/lib/supabase/   typed browser + server clients
src/lib/store.ts    Zustand; re-solves synchronously, persists debounced
src/components/     Gauge, AllocationTable, charts, nav
src/app/            App Router: marketing, auth, /app dashboard, Kite routes
src/middleware.ts   refreshes the session, guards /app
tests/              29 engine tests
```

The engine is deliberately framework-free and dependency-free. It is deterministic
arithmetic with one correct answer, so it must be reproducible and testable without a
browser or a database. You can lift `src/lib/engine/` into any other project unchanged.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run test` | engine test suite |
| `npm run test:watch` | tests in watch mode |

## Note on fonts

Fonts load via `<link>` rather than `next/font` so the build never needs outbound
network access. If your CI allows `fonts.googleapis.com`, switching to
`next/font/google` self-hosts them and removes a round trip.
