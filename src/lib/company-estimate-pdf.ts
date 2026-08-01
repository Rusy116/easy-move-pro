// Branded one-page PDF for a moving company's estimate.
import { jsPDF } from "jspdf";

const NAVY = "#0f2540";
const SAGE = "#4b7a5a";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

export interface CompanyEstimatePdfInput {
  companyName: string;
  quoteNumber: string;
  revision: number;
  issuedAtISO?: string;
  validUntil?: string | null;
  customer: { name?: string | null; email?: string | null; phone?: string | null };
  origin?: string | null;
  destination?: string | null;
  moveDate?: string | null;
  crewSize?: number | null;
  truckSize?: string | null;
  cubicFeet?: number | null;
  breakdown: Array<{ label: string; amount: number }>;
  total: number;
  notes?: string | null;
  portalUrl?: string | null;
}

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function generateCompanyEstimatePdf(input: CompanyEstimatePdfInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const w = doc.internal.pageSize.getWidth();
  const m = 48;
  let y = m;

  doc.setFillColor(NAVY);
  doc.rect(0, 0, w, 96, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(input.companyName || "Moving estimate", m, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Estimate ${input.quoteNumber} · revision ${input.revision}`,
    m,
    64,
  );
  doc.text(
    `Issued ${new Date(input.issuedAtISO ?? Date.now()).toLocaleDateString("en-US")}`,
    m,
    80,
  );
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(money(input.total), w - m, 60, { align: "right" });

  y = 130;
  doc.setTextColor(NAVY);

  const col = (label: string, value: string, x: number, yy: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(NAVY);
    doc.text(doc.splitTextToSize(value || "—", (w - m * 2) / 2 - 12), x, yy + 14);
  };

  col("Customer", input.customer.name ?? "—", m, y);
  col(
    "Contact",
    [input.customer.phone, input.customer.email].filter(Boolean).join(" · ") || "—",
    w / 2,
    y,
  );
  y += 52;
  col("Origin", input.origin ?? "—", m, y);
  col("Destination", input.destination ?? "—", w / 2, y);
  y += 56;
  col("Move date", input.moveDate ?? "To be confirmed", m, y);
  col(
    "Crew & truck",
    [input.crewSize ? `${input.crewSize} movers` : null, input.truckSize]
      .filter(Boolean)
      .join(" · ") || "—",
    w / 2,
    y,
  );
  y += 48;

  doc.setDrawColor(BORDER);
  doc.line(m, y, w - m, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Price breakdown", m, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const line of input.breakdown) {
    if (!line.amount) continue;
    doc.setTextColor(NAVY);
    doc.text(line.label, m, y);
    doc.text(money(line.amount), w - m, y, { align: "right" });
    doc.setDrawColor(BORDER);
    doc.line(m, y + 5, w - m, y + 5);
    y += 20;
    if (y > 700) {
      doc.addPage();
      y = m;
    }
  }

  y += 8;
  doc.setFillColor(SAGE);
  doc.rect(m, y, w - m * 2, 44, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL ESTIMATE", m + 14, y + 27);
  doc.setFontSize(18);
  doc.text(money(input.total), w - m - 14, y + 29, { align: "right" });
  y += 66;

  doc.setTextColor(NAVY);
  if (input.validUntil) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Valid until ${new Date(input.validUntil).toLocaleDateString("en-US")}`,
      m,
      y,
    );
    y += 20;
  }
  if (input.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Notes", m, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED);
    const lines = doc.splitTextToSize(input.notes, w - m * 2);
    doc.text(lines, m, y);
    y += lines.length * 13 + 10;
  }
  if (input.portalUrl) {
    doc.setTextColor(SAGE);
    doc.setFontSize(10);
    doc.text(`Review & accept online: ${input.portalUrl}`, m, y);
  }

  return doc;
}
