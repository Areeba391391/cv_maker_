import { CvData } from "@/lib/cv/schema";
import { renderTemplate } from "@/lib/cv/templates";

/**
 * Server-side PDF via HTML printable document.
 * Client also supports html2canvas+jspdf from the live preview.
 * This returns HTML suitable for print-to-PDF and browser print.
 */
export function buildPrintableHtml(data: CvData): string {
  return renderTemplate(data, {
    templateId: data.metadata.templateId,
    forPrint: true,
  });
}
