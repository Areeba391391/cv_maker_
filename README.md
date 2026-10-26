# AI CV Maker

Professional AI-powered CV maker for shops, coaches, schools, and freelancers.

Walk-ins get a print-ready English CV in seconds: LinkedIn import, ATS-safe templates, instant generate, PDF/DOCX export — without inventing schools or employers.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Auth, Database, Storage, RLS)
- Ollama (local/open-weight LLM)
- Whisper via `@xenova/transformers` · Tesseract.js OCR
- Tiptap editor · DOCX (`docx`) · client PDF · A4/Letter/Legal print

## Features

- Instant CV from typed fields (attachments optional)
- LinkedIn paste / Save-to-PDF import
- 7 templates (ATS-safe first)
- Admin desk: team users, CV counts, contact inbox, reviews
- Marketing site with DB-backed approved reviews

## Setup

1. **Env**

```bash
cp .env.example .env.local
```

Fill at least:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

2. **Supabase SQL** — run in order in the SQL Editor:

- `supabase/migrations/001_initial_schema.sql` … through `007_workspace_type.sql`
- Then either:
  - `supabase/FIX_PERMISSIONS.sql` (grants + `update_my_cv` — required for Save), **or**
  - migrations `008` → `011` individually
- Optional demo data: `supabase/SEED_DEMO.sql` or `npm run seed:demo`

3. Create a **private** storage bucket named `cv-files`.

4. **Ollama** (optional but recommended for AI path):

```bash
ollama pull llama3.2:3b
```

5. **App**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up (creates workspace + Owner), then make a CV.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests |
| `npm run seed:demo` | Insert demo contact messages + reviews |

## Roles

| Role | Access |
|---|---|
| **Owner** | Admin desk, promote Admins, customers, messages, reviews, CVs |
| **Admin** (manager) | Admin desk, customers, messages, reviews, CVs |
| **User** (employee) | Make CVs only |

Owner: Admin desk → **Add team member** (User or Admin) or **Make Admin** on a User.

## Shop workflow

1. New CV → target job + details  
2. Optional: LinkedIn / voice / images / old CV  
3. Generate  
4. Edit · template · page size  
5. Save / Save version · PDF · DOCX · Print  

## Security

- Never commit `.env.local`
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- RLS scopes shop data by `shop_id`

## Deployment notes

- Set the same env vars on your host (Vercel / Amplify / etc.)
- After first deploy, confirm Supabase migrations + `FIX_PERMISSIONS.sql` ran
- Optional helpers: [docs/AWS_LIVE_STEPS.md](docs/AWS_LIVE_STEPS.md), [docs/AWS_DEPLOYMENT.md](docs/AWS_DEPLOYMENT.md)

## License

Private / your project terms — update this section if you open-source.
