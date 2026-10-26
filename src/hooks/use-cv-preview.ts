"use client";

import { useDeferredValue, useMemo, useRef } from "react";
import type { CvData } from "@/lib/cv/schema";
import { renderTemplate, getTemplateStyles } from "@/lib/cv/templates";
import { PAGE_SIZES, resolveLayout } from "@/lib/cv/layout";

/**
 * Fast CV preview: defer heavy HTML while typing, cache template CSS separately.
 * Typing stays responsive; preview catches up on the deferred snapshot.
 */
export function useCvPreview(data: CvData) {
  const deferred = useDeferredValue(data);
  const isStale = deferred !== data;

  const templateId = deferred.metadata.templateId || "professional";
  const pageSizeId = deferred.metadata.pageSize || "a4";

  // Cache CSS per template across edits (avoid string rebuild churn)
  const stylesCache = useRef(new Map<string, string>());
  const styles = useMemo(() => {
    const hit = stylesCache.current.get(templateId);
    if (hit) return hit;
    const next = getTemplateStyles(templateId);
    stylesCache.current.set(templateId, next);
    return next;
  }, [templateId]);

  const page = PAGE_SIZES[pageSizeId] || PAGE_SIZES.a4;

  const layout = useMemo(() => resolveLayout(deferred), [deferred]);

  const bodyHtml = useMemo(
    () => renderTemplate(deferred, { templateId, skipStyles: true }),
    [deferred, templateId],
  );

  const html = useMemo(
    () =>
      `<style>${styles}\n@page { size: ${page.cssSize}; margin: 0; }</style>${bodyHtml}`,
    [styles, bodyHtml, page.cssSize],
  );

  return {
    html,
    deferred,
    isStale,
    density: layout.density,
    fontScale: layout.fontScale,
    maxPages: layout.maxPages,
    multiPage: layout.maxPages > 1,
    pageSize: page,
  };
}
