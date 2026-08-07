// ---------------------------------------------------------------------------
// PHASE 13 — Client-side PDF renderer.
//
// Every product is stored as structured content, so the actual PDF is built
// on demand at download time. Same jsPDF dependency the estimate PDFs use.
// ---------------------------------------------------------------------------
import { jsPDF } from "jspdf";
import { resolveCoverSpec, type PdfProduct } from "./catalog";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

export function buildProductPdf(product: PdfProduct): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  const spec = resolveCoverSpec(product.slug, product.cover_spec);
  const [br, bg, bb] = hexToRgb(spec.palette[0]!);
  const [ar, ag, ab] = hexToRgb(spec.palette[1]!);

  // ---- Cover -------------------------------------------------------------
  doc.setFillColor(br, bg, bb);
  doc.rect(0, 0, W, H, "F");
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, H - 120, W, 120, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("EASY MOVING", M, 90);
  doc.setFontSize(30);
  doc.text(doc.splitTextToSize(product.title, W - M * 2), M, 190);
  if (product.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(doc.splitTextToSize(product.subtitle, W - M * 2), M, 260);
  }
  doc.setFontSize(10);
  doc.text(`Version ${product.version} · ${product.language.toUpperCase()}`, M, H - 60);

  // ---- Body --------------------------------------------------------------
  let y = M + 20;
  doc.addPage();
  doc.setTextColor(30, 30, 30);

  const ensure = (need: number) => {
    if (y + need > H - M) {
      doc.addPage();
      y = M;
    }
  };

  for (const section of product.content ?? []) {
    ensure(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(br, bg, bb);
    for (const line of doc.splitTextToSize(section.heading, W - M * 2)) {
      ensure(20);
      doc.text(line, M, y);
      y += 20;
    }
    y += 4;
    doc.setTextColor(45, 45, 45);
    if (section.body) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      for (const line of doc.splitTextToSize(section.body, W - M * 2)) {
        ensure(16);
        doc.text(line, M, y);
        y += 15;
      }
      y += 6;
    }
    for (const item of section.items ?? []) {
      ensure(20);
      doc.setDrawColor(ar, ag, ab);
      doc.setLineWidth(1);
      doc.rect(M, y - 9, 10, 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const lines = doc.splitTextToSize(item, W - M * 2 - 22);
      doc.text(lines, M + 20, y);
      y += 15 * lines.length + 4;
    }
    y += 12;
  }

  // ---- Footer on every body page ----------------------------------------
  const pages = doc.getNumberOfPages();
  for (let p = 2; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 140);
    doc.text(`Easy Moving · ${product.title}`, M, H - 28);
    doc.text(`${p - 1} / ${pages - 1}`, W - M, H - 28, { align: "right" });
  }
  return doc;
}

export function downloadProductPdf(product: PdfProduct) {
  buildProductPdf(product).save(`${product.slug}-v${product.version}.pdf`);
}
