import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ProformaItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface ProformaData {
  numero: string;
  tipo: "contabilidad" | "tramites";
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
  campos_personalizados?: Record<string, string>;
}

// Logo base64 (placeholder - will be replaced with actual logo)
const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF0WlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdEV2dD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlRXZlbnQjIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjQuMCAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI0LTAxLTE1VDEwOjAwOjAwLTA1OjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTAxLTE1VDEwOjAwOjAwLTA1OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMS0xNVQxMDowMDowMC0wNTowMCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDoxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwYWIiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDoxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwYWIiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwYWIiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIj4gPHhtcE1NOkhpc3Rvcnk+IDxyZGY6U2VxPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0iY3JlYXRlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDoxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwYWIiIHN0RXZ0OndoZW49IjIwMjQtMDEtMTVUMTA6MDA6MDAtMDU6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCAyNC4wIChXaW5kb3dzKSIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4AAAA0SURBVHic7cEBDQAAAMKg909tDjegAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4GYNKwAB1JYRtQAAAABJRU5ErkJggg==";

// Company information
const COMPANY_INFO = {
  name: "C&A ASESORES EMPRESARIALES",
  slogan: "Soluciones Empresariales que Potencian tu Negocio",
  address: "Jr. Tacna 560 - La Victoria - Chiclayo",
  phone: "Tel: 986524816",
  email: "cyaasesoresempresariales@gmail.com",
  ruc: "RUC: 10167543210"
};

const BANK_INFO = {
  bcp: {
    soles: "BCP - Cuenta Corriente Soles: 305-2345678-0-12",
    dolares: "BCP - Cuenta Corriente Dólares: 305-2345678-1-19"
  },
  interbank: {
    soles: "Interbank - Cuenta Corriente Soles: 200-3456789012",
    dolares: "Interbank - Cuenta Corriente Dólares: 200-3456789019"
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
  let yPos = margin;

  // Colors
  const primaryColor = data.tipo === "contabilidad" 
    ? [26, 54, 93] // Dark blue for accounting
    : [139, 69, 19]; // Brown/bronze for procedures
  
  const secondaryColor = data.tipo === "contabilidad"
    ? [59, 130, 246] // Light blue
    : [180, 120, 60]; // Light bronze

  // Header background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Try to load and add the logo
  try {
    // Use the logo from assets
    const logoImg = new Image();
    logoImg.src = "/src/assets/logo-ca-full.png";
    doc.addImage(LOGO_BASE64, "PNG", margin, 8, 30, 30);
  } catch (e) {
    // If logo fails, draw a placeholder
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, 8, 30, 30, 3, 3, "F");
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("C&A", margin + 15, 25, { align: "center" });
  }

  // Company name and info in header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, margin + 38, 18);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(COMPANY_INFO.slogan, margin + 38, 24);
  doc.text(`${COMPANY_INFO.address} | ${COMPANY_INFO.phone}`, margin + 38, 30);
  doc.text(`${COMPANY_INFO.email} | ${COMPANY_INFO.ruc}`, margin + 38, 36);

  // Proforma type badge on the right
  const badgeWidth = 50;
  const badgeX = pageWidth - margin - badgeWidth;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(badgeX, 12, badgeWidth, 22, 3, 3, "F");
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PROFORMA", badgeX + badgeWidth / 2, 20, { align: "center" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(data.tipo === "contabilidad" ? "CONTABILIDAD" : "TRÁMITES", badgeX + badgeWidth / 2, 26, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`N° ${data.numero}`, badgeX + badgeWidth / 2, 32, { align: "center" });

  yPos = 55;

  // Client and dates section
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 35, 3, 3, "F");
  
  // Left side - Client info
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CLIENTE:", margin + 5, yPos + 8);
  
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.cliente.razon_social, margin + 5, yPos + 15);
  
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`RUC/DNI: ${data.cliente.codigo}`, margin + 5, yPos + 22);
  if (data.cliente.direccion) {
    doc.text(`Dirección: ${data.cliente.direccion}`, margin + 5, yPos + 28);
  }
  if (data.cliente.email) {
    doc.text(`Email: ${data.cliente.email}`, margin + 5, yPos + 33);
  }

  // Right side - Dates
  const rightColX = pageWidth / 2 + 10;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text("FECHA DE EMISIÓN:", rightColX, yPos + 8);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(data.fecha_emision), rightColX, yPos + 15);
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("VÁLIDO HASTA:", rightColX, yPos + 24);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(data.fecha_vencimiento), rightColX, yPos + 31);

  yPos += 45;

  // Services table title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLE DE SERVICIOS", margin, yPos);
  
  yPos += 5;

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
    head: [["#", "Descripción del Servicio", "Cant.", "Precio Unit.", "Subtotal"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [primaryColor[0], primaryColor[1], primaryColor[2]],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [50, 50, 50],
      valign: "middle"
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { halign: "left", cellWidth: "auto" },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 28 }
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252]
    },
    margin: { left: margin, right: margin }
  });

  // Get the Y position after the table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Totals section
  const totalsX = pageWidth - margin - 70;
  const totalsWidth = 70;
  
  // Subtotal
  doc.setFillColor(245, 247, 250);
  doc.rect(totalsX, yPos, totalsWidth, 8, "F");
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsX + 5, yPos + 5.5);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.subtotal, data.moneda || "PEN"), totalsX + totalsWidth - 5, yPos + 5.5, { align: "right" });
  
  yPos += 9;
  
  // IGV
  doc.setFillColor(245, 247, 250);
  doc.rect(totalsX, yPos, totalsWidth, 8, "F");
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text("IGV (18%):", totalsX + 5, yPos + 5.5);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(data.igv, data.moneda || "PEN"), totalsX + totalsWidth - 5, yPos + 5.5, { align: "right" });
  
  yPos += 9;
  
  // Total
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(totalsX, yPos, totalsWidth, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", totalsX + 5, yPos + 7);
  doc.text(formatCurrency(data.total, data.moneda || "PEN"), totalsX + totalsWidth - 5, yPos + 7, { align: "right" });
  
  yPos += 20;

  // Notes section
  if (data.notas) {
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES:", margin, yPos);
    yPos += 6;
    
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(data.notas, pageWidth - margin * 2);
    doc.text(splitNotes, margin, yPos);
    yPos += splitNotes.length * 5 + 10;
  }

  // Bank info section
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 28, 3, 3, "F");
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS BANCARIOS PARA TRANSFERENCIA:", margin + 5, yPos + 7);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(BANK_INFO.bcp.soles, margin + 5, yPos + 14);
  doc.text(BANK_INFO.bcp.dolares, margin + 5, yPos + 20);
  doc.text(BANK_INFO.interbank.soles, pageWidth / 2, yPos + 14);
  doc.text(BANK_INFO.interbank.dolares, pageWidth / 2, yPos + 20);
  
  yPos += 35;

  // Terms and conditions
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("• Los precios incluyen IGV.", margin, yPos);
  doc.text("• La validez de esta proforma es de 30 días.", margin, yPos + 4);
  doc.text("• El pago se realiza al contado o según acuerdo con el cliente.", margin, yPos + 8);
  doc.text("• Los servicios se ejecutarán una vez confirmado el pago.", margin, yPos + 12);

  // Footer
  const footerY = pageHeight - 12;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(COMPANY_INFO.name, pageWidth / 2, footerY, { align: "center" });
  
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("¡Gracias por su preferencia!", pageWidth / 2, footerY + 4, { align: "center" });

  // Return as blob
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
