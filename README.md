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
	- `MONGODB_URI` (your mongodb+srv URI)
	- `MONGODB_DB` (e.g. `myprofiles`)
	- `NEXT_PUBLIC_ADMIN_KEY` (simple admin gate)
	- optional: `NEXT_PUBLIC_BASE_PATH`
2) Build settings:
	- Build: `next build && next export`
	- Publish: `out`
3) Netlify Functions live at `/.netlify/functions/*` (configured via `netlify.toml`).

MongoDB schema:
```
db: MONGODB_DB (default myprofiles)
collection: achievements
doc: { _id: 'achievements', data: { [year]: [{ text, cert? }] }, updatedAt }
```

## Notes
- Fullscreen layout, no scroll (`h-screen w-screen overflow-hidden`).
- Spline scene: replace the URL in `components/Scene.jsx` if needed.
- Overlay text is in `components/Overlay.jsx`.