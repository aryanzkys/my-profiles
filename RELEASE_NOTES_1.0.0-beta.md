# Version 1.0 (Beta)

This beta release marks the first complete pass of the Admin platform, presence visibility, and logging/traceability across the portfolio app.

## Highlights
- Admin Authorities management with Owner safeguards
  - CRUD for admin authorities: canEditSections, canAccessDev, banned
  - Owner (prayogoaryan63@gmail.com) is protected: cannot be banned or deleted and always has full access
  - Audit logging for every authority change (includes actor metadata)
- Instant UX for admin changes (optimistic updates)
  - Add/Update/Delete reflect immediately in the UI, then sync in the background
  - Owner-only inline toasts show loading/success/error for each modification
- Presence visibility
  - Heartbeat + presence list with online/offline badge and last-seen tooltip
  - Configurable auto-refresh interval (via env/UI), and provider info included
- Login traceability
  - Firebase sign-ins are logged (uid, email, name, provider, photoURL, userAgent)
  - Owner-only login logs viewer with search filters and pagination
- Logs viewer improvements
  - Audit Logs viewer with filter (actor/target/action/date) and pagination
- Reliability improvements
  - Robust, Supabase-first backend with storage/FS fallbacks
  - Delete flow hardened (tries by id/uid/email); client shows immediate UI updates and reverts on failure
- Maintenance mode
  - "Shutdown Main Site" toggle with animated UI and persistence

## Notes
- The app ships with both Serverless (Netlify) and local dev parity routes. The Owner role is enforced both client and server side.
- Presence and logs can be backed by Supabase tables or storage/FS JSON fallbacks.

## What’s next
- Optional: server-side filtering/pagination for logs to reduce payloads on very large datasets
- Optional: database schema docs/automation for Supabase tables (admin_authorities, admin_audit, admin_presence, admin_logins)

