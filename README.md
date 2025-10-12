# My Profiles — 3D Portfolio + Admin Platform (Next.js/Tailwind/Framer/Spline)

Interactive 3D portfolio with an Owner-grade Admin platform: authority management, presence, audit/login logs, and maintenance mode. Ships static (Next.js export) and supports serverless APIs with Supabase-first persistence and robust fallbacks. Containerized and published to GitHub Packages (GHCR) with automated Releases on tags.

## Features

- 3D portfolio: Next.js 14, TailwindCSS, Framer Motion, Spline.
- Admin platform (Owner: `prayogoaryan63@gmail.com`):
	- Authorities CRUD: canEditSections, canAccessDev, banned.
	- Owner protections: cannot be banned/deleted; always full access.
	- Maintenance mode toggle: “Shutdown Main Site” with animated UX.
	- Presence: online/offline badges, last-seen tooltip, provider info; configurable auto-refresh.
	- Logs:
		- Audit logs for authority changes (actor/target/action) with filters + pagination.
		- Admin login logs (Firebase) with filters (email/provider/date) + pagination.
	- Instant UX: optimistic add/update/delete with Owner-only toasts for loading/success/error.
- Security and integrity:
	- Firebase Auth (Google + email) with login trace logging.
	- Optional reCAPTCHA v3 on auth flows.
	- Supabase-first backends with Storage/FS fallbacks.
- CI/CD:
	- Docker image published to GHCR on tag push.
	- GitHub Release auto-created/updated on tag push; prereleases when tag contains a hyphen.
	- “latest” tag only for stable tags (no hyphen).

## Requirements

- Node.js 20.x
- Optional: Netlify Functions (or Next.js API routes) + Supabase
- Optional: Docker (for container usage)

## Environment variables (.env.local)

See `.env.example` for the full list. Common ones:

- NEXT_PUBLIC_BASE_PATH: base path when hosting under a subpath (e.g., "/repo").
- NEXT_PUBLIC_ADMIN_KEY: simple admin gate for /admin (stored in localStorage).
- Supabase (table-first): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- Optional direct Postgres: SUPABASE_DB_URL or discrete PG vars
- reCAPTCHA v3 (optional): NEXT_PUBLIC_RECAPTCHA_SITE_KEY_V3, RECAPTCHA_SECRET_KEY, RECAPTCHA_SCORE_THRESHOLD
- Presence refresh (optional): NEXT_PUBLIC_PRESENCE_REFRESH_MS (default 60000)
- Password reset (server-side): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, optional SMTP_FROM, PASSWORD_SALT_ROUNDS
- Password reset routing: NEXT_PUBLIC_PASSWORD_RESET_FUNCTION (default `auth-service`), NEXT_PUBLIC_PASSWORD_RESET_BASE_URL (custom domain opsional), NEXT_PUBLIC_PASSWORD_RESET_PORT (dev proxy)

## Run locally

1) Install deps: `npm install`
2) Start dev server: `npm run dev`
3) Open http://localhost:3000

## Static export (GitHub Pages / static hosts)

If deploying to username.github.io/repo:

1) Set `NEXT_PUBLIC_BASE_PATH="/repo"`
2) Build: `npm run build` (outputs to `out/` via Next.js export)
3) Serve `out/` or push to your static host

## Admin page

- Route: `/admin`
- Gate: set `NEXT_PUBLIC_ADMIN_KEY` and enter once.
- Data sources: serverless function > dev API > local JSON fallback.
- Owner-only viewers: Audit Logs and Login Logs (with filters/pagination).
- Presence: shows online/offline, last seen, and provider.
- Instant UX: optimistic updates for add/update/delete/toggles with Owner toasts.

## Serverless + Persistence

- Netlify Functions under `/.netlify/functions/*` (see `netlify/` + `netlify.toml`).
- Supabase-first tables (with Storage and FS fallbacks). Typical tables:
	- admin_authorities, admin_audit, admin_presence, admin_logins
	- admin_credentials, admin_password_reset_tokens (untuk fitur lupa password)
- Achievements data remains supported via REST-first + storage fallback.

### Password reset flow

- Endpoint server: `POST /.netlify/functions/auth-service/auth/request-reset` dan `POST /.netlify/functions/auth-service/auth/reset`.
- Token dibuat dengan masa berlaku 30 menit dan disimpan di Supabase (REST/Storage) dengan fallback filesystem.
- Email dikirim menggunakan SMTP (lihat variabel lingkungan baru di atas).
- Halaman front-end `pages/reset-password.jsx` menerima token & email dari tautan email.
- Jalankan migrasi Supabase baru (`supabase/migrations/20251012_admin_password_reset.sql`) agar tabel `admin_credentials` dan `admin_password_reset_tokens` tersedia sebelum produksi.

## Security & Policies

- Owner cannot be banned or deleted and always has access.
- reCAPTCHA v3 can be enabled for login actions; server-side verification included.
- Please ensure usage complies with your website’s latest terms and privacy policy (data handling, logging, retention):
	- Terms of Service: https://aryanstack.netlify.app/terms
	- Privacy Policy: https://aryanstack.netlify.app/privacy

## Docker & GitHub Packages (GHCR)

- Container build: `Dockerfile` (multi-stage) + `nginx.conf` serving static `out/`.
- CI publishes images to GHCR on tag push as `ghcr.io/<owner>/<repo>:<tag>`.
- latest tag is only applied for stable tags (no `-` in tag).

Pull & Run (after CI publishes the tag):

- Image: `ghcr.io/aryanzkys/my-profiles:v1.0.0-beta`
- Run: map host port 8080 -> container 80.

## Release & CI Automation

- Tagging a release (e.g., `v1.0.0-beta`) triggers:
	- GHCR publish workflow: builds Docker and pushes `:v1.0.0-beta` (no `:latest` for prereleases).
	- Release workflow: creates/updates GitHub Release with auto notes and GHCR link.
- Stable tags (e.g., `v1.0.0`) also push `:latest`.

## Deploy (Netlify)

- Build command: `next build` (export emits to `out/`)
- Publish directory: `out`
- Configure env vars in Netlify settings (see above)

## Notes

- Fullscreen layout, no scroll (`h-screen w-screen overflow-hidden`).
- Replace Spline scene URL in your component(s) if needed.
- Overlay or hero content can be edited under `components/`.