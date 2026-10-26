import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { CvData } from "@/lib/cv/schema";
import { visibleSections } from "@/lib/cv/validation";
import { resolveLayout, type DensityMode } from "@/lib/cv/layout";

function mmToTwips(mm: number) {
  return Math.round(mm * 56.7);
}

function sizes(data: CvData, density: DensityMode, fontScale: number) {
  const base =
    density === "spacious" ? 23 : density === "comfortable" ? 21 : 19;
  const name =
    density === "spacious" ? 36 : density === "comfortable" ? 32 : 28;
  const heading =
    density === "spacious" ? 24 : density === "comfortable" ? 22 : 20;
  let after =
    density === "spacious" ? 140 : density === "comfortable" ? 100 : 60;
  let before =
    density === "spacious" ? 280 : density === "comfortable" ? 200 : 140;
  let line =
    density === "spacious" ? 340 : density === "comfortable" ? 300 : 260;

  if (data.metadata.marginsLocked) {
    const para = data.metadata.paragraphSpacing ?? 6;
    const gap = data.metadata.sectionGap ?? 11;
    const lh = data.metadata.lineHeight ?? 1.5;
    after = Math.round(para * 15);
    before = Math.round(gap * 20);
    line = Math.round(240 * lh);
  }

  return {
    body: Math.round(base * fontScale),
    name: Math.round(name * fontScale),
    role: Math.round((density === "compact" ? 20 : 22) * fontScale),
    heading: Math.round(heading * fontScale),
    small: Math.round((base - 2) * fontScale),
    after,
    before,
    line,
  };
}

export async function buildDocx(data: CvData): Promise<Buffer> {
  const { density, fontScale } = resolveLayout(data);
  const s = sizes(data, density, fontScale);
  const children: Paragraph[] = [];
  const personal = data.personal;

  const p = (
    text: string,
    opts?: { bold?: boolean; size?: number; italics?: boolean; after?: number },
  ) =>
    new Paragraph({
      spacing: { after: opts?.after ?? s.after, line: s.line },
      children: [
        new TextRun({
          text,
          bold: opts?.bold,
          italics: opts?.italics,
          size: opts?.size ?? s.body,
          font: "Calibri",
        }),
      ],
    });

  const heading = (text: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: s.before, after: Math.round(s.after * 0.7) },
      border: {
        bottom: { style: "single", size: 6, color: "1e3a5f", space: 4 },
      },
      children: [
        new TextRun({
          text: text.toUpperCase(),
          bold: true,
          size: s.heading,
          font: "Calibri",
          color: "1e3a5f",
        }),
      ],
    });

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: personal.fullName || "Candidate",
          bold: true,
          size: s.name,
          font: "Calibri",
          color: "1e3a5f",
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: data.targetPosition,
          size: s.role,
          font: "Calibri",
          bold: true,
        }),
      ],
    }),
  );

  const contact = [personal.phone, personal.email, personal.city || personal.address]
    .filter(Boolean)
    .join(" · ");
  if (contact) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: s.after * 1.5 },
        children: [new TextRun({ text: contact, size: s.small, font: "Calibri" })],
      }),
    );
  }

  for (const section of visibleSections(data)) {
    switch (section) {
      case "summary":
        children.push(heading("Career Objective"), p(data.professionalSummary || ""));
        break;
      case "experience":
        children.push(heading("Work Experience"));
        for (const e of data.experience) {
          const titleLine = `${e.title || "Role"}${e.company ? ` — ${e.company}` : ""}`;
          const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");
          children.push(
            new Paragraph({
              spacing: { after: 40, line: s.line },
              children: [
                new TextRun({ text: titleLine, bold: true, size: s.body, font: "Calibri" }),
                ...(dates
                  ? [
                      new TextRun({ text: "    ", size: s.body, font: "Calibri" }),
                      new TextRun({
                        text: dates,
                        italics: true,
                        size: s.small,
                        font: "Calibri",
                        color: "555555",
                      }),
                    ]
                  : []),
              ],
            }),
          );
          if (e.location) children.push(p(e.location, { size: s.small, after: 40 }));
          for (const r of e.responsibilities || []) {
            children.push(
              new Paragraph({
                spacing: { after: Math.round(s.after * 0.5), line: s.line },
                indent: { left: 360 },
                children: [
                  new TextRun({ text: `• ${r}`, size: s.body, font: "Calibri" }),
                ],
              }),
            );
          }
          // Extra gap between jobs so each experience is a clear block
          children.push(
            new Paragraph({
              spacing: { after: Math.round(s.after * 0.8) },
              children: [],
            }),
          );
        }
        break;
      case "education":
        children.push(heading("Education"));
        for (const e of data.education) {
          const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ");
          const titleParts = [e.degree, e.field].filter(Boolean) as string[];
          const uniqTitle = titleParts.filter(
            (t, i) =>
              titleParts.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i,
          );
          const title = uniqTitle.join(" — ") || "Education";
          const institution =
            e.institution &&
            !uniqTitle.some((t) => t.toLowerCase() === e.institution!.toLowerCase())
              ? e.institution
              : undefined;
          children.push(
            new Paragraph({
              spacing: { after: 40, line: s.line },
              children: [
                new TextRun({
                  text: title,
                  bold: true,
                  size: s.body,
                  font: "Calibri",
                }),
                ...(dates
                  ? [
                      new TextRun({ text: "    ", size: s.body, font: "Calibri" }),
                      new TextRun({
                        text: dates,
                        italics: true,
                        size: s.small,
                        font: "Calibri",
                        color: "555555",
                      }),
                    ]
                  : []),
              ],
            }),
          );
          if (institution) children.push(p(institution, { after: 40 }));
          if (e.grade) children.push(p(`Grade: ${e.grade}`, { size: s.small }));
        }
        break;
      case "skills":
        children.push(heading("Skills"), p(data.skills.join(" · ")));
        break;
      case "languages":
        children.push(
          heading("Languages"),
          p(
            data.languages
              .map((l) => `${l.name}${l.proficiency ? ` (${l.proficiency})` : ""}`)
              .join(" · "),
          ),
        );
        break;
      case "certifications":
        children.push(heading("Certifications"));
        for (const c of data.certifications) {
          children.push(
            p(
              `${c.title}${c.details ? ` — ${c.details}` : ""}${c.date ? ` (${c.date})` : ""}`,
            ),
          );
        }
        break;
      case "courses":
        children.push(heading("Courses"));
        for (const c of data.courses) children.push(p(c.title));
        break;
      case "projects":
        children.push(heading("Projects"));
        for (const c of data.projects) {
          children.push(
            new Paragraph({
              spacing: { after: 40, line: s.line },
              children: [
                new TextRun({ text: c.title, bold: true, size: s.body, font: "Calibri" }),
                ...(c.date
                  ? [
                      new TextRun({ text: "    ", size: s.body, font: "Calibri" }),
                      new TextRun({
                        text: c.date,
                        italics: true,
                        size: s.small,
                        font: "Calibri",
                        color: "555555",
                      }),
                    ]
                  : []),
              ],
            }),
          );
          if (c.details) {
            children.push(p(c.details, { after: Math.round(s.after * 1.1) }));
          } else {
            children.push(
              new Paragraph({
                spacing: { after: Math.round(s.after * 0.8) },
                children: [],
              }),
            );
          }
        }
        break;
      case "achievements":
        children.push(heading("Key Strengths"));
        for (const c of data.achievements) {
          children.push(
            new Paragraph({
              spacing: { after: Math.round(s.after * 0.55), line: s.line },
              indent: { left: 360 },
              children: [new TextRun({ text: `• ${c.title}`, size: s.body, font: "Calibri" })],
            }),
          );
        }
        break;
      case "awards":
        children.push(heading("Awards"));
        for (const c of data.awards) children.push(p(c.title));
        break;
      case "references":
        children.push(heading("References"));
        for (const r of data.references) {
          children.push(p(r.name, { bold: true, after: 40 }));
          children.push(
            p([r.relationship, r.organization, r.phone, r.email].filter(Boolean).join(" · "), {
              size: s.small,
            }),
          );
        }
        break;
      case "additional":
        children.push(heading("Additional Information"), p(data.additionalInformation || ""));
        break;
      case "interests":
        children.push(heading("Interests"), p(data.interests.join(" · ")));
        break;
      case "volunteer":
        children.push(heading("Volunteer Experience"));
        for (const e of data.volunteerExperience) {
          children.push(
            p(`${e.title || "Volunteer"}${e.company ? ` — ${e.company}` : ""}`, { bold: true }),
          );
        }
        break;
    }
  }

  // When content is thin, add breathing room at end so page doesn't look cut short
  if (density === "spacious") {
    for (let i = 0; i < 3; i++) {
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: " ", size: s.body, font: "Calibri" })],
        }),
      );
    }
  }

  const m = data.metadata.margins;
  const margin =
    data.metadata.marginsLocked && m
      ? {
          top: mmToTwips(m.top),
          bottom: mmToTwips(m.bottom),
          left: mmToTwips(m.left),
          right: mmToTwips(m.right),
        }
      : (() => {
          const twips =
            density === "spacious" ? 720 : density === "comfortable" ? 650 : 540;
          return { top: twips, bottom: twips, left: twips, right: twips };
        })();

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin,
          },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
