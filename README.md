# My Profiles — Futuristic 3D Portfolio (Next.js + Tailwind + Framer + Spline)

Interactive 3D profile built with Next.js, TailwindCSS, Spline, and Framer Motion. Supports static export (GitHub Pages/Netlify) and Netlify Functions + MongoDB for Achievements data.

## Run locally

```powershell
# Install deps
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000

## Static export (for GitHub Pages)

```powershell
# If deploying to username.github.io/repo, set base path first
$env:NEXT_PUBLIC_BASE_PATH = "/repo"; npm run export

# output will be in `out/`
```

Serve `out/` with any static host or push to the `gh-pages` branch.

## Admin page
- Route: `/admin`
- Gate: set `NEXT_PUBLIC_ADMIN_KEY` in `.env` and enter it once (stored in localStorage)
- Data sources: loads from Netlify Function if available; otherwise uses local JSON
- Save options:
  - Save to DB: uses Netlify Function (MongoDB)
  - Save (dev): writes `data/achievements.json` in dev mode
  - Save to File / Download JSON: file-based, no server required

## Netlify + Storage Options
1) Choose a storage backend and set environment variables in Netlify Site settings:
	- GitHub (recommended for static sites; simple and durable):
	  - `GITHUB_TOKEN` (repo contents write)
	  - `GITHUB_REPO` (e.g. `owner/repo`)
	  - optional: `GITHUB_BRANCH` (default `main`), `GITHUB_FILE_PATH` (default `data/achievements.json`)
	- MongoDB Driver (direct connection):
	  - `MONGODB_URI`
	  - `MONGODB_DB` (e.g. `myprofiles`)
	  - `MONGODB_COLLECTION` (e.g. `myprofiles`)
	- MongoDB Data API (fallback; note deprecation EOL Sep 30, 2025):
	  - `MONGODB_DATA_API_BASEURL`
	  - `MONGODB_DATA_API_KEY`
	  - `MONGODB_DATA_SOURCE` (e.g. `Cluster0`)
	  - optional: `MONGODB_DATA_API_DB`, `MONGODB_DATA_API_COLLECTION`
	- Admin gate: `NEXT_PUBLIC_ADMIN_KEY`
	- optional: `NEXT_PUBLIC_BASE_PATH`
2) Build settings:
	- Build: `next build` (this repo uses `output: 'export'` so build emits static files to `out/`)
	- Publish: `out`
3) Netlify Functions live at `/.netlify/functions/*` (configured via `netlify.toml`).

Troubleshooting and notes:
- For serverless reliability with a static site, GitHub storage is simplest (no IP allowlists, durable PR history). The Admin Save button commits `data/achievements.json` to your repo.
- If using MongoDB driver: ensure Atlas Network Access allows Netlify egress IPs (temporarily allow 0.0.0.0/0 for testing) and your URI uses TLS.
- Data API is supported but slated for deprecation (EOL Sep 30, 2025). Prefer GitHub storage or the direct driver long term.

MongoDB schema (single doc):
```
db: MONGODB_DB (default myprofiles)
collection: MONGODB_COLLECTION (default myprofiles)
doc: { _id: 'achievements', data: { [year]: [{ text, cert? }] }, updatedAt }
```

## Notes
- Fullscreen layout, no scroll (`h-screen w-screen overflow-hidden`).
- Spline scene: replace the URL in `components/Scene.jsx` if needed.
- Overlay text is in `components/Overlay.jsx`.