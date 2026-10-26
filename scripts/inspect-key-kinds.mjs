import { readFileSync, existsSync } from "fs";

const path = ".env.local";
if (!existsSync(path)) {
  console.log("NO_ENV");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i <= 0) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

function clean(v) {
  let x = (v || "").trim();
  if (
    (x.startsWith('"') && x.endsWith('"')) ||
    (x.startsWith("'") && x.endsWith("'")) ||
    (x.startsWith("`") && x.endsWith("`"))
  ) {
    x = x.slice(1, -1).trim();
  }
  return x;
}

function describe(name, raw) {
  const v = clean(raw);
  let kind = "unknown";
  if (v.startsWith("eyJ") && v.split(".").length === 3) kind = "legacy_jwt";
  else if (v.startsWith("sb_publishable_")) kind = "sb_publishable";
  else if (v.startsWith("sb_secret_")) kind = "sb_secret";
  else if (!v) kind = "empty";
  console.log(`${name}_KIND=${kind}`);
  console.log(`${name}_LEN=${v.length}`);
}

describe("ANON", env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
describe("SERVICE", env.SUPABASE_SERVICE_ROLE_KEY);
console.log("URL_SET=" + Boolean(clean(env.NEXT_PUBLIC_SUPABASE_URL)));
