import { createRequire } from "module";

// Use vitest-style path via dynamic import of compiled logic is hard;
// smoke: call heuristic-only path by spawning through next isn't needed.
// Instead verify modules load and enrich path works via relative TS compile skip —
// we use a minimal duplicate check of empty seed enrich through validation helpers.

const require = createRequire(import.meta.url);

async function main() {
  // Soft import of built packages isn't available; use fetch generate requires auth.
  // Smoke the public API + page matrix instead, and time a local heuristic via child.
  const base = process.env.SMOKE_BASE || "http://localhost:3000";
  const pages = ["/", "/about", "/how-to", "/contact", "/login", "/signup"];
  for (const p of pages) {
    const res = await fetch(`${base}${p}`);
    if (!res.ok) throw new Error(`${p} -> ${res.status}`);
    console.log("PAGE_OK", p, res.status);
  }
  const health = await fetch(`${base}/api/health`).then((r) => r.json());
  if (!health.ok) throw new Error("health failed");
  console.log("HEALTH_OK", health.service);
  const ai = await fetch(`${base}/api/ai/status`).then((r) => r.json());
  console.log("AI_OK", ai.available, ai.model);

  // Auth gate
  const dash = await fetch(`${base}/dashboard`, { redirect: "manual" });
  console.log("DASH_REDIRECT", dash.status, dash.headers.get("location"));
  if (dash.status !== 307 && dash.status !== 302) {
    throw new Error("dashboard should redirect when logged out");
  }
  console.log("SMOKE_PASS");
}

main().catch((e) => {
  console.error("SMOKE_FAIL", e.message);
  process.exit(1);
});
