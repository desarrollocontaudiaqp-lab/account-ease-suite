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

interface CalendarProjectionItem {
  numero: number;
  fecha_pago: string;
  servicio: string;
  monto: number;
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
  calendarProjection?: CalendarProjectionItem[];
}

// PDF Style Configuration Interface
export interface PDFStyleConfig {
  colors: {
    primary: string;
    primaryDark: string;
    accent: string;
    textDark: string;
    textMuted: string;
    background: string;
    border: string;
    headerBackground: string;
    tableBackground: string;
    headerTitleText: string;
    headerSubtitleText: string;
    headerContactText: string;
  };
  typography: {
    headerTitleSize: number;
    headerSubtitleSize: number;
    sectionTitleSize: number;
    bodyTextSize: number;
    smallTextSize: number;
    fontFamily: "helvetica" | "times" | "courier";
  };
  layout: {
    marginHorizontal: number;
    headerHeight: number;
    sectionSpacing: number;
    borderRadius: number;
    showLogo: boolean;
    showSlogan: boolean;
    showBankInfo: boolean;
    showTerms: boolean;
    showCalendarProjection: boolean;
    clientColumnWidth: number;
  };
  company: {
    name: string;
    slogan: string;
    address: string;
    phone: string;
    email: string;
  };
  bank: {
    bcp_soles: string;
    bcp_dolares: string;
    interbank_soles: string;
    interbank_dolares: string;
  };
}

// Default configuration - exported for use in PDFStyleEditor
export const DEFAULT_PDF_CONFIG: PDFStyleConfig = {
  colors: {
    primary: "#CA9348",
    primaryDark: "#B47D32",
    accent: "#D91A22",
    textDark: "#323232",
    textMuted: "#646464",
    background: "#FFFFFF",
    border: "#B4B4B4",
    headerBackground: "#CA9348",
    tableBackground: "#CA9348",
    headerTitleText: "#FFFFFF",
    headerSubtitleText: "#FFFFFF",
    headerContactText: "#FFFFFF",
  },
  typography: {
    headerTitleSize: 16,
    headerSubtitleSize: 9,
    sectionTitleSize: 12,
    bodyTextSize: 10,
    smallTextSize: 8,
    fontFamily: "helvetica",
  },
  layout: {
    marginHorizontal: 15,
    headerHeight: 35,
    sectionSpacing: 12,
    borderRadius: 2,
    showLogo: true,
    showSlogan: true,
    showBankInfo: true,
    showTerms: true,
    showCalendarProjection: true,
    clientColumnWidth: 60,
  },
  company: {
    name: "C&A CONTADORES & AUDITORES",
    slogan: "Soluciones Contables y Empresariales",
    address: "Calle Santo Domingo N.º 103, Of. 303 y 304 – Arequipa",
    phone: "(+51) 982 307 213",
    email: "rmarquez@contadoresyauditoresarequipa.com",
  },
  bank: {
    bcp_soles: "BCP Cta. Cte. Soles: 305-2345678-0-12",
    bcp_dolares: "BCP Cta. Cte. Dólares: 305-2345678-1-19",
    interbank_soles: "Interbank Cta. Cte. Soles: 200-3456789012",
    interbank_dolares: "Interbank Cta. Cte. Dólares: 200-3456789019",
  },
};

// Alias for backwards compatibility
const DEFAULT_CONFIG = DEFAULT_PDF_CONFIG;

// Helper to convert hex to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16),
    ];
  }
  return [0, 0, 0];
}

export async function generateProformaPDF(
  data: ProformaData,
  customConfig?: Partial<PDFStyleConfig>
): Promise<Blob> {
  // Merge custom config with defaults
  const config: PDFStyleConfig = {
    colors: { ...DEFAULT_CONFIG.colors, ...customConfig?.colors },
    typography: { ...DEFAULT_CONFIG.typography, ...customConfig?.typography },
    layout: { ...DEFAULT_CONFIG.layout, ...customConfig?.layout },
    company: { ...DEFAULT_CONFIG.company, ...customConfig?.company },
    bank: { ...DEFAULT_CONFIG.bank, ...customConfig?.bank },
  };

  // Convert colors to RGB
  const COLORS = {
    primary: hexToRgb(config.colors.primary),
    primaryDark: hexToRgb(config.colors.primaryDark),
    accent: hexToRgb(config.colors.accent),
    textDark: hexToRgb(config.colors.textDark),
    textMuted: hexToRgb(config.colors.textMuted),
    background: hexToRgb(config.colors.background),
    border: hexToRgb(config.colors.border),
    headerBackground: hexToRgb(config.colors.headerBackground),
    tableBackground: hexToRgb(config.colors.tableBackground),
    headerTitleText: hexToRgb(config.colors.headerTitleText),
    headerSubtitleText: hexToRgb(config.colors.headerSubtitleText),
    headerContactText: hexToRgb(config.colors.headerContactText),
    white: [255, 255, 255] as [number, number, number],
  };

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = config.layout.marginHorizontal;
  const borderRadius = config.layout.borderRadius;
  let yPos = 0;

  // ========== HEADER SECTION ==========
  const headerHeight = config.layout.headerHeight;

  // Solid header background color
  doc.setFillColor(...COLORS.headerBackground);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Load and add logo
  if (config.layout.showLogo) {
    try {
      const logoImg = await loadImage("/images/logo-ca.png");
      const logoSize = 28;
      doc.addImage(logoImg, "PNG", margin, 4, logoSize, logoSize);
    } catch (error) {
      console.error("Error loading logo:", error);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 4, 28, 28, borderRadius, borderRadius, "F");
    }
  }

  // Company name and info
  const textStartX = config.layout.showLogo ? margin + 33 : margin;

  doc.setTextColor(...COLORS.headerTitleText);
  doc.setFontSize(config.typography.headerTitleSize);
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text(config.company.name, textStartX, 12);

  // Slogan
  if (config.layout.showSlogan) {
    doc.setTextColor(...COLORS.headerSubtitleText);
    doc.setFontSize(config.typography.headerSubtitleSize);
    doc.setFont(config.typography.fontFamily, "italic");
    doc.text(config.company.slogan, textStartX, 17);
  }

  // Contact info
  doc.setTextColor(...COLORS.headerContactText);
  doc.setFontSize(7.5);
  doc.setFont(config.typography.fontFamily, "normal");
  doc.text(`Llamanos 24/7: ${config.company.phone} Email:`, textStartX, 23);
  doc.text(`${config.company.email} Ubicación: `, textStartX, 27);
  doc.text(config.company.address, textStartX, 31);

  // Right side - PROFORMA title
  const rightTextX = pageWidth - margin;

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(18);
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text("PROFORMA", rightTextX, 12, { align: "right" });

  doc.setFontSize(11);
  doc.setFont(config.typography.fontFamily, "normal");
  doc.text(data.tipo.toUpperCase(), rightTextX, 18, { align: "right" });

  // Number badge
  const numberText = `N° ${data.numero}`;
  const numberWidth = 52;
  doc.setFillColor(...COLORS.primaryDark);
  doc.roundedRect(pageWidth - margin - numberWidth, 22, numberWidth, 9, borderRadius, borderRadius, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text(numberText, pageWidth - margin - numberWidth / 2, 28, { align: "center" });

  yPos = headerHeight + 8;

  // ========== CLIENT & DATES SECTION ==========
  const clientSectionHeight = 42;
  
  // Calculate column widths based on config
  const clientColWidth = (pageWidth - margin * 2) * (config.layout.clientColumnWidth / 100);
  const middleX = margin + clientColWidth;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, pageWidth - margin * 2, clientSectionHeight);

  // Vertical divider
  doc.line(middleX, yPos, middleX, yPos + clientSectionHeight);

  // Client info badge
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin + 8, yPos + 5, 48, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text("DATOS DEL CLIENTE", margin + 32, yPos + 10, { align: "center" });

  // Client details - with text wrapping
  const clientTextMaxWidth = clientColWidth - 16; // Account for padding on both sides
  
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(config.typography.sectionTitleSize);
  doc.setFont(config.typography.fontFamily, "bold");
  
  // Split razon_social to fit within column
  const razonSocialLines = doc.splitTextToSize(data.cliente.razon_social.toUpperCase(), clientTextMaxWidth);
  const razonSocialText = razonSocialLines.length > 1 ? razonSocialLines.slice(0, 2).join('\n') : razonSocialLines[0];
  doc.text(razonSocialText, margin + 8, yPos + 20);
  
  // Adjust Y position based on whether razon social wrapped
  const razonLineCount = Math.min(razonSocialLines.length, 2);
  const razonHeight = razonLineCount * 5;

  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(config.typography.bodyTextSize);
  doc.setFont(config.typography.fontFamily, "normal");
  doc.text(`RUC/DNI: ${data.cliente.codigo}`, margin + 8, yPos + 18 + razonHeight);

  if (data.cliente.direccion) {
    // Split direccion to fit within column
    const direccionLines = doc.splitTextToSize(`Dir: ${data.cliente.direccion}`, clientTextMaxWidth);
    const direccionText = direccionLines.length > 1 ? direccionLines[0].substring(0, direccionLines[0].length - 3) + "..." : direccionLines[0];
    doc.text(direccionText, margin + 8, yPos + 25 + razonHeight);
  }

  // Dates badge
  const rightColX = middleX + 8;
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(rightColX, yPos + 5, 28, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text("FECHAS", rightColX + 14, yPos + 10, { align: "center" });

  // Dates - stacked vertically
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont(config.typography.fontFamily, "normal");
  doc.text("Fecha de Emisión:", rightColX, yPos + 18);
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(10);
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text(formatDate(data.fecha_emision), rightColX + 35, yPos + 18);

  // Valid until - below emission date
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(8);
  doc.setFont(config.typography.fontFamily, "normal");
  doc.text("Válido hasta:", rightColX, yPos + 28);
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(10);
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text(formatDate(data.fecha_vencimiento), rightColX + 35, yPos + 28);

  // Contact info if available
  if (data.cliente.telefono || data.cliente.email) {
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(8);
    doc.setFont(config.typography.fontFamily, "normal");
    if (data.cliente.telefono) {
      doc.text(`Tel: ${data.cliente.telefono}`, rightColX, yPos + 38);
    }
  }

  yPos += clientSectionHeight + config.layout.sectionSpacing;

  // ========== SERVICES TABLE ==========
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(margin, yPos, 55, 7, 1.5, 1.5, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text("DETALLE DE SERVICIOS", margin + 27.5, yPos + 5, { align: "center" });

  yPos += 14;

  // Services table
  const tableData = data.items.map((item, index) => [
    (index + 1).toString(),
    item.descripcion,
    item.cantidad.toString(),
    formatCurrency(item.precio_unitario, data.moneda || "PEN"),
    formatCurrency(item.subtotal, data.moneda || "PEN"),
  ]);

  // Footer drawing function - to be used on all pages
  const drawFooter = () => {
    const footerBarY = pageHeight - 22;
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, footerBarY, pageWidth, 4, "F");
    doc.setTextColor(...COLORS.textDark);
    doc.setFontSize(11);
    doc.setFont(config.typography.fontFamily, "bold");
    doc.text(config.company.name, pageWidth / 2, footerBarY + 11, { align: "center" });
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(9);
    doc.setFont(config.typography.fontFamily, "italic");
    doc.text("¡Gracias por confiar en nosotros!", pageWidth / 2, footerBarY + 17, { align: "center" });
  };

  // Calculate table width to align totals
  const tableWidth = pageWidth - margin * 2;
  const totalsColWidth = 70; // Width for P. Unit. and Subtotal columns combined
  
  autoTable(doc, {
    startY: yPos,
    head: [["#", "Descripción del Servicio", "Cant", "P. Unit.", "Subtotal"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.tableBackground,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: COLORS.textDark,
      valign: "middle",
      lineColor: COLORS.border,
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 },
      1: { halign: "left", cellWidth: "auto" },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "right", cellWidth: 35 },
      4: { halign: "right", cellWidth: 35 },
    },
    margin: { left: margin, right: margin, bottom: 40 },
    tableLineColor: COLORS.border,
    tableLineWidth: 0.3,
    didDrawCell: (hookData) => {
      if (hookData.section === "body") {
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.3);
        doc.rect(hookData.cell.x, hookData.cell.y, hookData.cell.width, hookData.cell.height);
      }
    },
    didDrawPage: () => {
      drawFooter();
    },
  });

  yPos = (doc as any).lastAutoTable.finalY;

  // ========== TOTALS SECTION - Aligned with table columns ==========
  // Totals should align with the last two columns (P. Unit. and Subtotal)
  const totalsWidth = 70; // Same width as P. Unit. + Subtotal columns
  const totalsX = pageWidth - margin - totalsWidth;
  const labelColWidth = 35;
  const valueColWidth = 35;
  const rowHeight = 8; // Reduced row height
  
  // Check if we need a new page for totals
  const totalsHeight = rowHeight * 3 + 4; // 3 rows + small padding
  const footerZone = pageHeight - 40;
  
  if (yPos + totalsHeight > footerZone) {
    doc.addPage();
    drawFooter();
    yPos = margin;
  }

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);

  // Subtotal row
  doc.rect(totalsX, yPos, totalsWidth, rowHeight);
  doc.line(totalsX + labelColWidth, yPos, totalsX + labelColWidth, yPos + rowHeight);
  doc.setTextColor(...COLORS.textDark);
  doc.setFontSize(9);
  doc.setFont(config.typography.fontFamily, "normal");
  doc.text("Subtotal:", totalsX + labelColWidth - 4, yPos + 5.5, { align: "right" });
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text(formatCurrency(data.subtotal, data.moneda || "PEN"), totalsX + totalsWidth - 4, yPos + 5.5, {
    align: "right",
  });

  yPos += rowHeight;

  // IGV row
  doc.rect(totalsX, yPos, totalsWidth, rowHeight);
  doc.line(totalsX + labelColWidth, yPos, totalsX + labelColWidth, yPos + rowHeight);
  doc.setFont(config.typography.fontFamily, "normal");
  doc.text("IGV (18%):", totalsX + labelColWidth - 4, yPos + 5.5, { align: "right" });
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text(formatCurrency(data.igv, data.moneda || "PEN"), totalsX + totalsWidth - 4, yPos + 5.5, {
    align: "right",
  });

  yPos += rowHeight;

  // Total row with tableBackground
  doc.setFillColor(...COLORS.tableBackground);
  doc.rect(totalsX, yPos, totalsWidth, rowHeight + 2, "F");
  doc.setDrawColor(...COLORS.border);
  doc.rect(totalsX, yPos, totalsWidth, rowHeight + 2);
  doc.line(totalsX + labelColWidth, yPos, totalsX + labelColWidth, yPos + rowHeight + 2);
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont(config.typography.fontFamily, "bold");
  doc.text("TOTAL:", totalsX + labelColWidth - 4, yPos + 6.5, { align: "right" });
  doc.text(formatCurrency(data.total, data.moneda || "PEN"), totalsX + totalsWidth - 4, yPos + 6.5, {
    align: "right",
  });

  yPos += rowHeight + 16;

  // ========== CALENDAR PROJECTION TABLE ==========
  if (config.layout.showCalendarProjection && data.calendarProjection && data.calendarProjection.length > 0) {
    // Check if we need a new page for the projection header
    if (yPos + 30 > footerZone) {
      doc.addPage();
      drawFooter();
      yPos = margin;
    }
    
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, 62, 7, 1.5, 1.5, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont(config.typography.fontFamily, "bold");
    doc.text("PROYECCIÓN DE PAGOS", margin + 31, yPos + 5, { align: "center" });

    yPos += 14;

    const calendarData = data.calendarProjection.map((item) => [
      item.numero.toString(),
      formatDate(item.fecha_pago),
      item.servicio.length > 20 ? item.servicio.substring(0, 17) + "..." : item.servicio,
      formatCurrency(item.monto, data.moneda || "PEN"),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["N° Cuota", "Fecha de Pago", "Servicio", "Monto"]],
      body: calendarData,
      theme: "plain",
      headStyles: {
        fillColor: COLORS.tableBackground,
        textColor: COLORS.white,
        fontSize: 8,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: COLORS.textDark,
        valign: "middle",
        lineColor: COLORS.border,
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 22 },
        1: { halign: "center", cellWidth: 40 },
        2: { halign: "left", cellWidth: "auto" },
        3: { halign: "right", cellWidth: 32 },
      },
      margin: { left: margin, right: margin, bottom: 40 },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.2,
      didDrawCell: (hookData) => {
        if (hookData.section === "body") {
          doc.setDrawColor(...COLORS.border);
          doc.setLineWidth(0.2);
          doc.rect(hookData.cell.x, hookData.cell.y, hookData.cell.width, hookData.cell.height);
        }
      },
      didDrawPage: () => {
        drawFooter();
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + config.layout.sectionSpacing;
  }

  // ========== BANK INFO SECTION ==========
  if (config.layout.showBankInfo) {
    // Check if we need a new page for bank info
    const bankSectionHeight = 30;
    if (yPos + bankSectionHeight > footerZone) {
      doc.addPage();
      drawFooter();
      yPos = margin;
    }
    
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(margin, yPos, 48, 7, 1.5, 1.5, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(8);
    doc.setFont(config.typography.fontFamily, "bold");
    doc.text("DATOS BANCARIOS", margin + 24, yPos + 5, { align: "center" });

    yPos += 12;

    doc.setTextColor(...COLORS.textDark);
    doc.setFontSize(9);
    doc.setFont(config.typography.fontFamily, "normal");

    doc.text(config.bank.bcp_soles, margin, yPos);
    doc.text(config.bank.bcp_dolares, margin, yPos + 5);

    doc.text(config.bank.interbank_soles, pageWidth / 2, yPos);
    doc.text(config.bank.interbank_dolares, pageWidth / 2, yPos + 5);

    yPos += 16;
  }

  // ========== TERMS SECTION ==========
  if (config.layout.showTerms) {
    // Check if we need a new page for terms
    const termsSectionHeight = 25;
    if (yPos + termsSectionHeight > footerZone) {
      doc.addPage();
      drawFooter();
      yPos = margin;
    }
    
    doc.setTextColor(...COLORS.textDark);
    doc.setFontSize(8);
    doc.setFont(config.typography.fontFamily, "italic");

    const terms = [
      "• Los precios incluyen IGV.",
      "• Validez de la proforma: 30 días calendarios.",
      "• Forma de pago: Contado o según acuerdo.",
      "• Los servicios inician una vez confirmado el pago.",
    ];

    terms.forEach((term, i) => {
      doc.text(term, margin, yPos + i * 5);
    });
  }

  // Draw footer on the last page (if not already drawn by tables)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter();
  }

  return doc.output("blob");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
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
