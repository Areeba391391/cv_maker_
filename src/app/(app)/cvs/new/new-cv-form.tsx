"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileAudio,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UserCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TARGET_POSITIONS } from "@/lib/cv/positions";
import { buildInstantCv, canUseInstantPath } from "@/lib/cv/instant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  SectionBadge,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createId } from "@/lib/utils";

const STAGE_MESSAGES = [
  "Building CV…",
  "Saving…",
  "Almost ready…",
];

const EDU_PRESETS = ["Matric", "Intermediate", "Bachelor", "Master", "Diploma", "Certificate"];

type FileSlot = { id: string; file: File };

type EduRow = {
  id: string;
  degree: string;
  field: string;
  institution: string;
  startDate: string;
  endDate: string;
  grade: string;
};

type ExpRow = {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  duties: string;
};

type CertRow = {
  id: string;
  title: string;
  details: string;
  date: string;
};

type ProjectRow = {
  id: string;
  title: string;
  details: string;
  date: string;
};

type RefRow = {
  id: string;
  name: string;
  relationship: string;
  organization: string;
  phone: string;
  email: string;
};

function emptyEdu(degree = ""): EduRow {
  return {
    id: createId("edu"),
    degree,
    field: "",
    institution: "",
    startDate: "",
    endDate: "",
    grade: "",
  };
}

function emptyExp(): ExpRow {
  return {
    id: createId("exp"),
    title: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    duties: "",
  };
}

function emptyCert(): CertRow {
  return { id: createId("cert"), title: "", details: "", date: "" };
}

function emptyProject(): ProjectRow {
  return { id: createId("proj"), title: "", details: "", date: "" };
}

function emptyRef(): RefRow {
  return {
    id: createId("ref"),
    name: "",
    relationship: "",
    organization: "",
    phone: "",
    email: "",
  };
}

export default function NewCvPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId") || undefined;

  const [targetPosition, setTargetPosition] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [educationRows, setEducationRows] = useState<EduRow[]>([]);
  const [experienceRows, setExperienceRows] = useState<ExpRow[]>([]);
  const [certRows, setCertRows] = useState<CertRow[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [refRows, setRefRows] = useState<RefRow[]>([]);
  const [extraNotes, setExtraNotes] = useState("");
  const [showExtra, setShowExtra] = useState(false);

  const [voices, setVoices] = useState<FileSlot[]>([]);
  const [images, setImages] = useState<FileSlot[]>([]);
  const [cvFiles, setCvFiles] = useState<FileSlot[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [serverStages, setServerStages] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const [linkedinText, setLinkedinText] = useState("");
  const [linkedinPdf, setLinkedinPdf] = useState<File | null>(null);
  const [linkedinImporting, setLinkedinImporting] = useState(false);
  const [preferAts, setPreferAts] = useState(false);
  const [linkedinNotes, setLinkedinNotes] = useState<string[]>([]);
  const [importedSkills, setImportedSkills] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    // Warm Ollama + whisper so first Generate is fast
    void fetch("/api/ai/status?warm=1").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    const started = Date.now();
    const tick = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => clearInterval(tick);
  }, [loading]);

  const stageLabel = useMemo(() => {
    if (serverStages.length) return serverStages[Math.min(stageIndex, serverStages.length - 1)];
    return STAGE_MESSAGES[Math.min(stageIndex, STAGE_MESSAGES.length - 1)];
  }, [serverStages, stageIndex]);

  function addFiles(
    files: FileList | null,
    setter: React.Dispatch<React.SetStateAction<FileSlot[]>>,
  ) {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => ({
      id: `${file.name}_${file.size}_${Math.random().toString(36).slice(2, 7)}`,
      file,
    }));
    setter((prev) => [...prev, ...next]);
  }

  function hasFilledEducation() {
    return educationRows.some(
      (e) => e.degree.trim() || e.institution.trim() || e.field.trim(),
    );
  }

  function hasFilledExperience() {
    return experienceRows.some(
      (e) => e.title.trim() || e.company.trim() || e.duties.trim(),
    );
  }

  function hasFilledCerts() {
    return certRows.some((c) => c.title.trim());
  }

  const isInstantPath =
    Boolean(fullName.trim() || phone.trim()) &&
    (hasFilledEducation() || hasFilledExperience() || hasFilledCerts()) &&
    voices.length + images.length + cvFiles.length === 0;

  function hasFilledProjects() {
    return projectRows.some((p) => p.title.trim());
  }

  function hasFilledRefs() {
    return refRows.some((r) => r.name.trim());
  }

  function hasAnyCustomerInfo() {
    return Boolean(
      fullName.trim() ||
        phone.trim() ||
        email.trim() ||
        city.trim() ||
        hasFilledEducation() ||
        hasFilledExperience() ||
        hasFilledCerts() ||
        hasFilledProjects() ||
        hasFilledRefs() ||
        extraNotes.trim() ||
        voices.length ||
        images.length ||
        cvFiles.length,
    );
  }

  async function importLinkedIn() {
    if (!linkedinText.trim() && !linkedinPdf) {
      toast.error("Paste LinkedIn text or upload a Save-to-PDF export");
      return;
    }
    setLinkedinImporting(true);
    setLinkedinNotes([]);
    try {
      const form = new FormData();
      if (linkedinText.trim()) form.set("text", linkedinText.trim());
      if (linkedinPdf) form.set("file", linkedinPdf);

      const res = await fetch("/api/linkedin/import", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(45_000),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        seed?: {
          fullName?: string;
          phone?: string;
          email?: string;
          city?: string;
          headline?: string;
          about?: string;
          experienceEntries?: Array<{
            title: string;
            company: string;
            location: string;
            startDate: string;
            endDate: string;
            duties: string;
          }>;
          educationEntries?: Array<{
            degree: string;
            field: string;
            institution: string;
            startDate: string;
            endDate: string;
            grade: string;
          }>;
          skills?: string[];
        };
        notes?: string[];
        targetHint?: string;
        preferTemplate?: string;
      };
      if (!res.ok) throw new Error(data.error || "Import failed");
      const seed = data.seed;
      if (!seed) throw new Error("No data returned from import");

      if (seed.fullName) setFullName(seed.fullName);
      if (seed.phone) setPhone(seed.phone);
      if (seed.email) setEmail(seed.email);
      if (seed.city) setCity(seed.city);
      if (data.targetHint && !targetPosition.trim()) {
        setTargetPosition(data.targetHint);
      }

      if (seed.educationEntries?.length) {
        setEducationRows(
          seed.educationEntries.map((e) => ({
            id: createId("edu"),
            degree: e.degree || "",
            field: e.field || "",
            institution: e.institution || "",
            startDate: e.startDate || "",
            endDate: e.endDate || "",
            grade: e.grade || "",
          })),
        );
      }
      if (seed.experienceEntries?.length) {
        setExperienceRows(
          seed.experienceEntries.map((e) => ({
            id: createId("exp"),
            title: e.title || "",
            company: e.company || "",
            location: e.location || "",
            startDate: e.startDate || "",
            endDate: e.endDate || "",
            duties: e.duties || "",
          })),
        );
      }

      if (seed.skills?.length) setImportedSkills(seed.skills);

      const noteParts: string[] = [];
      if (seed.about) noteParts.push(seed.about);
      if (noteParts.length) {
        setExtraNotes((prev) => [prev, ...noteParts].filter(Boolean).join("\n\n"));
        setShowExtra(true);
      }

      if (data.preferTemplate === "ats") setPreferAts(true);
      setLinkedinNotes(Array.isArray(data.notes) ? data.notes : []);
      toast.success("LinkedIn data filled — review, then Generate");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "LinkedIn import failed");
    } finally {
      setLinkedinImporting(false);
    }
  }

  async function generate() {
    if (!targetPosition.trim()) {
      toast.error("Enter the target job title");
      return;
    }
    if (!hasAnyCustomerInfo()) {
      toast.error("Add at least a name, phone, city, or an attachment");
      return;
    }

    setLoading(true);
    setStageIndex(0);
    setServerStages([]);
    const timer = setInterval(() => {
      setStageIndex((i) => i + 1);
    }, 700);

    const eduPayload = educationRows
      .filter((e) => e.degree.trim() || e.institution.trim() || e.field.trim())
      .map(({ degree, field, institution, startDate, endDate, grade }) => ({
        degree,
        field,
        institution,
        startDate,
        endDate,
        grade,
      }));
    const expPayload = experienceRows
      .filter((e) => e.title.trim() || e.company.trim() || e.duties.trim())
      .map(({ title, company, location, startDate, endDate, duties }) => ({
        title,
        company,
        location,
        startDate,
        endDate,
        duties,
      }));
    const certPayload = certRows
      .filter((c) => c.title.trim())
      .map(({ title, details, date }) => ({ title, details, date }));
    const projectPayload = projectRows
      .filter((p) => p.title.trim())
      .map(({ title, details, date }) => ({ title, details, date }));
    const refPayload = refRows
      .filter((r) => r.name.trim())
      .map(({ name, relationship, organization, phone, email }) => ({
        name,
        relationship,
        organization,
        phone,
        email,
      }));

    try {
      const useInstant = canUseInstantPath({
        hasVoice: voices.length > 0,
        hasImages: images.length > 0,
        hasCvFiles: cvFiles.length > 0,
      });

      // Browser builds the CV → one JSON save. Fastest path (usually <2s).
      if (useInstant) {
        const cv = buildInstantCv({
          targetPosition: targetPosition.trim(),
          seed: {
            fullName: fullName.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            city: city.trim() || undefined,
            educationEntries: eduPayload,
            experienceEntries: expPayload.map((e) => ({
              title: e.title,
              company: e.company,
              location: e.location,
              startDate: e.startDate,
              endDate: e.endDate,
              responsibilities: e.duties
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            })),
            certificationEntries: certPayload,
            projectEntries: projectPayload,
            referenceEntries: refPayload,
            skills: importedSkills.length ? importedSkills : undefined,
          },
          notes: extraNotes.trim() || undefined,
          templateId: preferAts ? "ats" : undefined,
        });

        const res = await fetch("/api/cvs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: cv, customerId: customerId || undefined }),
          signal: AbortSignal.timeout(15_000),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          cvId?: string;
          mode?: string;
          elapsedMs?: number;
        };
        if (!res.ok) throw new Error(data.error || "Generation failed");
        if (!data.cvId) throw new Error("CV was generated but no ID was returned. Please try again.");

        const secs =
          typeof data.elapsedMs === "number" ? (data.elapsedMs / 1000).toFixed(1) : null;
        toast.success(secs ? `CV ready in ${secs}s (instant)` : "CV ready (instant)");
        if (photo) {
          toast.message("Add the photo in the editor — keeps generate ultra-fast.");
        }
        router.push(`/cvs/${data.cvId}`);
        return;
      }

      // Heavy path: voice / OCR / old CV file
      const form = new FormData();
      form.set("targetPosition", targetPosition.trim());
      if (customerId) form.set("customerId", customerId);
      if (fullName.trim()) form.set("fullName", fullName.trim());
      if (phone.trim()) form.set("phone", phone.trim());
      if (email.trim()) form.set("email", email.trim());
      if (city.trim()) form.set("city", city.trim());
      if (extraNotes.trim()) form.set("text", extraNotes.trim());
      if (eduPayload.length) form.set("educationJson", JSON.stringify(eduPayload));
      if (expPayload.length) form.set("experienceJson", JSON.stringify(expPayload));
      if (certPayload.length) form.set("certificationsJson", JSON.stringify(certPayload));
      if (projectPayload.length) form.set("projectsJson", JSON.stringify(projectPayload));
      if (refPayload.length) form.set("referencesJson", JSON.stringify(refPayload));
      if (preferAts) form.set("templateId", "ats");
      if (importedSkills.length) form.set("skillsJson", JSON.stringify(importedSkills));
      voices.forEach((v) => form.append("voice", v.file));
      images.forEach((v) => form.append("image", v.file));
      cvFiles.forEach((v) => form.append("cvFile", v.file));
      if (photo) form.append("photo", photo);

      const res = await fetch("/api/cvs/generate", {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(90_000),
      });
      const raw = await res.text();
      let data: {
        error?: string;
        cvId?: string;
        stages?: string[];
        mode?: string;
        elapsedMs?: number;
      } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        throw new Error(
          res.ok
            ? "Unexpected server response. Please try again."
            : `Generation failed (${res.status}). Please try again.`,
        );
      }
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (!data.cvId) throw new Error("CV was generated but no ID was returned. Please try again.");

      if (Array.isArray(data.stages)) setServerStages(data.stages);
      const secs =
        typeof data.elapsedMs === "number" ? (data.elapsedMs / 1000).toFixed(1) : null;
      toast.success(secs ? `CV ready in ${secs}s` : "CV generated");
      router.push(`/cvs/${data.cvId}`);
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const msg = error instanceof Error ? error.message : "Generation failed";
      if (name === "TimeoutError" || name === "AbortError" || /aborted|timeout/i.test(msg)) {
        toast.error("Took too long. Remove voice/images and try with typed fields — it is much faster.");
      } else {
        toast.error(msg);
      }
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }

  if (!mounted) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-2">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-stone-100" />
        <div className="h-56 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-28">
      <PageHeader
        eyebrow="Fast desk · ~10 second CVs"
        title="New CV"
        description="1) Job title → 2) Name & phone → 3) Education or experience → 4) Generate. Typed path is instant; voice/photos are optional extras."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            <SectionBadge n="01" />
            Target position
          </CardTitle>
          <CardDescription>Required for generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            list="positions"
            placeholder="e.g. Salesman"
            value={targetPosition}
            onChange={(e) => setTargetPosition(e.target.value)}
          />
          <datalist id="positions">
            {TARGET_POSITIONS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <div className="flex flex-wrap gap-1.5">
            {TARGET_POSITIONS.slice(0, 8).map((p) => (
              <button
                key={p}
                type="button"
                suppressHydrationWarning
                onClick={() => setTargetPosition(p)}
                className={`ui-chip ${targetPosition === p ? "ui-chip-active" : ""}`}
              >
                {p}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--cobalt)]/20 bg-[var(--mist)]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-[var(--cobalt)]" />
            Import from LinkedIn
          </CardTitle>
          <CardDescription>
            Paste profile text (About / Experience) or upload LinkedIn&apos;s{" "}
            <strong>Save to PDF</strong> export. We do not scrape live profile URLs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="linkedinText">Paste LinkedIn text</Label>
            <Textarea
              id="linkedinText"
              rows={5}
              placeholder="Paste About, Experience, Education, Skills from LinkedIn…"
              value={linkedinText}
              onChange={(e) => setLinkedinText(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkedinPdf">Or upload Save-to-PDF</Label>
            <Input
              id="linkedinPdf"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setLinkedinPdf(e.target.files?.[0] || null)}
            />
            {linkedinPdf ? (
              <p className="text-xs text-stone-500">{linkedinPdf.name}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => void importLinkedIn()}
              disabled={linkedinImporting}
            >
              {linkedinImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Fill form from LinkedIn
            </Button>
            {preferAts ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                ATS template will be selected
              </span>
            ) : null}
          </div>
          {linkedinNotes.length ? (
            <ul className="space-y-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
              {linkedinNotes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <SectionBadge n="02" />
            Customer details
          </CardTitle>
          <CardDescription>Contact information provided by the customer</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              placeholder="Full legal name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              placeholder="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="city">City / Address</Label>
            <Input
              id="city"
              placeholder="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Education multi */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>
              <SectionBadge n="03" />
              Education
            </CardTitle>
            <CardDescription>Add each qualification separately</CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setEducationRows((r) => [...r, emptyEdu()])}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {EDU_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                suppressHydrationWarning
                onClick={() => setEducationRows((r) => [...r, emptyEdu(preset)])}
                className="ui-chip"
              >
                + {preset}
              </button>
            ))}
          </div>

          {educationRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-3 py-5 text-center text-sm text-stone-500">
              No education added yet
            </p>
          ) : null}

          {educationRows.map((row, idx) => (
            <div key={row.id} className="entry-block space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                  Education {idx + 1}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-red-600"
                  onClick={() => setEducationRows((r) => r.filter((x) => x.id !== row.id))}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
              <Input
                placeholder="Degree — Matric / Intermediate / B.Com"
                value={row.degree}
                onChange={(e) =>
                  setEducationRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, degree: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Field / subject (optional)"
                value={row.field}
                onChange={(e) =>
                  setEducationRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, field: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="School / College / University"
                value={row.institution}
                onChange={(e) =>
                  setEducationRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, institution: e.target.value } : x)),
                  )
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="From year"
                  value={row.startDate}
                  onChange={(e) =>
                    setEducationRows((r) =>
                      r.map((x) => (x.id === row.id ? { ...x, startDate: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  placeholder="To year / Passed"
                  value={row.endDate}
                  onChange={(e) =>
                    setEducationRows((r) =>
                      r.map((x) => (x.id === row.id ? { ...x, endDate: e.target.value } : x)),
                    )
                  }
                />
              </div>
              <Input
                placeholder="Grade / marks (optional)"
                value={row.grade}
                onChange={(e) =>
                  setEducationRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, grade: e.target.value } : x)),
                  )
                }
              />
            </div>
          ))}

          {educationRows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setEducationRows((r) => [...r, emptyEdu()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add more education
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Experience multi */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>
              <SectionBadge n="04" />
              Work experience
            </CardTitle>
            <CardDescription>Add each role separately</CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setExperienceRows((r) => [...r, emptyExp()])}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {experienceRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-3 py-5 text-center text-sm text-stone-500">
              No experience added yet
            </p>
          ) : null}

          {experienceRows.map((row, idx) => (
            <div key={row.id} className="entry-block space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                  Job {idx + 1}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-red-600"
                  onClick={() => setExperienceRows((r) => r.filter((x) => x.id !== row.id))}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
              <Input
                placeholder="Job title — e.g. Salesman"
                value={row.title}
                onChange={(e) =>
                  setExperienceRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, title: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Company / shop name"
                value={row.company}
                onChange={(e) =>
                  setExperienceRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, company: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="City / location (optional)"
                value={row.location}
                onChange={(e) =>
                  setExperienceRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, location: e.target.value } : x)),
                  )
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="From — e.g. 2020"
                  value={row.startDate}
                  onChange={(e) =>
                    setExperienceRows((r) =>
                      r.map((x) => (x.id === row.id ? { ...x, startDate: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  placeholder="To — e.g. 2023 / Present"
                  value={row.endDate}
                  onChange={(e) =>
                    setExperienceRows((r) =>
                      r.map((x) => (x.id === row.id ? { ...x, endDate: e.target.value } : x)),
                    )
                  }
                />
              </div>
              <Textarea
                rows={3}
                placeholder={"One responsibility per line"}
                value={row.duties}
                onChange={(e) =>
                  setExperienceRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, duties: e.target.value } : x)),
                  )
                }
              />
            </div>
          ))}

          {experienceRows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setExperienceRows((r) => [...r, emptyExp()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add more experience
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Certifications multi */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>
              <SectionBadge n="05" />
              Certifications
            </CardTitle>
            <CardDescription>Add each certificate separately</CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setCertRows((r) => [...r, emptyCert()])}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {certRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-3 py-5 text-center text-sm text-stone-500">
              Optional — leave empty if none
            </p>
          ) : null}

          {certRows.map((row, idx) => (
            <div key={row.id} className="entry-block space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                  Certificate {idx + 1}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-red-600"
                  onClick={() => setCertRows((r) => r.filter((x) => x.id !== row.id))}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
              <Input
                placeholder="Certificate name — e.g. AutoCAD / IT course"
                value={row.title}
                onChange={(e) =>
                  setCertRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, title: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Institute / details (optional)"
                value={row.details}
                onChange={(e) =>
                  setCertRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, details: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Year / date (optional)"
                value={row.date}
                onChange={(e) =>
                  setCertRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, date: e.target.value } : x)),
                  )
                }
              />
            </div>
          ))}

          {certRows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setCertRows((r) => [...r, emptyCert()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add more certificates
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* Projects multi */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>
              <SectionBadge n="06" />
              Projects
            </CardTitle>
            <CardDescription>Optional project entries</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setProjectRows((r) => [...r, emptyProject()])}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {projectRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-3 py-5 text-center text-sm text-stone-500">
              Optional — leave empty if none
            </p>
          ) : null}

          {projectRows.map((row, idx) => (
            <div key={row.id} className="entry-block space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                  Project {idx + 1}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-red-600"
                  onClick={() => setProjectRows((r) => r.filter((x) => x.id !== row.id))}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
              <Input
                placeholder="Project name — e.g. Shop billing system"
                value={row.title}
                onChange={(e) =>
                  setProjectRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, title: e.target.value } : x)),
                  )
                }
              />
              <Textarea
                rows={2}
                placeholder="Brief description, tools, outcome"
                value={row.details}
                onChange={(e) =>
                  setProjectRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, details: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Year / date (optional)"
                value={row.date}
                onChange={(e) =>
                  setProjectRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, date: e.target.value } : x)),
                  )
                }
              />
            </div>
          ))}

          {projectRows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setProjectRows((r) => [...r, emptyProject()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add more projects
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* References multi */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>
              <SectionBadge n="07" />
              References
            </CardTitle>
            <CardDescription>Only add references the customer provided</CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setRefRows((r) => [...r, emptyRef()])}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {refRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-3 py-5 text-center text-sm text-stone-500">
              Optional — leave empty if none
            </p>
          ) : null}

          {refRows.map((row, idx) => (
            <div key={row.id} className="entry-block space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                  Reference {idx + 1}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-red-600"
                  onClick={() => setRefRows((r) => r.filter((x) => x.id !== row.id))}
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
              <Input
                placeholder="Full name — e.g. Ahmed Khan"
                value={row.name}
                onChange={(e) =>
                  setRefRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, name: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Relation — e.g. Previous manager / Teacher"
                value={row.relationship}
                onChange={(e) =>
                  setRefRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, relationship: e.target.value } : x)),
                  )
                }
              />
              <Input
                placeholder="Company / organization (optional)"
                value={row.organization}
                onChange={(e) =>
                  setRefRows((r) =>
                    r.map((x) => (x.id === row.id ? { ...x, organization: e.target.value } : x)),
                  )
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Phone"
                  value={row.phone}
                  onChange={(e) =>
                    setRefRows((r) =>
                      r.map((x) => (x.id === row.id ? { ...x, phone: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  placeholder="Email (optional)"
                  value={row.email}
                  onChange={(e) =>
                    setRefRows((r) =>
                      r.map((x) => (x.id === row.id ? { ...x, email: e.target.value } : x)),
                    )
                  }
                />
              </div>
            </div>
          ))}

          {refRows.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setRefRows((r) => [...r, emptyRef()])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add more references
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <SectionBadge n="08" />
            Attachments
          </CardTitle>
          <CardDescription>Notes, voice, images, photo, or an existing CV</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showExtra ? (
            <Button type="button" variant="outline" onClick={() => setShowExtra(true)}>
              <FileText className="h-4 w-4" />
              Add notes
            </Button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="extraNotes">Notes</Label>
                <button
                  type="button"
                  onClick={() => setShowExtra(false)}
                  className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Textarea
                id="extraNotes"
                rows={4}
                placeholder="Anything that does not fit the fields above"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <FileAdder
              label="Voice note"
              icon={<FileAudio className="h-4 w-4 text-[var(--cobalt)]" />}
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
              files={voices}
              onAdd={(list) => addFiles(list, setVoices)}
              onRemove={(id) => setVoices((v) => v.filter((f) => f.id !== id))}
            />
            <FileAdder
              label="Details image"
              icon={<ImageIcon className="h-4 w-4 text-[var(--cobalt)]" />}
              accept="image/*"
              files={images}
              onAdd={(list) => addFiles(list, setImages)}
              onRemove={(id) => setImages((v) => v.filter((f) => f.id !== id))}
            />
            <FileAdder
              label="Existing CV"
              icon={<Upload className="h-4 w-4 text-[var(--cobalt)]" />}
              accept=".pdf,.doc,.docx,image/*,.png,.jpg,.jpeg"
              files={cvFiles}
              onAdd={(list) => addFiles(list, setCvFiles)}
              onRemove={(id) => setCvFiles((v) => v.filter((f) => f.id !== id))}
            />
            <div className="space-y-2">
              <label className="flex h-full min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-3 py-3 text-sm text-stone-700 hover:border-[var(--cobalt)]/40 hover:bg-[var(--mist)]/40 active:scale-[0.995]">
                <UserCircle2 className="h-4 w-4 text-[var(--cobalt)]" />
                <span className="font-medium">{photo ? "Replace photo" : "Profile photo"}</span>
                <span className="ml-auto text-xs text-stone-400">Browse</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                />
              </label>
              {photo ? (
                <div className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
                  <span className="truncate">{photo.name}</span>
                  <button
                    type="button"
                    className="ml-auto rounded-md p-1 hover:bg-stone-200"
                    onClick={() => setPhoto(null)}
                  >
                    <X className="h-4 w-4 text-stone-400" />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="no-print sticky bottom-16 z-30 -mx-4 border-t border-stone-200/80 bg-white/92 px-4 py-3.5 shadow-[0_-8px_30px_rgba(15,23,22,0.06)] backdrop-blur-xl md:bottom-0 md:rounded-t-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="hidden min-w-0 sm:block">
            <p className="text-sm font-medium text-stone-800">
              {isInstantPath ? "Instant path ready" : "Ready to generate"}
            </p>
            <p className="text-xs text-stone-500">
              {isInstantPath
                ? "Typed fields → usually under 10 seconds"
                : "Tip: name + education/experience is fastest"}
            </p>
          </div>
          <Button size="lg" className="ml-auto min-w-[168px]" onClick={generate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Generating…" : "Generate CV"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-stone-950/45 backdrop-blur-[3px]">
          <Card className="anim-pop w-[min(92vw,420px)] overflow-hidden shadow-2xl">
            <CardContent className="space-y-4 py-7">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--mist)]">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--ink)]" />
                </div>
                <div>
                  <p className="font-medium text-stone-900">{stageLabel}</p>
                  <p className="text-xs text-stone-500">
                    {elapsedSec}s · target under 10s for typed CVs
                  </p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="anim-progress h-full rounded-full bg-gradient-to-r from-[var(--cobalt)] to-[var(--signal)]" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function FileAdder({
  label,
  icon,
  accept,
  files,
  onAdd,
  onRemove,
}: {
  label: string;
  icon: React.ReactNode;
  accept: string;
  files: FileSlot[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex h-full min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50/70 px-3 py-3 text-sm text-stone-700 hover:border-[var(--cobalt)]/40 hover:bg-[var(--mist)]/40 active:scale-[0.995]">
        {icon}
        <span className="font-medium">{label}</span>
        <span className="ml-auto text-xs text-stone-400">Browse</span>
        <input
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {files.length ? (
        <ul className="space-y-1">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm"
            >
              <span className="truncate">{f.file.name}</span>
              <button type="button" className="cursor-pointer rounded-md p-1 hover:bg-stone-200" onClick={() => onRemove(f.id)}>
                <X className="h-4 w-4 text-stone-400" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
