# Aap ko sirf ye add karna hai

Local setup (app + Ollama + model) ready hai.

## Sirf aapka kaam: Supabase

### 0) Email rate limit fix (IMPORTANT)

Supabase → **Authentication** → **Providers** → **Email** → **Confirm email = OFF**

Is se signup/login pe "email rate limit exceeded" nahi aana chahiye.

### 1) Keys — `.env.local`

File already hai. Isme ye 3 values paste karo (Supabase → Project Settings → API Keys):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...full anon OR sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=...full service_role OR sb_secret_...
```

`SUPABASE_SERVICE_ROLE_KEY` **poori** honi chahiye (truncated mat).

### 2) SQL — Supabase SQL Editor

Order mein Run:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_storage.sql`
3. `supabase/migrations/003_employee_self_select.sql`  ← employee profile
4. `supabase/migrations/004_save_generated_cv.sql`  ← customer/CV save
5. `supabase/migrations/005_list_get_cvs.sql`  ← home page + open CV

Agar pehle 1–4 run ho chuke hain, ab sirf **005** run karo.

### 3) Storage bucket

Supabase → Storage → New bucket:

- Name: `cv-files`
- Public: **OFF** (private)

### 4) Check + run

```bash
npm run setup:check
npm run dev
```

Phir http://localhost:3000 → Sign up / Sign in → New CV

---

## Pehle se ho chuka (aapko nahi karna)

- App dependencies
- `.env.local` template
- Ollama install (v0.33.3)
- Model `llama3.2:3b` pulled
- Setup checker script
