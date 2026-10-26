/**
 * Local setup checker — does NOT print secret values.
 * Run: npm run setup:check
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i <= 0) continue;
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return out;
}

function status(ok, label, hint) {
  console.log(`${ok ? "[OK]" : "[ ]"} ${label}${hint ? ` — ${hint}` : ""}`);
  return ok;
}

async function main() {
  console.log("AI CV Maker — setup check\n");

  const env = loadEnvLocal();
  let ready = true;

  ready =
    status(existsSync(resolve(".env.local")), ".env.local exists", "copy from .env.example if missing") &&
    ready;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  function cleanKey(v) {
    return (v || "").trim().replace(/^["'`]|["'`]$/g, "");
  }

  function looksLikeAnonKey(v) {
    const x = cleanKey(v);
    if (x.startsWith("eyJ") && x.split(".").length === 3 && x.length > 80) return true;
    // New Supabase publishable keys
    if (x.startsWith("sb_publishable_") && x.length >= 30) return true;
    return false;
  }

  function looksLikeServiceKey(v) {
    const x = cleanKey(v);
    if (x.startsWith("eyJ") && x.split(".").length === 3 && x.length > 80) return true;
    // New Supabase secret keys (must be full, not truncated)
    if (x.startsWith("sb_secret_") && x.length >= 30) return true;
    return false;
  }

  for (const key of required) {
    const val = env[key] || "";
    const filled =
      val.length > 0 &&
      !val.includes("your-") &&
      !val.includes("your_project") &&
      val !== "https://your-project.supabase.co";

    if (key === "NEXT_PUBLIC_SUPABASE_URL") {
      const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(val.trim());
      ready =
        status(
          filled && urlOk,
          key,
          filled && urlOk ? "set" : "must be https://YOUR-PROJECT.supabase.co",
        ) && ready;
      continue;
    }

    if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
      const ok = filled && looksLikeAnonKey(val);
      ready =
        status(
          ok,
          key,
          ok
            ? "set"
            : "paste full anon (eyJ...) OR publishable (sb_publishable_...) key",
        ) && ready;
      continue;
    }

    if (key === "SUPABASE_SERVICE_ROLE_KEY") {
      const ok = filled && looksLikeServiceKey(val);
      ready =
        status(
          ok,
          key,
          ok
            ? "set"
            : "paste FULL service_role (eyJ...) OR secret (sb_secret_...) — current value looks truncated",
        ) && ready;
    }
  }

  ready =
    status(existsSync(resolve("supabase/migrations/001_initial_schema.sql")), "DB migration file ready") &&
    ready;
  ready =
    status(existsSync(resolve("supabase/migrations/002_storage.sql")), "Storage migration file ready") &&
    ready;

  const ollamaUrl = (env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  let ollamaOk = false;
  try {
    const res = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    ollamaOk = res.ok;
  } catch {
    ollamaOk = false;
  }
  ready =
    status(
      ollamaOk,
      "Ollama running",
      ollamaOk ? ollamaUrl : "install from https://ollama.com/download then: ollama pull llama3.2:3b",
    ) && ready;

  console.log(
    ready
      ? "\nAll set. Run: npm run dev"
      : "\nFinish the unchecked items, then run: npm run setup:check",
  );
  console.log("\nAfter keys are added, also in Supabase:");
  console.log("1) Run supabase/migrations/001_initial_schema.sql");
  console.log("2) Run supabase/migrations/002_storage.sql");
  console.log("3) Create private Storage bucket: cv-files");

  process.exit(ready ? 0 : 1);
}

main();
