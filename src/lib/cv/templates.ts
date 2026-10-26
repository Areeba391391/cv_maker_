import { CvData, TemplateId } from "@/lib/cv/schema";
import { hasSectionContent, visibleSections } from "@/lib/cv/validation";
import {
  resolveLayout,
  resolveMargins,
  resolvePageSize,
  resolveSpacing,
} from "@/lib/cv/layout";

export interface RenderOptions {
  templateId?: TemplateId;
  forPrint?: boolean;
  editable?: boolean;
  /** When true, omit &lt;style&gt; block (caller injects cached CSS). */
  skipStyles?: boolean;
}

const styleCache = new Map<TemplateId, string>();

function esc(s?: string | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sectionTitle(title: string, className = "cv-section-title"): string {
  return `<h2 class="${className}">${esc(title)}</h2>`;
}

/** Case-insensitive unique strings, keeping first casing. */
function uniqueTexts(...parts: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of parts) {
    const t = part?.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/**
 * Extra personal fields only — name/phone/email/city already live in the header.
 * Avoids the common "2× repeat" look on shop printouts.
 */
function renderPersonalInfoBlock(data: CvData): string {
  const p = data.personal;
  const rows: Array<[string, string | undefined]> = [
    ["Date of Birth", p.dateOfBirth],
    ["Age", p.age],
    ["Nationality", p.nationality],
  ];
  // Address only when it adds detail beyond the city already shown in the header
  const city = p.city?.trim();
  const address = p.address?.trim();
  if (address && city && address.toLowerCase() !== city.toLowerCase()) {
    rows.push(["Address", address]);
  }

  const filled = rows.filter(([, v]) => Boolean(v?.trim()));
  if (!filled.length) return "";

  return `
    <section class="cv-section cv-personal-block">
      ${sectionTitle("Personal Information")}
      <div class="cv-info-grid">
        ${filled
          .map(
            ([label, value]) => `
          <div class="cv-info-row">
            <span class="cv-info-label">${esc(label)}</span>
            <span class="cv-info-value">${esc(value)}</span>
          </div>`,
          )
          .join("")}
      </div>
    </section>`;
}

function contactBitsHtml(data: CvData, sep: "dot" | "pipe" | "break" = "dot"): string {
  const p = data.personal;
  const place = uniqueTexts(p.city, p.address)[0];
  const bits = [
    p.phone ? `<span>${esc(p.phone)}</span>` : "",
    p.email ? `<span>${esc(p.email)}</span>` : "",
    place ? `<span>${esc(place)}</span>` : "",
  ].filter(Boolean);
  if (!bits.length) return "";
  if (sep === "pipe") return `<p class="cv-contact">${bits.join(" | ")}</p>`;
  if (sep === "break") return `<p class="cv-contact cv-contact-stack">${bits.join("<br/>")}</p>`;
  return `<p class="cv-contact">${bits.join('<span class="cv-dot">•</span>')}</p>`;
}

function photoHtml(data: CvData): string {
  return data.photoUrl
    ? `<img class="cv-photo" src="${esc(data.photoUrl)}" alt="Profile photo" />`
    : "";
}

function renderPersonalHeader(data: CvData, variant: TemplateId): string {
  const p = data.personal;
  const photo = photoHtml(data);
  const name = esc(p.fullName || "Candidate");
  const role = esc(data.targetPosition);

  if (variant === "modern") {
    return `
      <header class="cv-header modern-header">
        <div class="modern-header-text">
          <p class="cv-role">${role}</p>
          <h1 class="cv-name">${name}</h1>
          ${contactBitsHtml(data, "dot")}
        </div>
        ${photo}
      </header>`;
  }

  if (variant === "classic") {
    return `
      <header class="cv-header classic-header">
        ${photo}
        <div>
          <h1 class="cv-name">${name}</h1>
          <p class="cv-role">${role}</p>
          ${contactBitsHtml(data, "pipe")}
        </div>
      </header>
      <hr class="classic-rule" />`;
  }

  if (variant === "executive") {
    return `
      <header class="cv-header executive-header">
        <div class="executive-band">
          <div class="cv-header-main">
            <h1 class="cv-name">${name}</h1>
            <p class="cv-role">${role}</p>
          </div>
          ${photo}
        </div>
        ${contactBitsHtml(data, "dot")}
      </header>`;
  }

  if (variant === "minimal") {
    return `
      <header class="cv-header minimal-header">
        ${photo}
        <div class="cv-header-main">
          <h1 class="cv-name">${name}</h1>
          <p class="cv-role">${role}</p>
          ${contactBitsHtml(data, "dot")}
        </div>
      </header>`;
  }

  if (variant === "sidebar") {
    // Sidebar template uses a split shell — header is inside the main column
    return "";
  }

  if (variant === "ats") {
    // No photo / icons — linear text parsers read this cleanly
    return `
      <header class="cv-header ats-header">
        <div class="cv-header-main">
          <h1 class="cv-name">${name}</h1>
          <p class="cv-role">${role}</p>
          ${contactBitsHtml(data, "break")}
        </div>
      </header>`;
  }

  return `
    <header class="cv-header professional-header">
      ${photo}
      <div class="cv-header-main">
        <h1 class="cv-name">${name}</h1>
        <p class="cv-role">${role}</p>
        ${contactBitsHtml(data, "dot")}
      </div>
    </header>`;
}

function renderBody(data: CvData, templateId: TemplateId): string {
  const parts: string[] = [];
  const isAts = templateId === "ats";

  // Most templates: show structured personal block under header for shop readability
  // ATS stays linear — skip personal grid (contact already in header)
  if (
    templateId !== "modern" &&
    templateId !== "sidebar" &&
    templateId !== "minimal" &&
    templateId !== "ats"
  ) {
    const block = renderPersonalInfoBlock(data);
    if (block) parts.push(block);
  }

  for (const section of visibleSections(data)) {
    if (!hasSectionContent(data, section)) continue;

    switch (section) {
      case "summary":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle(isAts ? "Summary" : "Career Objective")}
            <p class="cv-summary">${esc(data.professionalSummary)}</p>
          </section>`);
        break;
      case "experience":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle(isAts ? "Experience" : "Work Experience")}
            ${data.experience
              .map(
                (e) => `
              <div class="cv-item">
                <div class="cv-item-head">
                  <strong>${esc(e.title || "Role")}${e.company ? ` — ${esc(e.company)}` : ""}</strong>
                  <span class="cv-dates">${esc([e.startDate, e.endDate].filter(Boolean).join(" – "))}</span>
                </div>
                ${e.location ? `<div class="cv-muted">${esc(e.location)}</div>` : ""}
                ${
                  e.responsibilities?.length
                    ? `<ul class="cv-bullets">${e.responsibilities.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
                    : ""
                }
              </div>`,
              )
              .join("")}
          </section>`);
        break;
      case "education":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle("Education")}
            ${data.education
              .map((e) => {
                const titleParts = uniqueTexts(e.degree, e.field);
                const title = titleParts.join(" — ") || "Education";
                const institution = e.institution?.trim();
                const showInstitution =
                  !!institution &&
                  !titleParts.some((t) => t.toLowerCase() === institution.toLowerCase());
                return `
              <div class="cv-item">
                <div class="cv-item-head">
                  <strong>${esc(title)}</strong>
                  <span class="cv-dates">${esc([e.startDate, e.endDate].filter(Boolean).join(" – "))}</span>
                </div>
                ${showInstitution ? `<div>${esc(institution)}</div>` : ""}
                ${e.grade ? `<div class="cv-muted">Grade: ${esc(e.grade)}</div>` : ""}
                ${e.details ? `<p>${esc(e.details)}</p>` : ""}
              </div>`;
              })
              .join("")}
          </section>`);
        break;
      case "skills":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle("Skills")}
            <p class="cv-skills">${data.skills.map(esc).join(" · ")}</p>
          </section>`);
        break;
      case "languages":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle("Languages")}
            <p class="cv-languages">${data.languages
              .map((l) => `${esc(l.name)}${l.proficiency ? ` (${esc(l.proficiency)})` : ""}`)
              .join(" · ")}</p>
          </section>`);
        break;
      case "certifications":
        parts.push(twoColItemsSection("Certifications", data.certifications));
        break;
      case "courses":
        parts.push(listSection("Courses", data.courses));
        break;
      case "projects":
        parts.push(listSection("Projects", data.projects));
        break;
      case "achievements":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle("Key Strengths")}
            <ul class="cv-bullets">
              ${data.achievements.map((a) => `<li>${esc(a.title)}${a.details ? ` — ${esc(a.details)}` : ""}</li>`).join("")}
            </ul>
          </section>`);
        break;
      case "awards":
        parts.push(listSection("Awards", data.awards));
        break;
      case "volunteer":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle("Volunteer Experience")}
            ${data.volunteerExperience
              .map(
                (e) => `
              <div class="cv-item">
                <strong>${esc(e.title || "Volunteer")}${e.company ? ` — ${esc(e.company)}` : ""}</strong>
                ${
                  e.responsibilities?.length
                    ? `<ul class="cv-bullets">${e.responsibilities.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
                    : ""
                }
              </div>`,
              )
              .join("")}
          </section>`);
        break;
      case "interests":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle("Interests")}
            <p>${data.interests.map(esc).join(" · ")}</p>
          </section>`);
        break;
      case "references":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle("References")}
            ${data.references
              .map(
                (r) => `
              <div class="cv-item">
                <strong>${esc(r.name)}</strong>
                <div class="cv-muted">${[r.relationship, r.organization, r.phone, r.email]
                  .filter(Boolean)
                  .map((x) => esc(x as string))
                  .join(" · ")}</div>
              </div>`,
              )
              .join("")}
          </section>`);
        break;
      case "additional":
        parts.push(`
          <section class="cv-section">
            ${sectionTitle("Additional Information")}
            <p>${esc(data.additionalInformation)}</p>
          </section>`);
        break;
    }
  }

  return parts.join("\n");
}

function listSection(
  title: string,
  items: Array<{ title: string; details?: string; date?: string }>,
): string {
  return `
    <section class="cv-section">
      ${sectionTitle(title)}
      <ul class="cv-bullets">
        ${items
          .map(
            (i) =>
              `<li><strong>${esc(i.title)}</strong>${i.date ? ` (${esc(i.date)})` : ""}${
                i.details ? ` — ${esc(i.details)}` : ""
              }</li>`,
          )
          .join("")}
      </ul>
    </section>`;
}

/** Two items per row — certificates / short list items. */
function twoColItemsSection(
  title: string,
  items: Array<{ title: string; details?: string; date?: string }>,
): string {
  if (!items.length) return "";
  return `
    <section class="cv-section">
      ${sectionTitle(title)}
      <div class="cv-two-col">
        ${items
          .map((i) => {
            const meta = uniqueTexts(i.details, i.date).join(" · ");
            return `
          <div class="cv-two-col-item">
            <strong>${esc(i.title)}</strong>
            ${meta ? `<div class="cv-muted">${esc(meta)}</div>` : ""}
          </div>`;
          })
          .join("")}
      </div>
    </section>`;
}

/**
 * Always apply margins/spacing as inline styles so preview + print never ignore controls.
 * Density presets feed resolveMargins/resolveSpacing when the user has not locked custom values.
 */
function pageInlineStyle(data: CvData, fontScale: number): string {
  const m = resolveMargins(data);
  const s = resolveSpacing(data);
  const page = resolvePageSize(data);
  return [
    `--cv-font-scale: ${fontScale}`,
    `--cv-page-w: ${page.widthMm}mm`,
    `--cv-page-h: ${page.heightMm}mm`,
    `--cv-m-top: ${m.top}mm`,
    `--cv-m-right: ${m.right}mm`,
    `--cv-m-bottom: ${m.bottom}mm`,
    `--cv-m-left: ${m.left}mm`,
    `--cv-para-gap: ${s.paragraphSpacing}px`,
    `--cv-section-gap: ${s.sectionGap}px`,
    `--cv-line-height: ${s.lineHeight}`,
    /* Direct padding beats any stylesheet padding:0 (e.g. sidebar) */
    `padding: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
    `line-height: ${s.lineHeight}`,
  ].join(";");
}

export function getTemplateStyles(templateId: TemplateId): string {
  const hit = styleCache.get(templateId);
  if (hit) return hit;

  const shared = `
    .cv-page {
      --cv-font-scale: 1;
      --cv-m-top: 12mm;
      --cv-m-right: 14mm;
      --cv-m-bottom: 14mm;
      --cv-m-left: 14mm;
      --cv-para-gap: 6px;
      --cv-section-gap: 11px;
      --cv-line-height: 1.5;
      --cv-page-w: 210mm;
      --cv-page-h: 297mm;
      width: var(--cv-page-w);
      min-height: var(--cv-page-h);
      height: auto;
      margin: 0 auto;
      background: #fff;
      color: #15202b;
      box-sizing: border-box;
      padding: var(--cv-m-top) var(--cv-m-right) var(--cv-m-bottom) var(--cv-m-left);
      font-size: calc(10.5pt * var(--cv-font-scale));
      line-height: var(--cv-line-height);
      display: flex;
      flex-direction: column;
    }
    .cv-body {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
    }
    /* Density only tunes typography — margins/spacing come from inline style */
    .cv-page.cv-spacious {
      font-size: calc(11.75pt * var(--cv-font-scale));
    }
    .cv-page.cv-spacious .cv-body {
      justify-content: space-between;
      gap: 6px;
      min-height: 0;
      flex: 1;
    }
    .cv-page.cv-spacious .cv-section { padding-bottom: 4px; }
    .cv-page.cv-spacious .cv-name { font-size: calc(26pt * var(--cv-font-scale)); }
    .cv-page.cv-spacious .cv-role { font-size: calc(13pt * var(--cv-font-scale)); margin-top: 8px; }
    .cv-page.cv-spacious .cv-section-title { font-size: calc(11.5pt * var(--cv-font-scale)); margin-bottom: 10px; }
    .cv-page.cv-spacious .cv-item { margin-bottom: 12px; }
    .cv-page.cv-spacious .cv-bullets li { margin-bottom: 5px; }
    .cv-page.cv-spacious .cv-header { margin-bottom: 14px; }
    .cv-page.cv-comfortable {
      font-size: calc(10.85pt * var(--cv-font-scale));
    }
    .cv-page.cv-comfortable .cv-body { gap: 2px; }
    .cv-page.cv-comfortable .cv-name { font-size: calc(23pt * var(--cv-font-scale)); }
    .cv-page.cv-compact {
      font-size: calc(9.5pt * var(--cv-font-scale));
      min-height: 0;
    }
    .cv-page.cv-compact .cv-name { font-size: calc(19pt * var(--cv-font-scale)); }
    .cv-page.cv-compact .cv-item { margin-bottom: 5px; }
    .cv-page.cv-compact .cv-bullets li { margin-bottom: 1px; }
    .cv-page.cv-compact .cv-header { margin-bottom: 8px; }
    .cv-header { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 10px; }
    .cv-header-main { flex: 1; min-width: 0; }
    .cv-photo { width: 26mm; height: 32mm; object-fit: cover; border-radius: 2px; flex-shrink: 0; }
    .cv-name { margin: 0; font-size: calc(22pt * var(--cv-font-scale)); line-height: 1.1; letter-spacing: -0.02em; font-weight: 700; }
    .cv-role { margin: 5px 0 0; font-size: calc(12pt * var(--cv-font-scale)); font-weight: 600; }
    .cv-contact { margin: 8px 0 0; font-size: calc(9.5pt * var(--cv-font-scale)); color: #3a4654; display: flex; flex-wrap: wrap; gap: 4px 0; align-items: center; }
    .cv-contact-stack { display: block; line-height: 1.55; }
    .cv-dot { margin: 0 8px; color: #9aa5b1; }
    .cv-section { margin-bottom: var(--cv-section-gap); break-inside: avoid; page-break-inside: avoid; }
    .cv-section-title {
      margin: 0 0 7px;
      font-size: calc(10.5pt * var(--cv-font-scale));
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .cv-summary { text-align: justify; color: #243041; margin-bottom: var(--cv-para-gap); }
    .cv-item { margin-bottom: 9px; break-inside: avoid; }
    .cv-item-head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
    .cv-dates { color: #5b6b7c; font-size: 0.92em; white-space: nowrap; }
    .cv-muted { color: #5b6b7c; font-size: 0.92em; }
    .cv-bullets { margin: 4px 0 0 18px; padding: 0; }
    .cv-bullets li { margin-bottom: 3px; }
    .cv-skills, .cv-languages { margin: 0; line-height: 1.55; }
    .cv-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 18px; }
    .cv-info-row { display: flex; gap: 8px; font-size: 0.95em; padding: 2px 0; }
    .cv-info-label { min-width: 88px; color: #5b6b7c; font-weight: 600; }
    .cv-info-value { color: #15202b; }
    .cv-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 20px;
      align-items: start;
    }
    .cv-two-col-item {
      break-inside: avoid;
      page-break-inside: avoid;
      padding: 2px 0;
      min-width: 0;
    }
    .cv-two-col-item strong { display: block; line-height: 1.35; }
    .cv-page.cv-allow-pages {
      min-height: var(--cv-page-h);
      background-image: repeating-linear-gradient(
        to bottom,
        transparent 0,
        transparent calc(var(--cv-page-h) - 1px),
        #94a3b8 calc(var(--cv-page-h) - 1px),
        #94a3b8 var(--cv-page-h)
      );
    }
    .cv-page.cv-allow-pages .cv-body { justify-content: flex-start; }
    .cv-sidebar-shell { display: grid; grid-template-columns: 62mm 1fr; gap: 0; min-height: 100%; }
    .cv-sidebar {
      background: linear-gradient(180deg, #0f2744 0%, #163a5f 100%);
      color: #eef3f8;
      padding: 12mm 8mm 12mm 9mm;
    }
    .cv-sidebar .cv-name { color: #fff; font-size: calc(16pt * var(--cv-font-scale)); }
    .cv-sidebar .cv-role { color: #9ec0e6; font-size: calc(9.5pt * var(--cv-font-scale)); text-transform: uppercase; letter-spacing: 0.06em; }
    .cv-sidebar .cv-contact { color: #c9d7e6; display: block; }
    .cv-sidebar .cv-section-title { color: #9ec0e6; border-bottom: 1px solid rgba(158,192,230,0.35); padding-bottom: 3px; }
    .cv-sidebar .cv-skills, .cv-sidebar .cv-languages, .cv-sidebar .cv-muted { color: #e8eef5; }
    .cv-sidebar .cv-photo { width: 32mm; height: 32mm; border-radius: 50%; border: 2px solid #9ec0e6; margin-bottom: 10px; }
    .cv-main-col { padding: 12mm 12mm 12mm 10mm; }
    ul { margin: 4px 0 0 18px; padding: 0; }
    li { margin-bottom: 2px; }
    p { margin: 0; }
    @media print {
      .cv-page {
        width: auto;
        min-height: 0;
        margin: 0;
        box-shadow: none;
        background-image: none !important;
      }
      body { background: white !important; }
      .no-print { display: none !important; }
      .cv-section { break-inside: avoid; page-break-inside: avoid; }
    }
  `;

  let css: string;
  if (templateId === "modern") {
    css =
      shared +
      `
      .cv-page.modern { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
      .modern-header {
        background: linear-gradient(135deg, #0f3d3e 0%, #1a5557 100%);
        color: #f7f4ef;
        padding: 16px 18px;
        margin: 0 0 14px;
        border-radius: 6px;
        align-items: center;
        box-shadow: 0 8px 24px rgba(15, 61, 62, 0.18);
      }
      .modern-header .cv-role { color: #e2c48a; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9.5pt; margin: 0; }
      .modern-header .cv-name { color: #fff; }
      .modern-header .cv-contact { color: #e8e4dc; }
      .modern-header .cv-dot { color: #e2c48a; }
      .modern-header .cv-photo { border-radius: 4px; border: 2px solid #e2c48a; width: 28mm; height: 28mm; }
      .modern .cv-section-title { color: #0f3d3e; border-bottom: 2px solid #e2c48a; padding-bottom: 3px; }
    `;
  } else if (templateId === "classic") {
    css =
      shared +
      `
      .cv-page.classic { font-family: "Times New Roman", Times, serif; }
      .classic-header { text-align: center; flex-direction: column; align-items: center; }
      .classic-header .cv-photo { border-radius: 0; border: 1px solid #222; }
      .classic-header .cv-contact { justify-content: center; }
      .classic-rule { border: none; border-top: 1.5px solid #222; margin: 0 0 12px; }
      .classic .cv-section { text-align: left; }
      .classic .cv-section-title { text-align: center; border-bottom: 1px solid #222; font-variant: small-caps; letter-spacing: 0.08em; }
      .classic .cv-name { font-size: 24pt; letter-spacing: 0.04em; }
      .classic .cv-summary { text-align: left; }
      .classic .cv-info-grid { grid-template-columns: 1fr 1fr; max-width: none; margin: 0; }
      .classic .cv-personal-block { text-align: left; }
    `;
  } else if (templateId === "executive") {
    css =
      shared +
      `
      .cv-page.executive { font-family: Georgia, "Times New Roman", serif; }
      .executive-header { flex-direction: column; gap: 0; margin-bottom: 14px; }
      .executive-band {
        display: flex; justify-content: space-between; align-items: center; gap: 16px;
        background: linear-gradient(120deg, #111827 0%, #1f2937 100%);
        color: #fff;
        padding: 16px 18px;
        margin: 0 0 10px;
        border-radius: 4px;
        box-shadow: 0 10px 28px rgba(17, 24, 39, 0.22);
      }
      .executive-band .cv-name { color: #fff; letter-spacing: 0.02em; }
      .executive-band .cv-role { color: #fbbf24; margin-top: 6px; font-family: "Segoe UI", Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.1em; font-size: 9.5pt; }
      .executive-band .cv-photo { border: 2px solid #fbbf24; border-radius: 2px; }
      .executive .cv-contact { color: #4b5563; }
      .executive .cv-section-title {
        color: #111827; border-bottom: 2px solid #111827; padding-bottom: 3px;
        font-family: "Segoe UI", Arial, sans-serif; letter-spacing: 0.12em;
      }
    `;
  } else if (templateId === "minimal") {
    css =
      shared +
      `
      .cv-page.minimal { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111; }
      .minimal-header { border-bottom: 1px solid #111; padding-bottom: 12px; margin-bottom: 16px; }
      .minimal .cv-name { font-weight: 500; letter-spacing: -0.03em; }
      .minimal .cv-role { font-weight: 400; color: #555; text-transform: none; letter-spacing: 0; }
      .minimal .cv-section-title {
        text-transform: none; letter-spacing: 0; font-weight: 600;
        border-bottom: none; font-size: calc(11pt * var(--cv-font-scale)); color: #111;
      }
      .minimal .cv-summary { text-align: left; color: #333; }
      .minimal .cv-photo { border-radius: 0; border: none; }
    `;
  } else if (templateId === "sidebar") {
    css =
      shared +
      `
      .cv-page.sidebar { font-family: "Segoe UI", Calibri, Arial, sans-serif; }
      .cv-page.sidebar .cv-body { display: block; }
      .sidebar .cv-sidebar-shell {
        margin: 0;
        min-height: calc(var(--cv-page-h) - var(--cv-m-top) - var(--cv-m-bottom));
        border-radius: 4px;
        overflow: hidden;
        box-shadow: inset 0 0 0 1px rgba(15, 39, 68, 0.06);
      }
      .sidebar .cv-main-col .cv-section-title {
        color: #0f2744; border-left: 3px solid #0f2744; padding-left: 8px;
        border-bottom: 1px solid #d5dee8; padding-bottom: 3px;
      }
      .sidebar .cv-main-col .cv-name { color: #0f2744; }
    `;
  } else if (templateId === "ats") {
    css =
      shared +
      `
      .cv-page.ats {
        font-family: Calibri, Arial, Helvetica, sans-serif;
        color: #111;
      }
      .ats-header {
        display: block;
        border-bottom: 1px solid #333;
        padding-bottom: 10px;
        margin-bottom: 14px;
      }
      .ats .cv-name {
        font-size: calc(18pt * var(--cv-font-scale));
        font-weight: 700;
        letter-spacing: 0;
        color: #111;
      }
      .ats .cv-role {
        font-weight: 400;
        color: #222;
        text-transform: none;
        letter-spacing: 0;
        margin-top: 4px;
      }
      .ats .cv-contact {
        color: #222;
        display: block;
        margin-top: 6px;
      }
      .ats .cv-section-title {
        text-transform: none;
        letter-spacing: 0;
        font-weight: 700;
        font-size: calc(11pt * var(--cv-font-scale));
        color: #111;
        border-bottom: 1px solid #111;
        padding-bottom: 2px;
        margin-bottom: 8px;
      }
      .ats .cv-summary { text-align: left; color: #111; }
      .ats .cv-dates, .ats .cv-muted { color: #333; }
      .ats .cv-item-head { display: block; }
      .ats .cv-item-head .cv-dates { display: block; margin-top: 2px; white-space: normal; }
      .ats .cv-skills { color: #111; }
      .ats .cv-photo { display: none; }
    `;
  } else {
    css =
      shared +
      `
      .cv-page.professional { font-family: Calibri, "Segoe UI", Arial, sans-serif; }
      .professional-header {
        border-bottom: 3px solid #1e3a5f;
        padding-bottom: 12px;
        margin-bottom: 12px;
      }
      .professional .cv-name { color: #1e3a5f; }
      .professional .cv-role { color: #3d5a80; }
      .professional .cv-section-title {
        color: #1e3a5f;
        border-left: 4px solid #1e3a5f;
        padding-left: 8px;
        border-bottom: 1px solid #c5d0de;
        padding-bottom: 4px;
      }
      .professional .cv-photo { border: 1px solid #c5d0de; }
    `;
  }

  styleCache.set(templateId, css);
  return css;
}

function renderSidebarShell(data: CvData): string {
  const p = data.personal;
  const photo = photoHtml(data);
  const mainSkip = new Set(["skills", "languages", "certifications", "interests"]);

  const sideParts: string[] = [];
  if (data.skills.length) {
    sideParts.push(`
      <section class="cv-section">
        ${sectionTitle("Skills")}
        <p class="cv-skills">${esc(data.skills.join(" · "))}</p>
      </section>`);
  }
  if (data.languages.length) {
    sideParts.push(`
      <section class="cv-section">
        ${sectionTitle("Languages")}
        <p class="cv-languages">${data.languages
          .map((l) => esc(l.proficiency ? `${l.name} (${l.proficiency})` : l.name))
          .join(" · ")}</p>
      </section>`);
  }
  if (data.certifications.length) {
    sideParts.push(listSection("Certifications", data.certifications));
  }
  if (data.interests.length) {
    sideParts.push(`
      <section class="cv-section">
        ${sectionTitle("Interests")}
        <p class="cv-skills">${esc(data.interests.join(" · "))}</p>
      </section>`);
  }

  const personalBits = [
    p.dateOfBirth ? `<div class="cv-muted">DOB: ${esc(p.dateOfBirth)}</div>` : "",
    p.nationality ? `<div class="cv-muted">${esc(p.nationality)}</div>` : "",
  ]
    .filter(Boolean)
    .join("");

  // Main column: header + body without side sections
  const filtered: CvData = {
    ...data,
    sectionOrder: data.sectionOrder.filter((s) => !mainSkip.has(s)),
    skills: [],
    languages: [],
    certifications: [],
    interests: [],
  };

  return `
    <div class="cv-sidebar-shell">
      <aside class="cv-sidebar">
        ${photo}
        <h1 class="cv-name">${esc(p.fullName || "Candidate")}</h1>
        <p class="cv-role">${esc(data.targetPosition)}</p>
        ${contactBitsHtml(data, "break")}
        ${personalBits ? `<div class="cv-section">${personalBits}</div>` : ""}
        ${sideParts.join("")}
      </aside>
      <div class="cv-main-col">
        ${renderBody(filtered, "professional")}
      </div>
    </div>`;
}

export function renderTemplate(data: CvData, options: RenderOptions = {}): string {
  const templateId = options.templateId || data.metadata.templateId || "professional";
  const { density, fontScale, maxPages } = resolveLayout(data);
  const page = resolvePageSize(data);
  const pageClass = maxPages > 1 ? "cv-allow-pages" : "cv-fit-one";
  const marginsLocked = Boolean(data.metadata.marginsLocked);
  const vars = pageInlineStyle(data, fontScale);

  const inner =
    templateId === "sidebar"
      ? renderSidebarShell(data)
      : `${renderPersonalHeader(data, templateId)}
      <div class="cv-body">
        ${renderBody(data, templateId)}
      </div>`;

  const body = `
    <article
      class="cv-page ${templateId} cv-${density} ${pageClass}${marginsLocked ? " cv-margins-locked" : ""}"
      data-template="${templateId}"
      data-page-size="${page.id}"
      data-density="${density}"
      data-max-pages="${maxPages}"
      data-margins-locked="${marginsLocked ? "1" : "0"}"
      style="${vars}"
    >
      ${inner}
    </article>`;

  if (options.skipStyles) return body;

  const styles = `${getTemplateStyles(templateId)}\n@page { size: ${page.cssSize}; margin: 0; }`;
  if (options.forPrint) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>CV</title><style>${styles}</style></head><body>${body}</body></html>`;
  }

  return `<style>${styles}</style>${body}`;
}

export const TEMPLATES: Array<{
  id: TemplateId;
  name: string;
  description: string;
  accent: string;
  accent2: string;
}> = [
  {
    id: "ats",
    name: "ATS",
    description: "Single column · ATS-safe for portals",
    accent: "#111111",
    accent2: "#666666",
  },
  {
    id: "professional",
    name: "Professional",
    description: "Clean corporate — best for offices",
    accent: "#1e3a5f",
    accent2: "#c5d0de",
  },
  {
    id: "modern",
    name: "Modern",
    description: "Bold teal header + gold accents",
    accent: "#0f3d3e",
    accent2: "#e2c48a",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional centered serif",
    accent: "#222222",
    accent2: "#888888",
  },
  {
    id: "executive",
    name: "Executive",
    description: "Dark band — senior roles",
    accent: "#111827",
    accent2: "#fbbf24",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Quiet, lots of white space",
    accent: "#111111",
    accent2: "#dddddd",
  },
  {
    id: "sidebar",
    name: "Sidebar",
    description: "Two-column with left rail",
    accent: "#0f2744",
    accent2: "#9ec0e6",
  },
];
