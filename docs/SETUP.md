# Quick setup checklist

1. Create a Supabase project at https://supabase.com
2. Copy `.env.example` → `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. In Supabase SQL Editor, run in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_storage.sql`
   - `supabase/migrations/003_employee_self_select.sql`
   - `supabase/migrations/004_save_generated_cv.sql`
   - `supabase/migrations/005_list_get_cvs.sql`
   - `supabase/migrations/006_admin_customer_access.sql` (admins see clients; users do not)
   - `supabase/migrations/007_workspace_type.sql` (industry profile for any workplace)
4. Storage → create private bucket `cv-files`
5. Install Ollama and pull a model:
   ```bash
   ollama pull llama3.2:3b
   ```
6. Start the app:
   ```bash
   npm install
   npm run dev
   ```
7. Open http://localhost:3000 → Sign up (creates shop + owner) → New CV

Optional checks:
- `GET /api/health` — app alive
- `GET /api/ai/status` — Ollama reachability
