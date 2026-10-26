"use client";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { CvData } from "@/lib/cv/schema";
import { resolvePageSize } from "@/lib/cv/layout";

export async function exportCvPdfFromElement(
  element: HTMLElement,
  filename = "cv.pdf",
  pageSizeId?: CvData["metadata"]["pageSize"],
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const page = resolvePageSize({
    metadata: { pageSize: pageSizeId || "a4" },
  } as CvData);

  const imgData = canvas.toDataURL("image/jpeg", 0.98);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: page.jsPdfFormat,
  });
  const pageWidth = page.widthMm;
  const pageHeight = page.heightMm;
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}

export function suggestedPdfName(data: CvData): string {
  const name = (data.personal.fullName || "cv").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
  const role = data.targetPosition.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
  return `${name}_${role}.pdf`;
}
