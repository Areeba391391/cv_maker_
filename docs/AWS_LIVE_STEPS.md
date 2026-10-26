# AWS pe live — step by step (free credits / free tier)

Supabase pehle se cloud pe hai (DB + Auth + Storage).  
AWS pe sirf **Next.js app** host karni hai. Ollama optional hai.

## Recommended (sab se aasan): Amplify Hosting

Cost: Free tier / credits ke andar usually soft hai. Ollama alag nahi chahiye pehle din — app typed fields se CV bana leti hai.

### 1) GitHub pe code push karo
Agar repo nahi hai to GitHub pe naya private repo banao aur push karo (`.env.local` commit mat karna).

### 2) Amplify Console
1. https://console.aws.amazon.com/amplify
2. **Create new app** → **Host web app** → GitHub connect
3. Branch: `main` (ya jis pe code hai)
4. Framework: **Next.js - SSR** / WEB_COMPUTE (static hosting mat choose karo)
5. Build settings: repo mein `amplify.yml` already hai — use that

**Important:** Amplify pe `output: "standalone"` mat use karo — is se live pe **404 This page could not be found** aata hai.  
Docker/EC2 ke liye `STANDALONE=1` alag se set hota hai (`Dockerfile` mein already).

Agar pehle deploy pe 404 aa raha hai:
1. Latest code push karo (yeh fix include ho)
2. Amplify → **Redeploy this version** / new build
3. Root URL kholo: `https://YOUR-APP.amplifyapp.com/` (trailing path galat na ho)
4. Health check: `https://YOUR-APP.amplifyapp.com/api/health` → `{"ok":true}`

### 3) Environment variables (Amplify → App settings → Environment variables)

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (Supabase project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon / publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | (service role — server only) |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-AMPLIFY-DOMAIN` (deploy ke baad update) |
| `AI_PROVIDER` | `ollama` |
| `OLLAMA_BASE_URL` | pehle khali / local mat do — baad mein EC2 URL |
| `OLLAMA_MODEL` | `llama3.2:3b` |
| `OLLAMA_TIMEOUT_MS` | `180000` |
| `OLLAMA_SOFT_TIMEOUT_MS` | `45000` |
| `OCR_LANGUAGE` | `eng+urd` |
| `MAX_UPLOAD_BYTES` | `15728640` |

Deploy → milega URL jaise `https://main.xxxxx.amplifyapp.com`

### 4) Supabase Auth redirect
Supabase Dashboard → Authentication → URL Configuration:
- Site URL = Amplify URL
- Redirect URLs mein Amplify URL add karo (`https://....amplifyapp.com/**`)

### 5) Ollama baad mein (optional)
Jab AI chahiye:
- EC2 `t3.medium` / `t3.large` (Ubuntu)
- Ollama install + `ollama pull llama3.2:3b`
- Security group: sirf Amplify/app se port `11434` (ya reverse proxy)
- Amplify env: `OLLAMA_BASE_URL=http://EC2_PRIVATE_OR_PUBLIC:11434`

**Pehle live app without Ollama bhi kaam karti hai** (typed fields + heuristic).

---

## Alternate: ek EC2 pe Docker (app + optional Ollama)

Credits zyada hain / control chahiye to:

```bash
# Ubuntu 22.04 EC2 (t3.medium+)
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu
```

Repo clone → `.env` banao →:

```bash
docker compose -f docker-compose.aws.yml up -d --build
```

See `docker-compose.aws.yml`.

Open `http://EC2_PUBLIC_IP:3000` — baad mein Route53 + ACM + Nginx/Caddy for HTTPS.

---

## Checklist live se pehle

- [ ] Supabase migrations `001`–`005` production project pe chal chuki hain
- [ ] Storage bucket `cv-files` + policies
- [ ] Signup/login test
- [ ] New CV generate (bina Ollama bhi)
- [ ] PDF / DOCX / Print
- [ ] `NEXT_PUBLIC_APP_URL` real domain pe set

## Health

`GET /api/health` → `{ ok: true }`
