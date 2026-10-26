/**
 * Push .env.local keys to the linked Vercel project (all environments).
 *
 * Usage:
 *   npx vercel login
 *   npx vercel link
 *   node scripts/push-env-vercel.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("Missing .env.local — add your keys there first.");
  process.exit(1);
}

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
];

const OPTIONAL_OK = new Set([
  "AI_PROVIDER",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "OLLAMA_TIMEOUT_MS",
  "OLLAMA_SOFT_TIMEOUT_MS",
  "WHISPER_MODEL",
  "OCR_LANGUAGE",
  "MAX_UPLOAD_BYTES",
  "MAX_VOICE_BYTES",
]);

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const keys = [...REQUIRED, ...Object.keys(env).filter((k) => OPTIONAL_OK.has(k))];
const unique = [...new Set(keys)];

for (const key of REQUIRED) {
  if (!env[key]?.trim()) {
    console.error(`Missing required key in .env.local: ${key}`);
    process.exit(1);
  }
}

const environments = ["production", "preview", "development"];

for (const key of unique) {
  const value = env[key];
  if (!value?.trim()) continue;
  for (const target of environments) {
    // Remove existing then add (idempotent-ish)
    spawnSync("npx", ["vercel", "env", "rm", key, target, "-y"], {
      stdio: "ignore",
      shell: true,
    });
    const add = spawnSync(
      "npx",
      ["vercel", "env", "add", key, target],
      {
        input: value + "\n",
        encoding: "utf8",
        shell: true,
      },
    );
    if (add.status !== 0) {
      console.error(`Failed: ${key} → ${target}`);
      console.error(add.stderr || add.stdout);
      process.exit(add.status || 1);
    }
    console.log(`OK  ${key} (${target})`);
  }
}

console.log("\nDone. Redeploy on Vercel for vars to apply.");
