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
  campos_especificos?: { label: string; value: string }[]; // Campos específicos para mostrar en PDF
}

// Corporate colors - Red, Gold & Maroon palette
const COLORS = {
  // Primary red (header background) - brighter corporate red
  primaryMaroon: [163, 54, 62] as [number, number, number],
  // Deep burgundy for accents
  deepBurgundy: [140, 45, 52] as [number, number, number],
  // Accent red (from logo)
  accentRed: [185, 28, 28] as [number, number, number],
  // Gold/Bronze (from logo)
  accentGold: [180, 130, 70] as [number, number, number],
  // Light gold for highlights
  lightGold: [212, 175, 55] as [number, number, number],
  // Gray (from logo)
  accentGray: [120, 120, 120] as [number, number, number],
  // Light backgrounds
  lightBg: [252, 248, 245] as [number, number, number],
  warmLightBg: [255, 250, 245] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  // Text colors
  textDark: [45, 30, 30] as [number, number, number],
  textMuted: [100, 80, 80] as [number, number, number],
  textLight: [255, 255, 255] as [number, number, number],
};

// Company information
const COMPANY_INFO = {
  name: "C&A CONTADORES & AUDITORES",
  slogan: "Soluciones Contables y Empresariales",
  address: "Calle Santo Domingo N.º 103, Of. 303 y 304 – Arequipa",
  phone: "(+51) 982 307 213",
  email: "rmarquez@contadoresyauditoresarequipa.com",
  website: "Llamanos 24/7"
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

// Helper to draw the C&A logo using shapes
function drawLogo(doc: jsPDF, x: number, y: number, size: number) {
  const scale = size / 40;
  
  // White background with rounded corners
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(x, y, size, size, 3, 3, "F");
  
  // Draw diamond shapes representing the logo
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const diamondSize = 12 * scale;
  
  // Gray diamond (left/back)
  doc.setFillColor(150, 150, 150);
  drawDiamond(doc, centerX - 8 * scale, centerY - 2 * scale, diamondSize * 0.85);
  
  // Red diamond (bottom/middle)
  doc.setFillColor(...COLORS.accentRed);
  drawDiamond(doc, centerX - 2 * scale, centerY + 4 * scale, diamondSize * 0.85);
  
  // Gold diamond (front/right) - with C&A text
  doc.setFillColor(...COLORS.accentGold);
  drawDiamond(doc, centerX + 4 * scale, centerY - 2 * scale, diamondSize);
  
  // C&A text on gold diamond
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7 * scale);
  doc.setFont("helvetica", "bold");
  doc.text("C&A", centerX + 4 * scale, centerY, { align: "center" });
}

function drawDiamond(doc: jsPDF, cx: number, cy: number, size: number) {
  const half = size / 2;
  // Draw a rotated square (diamond)
  const points = [
    [cx, cy - half],       // top
    [cx + half, cy],       // right
    [cx, cy + half],       // bottom
    [cx - half, cy],       // left
  ];
  
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  
  // Create path manually
  (doc as any).triangle(
    points[0][0], points[0][1],
    points[1][0], points[1][1],
    points[3][0], points[3][1],
    "F"
  );
  (doc as any).triangle(
    points[1][0], points[1][1],
    points[2][0], points[2][1],
    points[3][0], points[3][1],
    "F"
  );
}

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

  // ========== HEADER SECTION ==========
  const headerHeight = 38;
  
  // Full-width maroon header background (solid, no boxes)
  doc.setFillColor(...COLORS.primaryMaroon);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  
  // Load and add logo from PNG (no background box)
  try {
    const logoImg = await loadImage("/images/logo-ca.png");
    const logoSize = 30;
    doc.addImage(logoImg, "PNG", margin, 4, logoSize, logoSize);
  } catch (error) {
    console.error("Error loading logo:", error);
  }

  // Company name and info - centered in header
  const textStartX = margin + 38;
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, textStartX, 12);
  
  // Gold slogan
  doc.setTextColor(...COLORS.lightGold);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text(COMPANY_INFO.slogan, textStartX, 18);
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY_INFO.website}: ${COMPANY_INFO.phone}`, textStartX, 25);
  doc.text(`Email: ${COMPANY_INFO.email}`, textStartX, 30);
  doc.text(`Ubicación: ${COMPANY_INFO.address}`, textStartX, 35);

  // Proforma info on the right - text only, no boxes
  const rightTextX = pageWidth - margin;
  
  // PROFORMA title in white
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PROFORMA", rightTextX, 12, { align: "right" });
  
  // Type label in white
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(data.tipo.toUpperCase(), rightTextX, 20, { align: "right" });
  
  // Proforma number in gold/yellow
  doc.setTextColor(...COLORS.lightGold);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`N° ${data.numero}`, rightTextX, 28, { align: "right" });

  yPos = 42;

  // ========== CLIENT & DATES SECTION ==========
  // Calcular altura dinámica basada en campos específicos
  const hasCamposEspecificos = data.campos_especificos && data.campos_especificos.length > 0;
  const camposEspecificosHeight = hasCamposEspecificos ? Math.ceil(data.campos_especificos!.length / 2) * 6 : 0;
  const clientSectionHeight = 38 + camposEspecificosHeight;
  
  // Modern card style
  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, clientSectionHeight, 4, 4, "F");
  
  // Left column - Client info
  const leftColX = margin + 8;
  
  // Client label with accent
  doc.setFillColor(...COLORS.primaryMaroon);
  doc.roundedRect(leftColX, yPos + 5, 45, 6, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL CLIENTE", leftColX + 22.5, yPos + 9, { align: "center" });
  
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.cliente.razon_social, leftColX, yPos + 18);
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`RUC/DNI: ${data.cliente.codigo}`, leftColX, yPos + 24);
  
  if (data.cliente.direccion) {
    const direccion = data.cliente.direccion.length > 50 
      ? data.cliente.direccion.substring(0, 47) + "..." 
      : data.cliente.direccion;
    doc.text(`Dir: ${direccion}`, leftColX, yPos + 30);
  }
  if (data.cliente.email) {
    doc.text(`Email: ${data.cliente.email}`, leftColX, yPos + 36);
  }

  // Campos específicos - debajo de los datos del cliente
  if (hasCamposEspecificos && data.campos_especificos) {
    let campoY = yPos + 42;
    const camposPerRow = 2;
    const campoWidth = (pageWidth - margin * 2 - 20) / camposPerRow;
    
    data.campos_especificos.forEach((campo, idx) => {
      const col = idx % camposPerRow;
      const row = Math.floor(idx / camposPerRow);
      const campoX = leftColX + (col * campoWidth);
      const campoYPos = campoY + (row * 6);
      
      doc.setTextColor(...COLORS.textMuted);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(`${campo.label}:`, campoX, campoYPos);
      
      doc.setTextColor(...COLORS.textDark);
      doc.setFont("helvetica", "normal");
      const labelWidth = doc.getTextWidth(`${campo.label}: `);
      doc.text(campo.value || "-", campoX + labelWidth, campoYPos);
    });
  }

  // Right column - Dates
  const rightColX = pageWidth / 2 + 15;
  
  // Dates section
  doc.setFillColor(...COLORS.primaryMaroon);
  doc.roundedRect(rightColX, yPos + 5, 35, 6, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("FECHAS", rightColX + 17.5, yPos + 9, { align: "center" });
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Fecha de Emisión:", rightColX, yPos + 18);
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(data.fecha_emision), rightColX, yPos + 24);
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Válido hasta:", rightColX, yPos + 31);
  doc.setTextColor(...COLORS.accentRed);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(data.fecha_vencimiento), rightColX, yPos + 37);

  yPos += clientSectionHeight + 8;

  // ========== SERVICES TABLE ==========
  // Section title with modern styling
  doc.setFillColor(...COLORS.primaryMaroon);
  doc.roundedRect(margin, yPos, 55, 7, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLE DE SERVICIOS", margin + 27.5, yPos + 5, { align: "center" });
  
  yPos += 12;

  // Services table
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.descripcion,
    item.cantidad.toString(),
    formatCurrency(item.precio_unitario, data.moneda || "PEN"),
    formatCurrency(item.subtotal, data.moneda || "PEN")
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Descripción del Servicio", "Cant.", "P. Unit.", "Subtotal"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.primaryMaroon,
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
      lineColor: [230, 230, 230],
      lineWidth: 0.1
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", cellWidth: "auto" },
      2: { halign: "center", cellWidth: 15 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 }
    },
    alternateRowStyles: {
      fillColor: [252, 252, 254]
    },
    margin: { left: margin, right: margin },
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.2
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // ========== TOTALS SECTION ==========
  const totalsX = pageWidth - margin - 75;
  const totalsWidth = 75;
  
  // Totals box with shadow effect
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(totalsX - 2, yPos - 2, totalsWidth + 4, 38, 3, 3, "F");
  
  // Subtotal row
  doc.setFillColor(...COLORS.lightBg);
  doc.rect(totalsX, yPos, totalsWidth, 9, "F");
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX + 5, yPos + 6);
  doc.setTextColor(...COLORS.textDark);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.subtotal, data.moneda || "PEN"), totalsX + totalsWidth - 5, yPos + 6, { align: "right" });
  
  yPos += 10;
  
  // IGV row
  doc.setFillColor(...COLORS.lightBg);
  doc.rect(totalsX, yPos, totalsWidth, 9, "F");
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont("helvetica", "normal");
  doc.text("IGV (18%):", totalsX + 5, yPos + 6);
  doc.setTextColor(...COLORS.textDark);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.igv, data.moneda || "PEN"), totalsX + totalsWidth - 5, yPos + 6, { align: "right" });
  
  yPos += 10;
  
  // Total row with gradient-like effect
  doc.setFillColor(...COLORS.primaryMaroon);
  doc.roundedRect(totalsX, yPos, totalsWidth, 12, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalsX + 5, yPos + 8);
  doc.text(formatCurrency(data.total, data.moneda || "PEN"), totalsX + totalsWidth - 5, yPos + 8, { align: "right" });
  
  yPos += 22;

  // ========== NOTES SECTION ==========
  if (data.notas) {
    doc.setFillColor(...COLORS.lightBg);
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 3, 3, "F");
    
    doc.setTextColor(...COLORS.primaryMaroon);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES:", margin + 5, yPos + 7);
    
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(data.notas, pageWidth - margin * 2 - 10);
    doc.text(splitNotes.slice(0, 2), margin + 5, yPos + 14);
    yPos += 25;
  }

  // ========== BANK INFO SECTION ==========
  doc.setFillColor(...COLORS.lightBg);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 26, 3, 3, "F");
  
  // Bank icon/badge
  doc.setFillColor(...COLORS.accentGold);
  doc.roundedRect(margin + 5, yPos + 3, 60, 6, 2, 2, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS BANCARIOS", margin + 35, yPos + 7, { align: "center" });
  
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  
  // Left column
  doc.text(BANK_INFO.bcp.soles, margin + 5, yPos + 15);
  doc.text(BANK_INFO.bcp.dolares, margin + 5, yPos + 21);
  
  // Right column
  doc.text(BANK_INFO.interbank.soles, pageWidth / 2 + 5, yPos + 15);
  doc.text(BANK_INFO.interbank.dolares, pageWidth / 2 + 5, yPos + 21);
  
  yPos += 32;

  // ========== TERMS SECTION ==========
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  
  const terms = [
    "• Los precios incluyen IGV.",
    "• Validez de la proforma: 30 días calendarios.",
    "• Forma de pago: Contado o según acuerdo.",
    "• Los servicios inician una vez confirmado el pago."
  ];
  
  terms.forEach((term, i) => {
    doc.text(term, margin, yPos + (i * 4));
  });

  // ========== FOOTER ==========
  const footerY = pageHeight - 15;
  
  // Gradient-like footer line
  doc.setDrawColor(...COLORS.accentGold);
  doc.setLineWidth(1);
  doc.line(margin, footerY - 3, pageWidth / 3, footerY - 3);
  
  doc.setDrawColor(...COLORS.accentRed);
  doc.line(pageWidth / 3, footerY - 3, pageWidth * 2 / 3, footerY - 3);
  
  doc.setDrawColor(...COLORS.primaryMaroon);
  doc.line(pageWidth * 2 / 3, footerY - 3, pageWidth - margin, footerY - 3);
  
  doc.setTextColor(...COLORS.primaryMaroon);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, pageWidth / 2, footerY + 2, { align: "center" });
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("¡Gracias por confiar en nosotros!", pageWidth / 2, footerY + 7, { align: "center" });

  return doc.output("blob");
}

// Helper function to draw a square diamond
function drawSquareDiamond(doc: jsPDF, cx: number, cy: number, size: number) {
  const half = size / 2;
  
  // Use lines to create diamond shape
  doc.setLineWidth(0);
  
  // Draw filled diamond using triangles approach
  const points: [number, number][] = [
    [cx, cy - half],       // top
    [cx + half, cy],       // right
    [cx, cy + half],       // bottom
    [cx - half, cy],       // left
  ];
  
  // Draw as two triangles
  doc.triangle(
    points[0][0], points[0][1],
    points[1][0], points[1][1],
    points[3][0], points[3][1],
    "F"
  );
  doc.triangle(
    points[1][0], points[1][1],
    points[2][0], points[2][1],
    points[3][0], points[3][1],
    "F"
  );
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
