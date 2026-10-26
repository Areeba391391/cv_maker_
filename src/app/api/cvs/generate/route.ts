import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireEmployee } from "@/lib/auth/ensure-employee";
import { getWriteClient } from "@/lib/supabase/write";
import { runCvPipeline, SourceInput } from "@/lib/ai/pipeline";
import { extractTextFromDocument } from "@/lib/documents/parse";
import { extractTextFromImage } from "@/lib/ocr/tesseract";
import { transcribeAudio } from "@/lib/speech/whisper";
import { validateUpload } from "@/lib/files/validate";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const MetaSchema = z.object({
  targetPosition: z.string().min(1),
  text: z.string().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  education: z.string().optional(),
  experience: z.string().optional(),
  educationJson: z.string().optional(),
  experienceJson: z.string().optional(),
  certificationsJson: z.string().optional(),
  projectsJson: z.string().optional(),
  referencesJson: z.string().optional(),
  customerId: z.string().uuid().optional().or(z.literal("")).transform((v) => v || undefined),
  photoUrl: z
    .string()
    .url()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

function parseJsonArray<T>(raw?: string): T[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function buildCustomerNotes(
  meta: z.infer<typeof MetaSchema>,
  educationEntries: Array<Record<string, string>>,
  experienceEntries: Array<Record<string, string>>,
  certificationEntries: Array<Record<string, string>>,
  projectEntries: Array<Record<string, string>>,
  referenceEntries: Array<Record<string, string>>,
): string {
  const lines: string[] = [];
  if (meta.fullName?.trim()) lines.push(`Name: ${meta.fullName.trim()}`);
  if (meta.phone?.trim()) lines.push(`Phone: ${meta.phone.trim()}`);
  if (meta.email?.trim()) lines.push(`Email: ${meta.email.trim()}`);
  if (meta.city?.trim()) lines.push(`City: ${meta.city.trim()}`);

  educationEntries.forEach((e, i) => {
    const bits = [e.degree, e.field, e.institution, e.startDate, e.endDate, e.grade]
      .map((x) => x?.trim())
      .filter(Boolean);
    if (bits.length) lines.push(`Education ${i + 1}: ${bits.join(" | ")}`);
  });
  if (!educationEntries.length && meta.education?.trim()) {
    lines.push(`Education: ${meta.education.trim()}`);
  }

  experienceEntries.forEach((e, i) => {
    const bits = [e.title, e.company, e.location, e.startDate, e.endDate, e.duties]
      .map((x) => x?.trim())
      .filter(Boolean);
    if (bits.length) lines.push(`Experience ${i + 1}: ${bits.join(" | ")}`);
  });
  if (!experienceEntries.length && meta.experience?.trim()) {
    lines.push(`Experience: ${meta.experience.trim()}`);
  }

  certificationEntries.forEach((c, i) => {
    const bits = [c.title, c.details, c.date].map((x) => x?.trim()).filter(Boolean);
    if (bits.length) lines.push(`Certification ${i + 1}: ${bits.join(" | ")}`);
  });

  projectEntries.forEach((p, i) => {
    const bits = [p.title, p.details, p.date].map((x) => x?.trim()).filter(Boolean);
    if (bits.length) lines.push(`Project ${i + 1}: ${bits.join(" | ")}`);
  });

  referenceEntries.forEach((r, i) => {
    const bits = [r.name, r.relationship, r.organization, r.phone, r.email]
      .map((x) => x?.trim())
      .filter(Boolean);
    if (bits.length) lines.push(`Reference ${i + 1}: ${bits.join(" | ")}`);
  });

  if (meta.text?.trim()) lines.push(meta.text.trim());
  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireEmployee();
    if ("error" in auth && auth.error) return auth.error;
    const { supabase, employee } = auth as Awaited<ReturnType<typeof requireEmployee>> & {
      supabase: Awaited<ReturnType<typeof createClient>>;
      employee: { id: string; shop_id: string };
    };

    const { client: db } = getWriteClient(supabase);

    const form = await request.formData();
    const meta = MetaSchema.parse({
      targetPosition: String(form.get("targetPosition") || ""),
      text: form.get("text") ? String(form.get("text")) : undefined,
      fullName: form.get("fullName") ? String(form.get("fullName")) : undefined,
      phone: form.get("phone") ? String(form.get("phone")) : undefined,
      email: form.get("email") ? String(form.get("email")) : undefined,
      city: form.get("city") ? String(form.get("city")) : undefined,
      education: form.get("education") ? String(form.get("education")) : undefined,
      experience: form.get("experience") ? String(form.get("experience")) : undefined,
      educationJson: form.get("educationJson") ? String(form.get("educationJson")) : undefined,
      experienceJson: form.get("experienceJson") ? String(form.get("experienceJson")) : undefined,
      certificationsJson: form.get("certificationsJson")
        ? String(form.get("certificationsJson"))
        : undefined,
      projectsJson: form.get("projectsJson") ? String(form.get("projectsJson")) : undefined,
      referencesJson: form.get("referencesJson") ? String(form.get("referencesJson")) : undefined,
      customerId: form.get("customerId") ? String(form.get("customerId")) : undefined,
      photoUrl: form.get("photoUrl") ? String(form.get("photoUrl")) : null,
    });

    const educationEntries = parseJsonArray<Record<string, string>>(meta.educationJson);
    const experienceEntries = parseJsonArray<Record<string, string>>(meta.experienceJson);
    const certificationEntries = parseJsonArray<Record<string, string>>(meta.certificationsJson);
    const projectEntries = parseJsonArray<Record<string, string>>(meta.projectsJson);
    const referenceEntries = parseJsonArray<Record<string, string>>(meta.referencesJson);
    const skillsFromForm = (() => {
      const raw = form.get("skillsJson");
      if (!raw || typeof raw !== "string") return [] as string[];
      try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed)
          ? parsed.map((s) => String(s || "").trim()).filter(Boolean)
          : [];
      } catch {
        return [];
      }
    })();

    const sources: SourceInput[] = [];
    const stages: string[] = ["Reading customer information..."];

    const notes = buildCustomerNotes(
      meta,
      educationEntries,
      experienceEntries,
      certificationEntries,
      projectEntries,
      referenceEntries,
    );
    if (notes.trim()) {
      sources.push({ type: "text", text: notes, label: "Customer details" });
    }

    const seed = {
      fullName: meta.fullName?.trim() || undefined,
      phone: meta.phone?.trim() || undefined,
      email: meta.email?.trim() || undefined,
      city: meta.city?.trim() || undefined,
      education: meta.education?.trim() || undefined,
      experience: meta.experience?.trim() || undefined,
      educationEntries: educationEntries.map((e) => ({
        degree: e.degree,
        institution: e.institution,
        field: e.field,
        startDate: e.startDate,
        endDate: e.endDate,
        grade: e.grade,
      })),
      experienceEntries: experienceEntries.map((e) => ({
        title: e.title,
        company: e.company,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        responsibilities: (e.duties || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      })),
      certificationEntries: certificationEntries
        .filter((c) => c.title?.trim())
        .map((c) => ({
          title: c.title,
          details: c.details,
          date: c.date,
        })),
      projectEntries: projectEntries
        .filter((p) => p.title?.trim())
        .map((p) => ({
          title: p.title,
          details: p.details,
          date: p.date,
        })),
      referenceEntries: referenceEntries
        .filter((r) => r.name?.trim())
        .map((r) => ({
          name: r.name,
          relationship: r.relationship,
          organization: r.organization,
          phone: r.phone,
          email: r.email,
        })),
      skills: skillsFromForm.length ? skillsFromForm : undefined,
    };

    const requestStarted = Date.now();

    // Attachments: never run Whisper + OCR at the same time (OOM). PDF/DOCX text can parallelize.
    const voiceFiles = (form.getAll("voice") as File[]).filter((f) => f && typeof f !== "string");
    const imageFiles = (form.getAll("image") as File[]).filter((f) => f && typeof f !== "string");
    const cvFiles = (form.getAll("cvFile") as File[]).filter((f) => f && typeof f !== "string");
    const hasHeavyAttachments =
      voiceFiles.length > 0 || imageFiles.length > 0 || cvFiles.length > 0;

    // Profile photo — never fail the whole CV; soft-fail so typed path stays instant
    const photo = form.get("photo") as File | null;
    const photoPromise = (async (): Promise<string | null> => {
      if (!photo || typeof photo === "string" || photo.size <= 0) return meta.photoUrl || null;
      const validation = await validateUpload(photo, photo.name, "photo");
      if (!validation.ok) return meta.photoUrl || null;
      const buffer = Buffer.from(await photo.arrayBuffer());
      const path = `${employee.shop_id}/photos/${Date.now()}_${photo.name}`;
      const { error: uploadError } = await supabase.storage.from("cv-files").upload(path, buffer, {
        contentType: photo.type,
        upsert: false,
      });
      if (uploadError) return meta.photoUrl || null;
      const { data: signed } = await supabase.storage
        .from("cv-files")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      return signed?.signedUrl || null;
    })();

    let result: Awaited<ReturnType<typeof runCvPipeline>>;

    if (!hasHeavyAttachments) {
      // INSTANT: typed form only — skip Whisper/OCR entirely
      stages.push("Building CV instantly...");
      const [pipelineResult, photoUrl] = await Promise.all([
        runCvPipeline({
          targetPosition: meta.targetPosition,
          sources,
          photoUrl: null,
          seed,
        }),
        photoPromise,
      ]);
      result = pipelineResult;
      if (photoUrl) result.cv.photoUrl = photoUrl;
    } else {
      // Heavy path: docs (parallel) → voice → images (sequential for RAM)
      const docCvFiles: File[] = [];
      const imageCvFiles: File[] = [];
      for (const file of cvFiles) {
        const validation = await validateUpload(file, file.name, "cv_file");
        if (!validation.ok) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        const kind = validation.kind!;
        if (kind === "pdf" || kind === "doc" || kind === "docx") {
          docCvFiles.push(file);
        } else {
          imageCvFiles.push(file);
        }
      }

      if (docCvFiles.length) {
        stages.push("Reading existing CV...");
        try {
          const parsed = await Promise.all(
            docCvFiles.map(async (file) => {
              const validation = await validateUpload(file, file.name, "cv_file");
              const kind = validation.kind as "pdf" | "doc" | "docx";
              const buffer = Buffer.from(await file.arrayBuffer());
              const text = await extractTextFromDocument(buffer, kind);
              const path = `${employee.shop_id}/cvs/${Date.now()}_${file.name}`;
              void supabase.storage.from("cv-files").upload(path, buffer, {
                contentType: file.type,
                upsert: false,
              });
              return { type: kind as SourceInput["type"], text, label: file.name };
            }),
          );
          for (const item of parsed) {
            if (item.text) sources.push(item);
          }
        } catch (error) {
          return NextResponse.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Could not read the CV file. Type details instead.",
            },
            { status: 400 },
          );
        }
      }

      for (const file of voiceFiles) {
        stages.push("Processing voice...");
        const validation = await validateUpload(file, file.name, "voice");
        if (!validation.ok) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const transcript = await transcribeAudio(buffer, file.type);
          sources.push({ type: "voice", text: transcript, label: file.name });
          const path = `${employee.shop_id}/voice/${Date.now()}_${file.name}`;
          void supabase.storage.from("cv-files").upload(path, buffer, {
            contentType: file.type,
            upsert: false,
          });
        } catch (error) {
          return NextResponse.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Voice failed. Remove the voice file and type notes instead.",
            },
            { status: 400 },
          );
        }
      }

      for (const file of [...imageFiles, ...imageCvFiles]) {
        stages.push(imageCvFiles.includes(file) ? "Reading existing CV..." : "Reading image...");
        const slot = imageCvFiles.includes(file) ? "cv_file" : "image";
        const validation = await validateUpload(file, file.name, slot);
        if (!validation.ok) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const ocr = await extractTextFromImage(buffer);
          const note =
            ocr.confidence < 60
              ? `\n[OCR confidence low (${Math.round(ocr.confidence)}%). Please verify.]`
              : "";
          sources.push({
            type: slot === "cv_file" ? "cv_image" : "image",
            text: ocr.text + note,
            label: file.name,
          });
          const folder = slot === "cv_file" ? "cvs" : "images";
          const path = `${employee.shop_id}/${folder}/${Date.now()}_${file.name}`;
          void supabase.storage.from("cv-files").upload(path, buffer, {
            contentType: file.type,
            upsert: false,
          });
        } catch (error) {
          return NextResponse.json(
            {
              error:
                error instanceof Error
                  ? error.message
                  : "Image read failed. Type the details instead.",
            },
            { status: 400 },
          );
        }
      }

      const photoUrl = await photoPromise;
      stages.push("Building CV...", "Preparing document...");
      result = await runCvPipeline({
        targetPosition: meta.targetPosition,
        sources,
        photoUrl,
        seed,
      });
    }

    const requestedTemplate = String(form.get("templateId") || "").trim();
    if (requestedTemplate === "ats") {
      result.cv = {
        ...result.cv,
        metadata: { ...result.cv.metadata, templateId: "ats" },
      };
    }

    const fullName = result.cv.personal.fullName || null;
    const phone = result.cv.personal.phone || null;
    const email = result.cv.personal.email || null;
    let customerId = meta.customerId;

    // Prefer security-definer RPC (works without service role key)
    const { data: saved, error: saveError } = await supabase.rpc("save_generated_cv", {
      p_shop_id: employee.shop_id,
      p_target_position: meta.targetPosition,
      p_template_id: result.cv.metadata.templateId || "professional",
      p_cv_data: result.cv,
      p_customer_id: customerId || null,
      p_full_name: fullName,
      p_phone: phone,
      p_email: email,
      p_city: result.cv.personal.city || null,
    });

    const elapsedMs = Date.now() - requestStarted;
    if (!saveError && saved) {
      const payload = saved as Record<string, unknown>;
      const savedCvId = String(payload.cvId || payload.cvid || "");
      const savedCustomerId = String(payload.customerId || payload.customerid || "");
      if (savedCvId) {
        return NextResponse.json({
          cvId: savedCvId,
          customerId: savedCustomerId || undefined,
          cv: result.cv,
          stages,
          mode: result.mode || (hasHeavyAttachments ? "ai" : "instant"),
          elapsedMs,
        });
      }
    }

    // Fallback: direct table writes (service role if available)
    if (!customerId) {
      const { data: customer, error: customerError } = await db
        .from("customers")
        .insert({
          shop_id: employee.shop_id,
          full_name: fullName,
          phone,
          email,
          city: result.cv.personal.city || null,
          created_by: employee.id,
        })
        .select("id")
        .single();
      if (customerError) {
        return NextResponse.json(
          {
            error: "Could not save customer record. Please try again.",
            code: customerError.code,
          },
          { status: 500 },
        );
      }
      customerId = customer.id;
    } else {
      const { error: updateError } = await db
        .from("customers")
        .update({
          full_name: fullName,
          phone,
          email,
          city: result.cv.personal.city || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId)
        .eq("shop_id", employee.shop_id);
      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update customer: ${updateError.message}` },
          { status: 500 },
        );
      }
    }

    const { data: cvRow, error: cvError } = await db
      .from("cvs")
      .insert({
        shop_id: employee.shop_id,
        customer_id: customerId,
        target_position: meta.targetPosition,
        template_id: result.cv.metadata.templateId || "professional",
        current_data: result.cv,
        status: "ready",
        created_by: employee.id,
      })
      .select("id")
      .single();

    if (cvError || !cvRow) {
      return NextResponse.json(
        { error: `Failed to save CV: ${cvError?.message || "unknown error"}` },
        { status: 500 },
      );
    }

    const { error: versionError } = await db.from("cv_versions").insert({
      cv_id: cvRow.id,
      shop_id: employee.shop_id,
      version_number: 1,
      data: result.cv,
      template_id: result.cv.metadata.templateId || "professional",
      notes: "Initial generation",
      created_by: employee.id,
    });

    if (versionError) {
      console.error("cv_versions insert failed", versionError.message);
    }

    return NextResponse.json({
      cvId: cvRow.id,
      customerId,
      cv: result.cv,
      stages,
      mode: result.mode || (hasHeavyAttachments ? "ai" : "instant"),
      elapsedMs: Date.now() - requestStarted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
