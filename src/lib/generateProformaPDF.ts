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

// Corporate colors matching the design
const COLORS = {
  // Orange/amber for header gradient and accents
  orange: [230, 126, 34] as [number, number, number],
  orangeDark: [211, 84, 0] as [number, number, number],
  orangeLight: [243, 156, 18] as [number, number, number],
  // Gold/yellow for highlights
  gold: [241, 196, 15] as [number, number, number],
  goldLight: [247, 220, 111] as [number, number, number],
  // Maroon/brown for text and number badge
  maroon: [100, 60, 40] as [number, number, number],
  maroonDark: [80, 50, 30] as [number, number, number],
  // Gray for section badges
  grayBadge: [90, 90, 90] as [number, number, number],
  grayLight: [245, 245, 245] as [number, number, number],
  // White
  white: [255, 255, 255] as [number, number, number],
  // Text colors
  textDark: [50, 50, 50] as [number, number, number],
  textMuted: [100, 100, 100] as [number, number, number],
  // Border
  borderGray: [200, 200, 200] as [number, number, number],
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
  const margin = 12;
  let yPos = 0;

  // ========== HEADER SECTION WITH GRADIENT ==========
  const headerHeight = 32;
  
  // Create gradient effect with multiple rectangles (orange to gold)
  const gradientSteps = 20;
  for (let i = 0; i < gradientSteps; i++) {
    const ratio = i / gradientSteps;
    const r = Math.round(COLORS.orangeDark[0] + (COLORS.goldLight[0] - COLORS.orangeDark[0]) * ratio);
    const g = Math.round(COLORS.orangeDark[1] + (COLORS.goldLight[1] - COLORS.orangeDark[1]) * ratio);
    const b = Math.round(COLORS.orangeDark[2] + (COLORS.goldLight[2] - COLORS.orangeDark[2]) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(0, (headerHeight / gradientSteps) * i, pageWidth, headerHeight / gradientSteps + 0.5, "F");
  }

  // Load and add logo
  try {
    const logoImg = await loadImage("/images/logo-ca.png");
    const logoSize = 26;
    doc.addImage(logoImg, "PNG", margin, 3, logoSize, logoSize);
  } catch (error) {
    console.error("Error loading logo:", error);
  }

  // Company name and info
  const textStartX = margin + 32;
  
  doc.setTextColor(...COLORS.maroonDark);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, textStartX, 10);
  
  // Slogan in green/teal
  doc.setTextColor(39, 174, 96);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(COMPANY_INFO.slogan, textStartX, 15);
  
  // Contact info
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`Llamanos 24/7: ${COMPANY_INFO.phone} Email:`, textStartX, 21);
  doc.text(COMPANY_INFO.email, textStartX, 25);
  doc.text(`Ubicación: ${COMPANY_INFO.address}`, textStartX, 29);

  // Right side - PROFORMA title and type
  const rightTextX = pageWidth - margin;
  
  doc.setTextColor(...COLORS.maroonDark);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PROFORMA", rightTextX, 10, { align: "right" });
  
  doc.setFontSize(10);
  doc.text(data.tipo.toUpperCase(), rightTextX, 16, { align: "right" });
  
  // Number badge with maroon background
  const numberText = `N° ${data.numero}`;
  const numberWidth = 50;
  doc.setFillColor(...COLORS.maroon);
  doc.roundedRect(pageWidth - margin - numberWidth, 20, numberWidth, 8, 1, 1, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(numberText, pageWidth - margin - numberWidth / 2, 25.5, { align: "center" });

  yPos = headerHeight + 5;

  // ========== CLIENT & DATES SECTION ==========
  const clientSectionHeight = 40;
  
  // Border around the section
  doc.setDrawColor(...COLORS.borderGray);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - margin * 2, clientSectionHeight);
  
  // Left column - Client info badge
  doc.setFillColor(...COLORS.grayBadge);
  doc.roundedRect(margin + 5, yPos + 4, 42, 6, 1, 1, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE", margin + 26, yPos + 8.2, { align: "center" });
  
  // Client details
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.cliente.razon_social, margin + 5, yPos + 18);
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`RUC/DNI: ${data.cliente.codigo}`, margin + 5, yPos + 24);
  
  if (data.cliente.direccion) {
    const direccion = data.cliente.direccion.length > 55 
      ? data.cliente.direccion.substring(0, 52) + "..." 
      : data.cliente.direccion;
    doc.text(`Dir: ${direccion}`, margin + 5, yPos + 30);
  }

  // Right column - Dates badge
  const rightColX = pageWidth / 2 + 20;
  doc.setFillColor(...COLORS.grayBadge);
  doc.roundedRect(rightColX, yPos + 4, 25, 6, 1, 1, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("FECHAS", rightColX + 12.5, yPos + 8.2, { align: "center" });
  
  // Dates
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Fecha de Emisión:", rightColX, yPos + 17);
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(data.fecha_emision), rightColX, yPos + 23);
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Válido hasta:", rightColX + 45, yPos + 17);
  doc.setTextColor(...COLORS.maroon);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(data.fecha_vencimiento), rightColX + 45, yPos + 23);

  yPos += clientSectionHeight + 8;

  // ========== SERVICES TABLE ==========
  // Section title badge
  doc.setFillColor(...COLORS.grayBadge);
  doc.roundedRect(margin, yPos, 50, 6, 1, 1, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLE DE SERVICIOS", margin + 25, yPos + 4.2, { align: "center" });
  
  yPos += 12;

  // Services table with orange header
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
      fillColor: COLORS.orange,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: COLORS.textDark,
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", cellWidth: "auto" },
      2: { halign: "center", cellWidth: 15 },
      3: { halign: "center", cellWidth: 25 },
      4: { halign: "center", cellWidth: 25 }
    },
    margin: { left: margin, right: margin },
    tableLineColor: COLORS.borderGray,
    tableLineWidth: 0.3,
    didDrawCell: (hookData) => {
      // Draw borders
      if (hookData.section === 'body') {
        doc.setDrawColor(...COLORS.borderGray);
        doc.setLineWidth(0.3);
        doc.rect(hookData.cell.x, hookData.cell.y, hookData.cell.width, hookData.cell.height);
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // ========== TOTALS SECTION ==========
  const totalsX = pageWidth - margin - 75;
  const totalsWidth = 75;
  
  // Border for totals section
  doc.setDrawColor(...COLORS.borderGray);
  doc.setLineWidth(0.3);
  
  // Subtotal row
  doc.rect(totalsX, yPos, totalsWidth, 10);
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX + 5, yPos + 6.5);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.subtotal, data.moneda || "PEN"), totalsX + totalsWidth - 5, yPos + 6.5, { align: "right" });
  
  yPos += 10;
  
  // IGV row
  doc.rect(totalsX, yPos, totalsWidth, 10);
  doc.setFont("helvetica", "normal");
  doc.text("IGV (18%):", totalsX + 5, yPos + 6.5);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.igv, data.moneda || "PEN"), totalsX + totalsWidth - 5, yPos + 6.5, { align: "right" });
  
  yPos += 10;
  
  // Total row with gold/orange background
  doc.setFillColor(...COLORS.gold);
  doc.rect(totalsX, yPos, totalsWidth, 12, "F");
  doc.setDrawColor(...COLORS.borderGray);
  doc.rect(totalsX, yPos, totalsWidth, 12);
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalsX + 5, yPos + 8);
  doc.text(formatCurrency(data.total, data.moneda || "PEN"), totalsX + totalsWidth - 5, yPos + 8, { align: "right" });
  
  yPos += 25;

  // ========== BANK INFO SECTION ==========
  // Bank badge
  doc.setFillColor(...COLORS.grayBadge);
  doc.roundedRect(margin, yPos, 45, 6, 1, 1, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS BANCARIOS", margin + 22.5, yPos + 4.2, { align: "center" });
  
  yPos += 10;
  
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  
  // Left column - BCP
  doc.text(BANK_INFO.bcp.soles, margin, yPos);
  doc.text(BANK_INFO.bcp.dolares, margin, yPos + 5);
  
  // Right column - Interbank
  doc.text(BANK_INFO.interbank.soles, pageWidth / 2, yPos);
  doc.text(BANK_INFO.interbank.dolares, pageWidth / 2, yPos + 5);
  
  yPos += 15;

  // ========== TERMS SECTION ==========
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  
  const terms = [
    "• Los precios incluyen IGV.",
    "• Validez de la proforma: 30 días calendarios.",
    "• Forma de pago: Contado o según acuerdo.",
    "• Los servicios inician una vez confirmado el pago."
  ];
  
  terms.forEach((term, i) => {
    doc.text(term, margin, yPos + (i * 4.5));
  });

  // ========== FOOTER ==========
  const footerY = pageHeight - 18;
  
  // Orange bar at bottom
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, footerY, pageWidth, 4, "F");
  
  // Company name
  doc.setTextColor(...COLORS.maroonDark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, pageWidth / 2, footerY + 10, { align: "center" });
  
  // Thank you message
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("¡Gracias por confiar en nosotros!", pageWidth / 2, footerY + 15, { align: "center" });

  return doc.output("blob");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { 
    day: "2-digit", 
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
