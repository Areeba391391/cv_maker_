"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Printer,
  FileDown,
  Save,
  AlertTriangle,
  Minus,
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Check,
  Loader2,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  CvData,
  TemplateId,
  PageSizeId,
  SectionId,
  SECTION_LABELS,
  DEFAULT_SECTION_ORDER,
} from "@/lib/cv/schema";
import { TEMPLATES } from "@/lib/cv/templates";
import {
  PAGE_SIZES,
  resolveFontScale,
  resolveLayout,
  resolveMargins,
  resolvePageSize,
  resolveSpacing,
} from "@/lib/cv/layout";
import { exportCvPdfFromElement, suggestedPdfName } from "@/lib/export/client-pdf";
import { useCvPreview } from "@/hooks/use-cv-preview";
import { useAutoSave } from "@/hooks/use-auto-save";
import { formatDateTime } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createId } from "@/lib/utils";

const EDU_PRESETS = ["Matric", "Intermediate", "Bachelor", "Master", "Diploma", "Certificate"];

const DEFAULT_MARGINS = { top: 12, right: 14, bottom: 14, left: 14 };

const MARGIN_PRESETS = [
  { id: "narrow", label: "Narrow", margins: { top: 8, right: 8, bottom: 8, left: 8 } },
  { id: "normal", label: "Normal", margins: { top: 12, right: 14, bottom: 14, left: 14 } },
  { id: "wide", label: "Wide", margins: { top: 18, right: 20, bottom: 18, left: 20 } },
] as const;

function clampNum(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Informational ATS readiness cues — not a fake “pass %”. */
function AtsChecklist({ data }: { data: CvData }) {
  const checks = [
    {
      ok: Boolean(data.personal.phone?.trim() || data.personal.email?.trim()),
      label: "Contact (phone or email)",
    },
    {
      ok: Boolean(data.professionalSummary?.trim()),
      label: "Summary / objective",
    },
    {
      ok: data.experience.some((e) => (e.responsibilities?.length || 0) > 0),
      label: "Experience with bullet points",
    },
    {
      ok: data.skills.length > 0,
      label: "Skills listed",
    },
    {
      ok: data.metadata.templateId === "ats",
      label: "ATS-safe template (single column)",
    },
    {
      ok: data.metadata.templateId !== "sidebar",
      label: "No sidebar layout",
    },
  ];
  const passed = checks.filter((c) => c.ok).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ATS checklist</CardTitle>
        <p className="text-xs text-stone-500">
          {passed}/{checks.length} cues ready — guidance only, not a portal score.
        </p>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs ${
              c.ok ? "bg-emerald-50 text-emerald-900" : "bg-stone-50 text-stone-600"
            }`}
          >
            <span className="mt-0.5 font-bold">{c.ok ? "✓" : "·"}</span>
            <span>{c.label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CvWorkspace({
  cvId,
  customerId,
  initialData,
  versions,
}: {
  cvId: string;
  customerId: string;
  initialData: CvData;
  versions: Array<{ id: string; version_number: number; created_at: string; notes: string | null }>;
}) {
  const [data, setData] = useState<CvData>(initialData);
  const [mode, setMode] = useState<"structured" | "richtext">("structured");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);
  const [dragSection, setDragSection] = useState<SectionId | null>(null);
  const [zoom, setZoom] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  const { html, isStale, density, fontScale, maxPages, multiPage } = useCvPreview(data);
  const effectiveMargins = useMemo(() => resolveMargins(data), [data]);
  const effectiveSpacing = useMemo(() => resolveSpacing(data), [data]);
  const pageSize = useMemo(() => resolvePageSize(data), [data]);

  const patchData = useCallback((updater: SetStateAction<CvData>) => {
    startTransition(() => {
      setData(updater);
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: `<p>${data.professionalSummary || ""}</p>`,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const text = ed.getText();
      setData((d) => ({ ...d, professionalSummary: text || undefined }));
    },
  });

  useEffect(() => {
    if (editor && mode === "richtext") {
      editor.commands.setContent(`<p>${data.professionalSummary || ""}</p>`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function setTemplate(templateId: TemplateId) {
    patchData((d) => ({
      ...d,
      metadata: { ...d.metadata, templateId },
    }));
  }

  function bumpFont(delta: number) {
    patchData((d) => {
      const effective = d.metadata.fontLocked
        ? resolveFontScale(d)
        : resolveLayout(d).fontScale;
      const next =
        Math.round(Math.min(1.45, Math.max(0.8, effective + delta)) * 100) / 100;
      return {
        ...d,
        metadata: { ...d.metadata, fontScale: next, fontLocked: true },
      };
    });
  }

  function setDensity(next: CvData["metadata"]["density"]) {
    patchData((d) => ({
      ...d,
      metadata: {
        ...d.metadata,
        density: next,
        // Switching density unlocks so presets can drive margins again
        marginsLocked: false,
      },
    }));
  }

  function setMaxPages(maxPages: CvData["metadata"]["maxPages"]) {
    patchData((d) => ({ ...d, metadata: { ...d.metadata, maxPages } }));
  }

  function setPageSize(pageSizeId: PageSizeId) {
    patchData((d) => ({ ...d, metadata: { ...d.metadata, pageSize: pageSizeId } }));
  }

  function patchMargins(partial: Partial<typeof DEFAULT_MARGINS>) {
    setData((d) => {
      const current = resolveMargins(d);
      return {
        ...d,
        metadata: {
          ...d.metadata,
          marginsLocked: true,
          margins: {
            top: clampNum(partial.top ?? current.top, 4, 30),
            right: clampNum(partial.right ?? current.right, 4, 30),
            bottom: clampNum(partial.bottom ?? current.bottom, 4, 30),
            left: clampNum(partial.left ?? current.left, 4, 30),
          },
        },
      };
    });
  }

  function applyMarginPreset(margins: typeof DEFAULT_MARGINS) {
    setData((d) => ({
      ...d,
      metadata: {
        ...d.metadata,
        marginsLocked: true,
        margins: { ...margins },
      },
    }));
  }

  function patchSpacing(
    key: "paragraphSpacing" | "sectionGap" | "lineHeight",
    value: number,
    min: number,
    max: number,
  ) {
    setData((d) => {
      const current = resolveSpacing(d);
      return {
        ...d,
        metadata: {
          ...d.metadata,
          marginsLocked: true,
          paragraphSpacing: current.paragraphSpacing,
          sectionGap: current.sectionGap,
          lineHeight: current.lineHeight,
          [key]: clampNum(value, min, max),
        },
      };
    });
  }

  function resetCustomLayout() {
    setData((d) => ({
      ...d,
      metadata: {
        ...d.metadata,
        marginsLocked: false,
        margins: { ...DEFAULT_MARGINS },
        paragraphSpacing: 6,
        sectionGap: 11,
        lineHeight: 1.5,
      },
    }));
  }

  function moveSection(id: SectionId, dir: -1 | 1) {
    patchData((d) => {
      const order = [...(d.sectionOrder?.length ? d.sectionOrder : DEFAULT_SECTION_ORDER)];
      const i = order.indexOf(id);
      if (i < 0) return d;
      const j = i + dir;
      if (j < 0 || j >= order.length) return d;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...d, sectionOrder: order };
    });
  }

  function dropSectionOn(target: SectionId) {
    if (!dragSection || dragSection === target) {
      setDragSection(null);
      return;
    }
    patchData((d) => {
      const order = [...(d.sectionOrder?.length ? d.sectionOrder : DEFAULT_SECTION_ORDER)];
      const from = order.indexOf(dragSection);
      const to = order.indexOf(target);
      if (from < 0 || to < 0) return d;
      order.splice(from, 1);
      order.splice(to, 0, dragSection);
      return { ...d, sectionOrder: order };
    });
    setDragSection(null);
  }

  function resetSectionOrder() {
    patchData((d) => ({ ...d, sectionOrder: [...DEFAULT_SECTION_ORDER] }));
  }

  const persist = useCallback(
    async (createVersion = false) => {
      const snapshot = dataRef.current;
      const res = await fetch("/api/cvs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvId,
          customerId,
          data: snapshot,
          createVersion,
          notes: createVersion ? "Manual save version" : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      // Do not replace local editor state on auto-save — avoids clobbering in-flight typing.
      // Manual version saves still refresh from server when provided.
      if (createVersion && json.data) setData(json.data);
    },
    [cvId, customerId],
  );

  // Stable save fn — persist already reads dataRef.current
  const autoSave = useCallback(() => persist(false), [persist]);
  const { status: autoStatus } = useAutoSave(data, autoSave, 900);

  async function save(createVersion = false) {
    setSaving(true);
    try {
      await persist(createVersion);
      toast.success(createVersion ? "Saved new version" : "Saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function exportDocx() {
    setBusy("docx");
    try {
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "DOCX export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data.personal.fullName || "cv").replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("DOCX downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "DOCX export failed");
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    if (!previewRef.current) return;
    setBusy("pdf");
    const root = previewRef.current;
    const prevTransform = root.style.transform;
    try {
      const article = root.querySelector(".cv-page") as HTMLElement | null;
      if (!article) throw new Error("CV preview not ready");
      // Capture at 100% — preview zoom must not shrink the PDF
      root.style.transform = "none";
      await exportCvPdfFromElement(article, suggestedPdfName(data), data.metadata.pageSize);
      toast.success("PDF downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF export failed");
    } finally {
      root.style.transform = prevTransform;
      setBusy(null);
    }
  }

  function printCv() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div className="no-print sticky top-[4.25rem] z-30 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(15,23,22,0.04)] backdrop-blur-xl sm:mx-0 sm:rounded-2xl sm:border sm:shadow-[var(--shadow)]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--cobalt)]">
            Editor
          </p>
          <h1
            className="mt-0.5 truncate text-2xl font-semibold text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {data.personal.fullName || "Untitled CV"}
          </h1>
          <p className="truncate text-sm text-stone-500">
            {data.targetPosition}
            {multiPage ? " · multi-page layout" : " · single-page layout"}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-stone-500">
            {autoStatus === "saving" || saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Saving…
              </>
            ) : autoStatus === "saved" ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" /> Autosaved
              </>
            ) : autoStatus === "dirty" ? (
              "Unsaved changes…"
            ) : autoStatus === "error" ? (
              <span className="text-red-600">Autosave failed — use Save</span>
            ) : (
              "Ready"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" onClick={() => save(true)} disabled={saving}>
            Save version
          </Button>
          <Button variant="outline" onClick={exportPdf} disabled={busy !== null}>
            <FileDown className="h-4 w-4" />
            {busy === "pdf" ? "PDF…" : "PDF"}
          </Button>
          <Button variant="outline" onClick={exportDocx} disabled={busy !== null}>
            <FileDown className="h-4 w-4" />
            {busy === "docx" ? "DOCX…" : "DOCX"}
          </Button>
          <Button onClick={printCv}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {data.warnings?.length ? (
        <Card className="no-print border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Verify before printing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.warnings.map((w, i) => (
              <p key={`${w.field}-${i}`} className="text-sm text-amber-900">
                {w.message}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="no-print space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => {
                const active = data.metadata.templateId === t.id;
                const atsSafe = t.id === "ats";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate(t.id)}
                    className={`group cursor-pointer overflow-hidden rounded-xl border text-left transition active:scale-[0.98] ${
                      active
                        ? "border-[var(--cobalt)] ring-2 ring-[var(--cobalt)]/25 shadow-sm"
                        : "border-stone-200 hover:border-stone-300 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className="flex h-10 items-end gap-1 px-2 pb-1.5"
                      style={{
                        background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accent2} 100%)`,
                      }}
                    >
                      <span className="h-1.5 w-8 rounded-full bg-white/80" />
                      <span className="h-1 w-5 rounded-full bg-white/50" />
                    </div>
                    <div className="px-2.5 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs font-semibold text-[var(--ink)]">{t.name}</div>
                        {atsSafe ? (
                          <span className="rounded bg-emerald-100 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800">
                            ATS-safe
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-stone-500">
                        {t.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <AtsChecklist data={data} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Page & font</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-stone-500">Page size</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(Object.values(PAGE_SIZES) as Array<(typeof PAGE_SIZES)[PageSizeId]>).map(
                    (p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPageSize(p.id)}
                        className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs active:scale-[0.97] ${
                          pageSize.id === p.id
                            ? "border-[var(--cobalt)] bg-[var(--mist)] text-[var(--ink)]"
                            : "border-stone-200 hover:bg-stone-50"
                        }`}
                        title={`${p.widthMm} × ${p.heightMm} mm`}
                      >
                        {p.label}
                      </button>
                    ),
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-stone-500">
                  {pageSize.label}: {pageSize.widthMm} × {pageSize.heightMm} mm
                </p>
              </div>
              <div>
                <Label className="text-xs text-stone-500">Font size</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => bumpFont(-0.05)}
                    disabled={fontScale <= 0.8}
                  >
                    <Minus className="h-3.5 w-3.5" />
                    A−
                  </Button>
                  <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
                    {Math.round(fontScale * 100)}%
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => bumpFont(0.05)}
                    disabled={fontScale >= 1.45}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    A+
                  </Button>
                </div>
                {data.metadata.fontLocked ? (
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-[var(--cobalt)] hover:underline"
                    onClick={() =>
                      setData((d) => ({
                        ...d,
                        metadata: {
                          ...d.metadata,
                          fontLocked: false,
                          fontScale: 1,
                        },
                      }))
                    }
                  >
                    Reset font (auto)
                  </button>
                ) : null}
              </div>
              <div>
                <Label className="text-xs text-stone-500">Pages</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(
                    [
                      ["auto", "Auto"],
                      [1, "1 page"],
                      [2, "2 pages"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={String(value)}
                      type="button"
                      onClick={() => setMaxPages(value)}
                      className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs active:scale-[0.97] ${
                        (data.metadata.maxPages ?? "auto") === value
                          ? "border-[var(--cobalt)] bg-[var(--mist)] text-[var(--ink)]"
                          : "border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-stone-500">
                  {multiPage
                    ? `Layout allows up to ${maxPages} pages.`
                    : "Fitted to one page."}
                </p>
              </div>
              <div>
                <Label className="text-xs text-stone-500">Spacing</Label>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ["auto", "Auto fit"],
                      ["spacious", "Spacious"],
                      ["comfortable", "Normal"],
                      ["compact", "Compact"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDensity(value)}
                      className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs active:scale-[0.97] ${
                        (data.metadata.density || "auto") === value
                          ? "border-[var(--cobalt)] bg-[var(--mist)] text-[var(--ink)]"
                          : "border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-stone-500">
                  Auto balances type size for print. Current: {density}.
                  {data.metadata.marginsLocked
                    ? " Custom margins/spacing are locked."
                    : " Margins follow this density until you edit them."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Margins (mm)</CardTitle>
              {data.metadata.marginsLocked ? (
                <button
                  type="button"
                  className="text-[11px] text-[var(--cobalt)] hover:underline"
                  onClick={resetCustomLayout}
                >
                  Reset
                </button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {MARGIN_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyMarginPreset(p.margins)}
                    className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs active:scale-[0.97] ${
                      data.metadata.marginsLocked &&
                      effectiveMargins.top === p.margins.top &&
                      effectiveMargins.right === p.margins.right
                        ? "border-[var(--cobalt)] bg-[var(--mist)]"
                        : "border-stone-200 hover:bg-stone-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["top", "Top"],
                    ["bottom", "Bottom"],
                    ["left", "Left"],
                    ["right", "Right"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <Label className="text-xs text-stone-500">{label}</Label>
                    <div className="mt-1 flex items-center gap-1">
                      <button
                        type="button"
                        className="flex h-9 w-8 items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-50"
                        onClick={() =>
                          patchMargins({ [key]: effectiveMargins[key] - 1 })
                        }
                        aria-label={`Decrease ${label}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <Input
                        type="number"
                        min={4}
                        max={30}
                        step={1}
                        className="h-9 text-center tabular-nums"
                        value={effectiveMargins[key]}
                        onChange={(e) =>
                          patchMargins({
                            [key]: Number(e.target.value) || effectiveMargins[key],
                          })
                        }
                      />
                      <button
                        type="button"
                        className="flex h-9 w-8 items-center justify-center rounded-lg border border-stone-200 hover:bg-stone-50"
                        onClick={() =>
                          patchMargins({ [key]: effectiveMargins[key] + 1 })
                        }
                        aria-label={`Increase ${label}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-stone-500">
                Live on preview — white space around the CV page.
                {!data.metadata.marginsLocked ? " (following density until you edit)" : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Spacing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-stone-500">Paragraph gap</Label>
                  <span className="text-[11px] tabular-nums text-stone-500">
                    {effectiveSpacing.paragraphSpacing}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={18}
                  step={1}
                  className="mt-1.5 w-full accent-[var(--cobalt)]"
                  value={effectiveSpacing.paragraphSpacing}
                  onChange={(e) =>
                    patchSpacing("paragraphSpacing", Number(e.target.value), 0, 18)
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-stone-500">Section gap</Label>
                  <span className="text-[11px] tabular-nums text-stone-500">
                    {effectiveSpacing.sectionGap}px
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1}
                  className="mt-1.5 w-full accent-[var(--cobalt)]"
                  value={effectiveSpacing.sectionGap}
                  onChange={(e) => patchSpacing("sectionGap", Number(e.target.value), 0, 24)}
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-stone-500">Line height</Label>
                  <span className="text-[11px] tabular-nums text-stone-500">
                    {effectiveSpacing.lineHeight.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1.15}
                  max={1.9}
                  step={0.05}
                  className="mt-1.5 w-full accent-[var(--cobalt)]"
                  value={effectiveSpacing.lineHeight}
                  onChange={(e) =>
                    patchSpacing("lineHeight", Number(e.target.value), 1.15, 1.9)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Section order</CardTitle>
              <button
                type="button"
                className="text-[11px] text-[var(--cobalt)] hover:underline"
                onClick={resetSectionOrder}
              >
                Reset
              </button>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="mb-2 text-[11px] text-stone-500">
                Drag to reorder, or use the arrows. Empty sections stay hidden on the CV.
              </p>
              {(data.sectionOrder?.length ? data.sectionOrder : DEFAULT_SECTION_ORDER).map(
                (id, index, arr) => (
                  <div
                    key={id}
                    draggable
                    onDragStart={() => setDragSection(id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dropSectionOn(id)}
                    onDragEnd={() => setDragSection(null)}
                    className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 ${
                      dragSection === id
                        ? "border-[var(--cobalt)] bg-[var(--mist)]"
                        : "border-stone-200 bg-white"
                    }`}
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                    <span className="min-w-0 flex-1 truncate text-sm">{SECTION_LABELS[id]}</span>
                    <button
                      type="button"
                      className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => moveSection(id, -1)}
                      aria-label={`Move ${SECTION_LABELS[id]} up`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-stone-500 hover:bg-stone-100 disabled:opacity-30"
                      disabled={index === arr.length - 1}
                      onClick={() => moveSection(id, 1)}
                      aria-label={`Move ${SECTION_LABELS[id]} down`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ),
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={mode === "structured" ? "default" : "outline"}
                  onClick={() => setMode("structured")}
                >
                  Fields
                </Button>
                <Button
                  size="sm"
                  variant={mode === "richtext" ? "default" : "outline"}
                  onClick={() => setMode("richtext")}
                >
                  Summary editor
                </Button>
              </div>

              {mode === "structured" ? (
                <StructuredEditor data={data} setData={setData} />
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    <ToolbarBtn onClick={() => editor?.chain().focus().toggleBold().run()}>
                      <Bold className="h-3.5 w-3.5" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor?.chain().focus().toggleItalic().run()}>
                      <Italic className="h-3.5 w-3.5" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                      <UnderlineIcon className="h-3.5 w-3.5" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
                      <AlignLeft className="h-3.5 w-3.5" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
                      <AlignCenter className="h-3.5 w-3.5" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
                      <AlignRight className="h-3.5 w-3.5" />
                    </ToolbarBtn>
                    <ToolbarBtn onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                      <List className="h-3.5 w-3.5" />
                    </ToolbarBtn>
                  </div>
                  <div className="min-h-[160px] rounded-md border border-stone-300 bg-white p-3">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {versions.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Versions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {versions.map((v) => (
                  <div key={v.id} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
                    <div className="font-medium">Version {v.version_number}</div>
                    <div className="text-xs text-stone-500">
                      {formatDateTime(v.created_at)}
                      {v.notes ? ` · ${v.notes}` : ""}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="overflow-auto rounded-2xl border border-stone-200 bg-[linear-gradient(180deg,#dfe7f0_0%,#edf2f7_100%)] p-3 sm:p-5">
          <div className="no-print mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-stone-600">
              Live preview
              {isStale ? <span className="ml-2 text-stone-400">updating…</span> : null}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="rounded-lg border border-stone-200 bg-white p-1.5 hover:bg-stone-50 disabled:opacity-40"
                disabled={zoom <= 0.7}
                onClick={() => setZoom((z) => Math.round((z - 0.1) * 10) / 10)}
                aria-label="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[3rem] text-center text-xs tabular-nums text-stone-600">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="rounded-lg border border-stone-200 bg-white p-1.5 hover:bg-stone-50 disabled:opacity-40"
                disabled={zoom >= 1.3}
                onClick={() => setZoom((z) => Math.round((z + 0.1) * 10) / 10)}
                aria-label="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div
            className="mx-auto transition-opacity duration-150"
            style={{
              width: `${pageSize.widthMm * zoom}mm`,
              opacity: isStale ? 0.85 : 1,
            }}
          >
            <div
              id="cv-print-root"
              ref={previewRef}
              className="origin-top shadow-[0_20px_50px_rgba(15,23,42,0.18)] ring-1 ring-black/5 transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                width: `${pageSize.widthMm}mm`,
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-stone-200 bg-white p-1.5 hover:bg-stone-50 active:scale-95"
    >
      {children}
    </button>
  );
}

function StructuredEditor({
  data,
  setData,
}: {
  data: CvData;
  setData: React.Dispatch<React.SetStateAction<CvData>>;
}) {
  function addExperience() {
    setData((d) => ({
      ...d,
      experience: [
        ...d.experience,
        {
          id: createId("exp"),
          title: "",
          company: "",
          location: "",
          startDate: "",
          endDate: "",
          responsibilities: [],
        },
      ],
    }));
  }

  function addEducation(degree = "") {
    setData((d) => ({
      ...d,
      education: [
        ...d.education,
        { id: createId("edu"), degree, institution: "", field: "", startDate: "", endDate: "", grade: "" },
      ],
    }));
  }

  return (
    <div className="space-y-4">
      <Field label="Target position">
        <Input
          value={data.targetPosition}
          onChange={(e) => setData((d) => ({ ...d, targetPosition: e.target.value }))}
        />
      </Field>
      <Field label="Full name">
        <Input
          value={data.personal.fullName || ""}
          onChange={(e) =>
            setData((d) => ({ ...d, personal: { ...d.personal, fullName: e.target.value } }))
          }
        />
      </Field>
      <Field label="Phone">
        <Input
          value={data.personal.phone || ""}
          onChange={(e) =>
            setData((d) => ({ ...d, personal: { ...d.personal, phone: e.target.value } }))
          }
        />
      </Field>
      <Field label="Email">
        <Input
          value={data.personal.email || ""}
          onChange={(e) =>
            setData((d) => ({ ...d, personal: { ...d.personal, email: e.target.value } }))
          }
        />
      </Field>
      <Field label="City / Address">
        <Input
          value={data.personal.city || data.personal.address || ""}
          onChange={(e) =>
            setData((d) => ({ ...d, personal: { ...d.personal, city: e.target.value } }))
          }
        />
      </Field>
      <Field label="Career objective / summary">
        <Textarea
          rows={4}
          value={data.professionalSummary || ""}
          onChange={(e) => setData((d) => ({ ...d, professionalSummary: e.target.value }))}
        />
      </Field>
      <Field label="Skills (comma separated)">
        <Textarea
          rows={2}
          value={data.skills.join(", ")}
          onChange={(e) =>
            setData((d) => ({
              ...d,
              skills: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }))
          }
        />
      </Field>

      {/* Experience — multiple jobs */}
      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-sm font-semibold">Work experience</Label>
            <p className="text-[11px] text-stone-500">
              Add each role separately
            </p>
          </div>
          <Button size="sm" type="button" onClick={addExperience}>
            <Plus className="h-3.5 w-3.5" />
            Add more
          </Button>
        </div>

        {data.experience.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white px-3 py-4 text-center text-xs text-stone-500">
            No experience added yet
          </p>
        ) : null}

        {data.experience.map((exp, idx) => (
          <div key={exp.id} className="space-y-2 rounded-md border border-stone-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                Job {idx + 1}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    experience: d.experience.filter((x) => x.id !== exp.id),
                  }))
                }
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
            <Input
              placeholder="Job title — e.g. Salesman / Accountant"
              value={exp.title || ""}
              onChange={(e) =>
                setData((d) => {
                  const experience = [...d.experience];
                  experience[idx] = { ...experience[idx], title: e.target.value };
                  return { ...d, experience };
                })
              }
            />
            <Input
              placeholder="Company / shop name"
              value={exp.company || ""}
              onChange={(e) =>
                setData((d) => {
                  const experience = [...d.experience];
                  experience[idx] = { ...experience[idx], company: e.target.value };
                  return { ...d, experience };
                })
              }
            />
            <Input
              placeholder="City / location (optional)"
              value={exp.location || ""}
              onChange={(e) =>
                setData((d) => {
                  const experience = [...d.experience];
                  experience[idx] = { ...experience[idx], location: e.target.value };
                  return { ...d, experience };
                })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="From — e.g. 2020"
                value={exp.startDate || ""}
                onChange={(e) =>
                  setData((d) => {
                    const experience = [...d.experience];
                    experience[idx] = { ...experience[idx], startDate: e.target.value };
                    return { ...d, experience };
                  })
                }
              />
              <Input
                placeholder="To — e.g. 2023 / Present"
                value={exp.endDate || ""}
                onChange={(e) =>
                  setData((d) => {
                    const experience = [...d.experience];
                    experience[idx] = { ...experience[idx], endDate: e.target.value };
                    return { ...d, experience };
                  })
                }
              />
            </div>
            <Textarea
              rows={3}
              placeholder={"One responsibility per line"}
              value={(exp.responsibilities || []).join("\n")}
              onChange={(e) =>
                setData((d) => {
                  const experience = [...d.experience];
                  experience[idx] = {
                    ...experience[idx],
                    responsibilities: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  };
                  return { ...d, experience };
                })
              }
            />
          </div>
        ))}

        {data.experience.length > 0 ? (
          <Button size="sm" variant="outline" type="button" className="w-full" onClick={addExperience}>
            <Plus className="h-3.5 w-3.5" />
            Add more experience
          </Button>
        ) : null}
      </div>

      {/* Education — Matric / Inter / Uni ... */}
      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-sm font-semibold">Education</Label>
            <p className="text-[11px] text-stone-500">
              Add each qualification separately
            </p>
          </div>
          <Button size="sm" type="button" onClick={() => addEducation()}>
            <Plus className="h-3.5 w-3.5" />
            Add more
          </Button>
        </div>

        <div className="flex flex-wrap gap-1">
          {EDU_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => addEducation(preset)}
              className="rounded border border-stone-200 bg-white px-2 py-0.5 text-[11px] text-stone-600 hover:border-[var(--cobalt)] hover:text-[var(--ink)]"
            >
              + {preset}
            </button>
          ))}
        </div>

        {data.education.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white px-3 py-4 text-center text-xs text-stone-500">
            No education added yet
          </p>
        ) : null}

        {data.education.map((edu, idx) => (
          <div key={edu.id} className="space-y-2 rounded-md border border-stone-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                Education {idx + 1}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    education: d.education.filter((x) => x.id !== edu.id),
                  }))
                }
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
            <Input
              placeholder="Degree — e.g. Matric / Intermediate / B.Com"
              value={edu.degree || ""}
              onChange={(e) =>
                setData((d) => {
                  const education = [...d.education];
                  education[idx] = { ...education[idx], degree: e.target.value };
                  return { ...d, education };
                })
              }
            />
            <Input
              placeholder="Field / subject (optional) — e.g. Commerce"
              value={edu.field || ""}
              onChange={(e) =>
                setData((d) => {
                  const education = [...d.education];
                  education[idx] = { ...education[idx], field: e.target.value };
                  return { ...d, education };
                })
              }
            />
            <Input
              placeholder="School / College / University"
              value={edu.institution || ""}
              onChange={(e) =>
                setData((d) => {
                  const education = [...d.education];
                  education[idx] = { ...education[idx], institution: e.target.value };
                  return { ...d, education };
                })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="From year"
                value={edu.startDate || ""}
                onChange={(e) =>
                  setData((d) => {
                    const education = [...d.education];
                    education[idx] = { ...education[idx], startDate: e.target.value };
                    return { ...d, education };
                  })
                }
              />
              <Input
                placeholder="To year / Passed"
                value={edu.endDate || ""}
                onChange={(e) =>
                  setData((d) => {
                    const education = [...d.education];
                    education[idx] = { ...education[idx], endDate: e.target.value };
                    return { ...d, education };
                  })
                }
              />
            </div>
            <Input
              placeholder="Grade / marks (optional)"
              value={edu.grade || ""}
              onChange={(e) =>
                setData((d) => {
                  const education = [...d.education];
                  education[idx] = { ...education[idx], grade: e.target.value };
                  return { ...d, education };
                })
              }
            />
          </div>
        ))}

        {data.education.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="w-full"
            onClick={() => addEducation()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add more education
          </Button>
        ) : null}
      </div>

      <Field label="Languages (comma — Name or Name: Level)">
        <Textarea
          rows={2}
          placeholder="Urdu: Native, English: Conversational"
          value={data.languages
            .map((l) => (l.proficiency ? `${l.name}: ${l.proficiency}` : l.name))
            .join(", ")}
          onChange={(e) =>
            setData((d) => ({
              ...d,
              languages: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((part) => {
                  const [name, ...rest] = part.split(":");
                  return {
                    id: createId("lang"),
                    name: name.trim(),
                    proficiency: rest.join(":").trim() || undefined,
                  };
                }),
            }))
          }
        />
      </Field>

      <Field label="Key strengths (one per line)">
        <Textarea
          rows={3}
          value={data.achievements.map((a) => a.title).join("\n")}
          onChange={(e) =>
            setData((d) => ({
              ...d,
              achievements: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((title) => ({ id: createId("ach"), title })),
            }))
          }
        />
      </Field>

      {/* Certifications — Add more */}
      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-sm font-semibold">Certifications</Label>
            <p className="text-[11px] text-stone-500">Add each certificate separately</p>
          </div>
          <Button
            size="sm"
            type="button"
            onClick={() =>
              setData((d) => ({
                ...d,
                certifications: [
                  ...d.certifications,
                  { id: createId("cert"), title: "", details: "", date: "" },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add more
          </Button>
        </div>

        {data.certifications.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white px-3 py-4 text-center text-xs text-stone-500">
            Optional — leave empty if none
          </p>
        ) : null}

        {data.certifications.map((cert, idx) => (
          <div key={cert.id} className="space-y-2 rounded-md border border-stone-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                Certificate {idx + 1}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    certifications: d.certifications.filter((x) => x.id !== cert.id),
                  }))
                }
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
            <Input
              placeholder="Certificate name"
              value={cert.title || ""}
              onChange={(e) =>
                setData((d) => {
                  const certifications = [...d.certifications];
                  certifications[idx] = { ...certifications[idx], title: e.target.value };
                  return { ...d, certifications };
                })
              }
            />
            <Input
              placeholder="Institute / details (optional)"
              value={cert.details || ""}
              onChange={(e) =>
                setData((d) => {
                  const certifications = [...d.certifications];
                  certifications[idx] = { ...certifications[idx], details: e.target.value };
                  return { ...d, certifications };
                })
              }
            />
            <Input
              placeholder="Year / date (optional)"
              value={cert.date || ""}
              onChange={(e) =>
                setData((d) => {
                  const certifications = [...d.certifications];
                  certifications[idx] = { ...certifications[idx], date: e.target.value };
                  return { ...d, certifications };
                })
              }
            />
          </div>
        ))}

        {data.certifications.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="w-full"
            onClick={() =>
              setData((d) => ({
                ...d,
                certifications: [
                  ...d.certifications,
                  { id: createId("cert"), title: "", details: "", date: "" },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add more certificates
          </Button>
        ) : null}
      </div>

      {/* Projects — Add more */}
      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-sm font-semibold">Projects</Label>
            <p className="text-[11px] text-stone-500">Add each project separately</p>
          </div>
          <Button
            size="sm"
            type="button"
            onClick={() =>
              setData((d) => ({
                ...d,
                projects: [
                  ...d.projects,
                  { id: createId("proj"), title: "", details: "", date: "" },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add more
          </Button>
        </div>

        {data.projects.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white px-3 py-4 text-center text-xs text-stone-500">
            Optional — leave empty if none
          </p>
        ) : null}

        {data.projects.map((proj, idx) => (
          <div key={proj.id} className="space-y-2 rounded-md border border-stone-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                Project {idx + 1}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    projects: d.projects.filter((x) => x.id !== proj.id),
                  }))
                }
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
            <Input
              placeholder="Project name"
              value={proj.title || ""}
              onChange={(e) =>
                setData((d) => {
                  const projects = [...d.projects];
                  projects[idx] = { ...projects[idx], title: e.target.value };
                  return { ...d, projects };
                })
              }
            />
            <Textarea
              rows={2}
              placeholder="Short details"
              value={proj.details || ""}
              onChange={(e) =>
                setData((d) => {
                  const projects = [...d.projects];
                  projects[idx] = { ...projects[idx], details: e.target.value };
                  return { ...d, projects };
                })
              }
            />
            <Input
              placeholder="Year / date (optional)"
              value={proj.date || ""}
              onChange={(e) =>
                setData((d) => {
                  const projects = [...d.projects];
                  projects[idx] = { ...projects[idx], date: e.target.value };
                  return { ...d, projects };
                })
              }
            />
          </div>
        ))}

        {data.projects.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="w-full"
            onClick={() =>
              setData((d) => ({
                ...d,
                projects: [
                  ...d.projects,
                  { id: createId("proj"), title: "", details: "", date: "" },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add more projects
          </Button>
        ) : null}
      </div>

      {/* References — Add more */}
      <div className="space-y-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <Label className="text-sm font-semibold">References</Label>
            <p className="text-[11px] text-stone-500">
              Only add provided references
            </p>
          </div>
          <Button
            size="sm"
            type="button"
            onClick={() =>
              setData((d) => ({
                ...d,
                references: [
                  ...d.references,
                  {
                    id: createId("ref"),
                    name: "",
                    relationship: "",
                    organization: "",
                    phone: "",
                    email: "",
                  },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add more
          </Button>
        </div>

        {data.references.length === 0 ? (
          <p className="rounded-md border border-dashed border-stone-300 bg-white px-3 py-4 text-center text-xs text-stone-500">
            Optional — leave empty if none
          </p>
        ) : null}

        {data.references.map((ref, idx) => (
          <div key={ref.id} className="space-y-2 rounded-md border border-stone-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink)]">
                Reference {idx + 1}
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    references: d.references.filter((x) => x.id !== ref.id),
                  }))
                }
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
            <Input
              placeholder="Full name"
              value={ref.name || ""}
              onChange={(e) =>
                setData((d) => {
                  const references = [...d.references];
                  references[idx] = { ...references[idx], name: e.target.value };
                  return { ...d, references };
                })
              }
            />
            <Input
              placeholder="Relation — e.g. Previous manager"
              value={ref.relationship || ""}
              onChange={(e) =>
                setData((d) => {
                  const references = [...d.references];
                  references[idx] = { ...references[idx], relationship: e.target.value };
                  return { ...d, references };
                })
              }
            />
            <Input
              placeholder="Company / organization (optional)"
              value={ref.organization || ""}
              onChange={(e) =>
                setData((d) => {
                  const references = [...d.references];
                  references[idx] = { ...references[idx], organization: e.target.value };
                  return { ...d, references };
                })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Phone"
                value={ref.phone || ""}
                onChange={(e) =>
                  setData((d) => {
                    const references = [...d.references];
                    references[idx] = { ...references[idx], phone: e.target.value };
                    return { ...d, references };
                  })
                }
              />
              <Input
                placeholder="Email (optional)"
                value={ref.email || ""}
                onChange={(e) =>
                  setData((d) => {
                    const references = [...d.references];
                    references[idx] = { ...references[idx], email: e.target.value };
                    return { ...d, references };
                  })
                }
              />
            </div>
          </div>
        ))}

        {data.references.length > 0 ? (
          <Button
            size="sm"
            variant="outline"
            type="button"
            className="w-full"
            onClick={() =>
              setData((d) => ({
                ...d,
                references: [
                  ...d.references,
                  {
                    id: createId("ref"),
                    name: "",
                    relationship: "",
                    organization: "",
                    phone: "",
                    email: "",
                  },
                ],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add more references
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
