# My Profiles — 3D Portfolio + Admin Platform (Next.js/Tailwind/Framer/Spline)

Interactive 3D portfolio with an Owner-grade Admin platform: authority management, presence, audit/login logs, and maintenance mode. Ships static (Next.js export) and supports serverless APIs with Supabase-first persistence and robust fallbacks. Containerized and published to GitHub Packages (GHCR) with automated Releases on tags.

## Feature Highlights

- Immersive realtime home experience powered by Next.js 14, TailwindCSS, Framer Motion, and embedded Spline scenes with shutdown overlays and mobile fallbacks.
- AI assistant surface (Gemini via `Chatbot`) with markdown rendering, feedback capture, slow-response UX, privacy routing, and full-screen `/AI` page variant.
- Announcement system with target selection (`main`, `ai`, or `both`), per-route gating, live status indicator, optimistic draft preview, versioning, expiry, CTA buttons, and mobile preview toggle.
- Owner/admin workspace featuring authorities CRUD (canEditSections, canAccessDev, banned), owner lock, maintenance mode toggle, presence heartbeat and live roster, Firebase login logs, audit history, announcement list, site flag editor, and supabase-backed content editors for achievements, education, and organizations.
- Mini experiences and utilities: signature request flow (`/sign-me`), indie games (`MiniFlappy`, `MiniFlappyPhaser`, `MiniChess`), micro experiments (`MicroSpline`, `ParticleField`), spotlight overlays, Spotify widgets, and shutdown UX.
- Security and resilience: Firebase Auth (Google + email/password), optional reCAPTCHA v3 verification, Supabase-first persistence with storage/filesystem fallbacks, safe localStorage fallback for announcement flags, and guarded admin routing.
- CI/CD automation: Docker image publishing to GHCR, GitHub Release automation on tags (prerelease detection), and static export pipeline for CDN or Netlify hosting.

## Application Surface

### Public pages (Next.js `pages/`)

- `/` (`index.jsx`): 3D hero backed by `Scene`, animated overlay sections, announcement popup, mobile notice, and maintenance shutdown overlay.
- `/AI` (`AI.jsx`): full-screen AI assistant with chatbot opened by default, curated quick questions, announcements scoped to AI target, and privacy banner.
- `/ai-privacy` (`ai-privacy.jsx`): AI privacy statement sourced from `data/ai_privacy.json` with collapsible sections.
- `/cv` (`cv.jsx`): résumé view with download links, achievements timeline, and educational background.
- `/login` (`login.jsx`): Firebase email/password + Google login flow with announcement gate awareness and supabase persistence fallback.
- `/message-to-aryan` (`message-to-aryan.jsx`): direct messaging surface with validation, optimistic send UX, and Netlify/Next API proxying.
- `/patch` (`patch.jsx`): release notes and patch history pulled from `public/patches.json` and `data/patches.json`.
- `/privacy` (`privacy.jsx`) and `/terms` (`terms.jsx`): policy pages sourced from JSON and rendered with timeline cards.
- `/reset-password` (`reset-password.jsx`): token-based password reset handler integrated with `auth-service` functions.
- `/sign-me` (`sign-me.jsx`): Supabase-backed signature request intake (PDF upload) plus status tracking for `sign_requests` table, with bucket existence checks.
- `/cv`, `/projects`, `/contact`, `/about`, `/education` sections are composed within the main overlay using dedicated components and dynamic data contexts.

### Admin and internal pages

- `/admin-dashboard` (`admin-dashboard.jsx`): post-login cinematic welcome with warp transition before redirecting to the control panel.
- `/admin` (`admin.jsx`): primary admin surface with tabbed editors (achievements, education, organizations, announcements, admin profile, developer ops, messaging moderation). Includes Firebase profile management, password change flow with re-auth, keyboard shortcuts, optimistic Supabase writes, announcement management with target filters, and live presence pulses.
- `/admin/sign-requests` (`admin/sign-requests.jsx`): reviewer console for signature requests including status updates, signed file uploads, and audit logging.

### System wrapper

- `_app.jsx`: hydrates shared providers (`AuthProvider`, `DataContext`, `PerformanceContext`), attaches `AnnouncementPopup`, `AnimatedCursor`, `Chatbot`, `SpotifyFloating`, and `MobileNotice` globally, and wires theme/fonts.

## Reusable Components and Modules

- 3D and visual stack: `Scene`, `Overlay`, `ParticleField`, `AnimatedCursor`, `ShutdownOverlay`, `MobileNotice`, `MicroSpline`, `Overlay` section cards.
- Portfolio sections: `About`, `Achievements`, `Education`, `Organizations`, `Projects`, `Contact`, `SignatureEditor`, `SignaturePreview`, `SpotifySection`, `SpotifyFloating`, each reading from JSON data sources or Supabase fallbacks.
- Admin suite: `Dashboard`, `AuthProvider`, `DataContext`, `PerformanceContext`, `AnnouncementPopup`, `admin/MessagesAdmin`, `AdminPanel/DevSection`, announcement card previews, and presence awareness hooks.
- Mini apps and experiments: `MiniFlappy`, `MiniFlappyPhaser`, `MiniChess`, `MessageToAryan`, plus chatbot presentation shells with animated markdown rendering.
- Libraries (`lib/`): `adminApi.js`, `generatePatches.js`, `passwordResetClient.js`, `supabaseClient.js` power persistence, patch exports, and credential flows.
- Utilities (`utils/`): `adminStore`, `mailer`, `passwordStore`, `tokenStore` provide storage fallbacks, email delivery, and token lifecycle helpers.

## Data and Content Sources

- JSON datasets under `data/`: `about`, `achievements`, `ai_privacy`, `contact`, `education`, `organizations`, `patches`, `site_features` feed public-facing sections and AI prompt context.
- Auth configuration located in `auth/custom_user_data.json` and `auth/providers.json` for seeded accounts, authority scaffolding, and provider metadata.
- Public assets: `public/patches.json`, `public/robots.txt`, `public/sitemap.xml`, and cursor SVGs.
- Environment-specific settings in `environments/*.json`, Supabase migrations under `supabase/migrations/`, and sync pipeline configs in `sync/config.json`.

## Serverless API Surface

### Next.js API routes (`/api/*`)

- Admin management: `admin-login-log`, `admin-login-log-list`, `admin-presence-heartbeat`, `admin-presence-list`, `admins-list`, `admins-upsert`, `admins-delete`, `admins-audit-list` for dashboard data, live presence, and audit trails.
- Announcement and site controls: `get-announcement`, `list-announcements`, `save-announcement`, `delete-announcement`, `get-site-flags`, `set-site-flags` handle targeted announcements, shutdown flags, and storage fallbacks.
- Content CRUD: `get-achievements`, `save-achievements`, `patches` provide CMS-style editing and export of achievements and patch notes.
- Messaging and outreach: `messages-list`, `messages-delete`, `send-message`, `validate-instagram` cover contact submissions and validation flows.
- AI and feedback: `gemini-chat` proxies Google Gemini requests with profile context and streaming control.
- Maintenance helpers: `save-announcement`, `delete-announcement`, and `set-site-flags` coordinate fallback storage when Supabase/Netlify APIs are unavailable.

### Netlify Functions (`/.netlify/functions/*`)

- Admin management mirrors: `admin-login-log`, `admin-login-log-list`, `admin-presence-heartbeat`, `admin-presence-list`, `admins-list`, `admins-upsert`, `admins-delete`, `admins-audit-list` for production serverless deployments.
- Announcement and site flags: `get-announcement`, `list-announcements`, `save-announcement`, `delete-announcement`, `get-site-flags`, `set-site-flags` with target filtering and fallback-safe storage.
- Content services: `get-achievements`, `save-achievements`, `patches`, `get-education`, `save-education`, `get-organizations`, `save-organizations` maintain portfolio data.
- Messaging suite: `messages-list`, `messages-delete`, `send-message`, `feedback-create`, `feedback-list`, `feedback-chat`, `feedback-summarize` for inbox workflows, chatbot logs, and summarization.
- AI gateway: `gemini-chat` handles Google Generative AI calls with moderation and rate protection.
- Auth and security: `auth-service` (password reset request/reset endpoints), `verify-recaptcha` (server-side v3 verification), `spotify-token` (refreshes Spotify API tokens), `validate-instagram` (URL sanity checks).
- Announcements and presence share the same fallback-safe storage helpers to sync with Next API when running locally.

### Other tooling

- `netlify.toml` wires redirects and function directories; `functions/config.json` configures Netlify runtime.
- `scripts/generate-patches.js` and `lib/generatePatches.js` produce versioned patch payloads for static and Netlify consumption.
- `Dockerfile`, `nginx.conf`, and `server.js` enable multi-stage builds and static export hosting with optional Node preview server.

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
- Data sources: serverless function > dev API > local JSON fallback across achievements, education, organizations, announcements, and authority tables.
- Owner-only viewers: Audit Logs and Login Logs (with filters/pagination) plus announcement list filters, signature request reviewer, and developer tooling.
- Presence: shows online/offline, last seen, and provider, backed by heartbeat functions and auto-refresh interval.
- Instant UX: optimistic updates for add/update/delete/toggles with Owner toasts and safe rollback when Supabase is down.

## Public contact and AI surfaces

- `/message-to-aryan`: chat-styled contact form writing into serverless inbox with moderation queues.
- `/AI`: Gemini-powered assistant with local data prompt seeding, markdown answers, conversation persistence, and optional feedback logging.
- Announcement popup respects target scope (main vs AI) and gate lists to avoid admin/system routes.

## Serverless + Persistence

- Netlify Functions under `/.netlify/functions/*` (see `netlify/` + `netlify.toml`).
- Supabase-first tables (with Storage and FS fallbacks). Typical tables:
	- admin_authorities, admin_audit, admin_presence, admin_logins
	- admin_credentials, admin_password_reset_tokens (untuk fitur lupa password)
- AI chatbot feedback tables, signature request tables (`sign_requests`), and announcement storage optionally persist beyond JSON fallbacks.
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
- Announcement dismissals are session-scoped to comply with request for always-on popups while respecting expiry windows.
- Please ensure usage complies with your website's latest terms and privacy policy (data handling, logging, retention):
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
- Replace Spline scene URL in `components/Scene.jsx` if needed.
- Overlay or hero content can be edited under `components/` and asset data under `data/`.