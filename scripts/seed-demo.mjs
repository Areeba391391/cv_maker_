/**
 * Inserts demo contact messages + reviews into Supabase (service role).
 * Usage: node scripts/seed-demo.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) throw new Error("Missing .env.local");
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = loadEnvLocal();
const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const messages = [
  {
    name: "Ahmed Raza",
    workspace_name: "City Careers Shop",
    phone: "03001234001",
    email: "ahmed@citycareers.pk",
    message:
      "We want to use AI CV Maker at our typing centre. How do we add 3 staff users?",
    created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
    read_at: null,
  },
  {
    name: "Sara Malik",
    workspace_name: "Bright Path Coaching",
    phone: "03219876002",
    email: "sara@brightpath.pk",
    message: "Can we import LinkedIn Save-to-PDF and print A4 the same day?",
    created_at: new Date(Date.now() - 1 * 864e5).toISOString(),
    read_at: new Date(Date.now() - 20 * 3600e3).toISOString(),
  },
  {
    name: "Imran Khan",
    workspace_name: "Campus Career Desk",
    phone: "03331234003",
    email: null,
    message: "Need ATS-safe template for students applying to portals. Demo please.",
    created_at: new Date(Date.now() - 5 * 3600e3).toISOString(),
    read_at: null,
  },
];

const reviews = [
  {
    name: "Nadia Hussain",
    workspace_name: "Quick Print & CV",
    rating: 5,
    message:
      "Walk-in customers leave with a clean English CV in minutes. LinkedIn paste alone saves us so much typing.",
    created_at: new Date(Date.now() - 12 * 864e5).toISOString(),
    approved_at: new Date(Date.now() - 11 * 864e5).toISOString(),
  },
  {
    name: "Bilal Ahmed",
    workspace_name: "Horizon Tutors",
    rating: 5,
    message:
      "ATS template is exactly what our students need for job portals. No fake schools — that honesty matters.",
    created_at: new Date(Date.now() - 9 * 864e5).toISOString(),
    approved_at: new Date(Date.now() - 8 * 864e5).toISOString(),
  },
  {
    name: "Fatima Noor",
    workspace_name: "DeskWorks Freelancers",
    rating: 4,
    message:
      "Templates look senior on paper. Clients ask which software we use — we just smile and print.",
    created_at: new Date(Date.now() - 6 * 864e5).toISOString(),
    approved_at: new Date(Date.now() - 5 * 864e5).toISOString(),
  },
  {
    name: "Usman Ali",
    workspace_name: "Market Road Computers",
    rating: 5,
    message:
      "Generate is fast under desk pressure. Staff picked it up in one afternoon.",
    created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
    approved_at: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
  {
    name: "Ayesha Siddiqui",
    workspace_name: "School Placement Cell",
    rating: 5,
    message:
      "Clear controls, honest English, PDF ready before the next student walks in.",
    created_at: new Date(Date.now() - 1 * 864e5).toISOString(),
    approved_at: new Date(Date.now() - 12 * 3600e3).toISOString(),
  },
  {
    name: "Omar Farooq",
    workspace_name: null,
    rating: 4,
    message:
      "Tried the contact flow — reply was clear. Setting up our shop workspace next week.",
    created_at: new Date(Date.now() - 8 * 3600e3).toISOString(),
    approved_at: null,
  },
];

async function upsertByMessage(table, rows) {
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const { data: existing, error: findErr } = await admin
      .from(table)
      .select("id")
      .eq("message", row.message)
      .maybeSingle();
    if (findErr) throw new Error(`${table} lookup: ${findErr.message}`);
    if (existing?.id) {
      skipped += 1;
      continue;
    }
    const { error } = await admin.from(table).insert(row);
    if (error) throw new Error(`${table} insert: ${error.message}`);
    inserted += 1;
  }
  return { inserted, skipped };
}

const msg = await upsertByMessage("contact_messages", messages);
const rev = await upsertByMessage("site_reviews", reviews);
console.log("contact_messages:", msg);
console.log("site_reviews:", rev);
console.log("Done. Refresh /admin and the home page.");
