# AWS Deployment

This app is a standard Next.js Node server plus Supabase (managed) and optional Ollama for AI.

## Recommended architecture (cost-aware)

1. **App**: AWS Elastic Beanstalk (Node.js) or ECS Fargate behind an Application Load Balancer
2. **Backend data**: Supabase (Auth, Postgres, Storage) — no self-managed RDS required
3. **AI**:
   - Start with Ollama on the same instance / a small companion EC2 if CPU inference is acceptable
   - Or point `OLLAMA_BASE_URL` at a separate inference host later
4. **Secrets**: AWS Secrets Manager or Elastic Beanstalk / ECS environment variables
5. **TLS**: ACM certificate on the load balancer

Do **not** provision GPU infrastructure until shop volume requires it.

## Environment variables (production)

Set the same variables from `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_APP_URL`
- `AI_PROVIDER=ollama`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `WHISPER_MODEL`
- `OCR_LANGUAGE`
- `MAX_UPLOAD_BYTES`

## Build on the server / CI

```bash
npm ci
npm run build
npm run start
```

Ensure Node.js 20+.

## Elastic Beanstalk sketch

1. Zip the app (or deploy from GitHub Actions)
2. Platform: Node.js 20
3. Set env vars in EB configuration
4. Process: `npm run start` (Next listens on `PORT`)
5. Increase instance size if running Whisper + Ollama on the same host (recommend separating AI later)

## Health check

`GET /api/health` returns `{ ok: true }`.

## Notes

- First Whisper model download is large; bake the model into the AMI or warm the cache on boot
- OCR/transcription/LLM can take time — keep ALB idle timeout ≥ 120s for generate requests
- Storage of customer files belongs in Supabase Storage (`cv-files` bucket), not local disk
