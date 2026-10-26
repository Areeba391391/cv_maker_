# Simple run (recommended for demos)

Do **not** treat VS Code Dev Tunnels as production. They break when the PC sleeps, Next stops, or the tunnel ages out — guests then see blank/404 pages.

## Local (best for client demos on this PC)

```bash
# Terminal 1
ollama serve
ollama pull llama3.2:3b

# Terminal 2
cd "D:\cv maker"
npm run dev
```

Open **http://localhost:3000**

## Share with someone on the same Wi‑Fi

Use the Network URL Next prints (e.g. `http://192.168.x.x:3000`).

## Real public hosting (later)

- **Simple:** Docker on one small VPS/EC2 — `docker compose -f docker-compose.aws.yml up -d --build`
- **Amplify:** only with Next.js SSR + no `output: standalone` (see `amplify.yml`)

Always set Supabase Auth → Site URL / Redirect URLs to the real domain.
