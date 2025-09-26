# Supabase setup

Follow these steps to avoid RLS errors (e.g., "new row violates row-level security policy") and make the sign-me/admin flows work:

1) Create Storage bucket
- Name: documents (or match NEXT_PUBLIC_SUPABASE_BUCKET)
- Set to Public if you want getPublicUrl to return direct links (or switch app code to signed URLs)
- Optionally create folder: signed_documents

2) Run migrations (in order)
- 20250926_sign_requests.sql
- 20250926_sign_requests_policies.sql

3) Environment variables (Next.js)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_SUPABASE_BUCKET=documents
- NEXT_PUBLIC_ADMIN_EMAIL=you@example.com (temp client-side gate)

Notes
- Policies currently allow anon insert/select/update on table and storage for simplicity. Replace with proper auth or service-role server functions in production.
- If you change the bucket name, also update policies in 20250926_sign_requests_policies.sql (bucket_id = 'yourname').
