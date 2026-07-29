// Client-side PDF generator for the Easy Moving estimate.
// Produces a branded, print-ready one-pager the customer can download.

import { jsPDF } from "jspdf";
import { INVENTORY_CATALOG, type InventoryItem } from "./inventory";

export interface EstimatePdfInput {
  quoteNumber: string;
  createdAtISO?: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  origin: {
    fullAddress: string;
    city: string;
    state: string;
    zip: string;
  };
  destination: {
    fullAddress: string;
    city: string;
    state: string;
    zip: string;
  };
  moveDate?: string | null;
  distanceMiles: number;
  numMovers: number;
  laborHours: number;
  truckSize: string;
  cubicFeet: number;
  weightLbs: number;
  estimatedLow: number;
  estimatedHigh: number;
  inventory: { id: string; quantity: number }[];
  breakdown: { label: string; amount: number }[];
  insurance: string;
  portalUrl?: string;
}

const NAVY = "#0f2540";
const SAGE = "#4b7a5a";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

function money(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function findItem(id: string): InventoryItem | undefined {
  return INVENTORY_CATALOG.find((i) => i.id === id);
}

export function generateEstimatePdf(input: EstimatePdfInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  // Header band
  doc.setFillColor(NAVY);
  doc.rect(0, 0, pageWidth, 88, "F");
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Easy Moving", margin, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Moving Estimate", margin, 60);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(input.quoteNumber, pageWidth - margin, 42, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const dateStr = new Date(input.createdAtISO ?? Date.now()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(dateStr, pageWidth - margin, 60, { align: "right" });

  y = 120;
  doc.setTextColor("#111827");

  // Customer + Move summary block
  const colW = (pageWidth - margin * 2 - 16) / 2;
  drawPanel(doc, margin, y, colW, 96, "Customer");
  drawKV(doc, margin + 12, y + 30, "Name", input.customer.fullName);
  drawKV(doc, margin + 12, y + 50, "Email", input.customer.email);
  drawKV(doc, margin + 12, y + 70, "Phone", input.customer.phone);

  drawPanel(doc, margin + colW + 16, y, colW, 96, "Move");
  drawKV(doc, margin + colW + 28, y + 30, "Date", input.moveDate || "Flexible");
  drawKV(doc, margin + colW + 28, y + 50, "Distance", `${input.distanceMiles} mi`);
  drawKV(
    doc,
    margin + colW + 28,
    y + 70,
    "Crew",
    `${input.numMovers} movers · ${input.laborHours.toFixed(1)} hrs`,
  );

  y += 116;

  // Addresses
  drawPanel(doc, margin, y, pageWidth - margin * 2, 92, "Route");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(SAGE);
  doc.text("ORIGIN", margin + 12, y + 28);
  doc.text("DESTINATION", margin + 12 + (pageWidth - margin * 2) / 2, y + 28);
  doc.setTextColor("#111827");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  wrappedText(
    doc,
    input.origin.fullAddress || `${input.origin.city}, ${input.origin.state} ${input.origin.zip}`,
    margin + 12,
    y + 46,
    (pageWidth - margin * 2) / 2 - 20,
  );
  wrappedText(
    doc,
    input.destination.fullAddress ||
      `${input.destination.city}, ${input.destination.state} ${input.destination.zip}`,
    margin + 12 + (pageWidth - margin * 2) / 2,
    y + 46,
    (pageWidth - margin * 2) / 2 - 20,
  );
  y += 112;

  // Estimate box
  doc.setFillColor("#f8fafc");
  doc.setDrawColor(BORDER);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 76, 8, 8, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text("ESTIMATED TOTAL", margin + 16, y + 22);
  doc.setTextColor(NAVY);
  doc.setFontSize(22);
  doc.text(`${money(input.estimatedLow)} – ${money(input.estimatedHigh)}`, margin + 16, y + 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(
    `Truck: ${input.truckSize} · ${input.cubicFeet} cu ft · ${input.weightLbs.toLocaleString()} lbs`,
    margin + 16,
    y + 66,
  );
  y += 96;

  // Breakdown
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#111827");
  doc.text("Cost Breakdown", margin, y);
  y += 14;
  doc.setDrawColor(BORDER);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const row of input.breakdown) {
    if (y > pageHeight - 120) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor("#374151");
    doc.text(row.label, margin, y);
    doc.setTextColor("#111827");
    doc.text(money(row.amount), pageWidth - margin, y, { align: "right" });
    y += 16;
  }
  y += 6;

  // Inventory summary
  const itemsWithNames = input.inventory
    .map((it) => {
      const meta = findItem(it.id);
      return meta ? { name: meta.label, quantity: it.quantity } : null;
    })
    .filter(Boolean) as { name: string; quantity: number }[];

  if (itemsWithNames.length > 0) {
    if (y > pageHeight - 160) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Inventory", margin, y);
    y += 14;
    doc.setDrawColor(BORDER);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const colWidth = (pageWidth - margin * 2) / 2;
    let col = 0;
    let startY = y;
    for (const it of itemsWithNames) {
      const rowY = startY + Math.floor(col / 2) * 16;
      if (rowY > pageHeight - 100) {
        doc.addPage();
        y = margin;
        startY = y;
        col = 0;
      }
      const x = margin + (col % 2) * colWidth;
      doc.setTextColor("#374151");
      doc.text(`${it.name}`, x, rowY);
      doc.setTextColor("#111827");
      doc.text(`×${it.quantity}`, x + colWidth - 20, rowY, { align: "right" });
      col += 1;
    }
    y = startY + Math.ceil(itemsWithNames.length / 2) * 16 + 8;
  }

  // Footer
  const footerY = pageHeight - 60;
  doc.setDrawColor(BORDER);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(
    "This is a non-binding estimate valid for 30 days. Final price is confirmed by your moving specialist. Insurance: " +
      input.insurance,
    margin,
    footerY + 14,
    { maxWidth: pageWidth - margin * 2 },
  );
  if (input.portalUrl) {
    doc.setTextColor(SAGE);
    doc.text(`View & accept online: ${input.portalUrl}`, margin, footerY + 30, {
      maxWidth: pageWidth - margin * 2,
    });
  }
  doc.setTextColor(MUTED);
  doc.text("Easy Moving · Licensed & Insured · easymoving.com", margin, footerY + 46);

  return doc;
}

function drawPanel(doc: jsPDF, x: number, y: number, w: number, h: number, title: string) {
  doc.setDrawColor(BORDER);
  doc.setFillColor("#ffffff");
  doc.roundedRect(x, y, w, h, 6, 6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(SAGE);
  doc.text(title.toUpperCase(), x + 12, y + 16);
}

function drawKV(doc: jsPDF, x: number, y: number, k: string, v: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(k, x, y);
  doc.setTextColor("#111827");
  doc.setFontSize(10);
  doc.text(v || "—", x + 60, y);
}

function wrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
}

export function downloadEstimatePdf(input: EstimatePdfInput) {
  const doc = generateEstimatePdf(input);
  doc.save(`Easy-Moving-${input.quoteNumber}.pdf`);
}
