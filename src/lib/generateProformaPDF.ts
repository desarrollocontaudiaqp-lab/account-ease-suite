import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Helper function to load image as base64
async function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

interface ProformaItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface ProformaData {
  numero: string;
  tipo: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  cliente: {
    razon_social: string;
    codigo: string;
    direccion?: string | null;
    email?: string | null;
    telefono?: string | null;
  };
  items: ProformaItem[];
  subtotal: number;
  igv: number;
  total: number;
  notas?: string | null;
  moneda?: string;
  campos_personalizados?: Record<string, any>;
  campos_especificos?: { label: string; value: string }[];
}

// Corporate colors - exactly matching the design
const COLORS = {
  // Gold/Mustard for header and accents
  gold: [202, 147, 72] as [number, number, number], // #CA9348
  goldLight: [212, 167, 102] as [number, number, number],
  goldDark: [180, 125, 50] as [number, number, number],
  // Red for valid until date
  red: [217, 26, 34] as [number, number, number], // #D91A22
  // Gray for badges
  grayBadge: [80, 80, 80] as [number, number, number],
  grayLight: [245, 245, 245] as [number, number, number],
  // White
  white: [255, 255, 255] as [number, number, number],
  // Text colors
  textDark: [50, 50, 50] as [number, number, number],
  textMuted: [100, 100, 100] as [number, number, number],
  // Border
  borderGray: [180, 180, 180] as [number, number, number],
};

// Company information
const COMPANY_INFO = {
  name: "C&A CONTADORES & AUDITORES",
  slogan: "Soluciones Contables y Empresariales",
  address: "Calle Santo Domingo N.º 103, Of. 303 y 304 – Arequipa",
  phone: "(+51) 982 307 213",
  email: "rmarquez@contadoresyauditoresarequipa.com",
};

const BANK_INFO = {
  bcp: {
    soles: "BCP Cta. Cte. Soles: 305-2345678-0-12",
    dolares: "BCP Cta. Cte. Dólares: 305-2345678-1-19"
  },
  interbank: {
    soles: "Interbank Cta. Cte. Soles: 200-3456789012",
    dolares: "Interbank Cta. Cte. Dólares: 200-3456789019"
  }
};

export async function generateProformaPDF(data: ProformaData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 0;

  // ========== HEADER SECTION - Gold/Mustard uniform color ==========
  const headerHeight = 35;
  
  // Solid gold header background
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Load and add logo with gold/yellow background effect
  try {
    const logoImg = await loadImage("/images/logo-ca.png");
    const logoSize = 28;
    doc.addImage(logoImg, "PNG", margin, 4, logoSize, logoSize);
  } catch (error) {
    console.error("Error loading logo:", error);
    // Fallback: draw a placeholder
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 4, 28, 28, 2, 2, "F");
  }

  // Company name and info - positioned to the right of logo
  const textStartX = margin + 33;
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, textStartX, 12);
  
  // Slogan in italic
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(COMPANY_INFO.slogan, textStartX, 17);
  
  // Contact info - smaller text
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Llamanos 24/7: ${COMPANY_INFO.phone} Email:`, textStartX, 23);
  doc.text(`${COMPANY_INFO.email} Ubicación: `, textStartX, 27);
  doc.text(COMPANY_INFO.address, textStartX, 31);

  // Right side - PROFORMA title and type
  const rightTextX = pageWidth - margin;
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PROFORMA", rightTextX, 12, { align: "right" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.tipo.toUpperCase(), rightTextX, 18, { align: "right" });
  
  // Number badge with gold/dark background
  const numberText = `N° ${data.numero}`;
  const numberWidth = 52;
  doc.setFillColor(...COLORS.goldDark);
  doc.roundedRect(pageWidth - margin - numberWidth, 22, numberWidth, 9, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(numberText, pageWidth - margin - numberWidth / 2, 28, { align: "center" });

  yPos = headerHeight + 8;

  // ========== CLIENT & DATES SECTION ==========
  const clientSectionHeight = 42;
  
  // Border around the entire section
  doc.setDrawColor(...COLORS.borderGray);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, pageWidth - margin * 2, clientSectionHeight);
  
  // Vertical divider line in the middle
  const middleX = pageWidth / 2 + 15;
  doc.line(middleX, yPos, middleX, yPos + clientSectionHeight);

  // Left column - Client info badge
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(margin + 8, yPos + 5, 48, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE", margin + 32, yPos + 10, { align: "center" });
  
  // Client details
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.cliente.razon_social.toUpperCase(), margin + 8, yPos + 22);
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`RUC/DNI: ${data.cliente.codigo}`, margin + 8, yPos + 29);
  
  if (data.cliente.direccion) {
    const maxWidth = middleX - margin - 15;
    const direccion = data.cliente.direccion.length > 50 
      ? data.cliente.direccion.substring(0, 47) + "..." 
      : data.cliente.direccion;
    doc.text(`Dir: ${direccion}`, margin + 8, yPos + 36);
  }

  // Right column - Dates badge
  const rightColX = middleX + 8;
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(rightColX, yPos + 5, 28, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("FECHAS", rightColX + 14, yPos + 10, { align: "center" });
  
  // Dates - two columns layout
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Fecha de Emisión:", rightColX, yPos + 22);
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(data.fecha_emision), rightColX, yPos + 29);
  
  // Valid until - right side with red color
  const validX = rightColX + 48;
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Válido hasta:", validX, yPos + 22);
  doc.setTextColor(...COLORS.red);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(data.fecha_vencimiento), validX, yPos + 29);

  yPos += clientSectionHeight + 12;

  // ========== SERVICES TABLE ==========
  // Section title badge
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(margin, yPos, 55, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLE DE SERVICIOS", margin + 27.5, yPos + 5, { align: "center" });
  
  yPos += 14;

  // Services table with gold header
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.descripcion,
    item.cantidad.toString(),
    formatCurrency(item.precio_unitario, data.moneda || "PEN"),
    formatCurrency(item.subtotal, data.moneda || "PEN")
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Descripción del Servicio", "Cant", "P. Unit.", "Subtotal"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.gold,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: COLORS.textDark,
      valign: "middle",
      lineColor: COLORS.borderGray,
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { halign: "left", cellWidth: "auto" },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "center", cellWidth: 28 },
      4: { halign: "center", cellWidth: 28 }
    },
    margin: { left: margin, right: margin },
    tableLineColor: COLORS.borderGray,
    tableLineWidth: 0.3,
    didDrawCell: (hookData) => {
      // Draw borders for body cells
      if (hookData.section === 'body') {
        doc.setDrawColor(...COLORS.borderGray);
        doc.setLineWidth(0.3);
        doc.rect(hookData.cell.x, hookData.cell.y, hookData.cell.width, hookData.cell.height);
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // ========== TOTALS SECTION - Aligned to right ==========
  const totalsWidth = 80;
  const totalsX = pageWidth - margin - totalsWidth;
  
  // Border for totals section
  doc.setDrawColor(...COLORS.borderGray);
  doc.setLineWidth(0.4);
  
  // Subtotal row
  doc.rect(totalsX, yPos, totalsWidth, 12);
  // Vertical divider
  doc.line(totalsX + 40, yPos, totalsX + 40, yPos + 12);
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX + 8, yPos + 8);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.subtotal, data.moneda || "PEN"), totalsX + totalsWidth - 8, yPos + 8, { align: "right" });
  
  yPos += 12;
  
  // IGV row
  doc.rect(totalsX, yPos, totalsWidth, 12);
  doc.line(totalsX + 40, yPos, totalsX + 40, yPos + 12);
  doc.setFont("helvetica", "normal");
  doc.text("IGV (18%):", totalsX + 8, yPos + 8);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.igv, data.moneda || "PEN"), totalsX + totalsWidth - 8, yPos + 8, { align: "right" });
  
  yPos += 12;
  
  // Total row with gold background
  doc.setFillColor(...COLORS.gold);
  doc.rect(totalsX, yPos, totalsWidth, 14, "F");
  doc.setDrawColor(...COLORS.borderGray);
  doc.rect(totalsX, yPos, totalsWidth, 14);
  doc.line(totalsX + 40, yPos, totalsX + 40, yPos + 14);
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalsX + 8, yPos + 10);
  doc.text(formatCurrency(data.total, data.moneda || "PEN"), totalsX + totalsWidth - 8, yPos + 10, { align: "right" });
  
  yPos += 28;

  // ========== BANK INFO SECTION ==========
  // Bank badge
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(margin, yPos, 48, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS BANCARIOS", margin + 24, yPos + 5, { align: "center" });
  
  yPos += 12;
  
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // Left column - BCP
  doc.text(BANK_INFO.bcp.soles, margin, yPos);
  doc.text(BANK_INFO.bcp.dolares, margin, yPos + 5);
  
  // Right column - Interbank
  doc.text(BANK_INFO.interbank.soles, pageWidth / 2, yPos);
  doc.text(BANK_INFO.interbank.dolares, pageWidth / 2, yPos + 5);
  
  yPos += 16;

  // ========== TERMS SECTION ==========
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  
  const terms = [
    "• Los precios incluyen IGV.",
    "• Validez de la proforma: 30 días calendarios.",
    "• Forma de pago: Contado o según acuerdo.",
    "• Los servicios inician una vez confirmado el pago."
  ];
  
  terms.forEach((term, i) => {
    doc.text(term, margin, yPos + (i * 5));
  });

  // ========== FOOTER - Exact match to design ==========
  const footerBarY = pageHeight - 22;
  
  // Gold bar at bottom
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, footerBarY, pageWidth, 4, "F");
  
  // Company name centered
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, pageWidth / 2, footerBarY + 11, { align: "center" });
  
  // Thank you message
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("¡Gracias por confiar en nosotros!", pageWidth / 2, footerBarY + 17, { align: "center" });

  return doc.output("blob");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { 
    day: "numeric", 
    month: "long", 
    year: "numeric" 
  };
  return date.toLocaleDateString("es-PE", options);
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "USD" ? "$ " : "S/ ";
  return symbol + amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
