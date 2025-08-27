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

## Netlify + MongoDB
1) Set environment variables in Netlify Site settings:
	- Driver (direct connection):
	  - `MONGODB_URI` (your mongodb+srv URI)
	  - `MONGODB_DB` (e.g. `myprofiles`)
	  - `MONGODB_COLLECTION` (e.g. `myprofiles`)
	- Data API (recommended if you hit TLS/IP allowlist issues):
	  - `MONGODB_DATA_API_BASEURL` (e.g. `https://<region>.data.mongodb-api.com/app/<app-id>/endpoint/data/v1`)
	  - `MONGODB_DATA_API_KEY`
	  - `MONGODB_DATA_SOURCE` (e.g. `Cluster0`)
	  - optional overrides: `MONGODB_DATA_API_DB`, `MONGODB_DATA_API_COLLECTION`
	- Admin gate: `NEXT_PUBLIC_ADMIN_KEY`
	- optional: `NEXT_PUBLIC_BASE_PATH`
2) Build settings:
	- Build: `next build` (this repo uses `output: 'export'` so build emits static files to `out/`)
	- Publish: `out`
3) Netlify Functions live at `/.netlify/functions/*` (configured via `netlify.toml`).

Troubleshooting DB connectivity:
- If Save to DB returns an SSL/TLS internal error or 504 from Atlas, switch to the MongoDB Data API by setting the three `MONGODB_DATA_API_*` vars above. The functions auto-prefer Data API when configured.
- For direct driver: ensure Atlas Network Access allows Netlify egress IPs (temporarily allow 0.0.0.0/0 for testing), and your connection string uses `mongodb+srv://` with TLS.

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