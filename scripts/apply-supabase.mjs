/**
 * Apply Supabase setup: clean env quotes, create bucket, run SQL if possible.
 * Does not print secret values.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

function clean(v) {
  if (!v) return v;
  let x = v.trim();
  if (
    (x.startsWith('"') && x.endsWith('"')) ||
    (x.startsWith("'") && x.endsWith("'")) ||
    (x.startsWith("`") && x.endsWith("`"))
  ) {
    x = x.slice(1, -1).trim();
  }
  return x;
}

function rewriteEnv(path, updates) {
  let raw = readFileSync(path, "utf8");
  let changed = false;
  for (const [key, val] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(raw)) {
      const next = raw.replace(re, `${key}=${val}`);
      if (next !== raw) {
        raw = next;
        changed = true;
      }
    }
  }
  if (changed) writeFileSync(path, raw);
  return changed;
}

async function main() {
  const envPath = resolve(".env.local");
  const env = loadEnv(envPath);

  const url = clean(env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const anon = clean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
  const service = clean(env.SUPABASE_SERVICE_ROLE_KEY || "");

  console.log("ANON_LOOKS_JWT=" + anon.startsWith("eyJ"));
  console.log("SERVICE_LOOKS_JWT=" + service.startsWith("eyJ"));
  console.log("ANON_SEGMENTS=" + anon.split(".").length);
  console.log("SERVICE_SEGMENTS=" + service.split(".").length);
  console.log("URL_OK=" + /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url));

  if (!url || !service) {
    console.log("MISSING_KEYS=true");
    process.exit(1);
  }

  const cleaned = rewriteEnv(envPath, {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
  });
  console.log("ENV_CLEANED=" + cleaned);

  const sb = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: buckets, error: listErr } = await sb.storage.listBuckets();
  if (listErr) {
    console.log("AUTH_FAIL=" + listErr.message);
    console.log(
      "FIX=Supabase Dashboard → Project Settings → API se anon + service_role keys dobara copy-paste karo (.env.local). Quotes mat lagana.",
    );
    process.exit(2);
  }

  console.log("AUTH_OK=true");
  console.log(
    "BUCKETS=" + ((buckets || []).map((b) => b.name).join(",") || "none"),
  );

  if (!(buckets || []).some((b) => b.name === "cv-files")) {
    const { error } = await sb.storage.createBucket("cv-files", {
      public: false,
      fileSizeLimit: 15728640,
    });
    console.log("CREATE_BUCKET=" + (error ? "ERR:" + error.message : "OK"));
  } else {
    console.log("CREATE_BUCKET=ALREADY_EXISTS");
  }

  const { error: shopsErr } = await sb.from("shops").select("id").limit(1);
  if (!shopsErr) {
    console.log("SQL_SCHEMA=ALREADY_APPLIED");
    process.exit(0);
  }

  console.log("SQL_SCHEMA_MISSING=" + shopsErr.message);
  console.log(
    "NOTE=Service role se raw SQL run nahi hoti. Database password chahiye OR aap SQL Editor mein migrations run karo.",
  );

  // If DB password present, attempt psql
  const dbPass =
    clean(env.SUPABASE_DB_PASSWORD || "") ||
    clean(env.POSTGRES_PASSWORD || "") ||
    clean(env.DB_PASSWORD || "");
  const dbUrl = clean(env.DATABASE_URL || env.SUPABASE_DB_URL || "");

  if (!dbPass && !dbUrl) {
    console.log("NEED_DB_PASSWORD=true");
    process.exit(3);
  }

  console.log("HAS_DB_CREDENTIALS=true");
  process.exit(0);
}

main().catch((e) => {
  console.log("FAIL=" + e.message);
  process.exit(1);
});
